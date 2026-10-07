# ============================================================================
# Legacy entrypoint — prefer `python -m backend.server` (port 8000)
# ============================================================================

from .server import app  # noqa: F401

if __name__ == "__main__":
    import uvicorn

    uvicorn.run("backend.server:app", host="127.0.0.1", port=8000, reload=False)
