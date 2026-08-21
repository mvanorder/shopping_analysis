from sqlalchemy.exc import SQLAlchemyError


class FakeAsyncSession:
    """A minimal stand-in for ``AsyncSession`` used to drive ``/health/db``.

    :param raise_error: Whether ``execute`` should raise ``SQLAlchemyError``
        to simulate a database outage.
    :type raise_error: bool
    """

    def __init__(self, raise_error: bool = False) -> None:
        """Initialize the fake session's configured failure behavior.

        :param raise_error: Whether ``execute`` should raise
            ``SQLAlchemyError`` to simulate a database outage.
        :type raise_error: bool
        """
        self._raise_error = raise_error

    async def execute(self, *args: object, **kwargs: object) -> None:
        """Simulate running a query, optionally raising like a dead DB would.

        :param args: Ignored positional arguments (mirrors ``AsyncSession.execute``).
        :param kwargs: Ignored keyword arguments (mirrors ``AsyncSession.execute``).
        :raises SQLAlchemyError: If configured via ``raise_error=True``.
        :returns: ``None`` — callers in this codebase discard the result.
        :rtype: None
        """
        if self._raise_error:
            raise SQLAlchemyError("simulated database failure")
