import time
from uuid import uuid4

from fastapi import APIRouter, BackgroundTasks, HTTPException

from app.config import get_settings
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
from app.services.score_parser import parse_score_text

router = APIRouter(prefix="/api", tags=["analysis"])
REPORT_JOBS: dict[str, dict] = {}
ENHANCED_REPORT_JOBS: dict[str, dict] = {}
JOB_TTL_SECONDS = 20 * 60


@router.post("/parse-score-text", response_model=ScoreInput)
def parse_score_text_endpoint(payload: ParseScoreTextRequest) -> ScoreInput:
    return parse_score_text(payload.text, payload.student, payload.exam)


@router.post("/analyze-score", response_model=ScoreReport)
async def analyze_score_endpoint(payload: ScoreInput) -> ScoreReport:
    try:
        return await run_ai_report(settings=get_settings(), score_input=payload)
    except (AiResponseError, ValueError) as error:
        raise HTTPException(status_code=502, detail=str(error)) from error


@router.post("/analyze-score-job", response_model=ReportJobCreateResponse)
async def create_analyze_score_job(
    payload: ScoreInput,
    background_tasks: BackgroundTasks,
) -> ReportJobCreateResponse:
    cleanup_jobs()
    job_id = uuid4().hex
    REPORT_JOBS[job_id] = {
        "status": "pending",
        "created_at": time.time(),
        "result": None,
        "error": "",
    }
    background_tasks.add_task(run_report_job, job_id, payload)
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
    background_tasks: BackgroundTasks,
) -> EnhancedReportJobCreateResponse:
    cleanup_jobs()
    job_id = uuid4().hex
    ENHANCED_REPORT_JOBS[job_id] = {
        "status": "pending",
        "created_at": time.time(),
        "result": None,
        "error": "",
    }
    background_tasks.add_task(run_enhanced_report_job, job_id, payload)
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


async def run_report_job(job_id: str, payload: ScoreInput) -> None:
    REPORT_JOBS[job_id]["status"] = "running"
    try:
        REPORT_JOBS[job_id]["result"] = await run_ai_report(settings=get_settings(), score_input=payload)
        REPORT_JOBS[job_id]["status"] = "done"
    except Exception as error:
        REPORT_JOBS[job_id]["error"] = str(error)
        REPORT_JOBS[job_id]["status"] = "failed"


async def run_enhanced_report_job(job_id: str, payload: EnhancedScoreRequest) -> None:
    ENHANCED_REPORT_JOBS[job_id]["status"] = "running"
    try:
        ENHANCED_REPORT_JOBS[job_id]["result"] = await run_enhanced_report(
            settings=get_settings(),
            score_input=payload.score_input,
            base_report=payload.base_report,
            history_records=payload.history_records,
            materials=payload.materials,
        )
        ENHANCED_REPORT_JOBS[job_id]["status"] = "done"
    except Exception as error:
        ENHANCED_REPORT_JOBS[job_id]["error"] = str(error)
        ENHANCED_REPORT_JOBS[job_id]["status"] = "failed"


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
