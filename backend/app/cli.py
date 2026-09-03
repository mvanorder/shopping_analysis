"""One-off operational CLI commands, invoked as ``python -m app.cli <command>``."""

import argparse
import asyncio
import getpass
import json
import os
import sys
from pathlib import Path
from typing import NoReturn

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_sessionmaker
from app.main import app as fastapi_app
from app.models import User
from app.security import hash_password, upsert_password_identity

# Shared by both interactive prompts (email and password) so an aborted run
# reports itself identically whichever prompt the operator was on.
_ABORT_MESSAGE = "\nAborted; no superuser created."

# backend/app/cli.py -> backend/app -> backend -> repo root, so this lands at
# <repo root>/docs/api/openapi.json regardless of the caller's cwd (mirrors
# app/config.py's _ENV_FILE, computed the same way relative to __file__).
_REPO_ROOT = Path(__file__).resolve().parent.parent.parent
_DEFAULT_OPENAPI_OUTPUT = _REPO_ROOT / "docs" / "api" / "openapi.json"


def read_bootstrap_password() -> str | None:
    """Resolve the initial superuser password: env, then secret file, then a prompt.

    Checks ``SUPERUSER_PASSWORD`` first, then ``SUPERUSER_PASSWORD_FILE`` —
    mirroring the ``POSTGRES_PASSWORD``/``POSTGRES_PASSWORD_FILE`` convention
    in :class:`app.config.Settings` — never a value baked into code or a
    migration. The env var and file values are ``strip()``ped (so a trailing
    newline in a mounted secret isn't part of the password); a value typed at
    the prompt is used verbatim apart from the blank check. With neither env
    var set, an operator running this at a terminal is prompted for the
    password (twice, to confirm); a blank entry there, like leaving both env
    vars unset in automation, means the account is meant to log in via Google
    only (see ``docs/design/uac-design.md`` §2): no password identity is
    created, and the account is linked to a Google login on first use (§4).

    :raises ValueError: If ``SUPERUSER_PASSWORD`` or ``SUPERUSER_PASSWORD_FILE``
        is set but empty/whitespace-only, or if the file it names doesn't
        exist or can't be read.
    :raises SystemExit: If the interactive prompt is aborted (Ctrl-C / EOF).
    :returns: The plaintext password, or ``None`` for a Google-only account.
    :rtype: str | None
    """
    env_password = os.environ.get("SUPERUSER_PASSWORD")
    if env_password is not None:
        return _require_non_blank(env_password.strip(), "SUPERUSER_PASSWORD")

    password_file = os.environ.get("SUPERUSER_PASSWORD_FILE")
    if not password_file:
        # No env var and no terminal to prompt at (deploy automation, piped
        # stdin) is the documented Google-only bootstrap — §2.
        if not sys.stdin.isatty():
            return None
        return _prompt_bootstrap_password()

    # A missing file already raises FileNotFoundError (an OSError), so a
    # separate path.exists() pre-check would be redundant with the except
    # below and just adds a TOCTOU gap. UnicodeDecodeError also needs
    # catching here, not only OSError — a non-UTF-8 secret (e.g. mounted
    # from a Windows tool that wrote UTF-16) would otherwise leak a raw
    # codec error instead of naming which env var is misconfigured.
    try:
        contents = Path(password_file).read_text(encoding="utf-8").strip()
    except (OSError, UnicodeDecodeError) as exc:
        raise ValueError(f"Could not read SUPERUSER_PASSWORD_FILE: {password_file}") from exc
    return _require_non_blank(contents, "SUPERUSER_PASSWORD_FILE")


def _prompt_bootstrap_password() -> str | None:
    """Interactively prompt for the initial superuser password, confirming it twice.

    The caller only reaches this after finding neither ``SUPERUSER_PASSWORD``
    nor ``SUPERUSER_PASSWORD_FILE`` set and confirming stdin is a terminal. A
    blank (empty or whitespace-only) entry selects a Google-only account
    (``docs/design/uac-design.md`` §2/§4) — matching how ``_require_non_blank``
    treats a blank env var; a non-blank entry must be typed identically twice,
    re-prompting on a mismatch, so a typo can't become a superuser credential
    no one can reproduce.

    :raises SystemExit: If the prompt is aborted with Ctrl-C or EOF.
    :returns: The confirmed plaintext password, or ``None`` for a Google-only
        account.
    :rtype: str | None
    """
    try:
        while True:
            password = getpass.getpass(
                "Superuser password (leave blank for Google-only login): "
            )
            if not password.strip():
                return None
            if password == getpass.getpass("Confirm password: "):
                return password
            print("Passwords didn't match; try again.", file=sys.stderr)
    except (EOFError, KeyboardInterrupt):
        raise SystemExit(_ABORT_MESSAGE) from None


def _require_non_blank(value: str, source: str) -> str:
    """Return ``value`` unchanged, or raise if it's empty/whitespace-only.

    Guards both ``SUPERUSER_PASSWORD`` and ``SUPERUSER_PASSWORD_FILE`` against
    a blank value quietly becoming a real, trivially-guessable superuser
    credential instead of a clear error.

    :param value: The already-stripped candidate password.
    :type value: str
    :param source: Which env var ``value`` came from, for the error message.
    :type source: str
    :raises ValueError: If ``value`` is empty.
    :returns: ``value`` unchanged.
    :rtype: str
    """
    if not value:
        raise ValueError(f"{source} is set but empty/whitespace-only")
    return value


async def ensure_superuser(
    session: AsyncSession, email: str, password_hash: str | None
) -> tuple[User, bool]:
    """Create or promote a ``users`` row to superuser, idempotently.

    Looks up ``email`` (case-insensitive, via the ``citext`` column, §5). If
    no account exists, one is created with ``is_superuser=True`` and
    ``email_verified=True`` — an operator running this script is trusted to
    have verified the address out of band. If the account already exists, it
    is promoted to superuser in place rather than duplicated, so this is safe
    to run more than once for the same email (e.g. on every deploy) —
    **sequentially**. Two concurrent invocations for the same not-yet-existing
    email will both see no row and both try to insert one, and the loser will
    raise on the ``users.email`` unique constraint rather than being promoted
    cleanly; deploy tooling should not run this command in parallel for the
    same email. When ``password_hash`` is given, a ``password``
    ``auth_identities`` row is created or updated to match; otherwise any
    existing password identity is left untouched and no new one is added.

    :param session: The database session to operate on.
    :type session: AsyncSession
    :param email: The superuser's email address.
    :type email: str
    :param password_hash: An argon2 hash from :func:`hash_password`, or
        ``None`` to leave the account without a password identity.
    :type password_hash: str | None
    :returns: The superuser's ``User`` row and whether it was newly created.
    :rtype: tuple[User, bool]
    """
    result = await session.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()
    created = user is None

    if user is None:
        user = User(email=email, is_superuser=True, email_verified=True)
        session.add(user)
        await session.flush()
    else:
        user.is_superuser = True

    if password_hash is not None:
        await upsert_password_identity(session, user, password_hash)

    await session.commit()
    return user, created


async def _run_create_superuser(
    session: AsyncSession, email: str, password_hash: str | None
) -> None:
    """Upsert the superuser and report what happened.

    Split out from :func:`_create_superuser` so every step except acquiring a
    real database connection is exercised in tests. Credential resolution
    stays in the caller, ahead of the DB session.

    :param session: The database session to operate on.
    :type session: AsyncSession
    :param email: The superuser's email address.
    :type email: str
    :param password_hash: An argon2 hash from :func:`hash_password`, or
        ``None`` for a Google-only account.
    :type password_hash: str | None
    """
    user, created = await ensure_superuser(session, email, password_hash)
    verb = "Created" if created else "Promoted"
    if password_hash is not None:
        auth_note = "with a password identity"
    elif created:
        auth_note = "for Google-only login"
    else:
        # Promote path — ensure_superuser leaves any existing password
        # identity in place, so don't claim the account is Google-only.
        auth_note = "leaving its auth identities unchanged"
    print(f"{verb} superuser {user.email} [{user.id}] {auth_note}.")


async def _create_superuser(email: str) -> None:  # pragma: no cover
    """Run the ``create-superuser`` command against the real database.

    This wrapper needs a real Postgres, so the whole function is coverage-
    excluded. Its pieces are tested directly: credential resolution via
    :func:`read_bootstrap_password` / :func:`hash_password`, and the upsert
    and reporting via :func:`_run_create_superuser`. It resolves the password
    before opening the session so a prompt or a config error never runs with
    one held.

    :param email: The superuser's email address.
    :type email: str
    :raises ValueError: If a configured password env var / secret file is
        blank or unreadable.
    :raises SystemExit: If the interactive password prompt is aborted.
    """
    password = read_bootstrap_password()
    password_hash = hash_password(password) if password is not None else None

    async with get_sessionmaker()() as session:
        await _run_create_superuser(session, email, password_hash)


def _export_openapi(output_path: Path) -> bool:
    """Write the app's current OpenAPI schema to a JSON file.

    Purely a schema introspection of the FastAPI app object — no database
    connection or running server required, so (unlike ``create-superuser``)
    this is fully exercised in tests. Overwrites ``output_path`` unconditionally
    if it already exists — that's the point for the tracked default path
    (regenerating a committed schema), but the caller reports whether it
    happened so a mistyped ``--output`` pointed at an unrelated existing
    file doesn't silently clobber it without any signal.

    :param output_path: Where to write the schema. Parent directories are
        created if they don't already exist.
    :type output_path: Path
    :returns: Whether a file already existed at ``output_path`` before this
        call (i.e. whether it was overwritten rather than newly created).
    :rtype: bool
    """
    existed = output_path.exists()
    output_path.parent.mkdir(parents=True, exist_ok=True)
    schema = fastapi_app.openapi()
    output_path.write_text(json.dumps(schema, indent=2) + "\n", encoding="utf-8")
    return existed


def _email_arg(value: str) -> str:
    """Validate an ``--email`` value as a plausible email address.

    Deliberately not a full RFC 5322 check — just enough to reject an obvious
    typo (a missing ``@``, stray whitespace) before it becomes a permanent
    row in ``users`` that no one can log into.

    :param value: The raw ``--email`` argument (or prompt entry).
    :type value: str
    :raises argparse.ArgumentTypeError: If ``value`` doesn't look like an
        email address.
    :returns: ``value`` unchanged, once validated.
    :rtype: str
    """
    local_part, _, domain_part = value.partition("@")
    looks_valid = (
        not any(ch.isspace() for ch in value)
        and value.count("@") == 1
        and local_part
        and "." in domain_part
        and not domain_part.startswith(".")
        and not domain_part.endswith(".")
    )
    if not looks_valid:
        raise argparse.ArgumentTypeError(f"not a valid email address: {value!r}")
    return value


def _prompt_email() -> str:
    """Interactively prompt for the superuser's email, re-prompting until it's plausible.

    Reached only when ``--email`` was omitted and stdin is a terminal. The
    entered value goes through the same :func:`_email_arg` check the flag
    uses, so a typo is caught here rather than becoming a permanent
    un-loggable-into ``users`` row.

    :raises SystemExit: If the prompt is aborted with Ctrl-C or EOF.
    :returns: A validated email address.
    :rtype: str
    """
    try:
        while True:
            try:
                return _email_arg(input("Superuser email: ").strip())
            except argparse.ArgumentTypeError as exc:
                print(exc, file=sys.stderr)
    except (EOFError, KeyboardInterrupt):
        raise SystemExit(_ABORT_MESSAGE) from None


class _HelpfulParser(argparse.ArgumentParser):
    """An ``ArgumentParser`` that prints full help, not just usage, on error.

    argparse's default is a one-line usage string plus the error. When a
    required argument is missing (or ``--email`` is omitted in a context that
    can't prompt for it), the operator is better served by the full option
    list, so ``error`` prints ``--help`` output first. Subparsers created via
    :meth:`add_subparsers` inherit this class.
    """

    def error(self, message: str) -> NoReturn:
        """Print the full help text, then exit with a usage error.

        :param message: The error message argparse produced.
        :type message: str
        :raises SystemExit: Always, with exit code 2.
        """
        self.print_help(sys.stderr)
        self.exit(2, f"\n{self.prog}: error: {message}\n")


def build_arg_parser() -> argparse.ArgumentParser:
    """Build the argument parser for ``python -m app.cli``.

    :returns: A parser with the ``create-superuser``/``export-openapi``
        subcommands registered.
    :rtype: argparse.ArgumentParser
    """
    parser = _HelpfulParser(prog="python -m app.cli")
    subparsers = parser.add_subparsers(dest="command", required=True)

    create_superuser = subparsers.add_parser(
        "create-superuser",
        help="Create a users row with is_superuser=true, or promote an existing one.",
    )
    create_superuser.add_argument(
        "--email",
        type=_email_arg,
        help="The superuser's email address. Prompted for interactively if omitted.",
    )

    export_openapi = subparsers.add_parser(
        "export-openapi",
        help="Write the app's current OpenAPI schema to a JSON file.",
    )
    export_openapi.add_argument(
        "--output",
        type=Path,
        default=_DEFAULT_OPENAPI_OUTPUT,
        help="Output path (default: docs/api/openapi.json, relative to the repo root).",
    )
    return parser


def main(argv: list[str] | None = None) -> int:
    """Entry point for ``python -m app.cli``.

    :param argv: Arguments to parse; defaults to ``sys.argv[1:]``.
    :type argv: list[str] | None
    :raises SystemExit: On a usage error, or if an interactive prompt is
        aborted.
    :returns: The process exit code.
    :rtype: int
    """
    parser = build_arg_parser()
    args = parser.parse_args(argv)

    if args.command == "create-superuser":
        email = args.email
        if email is None:
            if not sys.stdin.isatty():
                parser.error("create-superuser: --email is required (no terminal to prompt at)")
            email = _prompt_email()
        asyncio.run(_create_superuser(email))
        return 0

    if args.command == "export-openapi":
        overwrote = _export_openapi(args.output)
        verb = "Overwrote" if overwrote else "Wrote"
        print(f"{verb} OpenAPI schema at {args.output}")
        return 0

    # Unreachable while every registered subcommand is handled above, but a
    # missing dispatch branch for a future command should fail loudly here,
    # not exit 0 having done nothing.
    parser.error(f"unhandled command: {args.command}")  # pragma: no cover


if __name__ == "__main__":  # pragma: no cover
    sys.exit(main())
