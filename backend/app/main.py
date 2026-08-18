import csv
import io
import logging

from fastapi import Depends, FastAPI, HTTPException, UploadFile
from sqlalchemy import text as sa_text
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import SQLAlchemyError

from app.db import get_db


logger = logging.getLogger(__name__)

app = FastAPI(title="Shopping Analysis")


@app.get("/health")
def health() -> dict[str, str]:
    """Report basic application liveness.

    :returns: A static ``{"status": "ok"}`` payload.
    :rtype: dict[str, str]
    """
    return {"status": "ok"}


@app.get("/health/db")
async def health_db(db: AsyncSession = Depends(get_db)) -> dict[str, str]:
    """Check database connectivity by running a trivial query.

    :param db: The database session, injected via dependency.
    :type db: AsyncSession
    :raises HTTPException: If the database is unreachable.
    :returns: A static ``{"status": "ok"}`` payload if the query succeeds.
    :rtype: dict[str, str]
    """
    try:
        await db.execute(sa_text("SELECT 1"))
    except SQLAlchemyError:
        logger.exception("Database check failed")
        raise HTTPException(status_code=503, detail="Database unavailable")
    return {"status": "ok"}


@app.post("/orders/upload")
async def upload_orders_csv(file: UploadFile) -> dict:
    """Parse an uploaded Walmart order-history CSV and echo its rows.

    :param file: The uploaded CSV file.
    :type file: UploadFile
    :raises HTTPException: If the file is missing, not a ``.csv``, not
        valid UTF-8, or has no header row.
    :returns: The filename, column names, row count, and parsed rows.
    :rtype: dict
    """
    # Check that the file uploaded is a CSV
    if not file.filename or not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="File must be a .csv")

    # Read the uploaded file
    raw = await file.read()
    try:
        text = raw.decode("utf-8-sig")
    except UnicodeDecodeError as exc:
        raise HTTPException(status_code=400, detail="File is not valid UTF-8 text") from exc

    reader = csv.DictReader(io.StringIO(text))
    if not reader.fieldnames:
        raise HTTPException(status_code=400, detail="CSV has no header row")

    rows = list(reader)
    return {
        "filename": file.filename,
        "columns": reader.fieldnames,
        "row_count": len(rows),
        "rows": rows,
    }
