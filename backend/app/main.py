from fastapi import FastAPI

from app.config import get_settings
from app.routes.analysis import router as analysis_router
from app.routes.auth import router as auth_router
from app.routes.exports import router as exports_router
from app.routes.ocr import router as ocr_router

settings = get_settings()

app = FastAPI(
    title="AIScoreAnalysis API",
    version="0.1.0",
    description="FastAPI backend for the AI score analysis WeChat mini program.",
)


@app.get("/api/health")
def health() -> dict[str, str | bool]:
    return {
        "status": "ok",
        "service": "ai-score-api",
        "env": settings.env,
        "ai_enabled": settings.ai_enabled,
        "wx_enabled": settings.wx_enabled,
    }


app.include_router(analysis_router)
app.include_router(auth_router)
app.include_router(exports_router)
app.include_router(ocr_router)
