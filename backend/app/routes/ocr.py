import base64
import time
from uuid import uuid4

import httpx
from fastapi import APIRouter, BackgroundTasks, File, Form, HTTPException, UploadFile

from app.config import get_settings
from app.schemas import (
    OcrScoreBase64Request,
    OcrScoreFileRequest,
    OcrScoreJobCreateResponse,
    OcrScoreJobStatusResponse,
    OcrScoreResponse,
)
from app.services.dashscope import AiConfigurationError, AiResponseError, run_ocr_score

router = APIRouter(prefix="/api", tags=["ocr"])
OCR_JOBS: dict[str, dict] = {}
JOB_TTL_SECONDS = 20 * 60


async def download_image(url: str) -> tuple[bytes, str]:
    async with httpx.AsyncClient(timeout=30) as client:
        response = await client.get(url)
        response.raise_for_status()
        return response.content, response.headers.get("content-type") or "image/png"


@router.post("/ocr-score", response_model=OcrScoreResponse)
async def ocr_score_endpoint(
    file: UploadFile = File(...),
    type: str = Form(default="my"),
) -> OcrScoreResponse:
    settings = get_settings()
    try:
        payload = await run_ocr_score(
            settings=settings,
            file_bytes=await file.read(),
            mime_type=file.content_type or "image/png",
            score_type=type,
        )
        return OcrScoreResponse.model_validate(payload)
    except AiConfigurationError as error:
        raise HTTPException(status_code=503, detail=str(error)) from error
    except (AiResponseError, ValueError) as error:
        raise HTTPException(status_code=502, detail=str(error)) from error


@router.post("/ocr-score-base64", response_model=OcrScoreResponse)
async def ocr_score_base64_endpoint(payload: OcrScoreBase64Request) -> OcrScoreResponse:
    settings = get_settings()
    try:
        image_base64 = payload.image_base64
        if "," in image_base64:
            image_base64 = image_base64.split(",", 1)[1]
        result = await run_ocr_score(
            settings=settings,
            file_bytes=base64.b64decode(image_base64),
            mime_type=payload.mime_type or "image/png",
            score_type=payload.type or "my",
        )
        return OcrScoreResponse.model_validate(result)
    except AiConfigurationError as error:
        raise HTTPException(status_code=503, detail=str(error)) from error
    except (AiResponseError, ValueError) as error:
        raise HTTPException(status_code=502, detail=str(error)) from error


@router.post("/ocr-score-file", response_model=OcrScoreResponse)
async def ocr_score_file_endpoint(payload: OcrScoreFileRequest) -> OcrScoreResponse:
    settings = get_settings()
    try:
        file_bytes, mime_type = await download_image(payload.file_url)
        result = await run_ocr_score(
            settings=settings,
            file_bytes=file_bytes,
            mime_type=mime_type,
            score_type=payload.type or "my",
        )
        return OcrScoreResponse.model_validate(result)
    except httpx.HTTPStatusError as error:
        raise HTTPException(status_code=502, detail=f"图片下载失败：{error.response.status_code}") from error
    except httpx.HTTPError as error:
        raise HTTPException(status_code=502, detail=f"图片下载失败：{error}") from error
    except AiConfigurationError as error:
        raise HTTPException(status_code=503, detail=str(error)) from error
    except (AiResponseError, ValueError) as error:
        raise HTTPException(status_code=502, detail=str(error)) from error


@router.post("/ocr-score-job", response_model=OcrScoreJobCreateResponse)
async def create_ocr_score_job(
    payload: OcrScoreFileRequest,
    background_tasks: BackgroundTasks,
) -> OcrScoreJobCreateResponse:
    cleanup_jobs()
    job_id = uuid4().hex
    OCR_JOBS[job_id] = {
        "status": "pending",
        "created_at": time.time(),
        "result": None,
        "error": "",
    }
    background_tasks.add_task(run_ocr_job, job_id, payload.file_url, payload.type or "my")
    return OcrScoreJobCreateResponse(job_id=job_id)


@router.get("/ocr-score-job/{job_id}", response_model=OcrScoreJobStatusResponse)
async def get_ocr_score_job(job_id: str) -> OcrScoreJobStatusResponse:
    cleanup_jobs()
    job = OCR_JOBS.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="OCR 任务不存在或已过期")
    return OcrScoreJobStatusResponse(
        job_id=job_id,
        status=job["status"],
        result=job["result"],
        error=job["error"],
    )


async def run_ocr_job(job_id: str, file_url: str, score_type: str) -> None:
    settings = get_settings()
    OCR_JOBS[job_id]["status"] = "running"
    try:
        file_bytes, mime_type = await download_image(file_url)
        result = await run_ocr_score(
            settings=settings,
            file_bytes=file_bytes,
            mime_type=mime_type,
            score_type=score_type,
        )
        OCR_JOBS[job_id]["result"] = OcrScoreResponse.model_validate(result)
        OCR_JOBS[job_id]["status"] = "done"
    except Exception as error:
        OCR_JOBS[job_id]["error"] = str(error)
        OCR_JOBS[job_id]["status"] = "failed"


def cleanup_jobs() -> None:
    now = time.time()
    expired = [job_id for job_id, job in OCR_JOBS.items() if now - job["created_at"] > JOB_TTL_SECONDS]
    for job_id in expired:
        OCR_JOBS.pop(job_id, None)
