import base64
import json
from typing import Any

import httpx

from app.config import Settings
from app.schemas import ScoreInput, ScoreReport
from app.services.json_utils import extract_json_payload
from app.services.report_generator import build_mock_report


class AiConfigurationError(RuntimeError):
    pass


class AiResponseError(RuntimeError):
    pass


async def run_ocr_score(
    *,
    settings: Settings,
    file_bytes: bytes,
    mime_type: str,
    score_type: str,
) -> dict[str, Any]:
    _ensure_api_key(settings)
    image_url = f"data:{mime_type or 'image/png'};base64,{base64.b64encode(file_bytes).decode('ascii')}"
    data = await _chat_completion(
        settings=settings,
        model=settings.ocr_model,
        messages=[
            {
                "role": "user",
                "content": [
                    {"type": "image_url", "image_url": {"url": image_url}},
                    {"type": "text", "text": _build_ocr_prompt(score_type)},
                ],
            }
        ],
    )
    content = _extract_message_content(data)
    payload = extract_json_payload(content)
    payload.setdefault("raw_text", content)
    payload.setdefault("confidence", 0.75)
    return _normalize_ocr_payload(payload)


async def run_ai_report(*, settings: Settings, score_input: ScoreInput) -> ScoreReport:
    if not settings.ai_enabled:
        return build_mock_report(score_input)

    local_report = build_mock_report(score_input)
    prompt = _build_report_prompt(score_input, local_report)
    data = await _chat_completion(
        settings=settings,
        model=settings.analyze_model,
        messages=[{"role": "user", "content": prompt}],
    )
    content = _extract_message_content(data)
    payload = extract_json_payload(content)
    payload["mock_report"] = False
    return ScoreReport.model_validate(payload)


async def _chat_completion(
    *,
    settings: Settings,
    model: str,
    messages: list[dict[str, Any]],
) -> dict[str, Any]:
    _ensure_api_key(settings)
    async with httpx.AsyncClient(timeout=60) as client:
        response = await client.post(
            settings.dashscope_endpoint,
            headers={
                "Authorization": f"Bearer {settings.dashscope_api_key}",
                "Content-Type": "application/json",
            },
            json={"model": model, "messages": messages, "temperature": 0.2},
        )

    if response.status_code >= 400:
        raise AiResponseError(f"DashScope request failed: {response.status_code} {response.text[:500]}")
    return response.json()


def _ensure_api_key(settings: Settings) -> None:
    if not settings.dashscope_api_key:
        raise AiConfigurationError("DASHSCOPE_API_KEY is not configured")


def _extract_message_content(data: dict[str, Any]) -> str:
    content = data.get("choices", [{}])[0].get("message", {}).get("content")
    if not content:
        raise AiResponseError("DashScope response did not contain message content")
    return content


def _normalize_ocr_payload(payload: dict[str, Any]) -> dict[str, Any]:
    structured = payload.get("structured_score") or {}
    normalized_subjects = _normalize_subject_items(structured.get("subjects") or structured.get("scores") or [])
    normalized_max_subjects = _normalize_subject_items(
        structured.get("max_subjects") or structured.get("maxSubjects") or []
    )

    payload["structured_score"] = {
        "student": structured.get("student") or {"grade": "", "city": ""},
        "exam": structured.get("exam") or {"name": "", "date": ""},
        "subjects": normalized_subjects,
        "max_subjects": normalized_max_subjects,
    }
    payload["warnings"] = payload.get("warnings") or []
    return payload


def _normalize_subject_items(subjects: Any) -> list[dict[str, Any]]:
    normalized_subjects = []
    if not isinstance(subjects, list):
        return normalized_subjects
    for item in subjects:
        if not isinstance(item, dict):
            continue
        name = item.get("name") or item.get("subject") or item.get("科目")
        score = item.get("score") or item.get("得分")
        full_score = item.get("full_score") or item.get("fullScore") or item.get("满分") or 100
        if not name or score is None:
            continue
        normalized_subjects.append(
            {
                "name": str(name),
                "score": float(score),
                "full_score": float(full_score),
                "class_rank": item.get("class_rank") or item.get("classRank"),
                "grade_rank": item.get("grade_rank") or item.get("gradeRank"),
            }
        )
    return normalized_subjects


def _build_ocr_prompt(score_type: str) -> str:
    score_label = "本人考试成绩" if score_type == "my" else "班级最高分或参考成绩"
    return f"""
你是成绩单 OCR 助手。请识别图片中的{score_label}，只输出 JSON，不要输出解释。

JSON 格式：
{{
  "raw_text": "识别到的主要文本",
  "confidence": 0.0,
  "structured_score": {{
    "student": {{"grade": "", "city": ""}},
    "exam": {{"name": "", "date": ""}},
    "subjects": [
      {{"name": "数学", "score": 108, "full_score": 150, "class_rank": null, "grade_rank": null}}
    ],
    "max_subjects": []
  }},
  "warnings": []
}}

规则：
1. 只提取语文、数学、英语、物理、化学、生物、历史、地理、政治等学科成绩。
2. 不要把班级排名、年级排名、序号误认为分数。
3. 不确定满分时，语数英默认 150，其他科目默认 100。
4. 不确定的字段保留空字符串或 null，并在 warnings 中说明。
""".strip()


def _build_report_prompt(score_input: ScoreInput, local_report: ScoreReport) -> str:
    return f"""
你是面向家长的学习成绩分析助手。请基于结构化成绩 JSON 生成具体、克制、可执行的学习报告。

输入成绩 JSON：
{json.dumps(score_input.model_dump(), ensure_ascii=False)}

本地规则分析参考：
{json.dumps(local_report.model_dump(), ensure_ascii=False)}

输出要求：
1. 只输出 JSON，不要输出 Markdown。
2. 不编造成绩中没有提供的题型、知识点、学校排名或政策信息。
3. 建议必须具体到家长能执行的两周动作。
4. elective_advice 不做绝对选科承诺。

JSON 格式必须完全符合：
{json.dumps(ScoreReport.model_json_schema(), ensure_ascii=False)}
""".strip()
