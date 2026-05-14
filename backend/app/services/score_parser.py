import re

from app.schemas import ExamInput, ScoreInput, StudentInput, SubjectScoreInput

SUBJECTS = ["语文", "数学", "英语", "物理", "化学", "生物", "历史", "地理", "政治"]
SUBJECT_ALIASES = {
    "政史": "政治",
    "思政": "政治",
    "道法": "政治",
}


def normalize_subject(value: str) -> str:
    clean = re.sub(r"\s+", "", value)
    return SUBJECT_ALIASES.get(clean, clean)


def parse_score_text(text: str, student: StudentInput | None = None, exam: ExamInput | None = None) -> ScoreInput:
    subjects: list[SubjectScoreInput] = []
    seen: set[str] = set()
    full_score_hint = _extract_full_score_hint(text)

    for subject in SUBJECTS:
        pattern = rf"{subject}\D{{0,8}}(\d+(?:\.\d+)?)"
        match = re.search(pattern, text)
        if not match:
            continue
        score = float(match.group(1))
        if subject in seen:
            continue
        seen.add(subject)
        subjects.append(
            SubjectScoreInput(
                name=normalize_subject(subject),
                score=score,
                full_score=_infer_full_score(subject, score, full_score_hint),
            )
        )

    return ScoreInput(
        student=student or StudentInput(),
        exam=exam or ExamInput(),
        subjects=subjects,
    )


def _extract_full_score_hint(text: str) -> float | None:
    match = re.search(r"满分\D{0,4}(\d+(?:\.\d+)?)", text)
    return float(match.group(1)) if match else None


def _infer_full_score(subject: str, score: float, full_score_hint: float | None) -> float:
    if full_score_hint and score <= full_score_hint:
        return full_score_hint
    if subject in {"语文", "数学", "英语"} or score > 100:
        return 150
    return 100
