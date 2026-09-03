"""Stop hook: enforce test-touched, code-review, API-docs, and lint/test gates.

Registered in .claude/settings.json under Stop (no matcher, fires every
Stop). Fully stateless: everything is derived from current git status
scoped to backend/app, backend/tests, docs/api, and postman, plus the
session transcript.

Note: this hook runs ``pytest`` (which imports and executes application
code) unattended against whatever was just written to backend/app, with
no human approval step. Treat edits to backend/app with the same scrutiny
as any other locally-executed code.
"""

import json
import sys
from datetime import datetime
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

# Pylint's wrong-import-position is disabled here befause the import below depends on the sys.path modification above.
from hooks_common import (  # noqa: E402  pylint: disable=wrong-import-position
    CODE_REVIEWER_SUBAGENTS,
    EDIT_TOOL_NAMES,
    REVIEW_TOOL_NAMES,
    GitStatusError,
    backend_git_status,
    docs_and_postman_status,
    extract_file_paths,
    is_api_surface_file,
    is_in_scope_app_file,
    lint_files,
    read_stdin_json,
    repo_root,
    run,
)


def _parse_ts(raw: str) -> datetime | None:
    """Parse an ISO-8601 transcript timestamp.

    :param raw: Timestamp string, e.g. ``"2026-08-17T16:57:02.611Z"``.
    :type raw: str
    :returns: The parsed timestamp, or None if unparseable.
    :rtype: datetime | None
    """
    try:
        return datetime.fromisoformat(raw.replace("Z", "+00:00"))
    except (ValueError, AttributeError):
        return None


def _review_gate_failure(transcript_path: str, root: Path) -> str | None:
    """Check whether backend/app was edited since the last backend-code-reviewer run.

    :param transcript_path: Path to the session's JSONL transcript.
    :type transcript_path: str
    :param root: Repository root.
    :type root: Path
    :returns: A failure message if a review is needed, else None.
    :rtype: str | None
    """
    path = Path(transcript_path)
    if not path.exists():
        return None

    last_edit_ts: datetime | None = None
    last_review_ts: datetime | None = None

    with path.open("r", encoding="utf-8") as handle:
        for line in handle:
            line = line.strip()
            if not line:
                continue
            try:
                entry = json.loads(line)
            except json.JSONDecodeError:
                continue

            message = entry.get("message")
            if not isinstance(message, dict):
                continue
            content = message.get("content")
            if not isinstance(content, list):
                continue
            ts = _parse_ts(entry.get("timestamp", ""))
            if ts is None:
                continue

            for block in content:
                if not isinstance(block, dict) or block.get("type") != "tool_use":
                    continue
                name = block.get("name")
                block_input = block.get("input") or {}

                if name in EDIT_TOOL_NAMES:
                    for p in extract_file_paths(block_input):
                        if is_in_scope_app_file(p, root):
                            if last_edit_ts is None or ts > last_edit_ts:
                                last_edit_ts = ts
                            break
                elif (
                    name in REVIEW_TOOL_NAMES
                    and block_input.get("subagent_type") in CODE_REVIEWER_SUBAGENTS
                ):
                    if last_review_ts is None or ts > last_review_ts:
                        last_review_ts = ts

    if last_edit_ts is not None and (last_review_ts is None or last_review_ts < last_edit_ts):
        return (
            "backend/app files were modified since the last code-reviewer run "
            "(or none has run this session) — invoke the backend-code-reviewer "
            "subagent via the Task tool (subagent_type: \"backend-code-reviewer\") "
            "before finishing."
        )
    return None


def _api_docs_gate_failure(root: Path, app_changed: list[str]) -> str | None:
    """Check that an API-surface change also updated the OpenAPI docs and Postman collection.

    :param root: Repository root.
    :type root: Path
    :param app_changed: Changed ``backend/app/*.py`` paths (from
        :func:`~hooks_common.backend_git_status`).
    :type app_changed: list[str]
    :raises GitStatusError: If the ``git status`` invocation itself fails.
    :returns: A failure message if the docs/Postman update is missing, else
        None (including when no API-surface file changed at all).
    :rtype: str | None
    """
    surface_changed = sorted(p for p in app_changed if is_api_surface_file(p))
    if not surface_changed:
        return None

    docs_status = docs_and_postman_status(root)
    openapi_updated = any(p.startswith("docs/api/") for _, p in docs_status)
    postman_updated = any(p.startswith("postman/") for _, p in docs_status)
    if openapi_updated and postman_updated:
        return None

    missing = []
    if not openapi_updated:
        missing.append(
            "regenerate docs/api/openapi.json (`python -m app.cli export-openapi` from "
            "backend/, with the venv active)"
        )
    if not postman_updated:
        missing.append("update the Postman collection under postman/ to match")
    return (
        "How the API is interacted with (or what it outputs) changed in "
        + ", ".join(surface_changed)
        + " but this wasn't reflected in the API docs — "
        + " and ".join(missing)
        + "."
    )


def main() -> int:
    """Run the Stop-time enforcement gates and block if any fail.

    :returns: Process exit code (always 0; blocking is signaled via the
        ``decision``/``reason`` JSON printed to stdout).
    :rtype: int
    """
    payload = read_stdin_json()
    root = repo_root()

    try:
        status = backend_git_status(root)
    except GitStatusError as exc:
        print(json.dumps({
            "decision": "block",
            "reason": f"Could not verify backend/app changes: {exc}",
        }))
        return 0
    if not status:
        return 0

    failures = []

    app_changed = sorted(
        {p for _, p in status if p.startswith("backend/app/") and p.endswith(".py")}
    )
    tests_changed = any(p.startswith("backend/tests/") for _, p in status)
    if app_changed and not tests_changed:
        failures.append(
            "backend/app changed but backend/tests shows no corresponding change: "
            + ", ".join(app_changed)
            + " — add or update a test for this change."
        )

    transcript_path = payload.get("transcript_path")
    if transcript_path:
        review_failure = _review_gate_failure(transcript_path, root)
        if review_failure:
            failures.append(review_failure)

    try:
        api_docs_failure = _api_docs_gate_failure(root, app_changed)
    except GitStatusError as exc:
        failures.append(f"Could not verify docs/api + postman changes: {exc}")
    else:
        if api_docs_failure:
            failures.append(api_docs_failure)

    if app_changed:
        rel_paths = [str(Path(p).relative_to("backend")) for p in app_changed]
        ok, message = lint_files(rel_paths, root)
        if not ok:
            failures.append(message)
        else:
            pytest_result = run(
                ["uv", "run", "--directory", str(root / "backend"), "pytest", "-q"],
                root,
                timeout=170,
            )
            if pytest_result.returncode != 0:
                failures.append(
                    "pytest failed:\n\n" + pytest_result.stdout + pytest_result.stderr
                )

    if failures:
        print(json.dumps({"decision": "block", "reason": "\n\n".join(failures)}))
        return 0

    return 0


if __name__ == "__main__":
    sys.exit(main())
