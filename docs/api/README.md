# API documentation

`openapi.json` is a generated snapshot of the backend's OpenAPI 3 schema — the start of this
project's API documentation, covering everything implemented so far (`/health`, `/health/db`,
`/orders/upload`, and the `/auth/*`/`/users/me` endpoints from
[`docs/design/uac-design.md`](../design/uac-design.md) §1).

## Regenerating it

From `backend/`, with the venv active, after any route/schema change:

```bash
python -m app.cli export-openapi
```

Writes to `docs/api/openapi.json` (this file) by default; pass `--output <path>` to write
somewhere else instead. Commit the updated file alongside the code change that caused it, so a
diff review shows the API contract change directly, not just the implementation.

## Interactive docs

The same schema is also served live by the running app — no separate build step:

- **Swagger UI**: `http://localhost:8000/docs`
- **ReDoc**: `http://localhost:8000/redoc`
- **Raw schema**: `http://localhost:8000/openapi.json`

## Testing the API by hand

See [`postman/README.md`](../../postman/README.md) for a Postman collection covering every
endpoint in this schema, including a login flow that captures tokens automatically for the
requests that need them.
