import pytest

from app.main import run


def test_run_starts_uvicorn_with_autoreload(monkeypatch: pytest.MonkeyPatch) -> None:
    """Verify ``run`` starts uvicorn against the app with autoreload enabled.

    :param monkeypatch: Pytest's monkeypatch fixture.
    :type monkeypatch: pytest.MonkeyPatch
    """
    calls = []

    def fake_run(*args: object, **kwargs: object) -> None:
        """Record the arguments ``run`` invoked ``uvicorn.run`` with.

        :param args: Positional arguments passed to ``uvicorn.run``.
        :param kwargs: Keyword arguments passed to ``uvicorn.run``.
        :returns: ``None``.
        :rtype: None
        """
        calls.append((args, kwargs))

    monkeypatch.setattr("app.main.uvicorn.run", fake_run)

    run()

    assert calls == [(("app.main:app",), {"reload": True})]
