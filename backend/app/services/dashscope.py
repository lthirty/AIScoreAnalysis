import base64
import json
import logging
import re
from typing import Any

import httpx

from app.config import Settings
from app.schemas import EnhancedMaterial, EnhancedScoreReport, HistoryExamRecord, ScoreInput, ScoreReport
from app.services.json_utils import extract_json_payload
from app.services.report_generator import build_mock_enhanced_report, build_mock_report


class AiConfigurationError(RuntimeError):
    pass


class AiResponseError(RuntimeError):
    pass


RETRY_MAX_ATTEMPTS = 3
RETRY_BASE_DELAY_SECONDS = 2
logger = logging.getLogger(__name__)


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
    try:
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
    except Exception:
        logger.exception("AI report generation failed; falling back to rule report")
        return local_report


async def run_enhanced_report(
    *,
    settings: Settings,
    score_input: ScoreInput,
    base_report: ScoreReport | None = None,
    history_records: list[HistoryExamRecord] | None = None,
    materials: list[EnhancedMaterial] | None = None,
) -> EnhancedScoreReport:
    if not settings.ai_enabled:
        return build_mock_enhanced_report(
            score_input,
            base_report=base_report,
            history_records=history_records,
            materials=materials,
        )

    local_report = base_report or build_mock_report(score_input)
    messages = _build_enhanced_report_messages(
        score_input=score_input,
        base_report=local_report,
        history_records=history_records or [],
        materials=materials or [],
    )
    try:
        data = await _chat_completion(
            settings=settings,
            model=settings.analyze_model,
            messages=messages,
        )
        content = _extract_message_content(data)
        payload = extract_json_payload(content)
        payload["mock_report"] = False
        return EnhancedScoreReport.model_validate(payload)
    except Exception:
        logger.exception("Enhanced report generation failed; falling back to rule report")
        return build_mock_enhanced_report(
            score_input,
            base_report=local_report,
            history_records=history_records or [],
            materials=materials or [],
        )


async def _chat_completion(
    *,
    settings: Settings,
    model: str,
    messages: list[dict[str, Any]],
    attempt: int = 1,
) -> dict[str, Any]:
    _ensure_api_key(settings)
    try:
        async with httpx.AsyncClient(timeout=90) as client:
            response = await client.post(
                settings.dashscope_endpoint,
                headers={
                    "Authorization": f"Bearer {settings.dashscope_api_key}",
                    "Content-Type": "application/json",
                },
                json={"model": model, "messages": messages, "temperature": 0.2},
            )

        if response.status_code >= 500:
            raise AiResponseError(f"DashScope server error: {response.status_code} {response.text[:200]}")
        if response.status_code >= 400:
            raise AiResponseError(f"DashScope request failed: {response.status_code} {response.text[:500]}")
        return response.json()
    except (httpx.ConnectError, httpx.TimeoutException, httpx.RemoteProtocolError) as e:
        if attempt >= RETRY_MAX_ATTEMPTS:
            raise AiResponseError(f"DashScope connection failed after {attempt} attempts: {e}")
        delay = RETRY_BASE_DELAY_SECONDS * (2 ** (attempt - 1))
        import asyncio
        await asyncio.sleep(delay)
        return await _chat_completion(settings=settings, model=model, messages=messages, attempt=attempt + 1)
    except AiResponseError:
        if attempt >= RETRY_MAX_ATTEMPTS:
            raise
        delay = RETRY_BASE_DELAY_SECONDS * (2 ** (attempt - 1))
        import asyncio
        await asyncio.sleep(delay)
        return await _chat_completion(settings=settings, model=model, messages=messages, attempt=attempt + 1)


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
你是资深的中高考成绩分析老师，擅长学情诊断、分差对比、选科建议和家庭执行计划。
请基于结构化成绩 JSON 生成接近 Web 端“AI 基础分析”的完整报告，内容要比普通摘要更具体。

输入成绩 JSON：
{json.dumps(score_input.model_dump(), ensure_ascii=False)}

本地规则分析参考：
{json.dumps(local_report.model_dump(), ensure_ascii=False)}

输出要求：
1. 只输出 JSON，不要输出 Markdown。
2. 不编造成绩中没有提供的题型、知识点、学校排名或政策信息。
3. 必须填充 overview、subject_comparison、strengths、weaknesses、learning_advice、next_goals 等字段。
4. subject_comparison 要逐科列出自己得分、满分、参考分和分差；没有参考分时 reference_score 与 gap_to_reference 可为 null。
5. strengths 至少 1 项，weaknesses 至少 2 项；每项都要写清 evidence 和 suggestion。
6. learning_advice 至少 4 条，必须可执行，包含复盘方式、训练频率或时间安排。
7. next_goals 至少 2 条，必须是下一次考试可验证的小目标。
8. elective_plan 必须直接给出 recommendation、basis、alternatives、actions 和 note；参考本地规则的方向，不能只写“需要结合政策再看”。
9. elective_advice 用一句完整文本同步概括 elective_plan：明确推荐组合、推荐依据、其他备选组合及依据。
10. parent_advice 面向家长，避免空话，强调如何陪孩子复盘和跟进。

JSON 格式必须完全符合：
{json.dumps(ScoreReport.model_json_schema(), ensure_ascii=False)}
""".strip()


def _build_enhanced_report_messages(
    *,
    score_input: ScoreInput,
    base_report: ScoreReport,
    history_records: list[HistoryExamRecord],
    materials: list[EnhancedMaterial],
) -> list[dict[str, Any]]:
    history_text = _format_history_for_prompt(history_records)
    material_text = _format_materials_for_prompt(materials)
    content: list[dict[str, Any]] = [
        {
            "type": "text",
            "text": f"""
你是资深学科成绩分析老师。请基于结构化成绩、基础报告、历史趋势，以及用户补充的题型材料或试卷照片，生成 AI 增强分析。

输入成绩 JSON：
{json.dumps(score_input.model_dump(), ensure_ascii=False)}

基础报告 JSON：
{json.dumps(base_report.model_dump(), ensure_ascii=False)}

历史趋势：
{history_text}

增强材料：
{material_text}

输出要求：
1. 只输出 JSON，不要输出 Markdown。
2. 必须严格基于已提供的成绩、最高分参考、历史记录和补充材料。
3. 如果图片或文字里没有出现具体题型、知识点、章节或题号，绝不能自行编造。
4. 如果用户提供了像“选择题 12 题共 60 分得了 42 分”“解答题-导数与函数 10 分得了 3 分”这种材料，要明确指出哪类题型失分更集中，并给出更具体的训练建议。
5. 每个学科判断尽量说明依据来自哪类材料：本次成绩、历史趋势、文字录入、图片可见内容。
6. 如果增强材料已经提供了可计算的模块得分率或失分分值，请直接指出“失分最集中模块”“相对稳定模块”“优先训练顺序”，不要只停留在笼统表述。
7. action 必须写成可执行动作，至少包含训练方式、频率或时长；next_target 必须给出下一次考试可验证的小目标。
8. 增强分析应比基础分析更具体，尤其要回答：当前趋势、失分模块、下一步补什么材料、家长如何配合、下次目标怎么定。
9. elective_note 不做绝对选科承诺。

JSON 格式必须完全符合：
{json.dumps(EnhancedScoreReport.model_json_schema(), ensure_ascii=False)}
""".strip()
        }
    ]
    for material in materials:
        if material.image_url:
            content.append({"type": "image_url", "image_url": {"url": material.image_url}})
            content.append({
                "type": "text",
                "text": f"这是{material.subject}的补充图片材料，文件名：{material.image_name or '未命名'}。如未看到清晰题干或模块名，请明确说明证据不足。"
            })
    return [{"role": "user", "content": content}]


def _format_history_for_prompt(history_records: list[HistoryExamRecord]) -> str:
    if not history_records:
        return "暂无历史成绩记录。"
    lines = []
    for record in history_records:
        subject_text = ", ".join([f"{item.name}:{item.score}" for item in record.subjects]) or "无科目明细"
        lines.append(f"{record.exam_date or '未知日期'} {record.exam_name or '未知考试'} 总分{record.total_score}；{subject_text}")
    return "\n".join(lines)


def _format_materials_for_prompt(materials: list[EnhancedMaterial]) -> str:
    if not materials:
        return "暂无增强材料。"
    lines = []
    for index, material in enumerate(materials, start=1):
        module_summary = _format_extracted_modules(material.detail)
        lines.append(
            f"{index}. {material.subject}；输入方式：{material.input_type}；文字内容：{material.detail or '无'}；图片：{'有' if material.image_url else '无'}；结构化模块：{module_summary}"
        )
    return "\n".join(lines)


def _format_extracted_modules(detail: str) -> str:
    modules = _extract_module_scores(detail)
    if not modules:
        return "未提取到明确的模块分数。"
    formatted = []
    for module in modules:
        formatted.append(
            f"{module['name']} {module['score']}/{module['full_score']}，失分{module['loss']}，得分率{module['rate']}%"
        )
    return "；".join(formatted)


def _extract_module_scores(detail: str) -> list[dict[str, Any]]:
    text = (detail or "").replace("：", ":").replace("，", ",").replace("；", ";")
    modules: list[dict[str, Any]] = []

    fraction_pattern = re.compile(
        r"(?P<name>[^,;:\n]{1,30}?)\s*(?:[:：])?\s*(?P<score>\d+(?:\.\d+)?)\s*/\s*(?P<full>\d+(?:\.\d+)?)"
    )
    verbose_pattern = re.compile(
        r"(?P<name>[^,;:\n]{1,40}?)(?:（|\()?(?:[^,;:\n]*?)(?P<full>\d+(?:\.\d+)?)分(?:[^,;:\n]*?)(?:）|\))?[^,;:\n]*?(?:得了|得|拿了|拿到|获得)\s*(?P<score>\d+(?:\.\d+)?)分"
    )

    for pattern in (fraction_pattern, verbose_pattern):
        for match in pattern.finditer(text):
            name = match.group("name").strip(" -:：,;")
            if not name:
                continue
            score = round(float(match.group("score")), 1)
            full_score = round(float(match.group("full")), 1)
            if full_score <= 0:
                continue
            loss = round(full_score - score, 1)
            rate = round(score / full_score * 100, 1)
            normalized = {
                "name": name,
                "score": score,
                "full_score": full_score,
                "loss": loss,
                "rate": rate,
            }
            if normalized not in modules:
                modules.append(normalized)

    modules.sort(key=lambda item: (-item["loss"], item["rate"], item["name"]))
    return modules
