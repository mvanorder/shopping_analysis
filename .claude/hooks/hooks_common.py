"""Shared helpers for backend/app-scoped Claude Code hooks."""

import json
import subprocess
import sys
from pathlib import Path

EDIT_TOOL_NAMES = {"Edit", "Write", "MultiEdit"}
REVIEW_TOOL_NAMES = {"Agent", "Task"}
CODE_REVIEWER_SUBAGENTS = {"backend-code-reviewer", "frontend-code-reviewer"}


def repo_root() -> Path:
    """Return the repo root, derived from this file's own location.

    :returns: Absolute path to the repository root.
    :rtype: Path
    """
    return Path(__file__).resolve().parents[2]


def read_stdin_json() -> dict:
    """Parse the hook's stdin payload as JSON.

    :returns: The decoded payload, or an empty dict if stdin is empty.
    :rtype: dict
    """
    raw = sys.stdin.read()
    return json.loads(raw) if raw.strip() else {}


def extract_file_paths(tool_input: dict) -> list[Path]:
    """Return the absolute file path(s) an Edit/Write/MultiEdit call touched.

    :param tool_input: The ``tool_input`` field of a PostToolUse payload.
    :type tool_input: dict
    :returns: Absolute paths referenced by the tool call.
    :rtype: list[Path]
    """
    raw = tool_input.get("file_path")
    if raw is None:
        return []
    values = raw if isinstance(raw, list) else [raw]
    return [Path(v) for v in values]


def is_in_scope_app_file(path: Path, root: Path) -> bool:
    """Return True if ``path`` is an in-scope backend/app Python file.

    :param path: Candidate file path.
    :type path: Path
    :param root: Repository root.
    :type root: Path
    :returns: Whether the file is a non-cache ``.py`` file under
        ``backend/app``.
    :rtype: bool
    """
    app_dir = (root / "backend" / "app").resolve()
    try:
        resolved = path.resolve()
    except OSError:
        return False
    if resolved.suffix != ".py":
        return False
    if not resolved.is_relative_to(app_dir):
        return False
    excluded = {"__pycache__", ".venv"}
    return not excluded & set(resolved.relative_to(app_dir).parts)


# Files that define the API's contract: which endpoints exist, what they
# accept/return, and what auth they require. Deliberately excludes
# app/security.py/app/config.py — those are implementation details (hashing
# algorithm, signing keys) that don't change the interaction/output surface
# on their own; a contract change there would show up here too because it'd
# require touching a router or schemas.py to actually take effect.
_API_SURFACE_FILES = {
    "backend/app/main.py",
    "backend/app/schemas.py",
    "backend/app/dependencies.py",
}
_API_SURFACE_DIR_PREFIXES = ("backend/app/routers/",)


def is_api_surface_file(relpath: str) -> bool:
    """Return True if ``relpath`` defines the API's request/response contract.

    :param relpath: A repo-relative path, as returned by
        :func:`backend_git_status` (POSIX-style separators).
    :type relpath: str
    :returns: Whether a change to this file can change how the API is
        interacted with, or what it outputs.
    :rtype: bool
    """
    if relpath in _API_SURFACE_FILES:
        return True
    return any(relpath.startswith(prefix) for prefix in _API_SURFACE_DIR_PREFIXES)


class GitStatusError(RuntimeError):
    """Raised when ``git status`` itself fails, so callers fail closed."""


def run(cmd: list[str], cwd: Path, timeout: int = 120) -> subprocess.CompletedProcess:
    """Run a subprocess, capturing output; never raises.

    Converts a timeout or a missing/unrunnable executable into a
    ``CompletedProcess`` with a nonzero return code instead of letting
    ``subprocess.TimeoutExpired``/``OSError`` propagate, so callers can
    always treat the result uniformly as pass/fail.

    :param cmd: Command and arguments to execute.
    :type cmd: list[str]
    :param cwd: Working directory for the subprocess.
    :type cwd: Path
    :param timeout: Maximum seconds to allow the command to run.
    :type timeout: int
    :returns: The completed process, regardless of exit code.
    :rtype: subprocess.CompletedProcess
    """
    try:
        return subprocess.run(
            cmd, cwd=str(cwd), capture_output=True, text=True,
            encoding="utf-8", errors="replace", timeout=timeout, check=False,
        )
    except subprocess.TimeoutExpired as exc:
        stdout = exc.stdout if isinstance(exc.stdout, str) else ""
        return subprocess.CompletedProcess(
            cmd, returncode=124, stdout=stdout, stderr=f"timed out after {timeout}s"
        )
    except OSError as exc:
        return subprocess.CompletedProcess(cmd, returncode=127, stdout="", stderr=str(exc))


def lint_files(
    rel_paths: list[str], root: Path, ruff_timeout: int = 20, pylint_timeout: int = 45,
) -> tuple[bool, str]:
    """Run ruff then pylint (fail-fast order) against backend-relative paths.

    :param rel_paths: Paths relative to ``backend/`` to lint.
    :type rel_paths: list[str]
    :param root: Repository root.
    :type root: Path
    :param ruff_timeout: Seconds allowed for the ruff invocation.
    :type ruff_timeout: int
    :param pylint_timeout: Seconds allowed for the pylint invocation.
    :type pylint_timeout: int
    :returns: ``(ok, message)`` — message is empty when ok.
    :rtype: tuple[bool, str]
    """
    backend = root / "backend"
    ruff = run(
        ["uv", "run", "--directory", str(backend), "ruff", "check", *rel_paths],
        root, timeout=ruff_timeout,
    )
    if ruff.returncode != 0:
        return False, "ruff check failed:\n\n" + ruff.stdout + ruff.stderr
    pylint = run(
        ["uv", "run", "--directory", str(backend), "pylint", *rel_paths],
        root, timeout=pylint_timeout,
    )
    if pylint.returncode != 0:
        return False, "pylint failed:\n\n" + pylint.stdout + pylint.stderr
    return True, ""


def git_status_for_paths(root: Path, paths: list[str]) -> list[tuple[str, str]]:
    """Return (status, relpath) pairs for changes under the given repo-relative paths.

    :param root: Repository root.
    :type root: Path
    :param paths: Repo-relative pathspecs to scope ``git status`` to (e.g.
        ``["backend/app", "backend/tests"]``).
    :type paths: list[str]
    :raises GitStatusError: If the ``git status`` invocation itself fails
        (as opposed to succeeding with an empty result), so a broken git
        invocation can never be mistaken for "nothing changed."
    :returns: Parsed ``git status --porcelain`` entries. Rename/copy entries
        (``"old/path -> new/path"``) are collapsed to their destination path.
    :rtype: list[tuple[str, str]]
    """
    result = run(
        ["git", "-C", str(root), "status", "--porcelain=v1", "--untracked-files=all", "--", *paths],
        root,
    )
    if result.returncode != 0:
        raise GitStatusError(f"git status failed:\n\n{result.stdout}{result.stderr}")
    pairs = []
    for line in result.stdout.splitlines():
        if len(line) <= 3:
            continue
        status, rest = line[:2].strip(), line[3:]
        rest = rest.split(" -> ", 1)[-1]
        pairs.append((status, rest))
    return pairs


def backend_git_status(root: Path) -> list[tuple[str, str]]:
    """Return (status, relpath) pairs for backend/app and backend/tests changes.

    :param root: Repository root.
    :type root: Path
    :raises GitStatusError: If the ``git status`` invocation itself fails.
    :returns: Parsed ``git status --porcelain`` entries scoped to
        ``backend/app`` and ``backend/tests``.
    :rtype: list[tuple[str, str]]
    """
    return git_status_for_paths(root, ["backend/app", "backend/tests"])


def docs_and_postman_status(root: Path) -> list[tuple[str, str]]:
    """Return (status, relpath) pairs for docs/api and postman changes.

    :param root: Repository root.
    :type root: Path
    :raises GitStatusError: If the ``git status`` invocation itself fails.
    :returns: Parsed ``git status --porcelain`` entries scoped to
        ``docs/api`` (the generated OpenAPI schema, see
        ``docs/api/README.md``) and ``postman`` (the Postman collection).
    :rtype: list[tuple[str, str]]
    """
    return git_status_for_paths(root, ["docs/api", "postman"])
