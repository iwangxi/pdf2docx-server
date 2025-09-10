"""
Local dev entrypoint for the PDF2DOCX Web API.

Usage:
  python3 main.py

Environment variables (optional):
  HOST   - default "0.0.0.0"
  PORT   - default "3000"
  RELOAD - "1"/"true" enables uvicorn reload (default on)
"""

import os


def _strtobool(val: str) -> bool:
    return val.lower() in {"1", "true", "yes", "on"}


if __name__ == "__main__":
    import uvicorn

    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", "3000"))
    reload_env = os.getenv("RELOAD", "1")
    reload = _strtobool(reload_env)

    # Use module path so reload works from project root
    uvicorn.run("api.main:app", host=host, port=port, reload=reload)

