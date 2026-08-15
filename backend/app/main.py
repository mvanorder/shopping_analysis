from fastapi import FastAPI

app = FastAPI(title="Shopping Analysis")


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
