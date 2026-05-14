from uuid import uuid4
import time

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.config import get_settings

router = APIRouter(prefix="/api", tags=["auth"])
AUTH_SESSIONS: dict[str, dict] = {}
SESSION_TTL_SECONDS = 30 * 60


class WeChatAuthRequest(BaseModel):
    code: str


class WeChatAuthResponse(BaseModel):
    session_key: str
    openid: str
    anonymous: bool = False


class AnonymousSessionResponse(BaseModel):
    session_key: str
    anonymous: bool = True


def cleanup_sessions() -> None:
    now = time.time()
    expired = [sid for sid, sess in AUTH_SESSIONS.items() if now - sess["created_at"] > SESSION_TTL_SECONDS]
    for sid in expired:
        AUTH_SESSIONS.pop(sid, None)


@router.post("/auth/wechat-login", response_model=WeChatAuthResponse)
async def wechat_login(payload: WeChatAuthRequest) -> WeChatAuthResponse:
    settings = get_settings()
    if not settings.wx_app_id or not settings.wx_app_secret:
        raise HTTPException(status_code=503, detail="微信登录未配置")

    import httpx
    async with httpx.AsyncClient(timeout=10) as client:
        response = await client.get(
            "https://api.weixin.qq.com/sns/jscode2session",
            params={
                "appid": settings.wx_app_id,
                "secret": settings.wx_app_secret,
                "js_code": payload.code,
                "grant_type": "authorization_code",
            },
        )

    if response.status_code != 200:
        raise HTTPException(status_code=502, detail="微信登录请求失败")

    data = response.json()
    if "errcode" in data and data["errcode"] != 0:
        raise HTTPException(status_code=400, detail=data.get("errmsg", "微信登录失败"))

    openid = data.get("openid")
    if not openid:
        raise HTTPException(status_code=400, detail="未获取到 openid")

    session_key = uuid4().hex
    AUTH_SESSIONS[session_key] = {
        "openid": openid,
        "created_at": time.time(),
    }
    return WeChatAuthResponse(session_key=session_key, openid=openid)


@router.post("/auth/anonymous-login", response_model=AnonymousSessionResponse)
async def anonymous_login() -> AnonymousSessionResponse:
    session_key = uuid4().hex
    AUTH_SESSIONS[session_key] = {
        "openid": None,
        "created_at": time.time(),
    }
    return AnonymousSessionResponse(session_key=session_key)


@router.get("/auth/session/{session_key}")
async def get_session(session_key: str) -> dict:
    cleanup_sessions()
    session = AUTH_SESSIONS.get(session_key)
    if not session:
        raise HTTPException(status_code=404, detail="会话不存在或已过期")
    return {"openid": session.get("openid"), "anonymous": session.get("openid") is None}