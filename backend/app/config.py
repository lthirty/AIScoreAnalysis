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
    ocr_model: str = "qwen-vl-max-latest"
    analyze_model: str = "qwen-max-latest"
    database_url: str | None = None

    @property
    def ai_enabled(self) -> bool:
        return bool(self.dashscope_api_key)


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
        ocr_model=getenv("OCR_MODEL", "qwen-vl-max-latest"),
        analyze_model=getenv("ANALYZE_MODEL", "qwen-max-latest"),
        database_url=getenv("DATABASE_URL"),
    )
