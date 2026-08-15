import csv
import io

from fastapi import FastAPI, HTTPException, UploadFile

app = FastAPI(title="Shopping Analysis")


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/orders/upload")
async def upload_orders_csv(file: UploadFile) -> dict:
    """Upload Walmart orders history CSV
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
