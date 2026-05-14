from pydantic import BaseModel, Field


class StudentInput(BaseModel):
    grade: str = ""
    city: str = ""


class ExamInput(BaseModel):
    name: str = ""
    date: str = ""


class SubjectScoreInput(BaseModel):
    name: str
    score: float = Field(ge=0)
    full_score: float = Field(default=100, gt=0)
    class_rank: int | None = Field(default=None, gt=0)
    grade_rank: int | None = Field(default=None, gt=0)


class ScoreInput(BaseModel):
    student: StudentInput = Field(default_factory=StudentInput)
    exam: ExamInput = Field(default_factory=ExamInput)
    subjects: list[SubjectScoreInput]
    max_subjects: list[SubjectScoreInput] = Field(default_factory=list)


class ParseScoreTextRequest(BaseModel):
    text: str = Field(min_length=1)
    student: StudentInput = Field(default_factory=StudentInput)
    exam: ExamInput = Field(default_factory=ExamInput)


class SubjectPerformance(BaseModel):
    name: str
    score: float
    full_score: float
    rate: float
    level: str
    comment: str


class PriorityItem(BaseModel):
    name: str
    reason: str
    action: str


class ScoreReport(BaseModel):
    summary: str
    subject_performance: list[SubjectPerformance]
    priority: list[PriorityItem]
    two_week_plan: list[str]
    parent_advice: str
    elective_advice: str
    disclaimer: str = "本报告仅供学习规划参考，不构成升学、选科或教育决策承诺。"
    mock_report: bool = True


class OcrScoreResponse(BaseModel):
    raw_text: str = ""
    confidence: float = 0
    structured_score: ScoreInput
    warnings: list[str] = Field(default_factory=list)


class OcrScoreBase64Request(BaseModel):
    image_base64: str = Field(min_length=1)
    mime_type: str = "image/png"
    type: str = "my"


class OcrScoreFileRequest(BaseModel):
    file_url: str = Field(min_length=1)
    type: str = "my"


class OcrScoreJobCreateResponse(BaseModel):
    job_id: str
    status: str = "pending"


class OcrScoreJobStatusResponse(BaseModel):
    job_id: str
    status: str
    result: OcrScoreResponse | None = None
    error: str = ""


class ReportJobCreateResponse(BaseModel):
    job_id: str
    status: str = "pending"


class ReportJobStatusResponse(BaseModel):
    job_id: str
    status: str
    result: ScoreReport | None = None
    error: str = ""
