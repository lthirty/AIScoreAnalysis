import asyncio
import logging
import time
from uuid import uuid4

from fastapi import APIRouter, Header, HTTPException

from app.config import build_runtime_settings, get_settings
from app.schemas import (
    ParseScoreTextRequest,
    EnhancedReportJobCreateResponse,
    EnhancedReportJobStatusResponse,
    EnhancedScoreRequest,
    ReportJobCreateResponse,
    ReportJobStatusResponse,
    ScoreInput,
    ScoreReport,
)
from app.services.dashscope import AiResponseError, run_ai_report, run_enhanced_report
from app.services.report_generator import build_mock_enhanced_report, build_mock_report
from app.services.score_parser import parse_score_text

router = APIRouter(prefix="/api", tags=["analysis"])
logger = logging.getLogger(__name__)
REPORT_JOBS: dict[str, dict] = {}
ENHANCED_REPORT_JOBS: dict[str, dict] = {}
RUNNING_TASKS: dict[str, asyncio.Task] = {}
JOB_TTL_SECONDS = 20 * 60


def resolve_runtime_settings(
    *,
    api_key: str | None,
    endpoint: str | None,
    ocr_model: str | None,
    analyze_model: str | None,
):
    return build_runtime_settings(
        get_settings(),
        api_key=api_key,
        endpoint=endpoint,
        ocr_model=ocr_model,
        analyze_model=analyze_model,
    )


@router.post("/parse-score-text", response_model=ScoreInput)
def parse_score_text_endpoint(payload: ParseScoreTextRequest) -> ScoreInput:
    return parse_score_text(payload.text, payload.student, payload.exam)


@router.post("/analyze-score", response_model=ScoreReport)
async def analyze_score_endpoint(
    payload: ScoreInput,
    x_ai_api_key: str | None = Header(default=None),
    x_ai_endpoint: str | None = Header(default=None),
    x_ai_ocr_model: str | None = Header(default=None),
    x_ai_analyze_model: str | None = Header(default=None),
) -> ScoreReport:
    try:
        settings = resolve_runtime_settings(
            api_key=x_ai_api_key,
            endpoint=x_ai_endpoint,
            ocr_model=x_ai_ocr_model,
            analyze_model=x_ai_analyze_model,
        )
        return await run_ai_report(settings=settings, score_input=payload)
    except (AiResponseError, ValueError) as error:
        raise HTTPException(status_code=502, detail=str(error)) from error


@router.post("/analyze-score-job", response_model=ReportJobCreateResponse)
async def create_analyze_score_job(
    payload: ScoreInput,
    x_ai_api_key: str | None = Header(default=None),
    x_ai_endpoint: str | None = Header(default=None),
    x_ai_ocr_model: str | None = Header(default=None),
    x_ai_analyze_model: str | None = Header(default=None),
) -> ReportJobCreateResponse:
    cleanup_jobs()
    job_id = uuid4().hex
    REPORT_JOBS[job_id] = {
        "status": "pending",
        "created_at": time.time(),
        "result": None,
        "error": "",
    }
    settings = resolve_runtime_settings(
        api_key=x_ai_api_key,
        endpoint=x_ai_endpoint,
        ocr_model=x_ai_ocr_model,
        analyze_model=x_ai_analyze_model,
    )
    task = asyncio.create_task(run_report_job(job_id, payload, settings))
    RUNNING_TASKS[job_id] = task
    task.add_done_callback(lambda _: RUNNING_TASKS.pop(job_id, None))
    return ReportJobCreateResponse(job_id=job_id)


@router.get("/analyze-score-job/{job_id}", response_model=ReportJobStatusResponse)
async def get_analyze_score_job(job_id: str) -> ReportJobStatusResponse:
    cleanup_jobs()
    job = REPORT_JOBS.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="报告任务不存在或已过期")
    return ReportJobStatusResponse(
        job_id=job_id,
        status=job["status"],
        result=job["result"],
        error=job["error"],
    )


@router.post("/enhance-score-job", response_model=EnhancedReportJobCreateResponse)
async def create_enhance_score_job(
    payload: EnhancedScoreRequest,
    x_ai_api_key: str | None = Header(default=None),
    x_ai_endpoint: str | None = Header(default=None),
    x_ai_ocr_model: str | None = Header(default=None),
    x_ai_analyze_model: str | None = Header(default=None),
) -> EnhancedReportJobCreateResponse:
    cleanup_jobs()
    job_id = uuid4().hex
    ENHANCED_REPORT_JOBS[job_id] = {
        "status": "pending",
        "created_at": time.time(),
        "result": None,
        "error": "",
    }
    settings = resolve_runtime_settings(
        api_key=x_ai_api_key,
        endpoint=x_ai_endpoint,
        ocr_model=x_ai_ocr_model,
        analyze_model=x_ai_analyze_model,
    )
    task = asyncio.create_task(run_enhanced_report_job(job_id, payload, settings))
    RUNNING_TASKS[job_id] = task
    task.add_done_callback(lambda _: RUNNING_TASKS.pop(job_id, None))
    return EnhancedReportJobCreateResponse(job_id=job_id)


@router.get("/enhance-score-job/{job_id}", response_model=EnhancedReportJobStatusResponse)
async def get_enhance_score_job(job_id: str) -> EnhancedReportJobStatusResponse:
    cleanup_jobs()
    job = ENHANCED_REPORT_JOBS.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="增强分析任务不存在或已过期")
    return EnhancedReportJobStatusResponse(
        job_id=job_id,
        status=job["status"],
        result=job["result"],
        error=job["error"],
    )


async def run_report_job(job_id: str, payload: ScoreInput, settings) -> None:
    REPORT_JOBS[job_id]["status"] = "running"
    try:
        REPORT_JOBS[job_id]["result"] = await run_ai_report(settings=settings, score_input=payload)
        REPORT_JOBS[job_id]["status"] = "done"
    except Exception as error:
        logger.exception("Report job failed; falling back to rule report (job_id=%s)", job_id)
        REPORT_JOBS[job_id]["error"] = str(error)
        REPORT_JOBS[job_id]["result"] = build_mock_report(payload)
        REPORT_JOBS[job_id]["status"] = "done"


async def run_enhanced_report_job(job_id: str, payload: EnhancedScoreRequest, settings) -> None:
    ENHANCED_REPORT_JOBS[job_id]["status"] = "running"
    try:
        ENHANCED_REPORT_JOBS[job_id]["result"] = await run_enhanced_report(
            settings=settings,
            score_input=payload.score_input,
            base_report=payload.base_report,
            history_records=payload.history_records,
            materials=payload.materials,
        )
        ENHANCED_REPORT_JOBS[job_id]["status"] = "done"
    except Exception as error:
        logger.exception("Enhanced report job failed; falling back to rule report (job_id=%s)", job_id)
        ENHANCED_REPORT_JOBS[job_id]["error"] = str(error)
        ENHANCED_REPORT_JOBS[job_id]["result"] = build_mock_enhanced_report(payload.score_input)
        ENHANCED_REPORT_JOBS[job_id]["status"] = "done"


def cleanup_jobs() -> None:
    now = time.time()
    expired = [job_id for job_id, job in REPORT_JOBS.items() if now - job["created_at"] > JOB_TTL_SECONDS]
    for job_id in expired:
        REPORT_JOBS.pop(job_id, None)
    expired_enhanced = [
        job_id for job_id, job in ENHANCED_REPORT_JOBS.items() if now - job["created_at"] > JOB_TTL_SECONDS
    ]
    for job_id in expired_enhanced:
        ENHANCED_REPORT_JOBS.pop(job_id, None)
