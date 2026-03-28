"""
HTTP API for Mind Mirror (Convex actions, remote hosts).

Environment:
  MIND_MIRROR_SERVICE_SECRET — required; must match Convex MIND_MIRROR_SECRET (Bearer token).
  LLM_PROVIDER, API keys — same as pipeline / main.py.
"""

from __future__ import annotations

import os

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from pipeline import run_mind_mirror_analysis

load_dotenv()

app = FastAPI(title="Mind Mirror API", version="1.0.0")


class AnalyzeBody(BaseModel):
    """Request body for POST /analyze."""

    notes: str = Field(..., min_length=1, description="Markdown knowledge base")
    request: str = Field(..., min_length=1, description="User question or goal")


def _require_bearer(request: Request) -> None:
    secret = os.getenv("MIND_MIRROR_SERVICE_SECRET", "").strip()
    if not secret:
        raise HTTPException(
            status_code=500,
            detail="Server misconfigured: MIND_MIRROR_SERVICE_SECRET is not set.",
        )
    auth = request.headers.get("authorization", "")
    prefix = "Bearer "
    if not auth.startswith(prefix) or auth[len(prefix) :].strip() != secret:
        raise HTTPException(status_code=401, detail="Unauthorized")


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/analyze")
async def analyze(request: Request, body: AnalyzeBody) -> JSONResponse:
    _require_bearer(request)
    try:
        result = await run_mind_mirror_analysis(
            body.notes,
            body.request,
            stream_to_console=False,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    return JSONResponse(content=result)
