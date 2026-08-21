from fastapi.testclient import TestClient


def test_upload_valid_csv_returns_parsed_rows(client: TestClient) -> None:
    """Verify a well-formed CSV upload is parsed and echoed back.

    :param client: The app's test client, injected via fixture.
    :type client: TestClient
    """
    csv_body = b"name,qty\nWidget,3\nGadget,1\n"

    response = client.post(
        "/orders/upload",
        files={"file": ("orders.csv", csv_body, "text/csv")},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["filename"] == "orders.csv"
    assert body["columns"] == ["name", "qty"]
    assert body["row_count"] == 2
    assert body["rows"] == [
        {"name": "Widget", "qty": "3"},
        {"name": "Gadget", "qty": "1"},
    ]


def test_upload_rejects_missing_filename(client: TestClient) -> None:
    """Verify an upload with an explicitly empty filename is rejected.

    httpx2's ``files=`` tuple encoding omits the ``filename`` attribute
    entirely when it's falsy, which FastAPI treats as "not a file" (422)
    before the handler ever runs. A raw multipart body with an explicit
    ``filename=""`` attribute is needed to reach the handler's own
    ``not file.filename`` check.

    :param client: The app's test client, injected via fixture.
    :type client: TestClient
    """
    body = (
        b"--BOUNDARY\r\n"
        b'Content-Disposition: form-data; name="file"; filename=""\r\n'
        b"Content-Type: text/csv\r\n\r\n"
        b"a,b\n1,2\n"
        b"\r\n--BOUNDARY--\r\n"
    )

    response = client.post(
        "/orders/upload",
        content=body,
        headers={"Content-Type": "multipart/form-data; boundary=BOUNDARY"},
    )

    assert response.status_code == 400
    assert response.json() == {"detail": "File must be a .csv"}


def test_upload_rejects_non_csv_extension(client: TestClient) -> None:
    """Verify an upload whose filename doesn't end in ``.csv`` is rejected.

    :param client: The app's test client, injected via fixture.
    :type client: TestClient
    """
    response = client.post(
        "/orders/upload",
        files={"file": ("orders.txt", b"a,b\n1,2\n", "text/plain")},
    )

    assert response.status_code == 400
    assert response.json() == {"detail": "File must be a .csv"}


def test_upload_rejects_invalid_utf8(client: TestClient) -> None:
    """Verify an upload with non-UTF-8 bytes is rejected.

    :param client: The app's test client, injected via fixture.
    :type client: TestClient
    """
    response = client.post(
        "/orders/upload",
        files={"file": ("orders.csv", b"\xff\xfe\x00\x01", "text/csv")},
    )

    assert response.status_code == 400
    assert response.json() == {"detail": "File is not valid UTF-8 text"}


def test_upload_rejects_empty_csv_no_header(client: TestClient) -> None:
    """Verify an upload with no header row is rejected.

    :param client: The app's test client, injected via fixture.
    :type client: TestClient
    """
    response = client.post(
        "/orders/upload",
        files={"file": ("orders.csv", b"", "text/csv")},
    )

    assert response.status_code == 400
    assert response.json() == {"detail": "CSV has no header row"}
