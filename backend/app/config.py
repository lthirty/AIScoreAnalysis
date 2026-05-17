from functools import lru_cache
from os import getenv

from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv()


class Settings(BaseModel):
    env: str = "development"
    port: int = 8080
    dashscope_api_key: str | None = None
    dashscope_endpoint: str = "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions"
    ocr_model: str = "qwen3.6-flash"
    analyze_model: str = "qwen3.6-flash"
    database_url: str | None = None
    wx_app_id: str | None = None
    wx_app_secret: str | None = None

    @property
    def ai_enabled(self) -> bool:
        return bool(self.dashscope_api_key)

    @property
    def wx_enabled(self) -> bool:
        return bool(self.wx_app_id and self.wx_app_secret)


def build_runtime_settings(
    settings: Settings,
    *,
    api_key: str | None = None,
    endpoint: str | None = None,
    ocr_model: str | None = None,
    analyze_model: str | None = None,
) -> Settings:
    updates: dict[str, str] = {}
    if api_key:
        updates["dashscope_api_key"] = api_key
    if endpoint:
        updates["dashscope_endpoint"] = endpoint
    if ocr_model:
        updates["ocr_model"] = ocr_model
    if analyze_model:
        updates["analyze_model"] = analyze_model
    if not updates:
        return settings
    return settings.model_copy(update=updates)


@lru_cache
def get_settings() -> Settings:
    return Settings(
        env=getenv("ENV", "development"),
        port=int(getenv("PORT", "8080")),
        dashscope_api_key=getenv("DASHSCOPE_API_KEY"),
        dashscope_endpoint=getenv(
            "DASHSCOPE_ENDPOINT",
            "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions",
        ),
        ocr_model=getenv("OCR_MODEL", "qwen3.6-flash"),
        analyze_model=getenv("ANALYZE_MODEL", "qwen3.6-flash"),
        database_url=getenv("DATABASE_URL"),
        wx_app_id=getenv("WX_APP_ID"),
        wx_app_secret=getenv("WX_APP_SECRET"),
    )
