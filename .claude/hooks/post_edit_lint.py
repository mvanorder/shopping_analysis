"""PostToolUse hook: lint backend/app files touched by Edit/Write/MultiEdit.

Registered in .claude/settings.json under PostToolUse with matcher
"Edit|Write|MultiEdit". Blocks (exit 2, stderr fed back to Claude) if ruff
or pylint reports any finding on the touched files.
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from hooks_common import (  # noqa: E402  pylint: disable=wrong-import-position
    EDIT_TOOL_NAMES,
    extract_file_paths,
    is_in_scope_app_file,
    lint_files,
    read_stdin_json,
    repo_root,
)


def main() -> int:
    """Lint any in-scope backend/app files touched by this tool call.

    :returns: Process exit code (0 = allow, 2 = block with feedback).
    :rtype: int
    """
    payload = read_stdin_json()
    if payload.get("tool_name") not in EDIT_TOOL_NAMES:
        return 0

    root = repo_root()
    touched = extract_file_paths(payload.get("tool_input", {}))
    in_scope = [p for p in touched if is_in_scope_app_file(p, root)]
    if not in_scope:
        return 0

    rel_paths = [str(p.resolve().relative_to(root / "backend")) for p in in_scope]
    ok, message = lint_files(rel_paths, root)
    if not ok:
        print(message, file=sys.stderr)
        return 2
    return 0


if __name__ == "__main__":
    sys.exit(main())
