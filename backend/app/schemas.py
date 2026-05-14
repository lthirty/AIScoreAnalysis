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
    parent_advice: str
    elective_advice: str
    disclaimer: str = "本报告仅供学习规划参考，不构成升学、选科或教育决策承诺。"
    mock_report: bool = True


class EnhancedSubjectInsight(BaseModel):
    name: str
    trend_judgment: str
    diagnosis: str
    evidence: str
    action: str
    next_target: str


class EnhancedMaterial(BaseModel):
    subject: str
    input_type: str = "text"
    detail: str = ""
    image_url: str = ""
    image_name: str = ""


class HistoryExamRecord(BaseModel):
    exam_name: str = ""
    exam_date: str = ""
    total_score: float = 0
    subjects: list[SubjectScoreInput] = Field(default_factory=list)


class EnhancedScoreReport(BaseModel):
    summary: str
    overall_trend: str
    subject_insights: list[EnhancedSubjectInsight]
    risk_alerts: list[str]
    followup_materials: list[str]
    parent_focus: str
    elective_note: str
    disclaimer: str = "增强分析基于当前成绩和已上传材料生成，不能替代试卷讲评、学校政策和教师判断。"
    mock_report: bool = True


class EnhancedScoreRequest(BaseModel):
    score_input: ScoreInput
    base_report: ScoreReport | None = None
    history_records: list[HistoryExamRecord] = Field(default_factory=list)
    materials: list[EnhancedMaterial] = Field(default_factory=list)


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


class EnhancedReportJobCreateResponse(BaseModel):
    job_id: str
    status: str = "pending"


class EnhancedReportJobStatusResponse(BaseModel):
    job_id: str
    status: str
    result: EnhancedScoreReport | None = None
    error: str = ""
