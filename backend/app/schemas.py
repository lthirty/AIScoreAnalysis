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


class ScoreOverview(BaseModel):
    total_score: float = 0
    total_full_score: float = 0
    average_score: float = 0
    overall_rate: float = 0
    reference_total_score: float | None = None
    gap_to_reference: float | None = None
    best_subject: str = ""
    weakest_subject: str = ""


class SubjectComparison(BaseModel):
    name: str
    score: float
    full_score: float
    rate: float
    reference_score: float | None = None
    gap_to_reference: float | None = None
    comment: str = ""


class ReportInsight(BaseModel):
    name: str
    evidence: str
    suggestion: str


class ElectiveOption(BaseModel):
    combo: str
    reason: str


class ElectiveAdvice(BaseModel):
    recommendation: str = ""
    basis: str = ""
    alternatives: list[ElectiveOption] = Field(default_factory=list)
    actions: list[str] = Field(default_factory=list)
    note: str = ""


class ScoreReport(BaseModel):
    summary: str
    overview: ScoreOverview = Field(default_factory=ScoreOverview)
    subject_comparison: list[SubjectComparison] = Field(default_factory=list)
    subject_performance: list[SubjectPerformance] = Field(default_factory=list)
    priority: list[PriorityItem]
    strengths: list[ReportInsight] = Field(default_factory=list)
    weaknesses: list[ReportInsight] = Field(default_factory=list)
    learning_advice: list[str] = Field(default_factory=list)
    next_goals: list[str] = Field(default_factory=list)
    parent_advice: str
    elective_advice: str
    elective_plan: ElectiveAdvice = Field(default_factory=ElectiveAdvice)
    disclaimer: str = "本报告仅供学习规划参考，不构成升学、选科或教育决策承诺。"
    mock_report: bool = True


class EnhancedAnalysisRow(BaseModel):
    content: str
    score: float
    full_score: float
    rate: float


class EnhancedSubjectInsight(BaseModel):
    name: str
    trend_judgment: str
    diagnosis: str
    evidence: str
    action: str
    next_target: str
    analysis_rows: list[EnhancedAnalysisRow] = Field(default_factory=list)
    section_advice: list[str] = Field(default_factory=list)
    analysis_summary: str = ""
    score_gap_analysis: str = ""
    loss_focus: list[str] = Field(default_factory=list)
    stable_focus: list[str] = Field(default_factory=list)
    source_basis: list[str] = Field(default_factory=list)


class EnhancedMaterial(BaseModel):
    subject: str
    input_type: str = "text"
    detail: str = ""
    image_url: str = ""
    image_name: str = ""


class ReportPdfExportRequest(BaseModel):
    title: str = "AI成绩分析报告"
    content: str = ""
    filename: str = "AI成绩分析报告.pdf"


class HistoryExamRecord(BaseModel):
    exam_name: str = ""
    exam_date: str = ""
    total_score: float = 0
    subjects: list[SubjectScoreInput] = Field(default_factory=list)


class EnhancedScoreReport(BaseModel):
    summary: str
    overall_trend: str
    subject_insights: list[EnhancedSubjectInsight]
    subject_gap_analysis: list[str] = Field(default_factory=list)
    strength_breakthroughs: list[str] = Field(default_factory=list)
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
