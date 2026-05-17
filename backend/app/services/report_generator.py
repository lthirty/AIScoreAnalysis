import re
from typing import Any

from app.schemas import (
    ElectiveAdvice,
    ElectiveOption,
    EnhancedAnalysisRow,
    EnhancedMaterial,
    EnhancedScoreReport,
    EnhancedSubjectInsight,
    HistoryExamRecord,
    PriorityItem,
    ReportInsight,
    ScoreInput,
    ScoreOverview,
    ScoreReport,
    SubjectComparison,
    SubjectPerformance,
)


def build_mock_report(score_input: ScoreInput) -> ScoreReport:
    performances = [_build_subject_performance(item) for item in score_input.subjects]
    sorted_by_rate = sorted(performances, key=lambda item: item.rate)
    comparison_items = _build_subject_comparisons(score_input)
    sorted_by_gap = sorted(
        comparison_items,
        key=lambda item: (
            item.gap_to_reference if item.gap_to_reference is not None else (1 - item.rate) * item.full_score
        ),
        reverse=True,
    )
    strengths = _build_strength_insights(comparison_items)
    weaknesses = _build_weakness_insights(sorted_by_gap)
    priority = [
        PriorityItem(
            name=item.name,
            reason=_build_priority_reason(item),
            action=_build_priority_action(item.name),
        )
        for item in sorted_by_gap[:3]
    ]

    total_score = sum(item.score for item in score_input.subjects)
    total_full_score = sum(item.full_score for item in score_input.subjects)
    overall_rate = total_score / total_full_score if total_full_score else 0
    average_score = total_score / len(score_input.subjects) if score_input.subjects else 0
    reference_total_score = sum(item.score for item in score_input.max_subjects) if score_input.max_subjects else None
    gap_to_reference = (
        round(reference_total_score - total_score, 1)
        if reference_total_score is not None
        else None
    )
    grade = score_input.student.grade or "当前年级"
    city = score_input.student.city or "所在城市"
    elective_plan = _build_elective_plan(city, score_input)
    comparison_note = ""
    if score_input.max_subjects:
        comparison_note = " 已纳入班级/年段最好成绩作为对比参考。"
    best_subject = strengths[0].name if strengths else (sorted_by_rate[-1].name if sorted_by_rate else "")
    weakest_subject = weaknesses[0].name if weaknesses else (sorted_by_rate[0].name if sorted_by_rate else "")

    return ScoreReport(
        summary=(
            f"本次{grade}成绩总分 {round(total_score, 1)}/{round(total_full_score, 1)}，"
            f"总体得分率约 {round(overall_rate * 100, 1)}%，平均单科 {round(average_score, 1)} 分。"
            f"当前最值得先看的科目是{weakest_subject or '低得分率科目'}，优势科目是{best_subject or '高得分率科目'}。"
            f"建议按“先补短板、再稳优势”的顺序推进。{comparison_note}"
        ),
        overview=ScoreOverview(
            total_score=round(total_score, 1),
            total_full_score=round(total_full_score, 1),
            average_score=round(average_score, 1),
            overall_rate=round(overall_rate, 4),
            reference_total_score=round(reference_total_score, 1) if reference_total_score is not None else None,
            gap_to_reference=gap_to_reference,
            best_subject=best_subject,
            weakest_subject=weakest_subject,
        ),
        subject_comparison=comparison_items,
        subject_performance=performances,
        priority=priority,
        strengths=strengths,
        weaknesses=weaknesses,
        learning_advice=_build_learning_advice(score_input, weaknesses, strengths),
        next_goals=_build_next_goals(score_input, weaknesses),
        parent_advice=(
            "家长可以重点关注孩子是否说得清楚错因，而不是只追问分数。"
            "建议让孩子按科目复盘“会做做错、不会做、时间不够、表达不规范”四类错因，"
            "每周只盯1到2个最可验证的小目标。"
        ),
        elective_advice=_format_elective_advice(elective_plan),
        elective_plan=elective_plan,
    )


def build_compact_report_context(score_input: ScoreInput, report: ScoreReport) -> dict[str, Any]:
    performances = [_build_subject_performance(item) for item in score_input.subjects]
    comparisons = report.subject_comparison or _build_subject_comparisons(score_input)
    return {
        "student": score_input.student.model_dump(),
        "exam": score_input.exam.model_dump(),
        "subjects": [
            {
                "name": item.name,
                "score": round(item.score, 1),
                "full_score": round(item.full_score, 1),
                "rate": round(item.rate * 100, 1),
                "level": item.level,
            }
            for item in performances
        ],
        "max_subjects": [
            {
                "name": item.name,
                "score": round(item.score, 1),
                "full_score": round(item.full_score, 1),
            }
            for item in score_input.max_subjects
        ],
        "overview": report.overview.model_dump(),
        "summary": report.summary,
        "subject_comparison": [
            {
                "name": item.name,
                "score": round(item.score, 1),
                "full_score": round(item.full_score, 1),
                "rate": round(item.rate * 100, 1),
                "reference_score": item.reference_score,
                "gap_to_reference": item.gap_to_reference,
            }
            for item in comparisons
        ],
        "priority": [item.model_dump() for item in (report.priority or [])[:3]],
        "strengths": [item.model_dump() for item in (report.strengths or [])[:3]],
        "weaknesses": [item.model_dump() for item in (report.weaknesses or [])[:3]],
        "learning_advice": list(report.learning_advice[:4]),
        "next_goals": list(report.next_goals[:3]),
        "elective_plan": report.elective_plan.model_dump(),
        "elective_advice": report.elective_advice,
    }


def build_compact_enhanced_context(
    score_input: ScoreInput,
    base_report: ScoreReport,
    history_records: list[HistoryExamRecord] | None = None,
    materials: list[EnhancedMaterial] | None = None,
) -> dict[str, Any]:
    history_records = history_records or []
    materials = materials or []
    material_map = _build_material_map(materials)
    trend_map = _build_history_trend_map(history_records)
    base_context = build_compact_report_context(score_input, base_report)
    subject_context = []
    for item in score_input.subjects:
        performance = _build_subject_performance(item)
        material = _get_material_for_subject(material_map, item.name)
        modules = _extract_module_scores(_combine_material_detail(material))
        trend = trend_map.get(item.name)
        subject_context.append(
            {
                "name": item.name,
                "score": round(item.score, 1),
                "full_score": round(item.full_score, 1),
                "rate": round(performance.rate * 100, 1),
                "trend": _format_trend_text(trend),
                "material_type": material.input_type if material else "",
                "material_hint": _combine_material_detail(material)[:160],
                "modules": [
                    {
                        "name": module["name"],
                        "score": module["score"],
                        "full_score": module["full_score"],
                        "rate": module["rate"],
                    }
                    for module in modules[:8]
                ],
            }
        )
    return {
        "base_report": base_context,
        "subject_overview": subject_context,
        "history_summary": _summarize_history_records(history_records),
        "materials_summary": _summarize_materials(materials),
    }


def _summarize_history_records(history_records: list[HistoryExamRecord]) -> list[dict[str, Any]]:
    summary = []
    for record in history_records[-3:]:
        summary.append(
            {
                "exam_name": record.exam_name,
                "exam_date": record.exam_date,
                "total_score": round(record.total_score, 1),
                "subjects": [
                    {
                        "name": item.name,
                        "score": round(item.score, 1),
                        "full_score": round(item.full_score, 1),
                    }
                    for item in record.subjects
                ],
            }
        )
    return summary


def _summarize_materials(materials: list[EnhancedMaterial]) -> list[dict[str, Any]]:
    summary = []
    for material in materials:
        modules = _extract_module_scores(_combine_material_detail(material))
        summary.append(
            {
                "subject": material.subject,
                "input_type": material.input_type,
                "has_image": bool((material.image_url or "").strip() or (material.image_name or "").strip()),
                "detail_hint": (material.detail or "")[:160],
                "modules": [
                    {
                        "name": module["name"],
                        "score": module["score"],
                        "full_score": module["full_score"],
                        "rate": module["rate"],
                    }
                    for module in modules[:8]
                ],
            }
        )
    return summary


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
    text = (detail or "").replace("：", ":").replace("，", ",").replace("；", ";").replace("／", "/")
    modules: list[dict[str, Any]] = []
    seen: set[tuple[str, float, float]] = set()
    lines = re.split(r"[\n;；。]+", text)

    verbose_patterns = (
        re.compile(
            r"(?P<name>.+?)[(（]\s*(?P<full>\d+(?:\.\d+)?)\s*分?[)）]\s*(?:,|，|:|：)?\s*(?:得了|得|拿了|拿到|获得)\s*(?P<score>\d+(?:\.\d+)?)\s*分?"
        ),
        re.compile(
            r"(?P<name>.+?)\s*(?:,|，|:|：)?\s*(?:得了|得|拿了|拿到|获得)\s*(?P<score>\d+(?:\.\d+)?)\s*分?\s*[(（]\s*(?P<full>\d+(?:\.\d+)?)\s*分?[)）]"
        ),
        re.compile(
            r"(?P<name>.+?)\s*(?P<score>\d+(?:\.\d+)?)\s*/\s*(?P<full>\d+(?:\.\d+)?)"
        ),
    )

    for line in lines:
        candidate = line.strip(" ,;；。.!！?？")
        if not candidate:
            continue

        matched = None
        for pattern in verbose_patterns:
            match = pattern.search(candidate)
            if match:
                matched = match
                break
        if not matched:
            continue

        name = matched.group("name").strip(" -:：,;，。/|")
        if not name:
            continue

        score = round(float(matched.group("score")), 1)
        full_score = round(float(matched.group("full")), 1)
        if full_score <= 0:
            continue

        key = (_normalize_subject_key(name), score, full_score)
        if key in seen:
            continue
        seen.add(key)
        modules.append(
            {
                "name": name,
                "score": score,
                "full_score": full_score,
                "loss": round(full_score - score, 1),
                "rate": round(score / full_score * 100, 1),
            }
        )

    return modules


def _module_matches_alias(module_name: str, aliases: list[str]) -> bool:
    module_key = _normalize_subject_key(module_name)
    if not module_key:
        return False
    for alias in aliases:
        alias_key = _normalize_subject_key(alias)
        if not alias_key:
            continue
        if alias_key == module_key or alias_key in module_key or module_key in alias_key:
            return True
    return False


def _build_missing_subject_guidance(subject_name: str) -> dict[str, object]:
    subject = subject_name or "该科目"
    if subject == "语文":
        summary = "语文可先补阅读理解、古诗文和作文这三类材料，再看失分是否集中在审题、默写或结构表达。"
        action = "先补1张能看清题目的试卷或作文批改页，再把阅读、古诗文、作文的得分和失分原因拆开记录。"
        target = "下次先确认语文的失分是来自阅读、古诗文还是作文，再针对性补强。"
        focus = ["优先补阅读理解和作文材料。", "先看审题、结构和表达是否稳定。"]
        section_advice = [
            "整体分析：语文通常先看阅读理解、古诗文和作文三块，缺少分项时先按这三块补证据。",
            "整体建议：优先补1张能看清题目的试卷或作文批改页，并把阅读、古诗文、作文的得分拆开记录。",
            "阅读理解：先关注审题、信息提取和答题结构，看看失分是否集中在表达不完整。",
            "古诗文：先核对默写、翻译和理解题，确认是记忆不稳还是题意理解偏差。",
            "作文：先看立意、结构和语言表达，补充批改痕迹后更容易定位问题。",
        ]
    elif subject == "数学":
        summary = "数学通常最值得先看基础题、计算步骤和中档题，补齐题型后很容易看到真实提分空间。"
        action = "先补选择、填空和大题的得分记录，或者上传一页能看清步骤的题目截图。"
        target = "下次先把数学的基础题稳定住，再看计算和压轴题是否还能继续提升。"
        focus = ["优先补基础题和步骤题。", "先看计算错误和审题遗漏。"]
        section_advice = [
            "整体分析：数学先看基础题、步骤题和中档题，缺少分项时优先补能看清题干和步骤的材料。",
            "整体建议：先把选择、填空和大题的得分拆开记录，再判断是计算、审题还是方法不熟。",
            "基础题：先稳住公式、概念和常见题型，避免小题反复失分。",
            "步骤题：重点看过程是否完整，尽量把每一步丢分原因写清楚。",
            "中档题：优先补题型方法和典型解法，再做限时训练。",
        ]
    elif subject == "英语":
        summary = "英语可先补词汇、语法、阅读和作文四块，通常最容易在客观题和写作里找到提分点。"
        action = "先补阅读、完形、语法填空或作文批改页，重点记录题型得分而不是只写总分。"
        target = "下次先确认英语是词汇不稳、阅读慢，还是作文和语法在拖后腿。"
        focus = ["优先补阅读和写作材料。", "先看词汇与语法是否影响客观题。"]
        section_advice = [
            "整体分析：英语最值得先拆成听力、阅读理解、完形填空、语法填空、应用文写作和读后续写六块。",
            "整体建议：优先补阅读、完形、语法和写作的分项分数，再判断是词汇、方法还是表达在拖分。",
            "听力：先关注关键词捕捉和信息定位，补听错题后再做短时复盘。",
            "阅读理解：先补基础词汇、题型方法和错因，再做限时训练。",
            "完形填空：重点看上下文逻辑和词义辨析，避免只盯单词不看语境。",
            "语法填空：先复盘固定搭配、语法规则和常见易错点。",
            "应用文写作：先补句型、格式和要点覆盖，避免内容完整但表达失分。",
            "读后续写：先看情节衔接、动作描写和结尾收束，尽量把前后文逻辑串起来。",
        ]
    elif subject == "物理":
        summary = "物理通常要先看公式应用、受力分析和实验题，材料一补上就能快速定位短板。"
        action = "先补受力分析、公式代入和实验题的题面或批改页，记录哪一步开始丢分。"
        target = "下次先确认物理是概念不清、公式不会用，还是实验题表述不完整。"
        focus = ["优先补公式和实验材料。", "先看步骤丢分还是概念丢分。"]
        section_advice = [
            "整体分析：物理通常先看公式应用、受力分析和实验题，缺少分项时先补能看清步骤的材料。",
            "整体建议：优先把选择、实验和大题的得分拆开，确认是概念、公式还是步骤在掉分。",
            "公式应用：先检查条件代入和公式选取是否正确。",
            "受力分析：重点看受力图是否完整，避免建模一开始就偏了。",
            "实验题：先补操作步骤、数据处理和结论表达。",
        ]
    elif subject == "化学":
        summary = "化学可先补方程式、实验现象和计算题，很多提分点都来自基础概念是否扎实。"
        action = "先补化学方程式、实验题和计算题的分数记录，尤其是反应式和现象描述。"
        target = "下次先确认化学是方程式不会写、实验不会判断，还是计算题丢分较多。"
        focus = ["优先补方程式和实验题。", "先看反应现象和计算步骤。"]
        section_advice = [
            "整体分析：化学通常先看方程式、实验现象和计算题，缺少分项时先补能看清题面的材料。",
            "整体建议：优先把方程式、实验和计算题拆开记录，再判断是概念、现象还是步骤在掉分。",
            "方程式：先补反应条件、配平和书写规范。",
            "实验题：重点看现象判断、装置理解和结论表达。",
            "计算题：先复盘单位换算、步骤完整性和结果保留。",
        ]
    elif subject == "生物":
        summary = "生物常见提分点在概念辨析、图表解读和实验设计，补题型后更容易找到薄弱环节。"
        action = "先补图表题、实验设计题和概念判断题的得分情况，尽量写清具体错因。"
        target = "下次先确认生物是概念记忆、图表分析还是实验设计在影响得分。"
        focus = ["优先补图表和实验题。", "先看概念辨析是否稳定。"]
        section_advice = [
            "整体分析：生物通常先看概念辨析、图表解读和实验设计，缺少分项时先补对应材料。",
            "整体建议：优先把图表题、实验题和概念判断题拆开记录，再确认是哪类知识点不稳。",
            "图表题：先抓变量、趋势和对照关系，避免只看表面数据。",
            "实验设计：重点看变量控制、步骤顺序和结论是否完整。",
            "概念辨析：先把易混概念整理出来，减少记忆性失分。",
        ]
    elif subject == "历史":
        summary = "历史可先补时间线、史实对应和材料题，很多得分差异都来自材料理解是否到位。"
        action = "先补时间线、选择题和材料题的得分记录，最好能看清题干和作答要求。"
        target = "下次先确认历史是史实记忆、时间线梳理还是材料题表达在掉分。"
        focus = ["优先补材料题和时间线。", "先看史实对应是否准确。"]
        section_advice = [
            "整体分析：历史通常先看时间线、史实对应和材料题，缺少分项时先补能看清题干的材料。",
            "整体建议：优先把选择题、材料题和简答题拆开记录，再判断是记忆、理解还是表达在掉分。",
            "时间线：先把关键事件按时间顺序梳理清楚。",
            "材料题：重点看信息提取、观点概括和史实对应。",
            "简答题：先检查论点是否完整、表述是否到位。",
        ]
    elif subject == "地理":
        summary = "地理最值得先补地图判读、区域特征和材料分析，通常能很快看出空间概念是否扎实。"
        action = "先补地图题、区域比较题和材料题的得分情况，尤其写清楚题干里出现的区域或图表信息。"
        target = "下次先确认地理是地图信息提取、区域特征还是材料题表述在拖分。"
        focus = ["优先补地图判读和区域比较。", "先看材料题是否能读出关键信息。"]
        section_advice = [
            "整体分析：地理通常先看地图判读、区域特征和材料分析，缺少分项时先补对应证据。",
            "整体建议：优先补地图题、区域比较题和材料题，再确认是空间概念还是材料提取在影响得分。",
            "地图判读：先抓方向、位置和空间关系。",
            "区域比较：重点看自然条件、人文特征和差异描述。",
            "材料分析：先提取图表、数据和关键词，再组织答案。",
        ]
    elif subject == "政治":
        summary = "政治可以先补术语、材料概括和观点表达，通常材料题一补上就能看见分差。"
        action = "先补材料分析题、术语题和简答题的得分记录，重点写清观点是否完整。"
        target = "下次先确认政治是术语不准、材料提炼不足，还是观点表达不完整。"
        focus = ["优先补材料题和术语题。", "先看观点表达是否完整。"]
        section_advice = [
            "整体分析：政治通常先看术语、材料概括和观点表达，缺少分项时先补能看清答题卡的材料。",
            "整体建议：优先把材料题、术语题和简答题拆开记录，再判断是记忆、概括还是表达在掉分。",
            "材料题：先抓观点、术语和材料对应关系。",
            "术语题：重点检查概念是否准确、表述是否规范。",
            "简答题：先补观点完整性和逻辑层次。",
        ]
    else:
        summary = f"{subject}暂未导入试卷或题型得分，建议先补充题型材料，再按模块拆分失分点。"
        action = "先补能看清题目和分数的截图，或直接输入各题型的满分、得分和失分原因。"
        target = f"下次先把{subject}补到可以按题型复盘，再看失分是否集中。"
        focus = ["优先补题型材料。", "先看失分是否集中在基础题。"]
        section_advice = [
            f"整体分析：{subject}当前没有可拆分的题型材料，先补能看清题面和分数的证据。",
            "整体建议：优先补题型得分、错因和批改痕迹，再决定下一步训练重点。",
            "基础题：先确认基础分是否稳定，不要一开始就跳到难题。",
            "中档题：尽量把方法、步骤和典型错因写清。",
            "综合题：先补审题、表达和步骤完整性。",
        ]

    return {
        "trend_judgment": "暂无题型证据，但可以先按学科特性补材料。",
        "diagnosis": summary,
        "evidence": summary,
        "action": action,
        "next_target": target,
        "analysis_summary": summary,
        "loss_focus": focus,
        "stable_focus": [f"先稳住{subject}已有基础分，不要因为缺材料就把这科完全放掉。"],
        "source_basis": [f"基于{subject}学科常见提分路径和当前缺少材料的情况。"],
        "section_advice": section_advice,
    }


def build_mock_enhanced_report(
    score_input: ScoreInput,
    base_report: ScoreReport | None = None,
    history_records: list[HistoryExamRecord] | None = None,
    materials: list[EnhancedMaterial] | None = None,
) -> EnhancedScoreReport:
    performances = [_build_subject_performance(item) for item in score_input.subjects]
    base_report = base_report or build_mock_report(score_input)
    history_records = history_records or []
    materials = materials or []
    material_map = _build_material_map(materials)
    trend_map = _build_history_trend_map(history_records)
    insights = [
        _build_enhanced_subject_insight(
            item,
            trend_map.get(item.name),
            _get_material_for_subject(material_map, item.name),
            base_report,
        )
        for item in performances
    ]
    if not insights:
        missing = "由于缺少数据，该科目无法进行深入分析。"
        insights = [
            EnhancedSubjectInsight(
                name="未录入学科",
                trend_judgment=missing,
                diagnosis=missing,
                evidence=missing,
                action=missing,
                next_target=missing,
                analysis_rows=[],
                analysis_summary=missing,
                score_gap_analysis=missing,
                loss_focus=[missing],
                stable_focus=[missing],
                source_basis=[missing],
            )
        ]
    overall_trend = _build_overall_trend_summary(score_input, history_records)
    weakest_subjects = [item.name for item in sorted(performances, key=lambda item: item.rate)[:3]]
    best_subjects = [item.name for item in sorted(performances, key=lambda item: item.rate, reverse=True)[:2]]

    return EnhancedScoreReport(
        summary=(
            f"增强分析已生成。当前先围绕 {weakest_subjects[0] if weakest_subjects else '低得分率学科'}、"
            f"{weakest_subjects[1] if len(weakest_subjects) > 1 else '第二短板学科'} 和 "
            f"{weakest_subjects[2] if len(weakest_subjects) > 2 else '第三短板学科'} 做重点定位；"
            f"优势支点主要来自 {best_subjects[0] if best_subjects else '相对稳定学科'}。"
        ),
        overall_trend=overall_trend or "当前材料不足，先用已录入成绩给出方向性分析。",
        subject_insights=insights,
        subject_gap_analysis=_build_subject_gap_lines(base_report, weakest_subjects) or [
            "当前先以总分差和得分率作为判断依据，后续补充题型材料后再细化。"
        ],
        strength_breakthroughs=_build_strength_breakthroughs(best_subjects, performances) or [
            "先稳定优势科目，避免分数回落稀释总分提升。"
        ],
        risk_alerts=[
            "没有在图片或文字里明确出现的题型、模块、章节名称，系统不会自行补充。",
            "如果历史记录少于 2 次，趋势判断只作为弱提示，不作为稳定结论。",
            "如果试卷照片不清晰、只看得到分数看不到题型名称，增强分析会优先提示继续补材料。"
        ],
        followup_materials=[
            "补充优先学科的试卷照片、答题卡或错题截图，至少保证能看清题型标题或模块名称。",
            "按题型记录每部分满分、得分和主要失分原因，优先补充失分最多的两类模块。",
            "补充最近 2 到 3 次同类考试成绩，用于判断趋势是短期波动还是持续性问题。",
        ],
        parent_focus="",
        elective_note="选科建议需要连续成绩、兴趣、学校课程资源和当地政策共同验证；当前增强分析给出的是优先建议、依据和备选方向，不是绝对承诺。",
    )


def ensure_all_subject_insights(
    report: EnhancedScoreReport,
    score_input: ScoreInput,
    base_report: ScoreReport | None = None,
    history_records: list[HistoryExamRecord] | None = None,
    materials: list[EnhancedMaterial] | None = None,
) -> EnhancedScoreReport:
    base_report = base_report or build_mock_report(score_input)
    history_records = history_records or []
    materials = materials or []
    material_map = _build_material_map(materials)
    trend_map = _build_history_trend_map(history_records)
    insights = [
        _build_enhanced_subject_insight(
            subject,
            trend_map.get(subject.name),
            _get_material_for_subject(material_map, subject.name),
            base_report,
        )
        for subject in score_input.subjects
    ]
    return report.model_copy(update={"subject_insights": insights})


def _build_subject_performance(item) -> SubjectPerformance:
    rate = item.score / item.full_score if item.full_score else 0
    if rate >= 0.85:
        level = "优势"
        comment = "基础较稳，可以通过限时训练和压轴题提升上限。"
    elif rate >= 0.7:
        level = "稳定"
        comment = "已有一定基础，建议优先减少中档题失分。"
    elif rate >= 0.55:
        level = "待提升"
        comment = "需要先补关键知识点，再做题型化训练。"
    else:
        level = "薄弱"
        comment = "建议降低训练跨度，从基础题正确率开始恢复信心。"

    return SubjectPerformance(
        name=item.name,
        score=item.score,
        full_score=item.full_score,
        rate=round(rate, 4),
        level=level,
        comment=comment,
    )


def _build_subject_comparisons(score_input: ScoreInput) -> list[SubjectComparison]:
    reference_map = {item.name: item.score for item in score_input.max_subjects}
    comparisons: list[SubjectComparison] = []
    for item in score_input.subjects:
        rate = item.score / item.full_score if item.full_score else 0
        reference_score = reference_map.get(item.name)
        gap = round(reference_score - item.score, 1) if reference_score is not None else None
        if gap is not None:
            if gap <= 8:
                comment = "接近参考高分，建议保持训练节奏。"
            elif gap <= 20:
                comment = "与参考高分有一定距离，优先减少中档题失分。"
            else:
                comment = "与参考高分差距较大，需要先定位基础题和典型题失分。"
        elif rate >= 0.85:
            comment = "得分率较高，是当前稳定科目。"
        elif rate >= 0.7:
            comment = "基础尚可，适合通过专项复盘继续提升。"
        else:
            comment = "得分率偏低，建议作为近期重点复盘科目。"
        comparisons.append(
            SubjectComparison(
                name=item.name,
                score=item.score,
                full_score=item.full_score,
                rate=round(rate, 4),
                reference_score=reference_score,
                gap_to_reference=gap,
                comment=comment,
            )
        )
    return comparisons


def _build_strength_insights(comparisons: list[SubjectComparison]) -> list[ReportInsight]:
    candidates = sorted(
        comparisons,
        key=lambda item: (
            -(item.rate or 0),
            item.gap_to_reference if item.gap_to_reference is not None else 0,
        ),
    )
    insights: list[ReportInsight] = []
    for item in candidates[:2]:
        if item.rate < 0.75 and item.gap_to_reference is None:
            continue
        evidence = f"{item.name}得分 {item.score}/{item.full_score}，得分率约 {round(item.rate * 100, 1)}%。"
        if item.gap_to_reference is not None:
            evidence += f" 与参考高分相差 {item.gap_to_reference} 分。"
        insights.append(
            ReportInsight(
                name=item.name,
                evidence=evidence,
                suggestion=f"{item.name}建议以保持稳定为主，每周安排1到2次限时练习，避免优势科目回落。",
            )
        )
    return insights


def _build_weakness_insights(comparisons: list[SubjectComparison]) -> list[ReportInsight]:
    insights: list[ReportInsight] = []
    for item in comparisons[:3]:
        loss = round(item.full_score - item.score, 1)
        evidence = f"{item.name}丢分约 {loss} 分，得分率约 {round(item.rate * 100, 1)}%。"
        if item.gap_to_reference is not None:
            evidence += f" 与参考高分相差 {item.gap_to_reference} 分。"
        insights.append(
            ReportInsight(
                name=item.name,
                evidence=evidence,
                suggestion=f"先整理{item.name}最近一次考试的错题类型，区分基础概念、计算/审题、时间分配和表达规范，再做专项训练。",
            )
        )
    return insights


def _build_priority_reason(item: SubjectComparison) -> str:
    if item.gap_to_reference is not None:
        return f"当前与参考高分相差 {item.gap_to_reference} 分，是短期追分空间较明显的学科。"
    return f"当前得分率为 {round(item.rate * 100, 1)}%，还有较明确的提分空间。"


def _build_priority_action(subject: str) -> str:
    return (
        f"未来7天先复盘{subject}最近一次试卷，标出重复错因；"
        "每天安排20到30分钟专项练习，结束后用5分钟写下错因和下次规避动作。"
    )


def _build_learning_advice(
    score_input: ScoreInput,
    weaknesses: list[ReportInsight],
    strengths: list[ReportInsight],
) -> list[str]:
    first_weak = weaknesses[0].name if weaknesses else ""
    first_strong = strengths[0].name if strengths else ""
    advice = [
        "先按分差和得分率确定优先级，不要所有科目平均用力。",
        "每次复盘只记录可行动的错因，例如概念不清、审题遗漏、计算失误、时间不够和表达不规范。",
    ]
    if first_weak:
        advice.append(f"{first_weak}建议先做基础题和中档题的稳定性训练，连续7天观察正确率是否提升。")
    if first_strong:
        advice.append(f"{first_strong}作为相对优势科目，保持隔天一组限时题，避免复习重心转移后回落。")
    if score_input.max_subjects:
        advice.append("已录入参考高分时，优先看差距最大的科目；没有参考题型材料时，不直接推断具体知识点。")
    return advice


def _build_next_goals(score_input: ScoreInput, weaknesses: list[ReportInsight]) -> list[str]:
    total_score = sum(item.score for item in score_input.subjects)
    goals = [f"下一次同类考试先把总分目标定在 {round(total_score + 10, 1)} 分以上，重点验证复盘是否有效。"]
    if weaknesses:
        goals.append(f"{weaknesses[0].name}优先争取提升 5 到 10 分，并减少同类错因重复出现。")
    goals.append("保存下一次成绩后，再结合历史趋势判断是真提升还是单次波动。")
    return goals


def _build_elective_plan(city: str, score_input: ScoreInput) -> ElectiveAdvice:
    subject_scores = {item.name: item.score for item in score_input.subjects}
    physics = subject_scores.get("物理", 0)
    chemistry = subject_scores.get("化学", 0)
    biology = subject_scores.get("生物", 0)
    geography = subject_scores.get("地理", 0)
    politics = subject_scores.get("政治", 0)
    history = subject_scores.get("历史", 0)
    has_physics = "物理" in subject_scores
    has_chemistry = "化学" in subject_scores
    subject_rank = sorted(
        [
            ("物理", physics),
            ("化学", chemistry),
            ("生物", biology),
            ("地理", geography),
            ("政治", politics),
            ("历史", history),
        ],
        key=lambda item: item[1],
        reverse=True,
    )
    top_subject_name = subject_rank[0][0] if subject_rank else "地理"
    top_subject_score = subject_rank[0][1] if subject_rank else 0
    second_subject_name = subject_rank[1][0] if len(subject_rank) > 1 else "生物"
    second_subject_score = subject_rank[1][1] if len(subject_rank) > 1 else 0
    third_subject_name = subject_rank[2][0] if len(subject_rank) > 2 else "政治"
    third_subject_score = subject_rank[2][1] if len(subject_rank) > 2 else 0
    humanities_strength = history + politics + geography
    mixed_strength = physics + biology + geography

    if has_physics and has_chemistry:
        science_base = physics + chemistry
        third_subjects = sorted(
            [
                ("生物", biology, "物化生", "理工、医学、药学、生命科学方向覆盖更完整。"),
                ("地理", geography, "物化地", "保留理工基础，同时兼顾地理信息、资源环境等方向，总分稳定性通常更容易观察。"),
                ("政治", politics, "物化政", "保留理工基础，同时兼顾法学、公安、公共管理等方向。"),
            ],
            key=lambda item: item[1],
            reverse=True,
        )
        best_subject, best_score, recommended_combo, best_fit = third_subjects[0]
        alternatives = [
            ElectiveOption(combo=combo, reason=f"{subject}当前约 {round(score, 1)} 分，{fit}")
            for subject, score, combo, fit in third_subjects[1:]
        ]
        if physics < 45 or chemistry < 45:
            fallback_combo = "史政地" if humanities_strength >= mixed_strength else "物生地"
            return ElectiveAdvice(
                recommendation=fallback_combo,
                basis=(
                    f"物理 {round(physics, 1)} 分、化学 {round(chemistry, 1)} 分，"
                    "物化组合当前不够稳；先用更稳的组合守住总分，再回头复核理工方向是否值得保留。"
                ),
                alternatives=[
                    ElectiveOption(combo=recommended_combo, reason=f"如果目标专业明确要求物理、化学，可继续保留{recommended_combo}，但要先观察物化是否连续回升。"),
                    ElectiveOption(combo="物生地", reason="如果物理仍想保留且地理或生物更稳，这组更适合兼顾理工方向和总分稳定性。"),
                ],
                actions=[
                    "先确认目标专业是否强制要求物理或化学。",
                    "用最近两次考试验证物理、化学是否能稳定提升。",
                    f"结合{city}选科政策和学校开课资源复核最终组合。"
                ],
                note=f"建议先结合{city}最新选科政策和目标专业要求做最终复核。",
            )

        return ElectiveAdvice(
            recommendation=recommended_combo,
            basis=(
                f"物理和化学合计约 {round(science_base, 1)} 分，具备保留理工方向的基础；"
                f"第三科目前以{best_subject}更有优势（约 {round(best_score, 1)} 分），{best_fit}"
            ),
            alternatives=alternatives,
            actions=[
                "如果目标是临床、药学、生物相关，优先复核物化生的专业覆盖。",
                "如果地理明显高于生物，且更看重总分稳定性，可认真比较物化地。",
                "如果政治成绩突出且目标偏法学、警校、公共管理，可评估物化政。",
                f"最终以{city}最新选科政策、学校资源和连续成绩趋势为准。"
            ],
            note=f"建议结合{city}最新选科政策、学校资源和目标专业要求再最终确认。",
        )

    recommended_combo = f"物{second_subject_name[0]}{third_subject_name[0]}"
    if physics < 45 or chemistry < 45:
        recommended_combo = "史政地" if humanities_strength >= mixed_strength else "物生地"

    recommendation_basis = (
        f"当前得分较稳的科目是{top_subject_name}和{second_subject_name}，"
        f"其中{top_subject_name}约{round(top_subject_score, 1)}分，{second_subject_name}约{round(second_subject_score, 1)}分；"
        f"{third_subject_name}约{round(third_subject_score, 1)}分，作为第三科更容易形成总分稳定性。"
    )
    if physics < 45 or chemistry < 45:
        recommendation_basis = (
            f"物理{round(physics, 1)}分、化学{round(chemistry, 1)}分，当前物化基础偏弱；"
            f"相比之下，当前更稳的方向是{recommended_combo}，先用更稳的组合保证总分。"
        )

    alternatives = [
        ElectiveOption(
            combo="物化生",
            reason=f"如果目标专业偏医学、药学、生命科学，且物理和化学后续持续回升，这组最适合保留理工方向。"
        ),
        ElectiveOption(
            combo="物化地",
            reason=f"如果地理成绩长期高于{third_subject_name}，这组通常更利于总分稳定和专业覆盖平衡。"
        ),
        ElectiveOption(
            combo="史政地",
            reason="如果物化压力大，且历史、政治、地理更均衡，这组可以降低理科短板对总分的拖累。"
        ),
    ]

    actions = [
        "先核对目标专业是否要求物理或化学，避免组合和专业要求冲突。",
        "连续看最近2到3次考试，确认当前强项是否稳定，而不是只看一次成绩。",
        "若地理或生物明显高于同类学科，优先把它作为第三科比较对象。",
    ]

    return ElectiveAdvice(
        recommendation=recommended_combo,
        basis=recommendation_basis,
        alternatives=alternatives,
        actions=actions,
        note=f"建议结合{city}最新选科政策、学校开课资源和专业要求做最终复核。",
    )


def _format_elective_advice(plan: ElectiveAdvice) -> str:
    alternative_text = "；".join([f"{item.combo}：{item.reason}" for item in plan.alternatives])
    action_text = "；".join(plan.actions)
    return (
        f"直接建议：{plan.recommendation}。建议依据：{plan.basis}"
        f"{'。其他备选建议及依据：' + alternative_text if alternative_text else ''}"
        f"{'。下一步确认：' + action_text if action_text else ''}"
    )


def _build_elective_advice(city: str, score_input: ScoreInput) -> str:
    return _format_elective_advice(_build_elective_plan(city, score_input))


def _build_enhanced_subject_insight(
    item: SubjectPerformance,
    trend: dict[str, object] | None,
    material: EnhancedMaterial | None,
    base_report: ScoreReport,
) -> EnhancedSubjectInsight:
    if not _material_has_data(material):
        guidance = _build_missing_subject_guidance(item.name)
        return EnhancedSubjectInsight(
            name=item.name,
            trend_judgment=str(guidance["trend_judgment"]),
            diagnosis=str(guidance["diagnosis"]),
            evidence=str(guidance["evidence"]),
            action=str(guidance["action"]),
            next_target=str(guidance["next_target"]),
            analysis_rows=[],
            section_advice=list(guidance.get("section_advice", [])),
            analysis_summary=str(guidance["analysis_summary"]),
            score_gap_analysis=str(guidance["analysis_summary"]),
            loss_focus=list(guidance["loss_focus"]),
            stable_focus=list(guidance["stable_focus"]),
            source_basis=list(guidance["source_basis"]),
        )

    modules = _extract_module_scores(_combine_material_detail(material))
    module_summary = _format_extracted_modules(_combine_material_detail(material))
    trend_text = _format_trend_text(trend)
    gap_text = _build_subject_gap_analysis(item, base_report)
    analysis_rows = _build_analysis_rows(item, material)
    analysis_summary = _build_analysis_summary(item, material, module_summary, trend_text, gap_text)
    subject_coaching = _build_subject_specific_guidance(item.name, modules, item)
    section_advice = _build_section_advice(item.name, modules, item)
    diagnosis = subject_coaching["diagnosis"]
    evidence = "；".join([part for part in [trend_text, module_summary, subject_coaching["evidence"]] if part])
    action = subject_coaching["action"]
    next_target = subject_coaching["next_target"]
    return EnhancedSubjectInsight(
        name=item.name,
        trend_judgment=trend_text,
        diagnosis=diagnosis,
        evidence=evidence or diagnosis,
        action=action,
        next_target=next_target,
        analysis_rows=analysis_rows,
        section_advice=section_advice,
        analysis_summary=analysis_summary,
        score_gap_analysis=gap_text,
        loss_focus=_build_loss_focus(item.name, material),
        stable_focus=_build_stable_focus(item.name, item, material),
        source_basis=_build_source_basis(item.name, trend, material),
    )


def _build_analysis_rows(item: SubjectPerformance, material: EnhancedMaterial | None) -> list[EnhancedAnalysisRow]:
    if not _material_has_data(material):
        return []

    modules = _extract_module_scores(_combine_material_detail(material))
    if modules:
        rows = [
            EnhancedAnalysisRow(
                content=str(module["name"]),
                score=round(float(module["score"]), 1),
                full_score=round(float(module["full_score"]), 1),
                rate=round(float(module["rate"]), 1),
            )
            for module in modules
        ]
        rows.append(
            EnhancedAnalysisRow(
                content=f"{item.name}总分",
                score=round(item.score, 1),
                full_score=round(item.full_score, 1),
                rate=round(item.rate * 100, 1),
            )
        )
        return rows

    return [
        EnhancedAnalysisRow(
            content=f"{item.name}总分",
            score=round(item.score, 1),
            full_score=round(item.full_score, 1),
            rate=round(item.rate * 100, 1),
        )
    ]


def _build_section_advice(
    subject_name: str,
    modules: list[dict[str, Any]],
    item: SubjectPerformance,
) -> list[str]:
    if not modules:
        if _normalize_subject_key(subject_name) == "英语":
            return ["英语暂未拆出章节分数，建议优先补听力、阅读理解、完形填空、语法填空、应用文写作和读后续写的分项分数。"]
        return [f"{subject_name}暂未拆出章节分数，建议先补充到题型/章节级材料，再做分章节建议。"]

    overall_rate = round(item.rate * 100, 1)
    ranked = sorted(modules, key=lambda module: (float(module["rate"]), float(module["loss"])))
    weakest = ranked[0]
    strongest = ranked[-1]
    advice = [
        f"整体分析：{subject_name}整体得分率约 {overall_rate}%，当前最需要优先补的是{weakest['name']}，最稳的是{strongest['name']}。",
        f"整体建议：先稳住{strongest['name']}的正确率，再优先补{weakest['name']}，把失分最多的部分先拉起来。",
    ]

    if _normalize_subject_key(subject_name) == "英语":
        ordered_sections = [
            ("听力", ["听力", "听说", "listening"]),
            ("阅读理解", ["阅读理解", "阅读", "reading"]),
            ("完形填空", ["完形填空", "完形", "cloze"]),
            ("语法填空", ["语法填空", "语法", "grammar"]),
            ("应用文写作", ["应用文写作", "应用文", "writing"]),
            ("读后续写", ["读后续写", "概要写作", "续写", "continuation"]),
        ]
        for title, aliases in ordered_sections:
            matched = next((module for module in modules if _module_matches_alias(module["name"], aliases)), None)
            if matched:
                advice.append(_build_english_section_advice_line(title, matched))
        return advice or [f"{subject_name}已提取到分项，但未匹配到可识别的英语章节名称。"]

    for module in sorted(modules, key=lambda module: (float(module["rate"]), float(module["loss"]))):
        advice.append(_build_section_advice_line(str(module["name"]), module))
    if not advice:
        advice.append(f"{subject_name}暂未提取到有效章节建议。")
    return advice


def _build_english_section_advice_line(section_name: str, module: dict[str, Any]) -> str:
    rate = round(float(module["rate"]), 1)
    score = round(float(module["score"]), 1)
    full_score = round(float(module["full_score"]), 1)
    if section_name == "听力":
        if rate >= 85:
            advice = "继续保持听力输入节奏，重点防止关键词漏听和粗心失分。"
        elif rate >= 70:
            advice = "建议重点补中档题和常见错误，每周2次专项训练。"
        else:
            advice = "先补语音辨识、关键词捕捉和短时反应，连续3天做短时强化。"
    elif section_name == "阅读理解":
        if rate >= 85:
            advice = "继续保持限时阅读训练，重点检查定位是否更快。"
        elif rate >= 70:
            advice = "先补基础词汇、题型方法和错因，连续3天做短时强化。"
        else:
            advice = "优先补词汇、长难句和题型方法，再做限时阅读复盘。"
    elif section_name == "完形填空":
        if rate >= 85:
            advice = "继续保持语境判断能力，重点避免细节型失分。"
        elif rate >= 70:
            advice = "建议补上下文逻辑、搭配和常见易错项。"
        else:
            advice = "先补语境判断、词义辨析和固定搭配，再做短时强化。"
    elif section_name == "语法填空":
        if rate >= 85:
            advice = "继续巩固语法规则和固定搭配，减少细节失分。"
        elif rate >= 70:
            advice = "建议补中档题和常见语法错误，重点复盘易错点。"
        else:
            advice = "先补时态、主谓一致、从句和固定搭配，再做专项训练。"
    elif section_name == "应用文写作":
        if rate >= 85:
            advice = "继续保持格式与要点覆盖，重点优化表达准确性。"
        elif rate >= 70:
            advice = "建议补中档表达、句型升级和要点完整性。"
        else:
            advice = "先补模板句型、格式规范和要点覆盖，再做限时写作。"
    else:
        if rate >= 85:
            advice = "继续保持续写节奏，重点防止逻辑跳跃和细节遗漏。"
        elif rate >= 70:
            advice = "建议补情节衔接、人物动作和结尾收束，增强整体连贯性。"
        else:
            advice = "先补情节展开、逻辑衔接和常用表达，再做短篇续写训练。"
    return f"{section_name} {score}/{full_score}，得分率{rate}%，{advice}"


def _build_section_advice_line(section_name: str, module: dict[str, Any]) -> str:
    rate = round(float(module["rate"]), 1)
    score = round(float(module["score"]), 1)
    full_score = round(float(module["full_score"]), 1)
    if rate >= 85:
        return f"{section_name} {score}/{full_score}，得分率{rate}%，建议保持节奏并用限时训练防止粗心失分。"
    if rate >= 70:
        return f"{section_name} {score}/{full_score}，得分率{rate}%，建议继续补中档题和常见错因。"
    return f"{section_name} {score}/{full_score}，得分率{rate}%，建议优先补基础方法、典型题和错因复盘。"


def _build_analysis_summary(
    item: SubjectPerformance,
    material: EnhancedMaterial | None,
    module_summary: str,
    trend_text: str,
    gap_text: str,
) -> str:
    if not _material_has_data(material):
        return "由于缺少数据，该科目无法进行深入分析。"

    parts = [f"{item.name}当前得分率约 {round(item.rate * 100, 1)}%。"]
    if module_summary and module_summary != "未提取到明确的模块分数。":
        parts.append(f"模块拆解显示：{module_summary}")
    if trend_text and trend_text != "历史趋势不足，暂不判断变化方向。":
        parts.append(trend_text)
    if gap_text:
        parts.append(gap_text)
    return "".join(parts)


def _build_subject_specific_guidance(
    subject_name: str,
    modules: list[dict[str, Any]],
    item: SubjectPerformance,
) -> dict[str, str]:
    subject = _normalize_subject_key(subject_name)
    overall_rate = round(item.rate * 100, 1)
    if not modules:
        base = {
            "diagnosis": f"{subject_name}当前得分率约 {overall_rate}%，建议继续补齐题型材料后再细化到各部分。",
            "evidence": "材料中暂未提取到可拆分的分项分数。",
            "action": _build_subject_action_text(subject_name, None, item, modules),
            "next_target": f"下次把{subject_name}提升 3 到 5 分，并记录至少 1 个具体失分原因。",
        }
        return base

    ranked = sorted(modules, key=lambda module: (float(module["rate"]), float(module["loss"])), reverse=True)
    weakest = ranked[-1]
    strongest = ranked[0]
    row_text = "；".join(
        [
            f"{module['name']} {module['score']}/{module['full_score']}（{module['rate']}%）"
            for module in modules
        ]
    )
    if subject == "英语":
        part_guidance = _build_english_part_guidance(modules)
        diagnosis = f"英语整体得分率约 {overall_rate}%，分项表现为：{row_text}。"
        evidence = f"最弱分项是{weakest['name']}，最稳分项是{strongest['name']}。"
        action = _build_subject_action_text(subject_name, part_guidance, item, modules)
        next_target = part_guidance["next_target"]
        return {
            "diagnosis": diagnosis,
            "evidence": evidence,
            "action": action,
            "next_target": next_target,
        }

    diagnosis = f"{subject_name}整体得分率约 {overall_rate}%，分项表现为：{row_text}。"
    evidence = f"当前最弱部分是{weakest['name']}，最稳部分是{strongest['name']}。"
    action = _build_subject_action_text(subject_name, None, item, modules)
    next_target = f"下次先把{subject_name}提升 3 到 5 分，并让最弱部分至少回升 5 个百分点。"
    return {
        "diagnosis": diagnosis,
        "evidence": evidence,
        "action": action,
        "next_target": next_target,
    }


def _build_subject_action_text(
    subject_name: str,
    part_guidance: dict[str, str] | None,
    item: SubjectPerformance,
    modules: list[dict[str, Any]],
) -> str:
    if part_guidance and part_guidance.get("action"):
        return part_guidance["action"]

    if not modules:
        return f"围绕{subject_name}的基础题、典型题和错因清单做 20 到 30 分钟定向训练。"

    ranked = sorted(modules, key=lambda module: (float(module["rate"]), float(module["loss"])))
    weakest = ranked[0]
    strongest = ranked[-1]
    overall_rate = round(item.rate * 100, 1)
    return (
        f"{subject_name}整体得分率约{overall_rate}%，优先补{weakest['name']}，"
        f"再用限时训练巩固{strongest['name']}；"
        f"每周至少做2次专项训练，每次20到30分钟。"
    )


def _build_english_part_guidance(modules: list[dict[str, Any]]) -> dict[str, str]:
    parts = [
        ("听力", ["听力", "听说", "listening"]),
        ("阅读理解", ["阅读理解", "阅读", "reading"]),
        ("完形填空", ["完形填空", "完形", "cloze"]),
        ("语法填空", ["语法填空", "语法", "grammar"]),
        ("应用文写作", ["应用文写作", "应用文", "writing"]),
        ("读后续写", ["读后续写", "概要写作", "续写", "continuation"]),
    ]
    matched = []
    for title, aliases in parts:
        match = next((module for module in modules if _module_matches_alias(module["name"], aliases)), None)
        if match:
            matched.append((title, match))

    if not matched:
        return {
            "action": "先把英语按听力、阅读理解、完形填空、语法填空、应用文写作、读后续写拆开复盘，再分别找出每块失分原因。",
            "next_target": "下次先让英语各分项都能看清得分，再分别验证哪一块最拖后腿。",
        }

    actions = []
    targets = []
    for title, module in matched:
        rate = round(float(module["rate"]), 1)
        score = module["score"]
        full_score = module["full_score"]
        loss = round(float(module["loss"]), 1)
        if rate >= 85:
            actions.append(f"{title}继续保持当前节奏，每周做1次限时训练，重点防止粗心失分。")
        elif rate >= 70:
            actions.append(f"{title}重点补中档题和常见错误，每周2次专项训练。")
        else:
            actions.append(f"{title}先补基础词汇、题型方法和错因，连续3天做短时强化。")
        targets.append(f"{title}下次至少提升 3 到 5 分")

    strongest = max(matched, key=lambda item: float(item[1]["rate"]))[0]
    weakest = min(matched, key=lambda item: float(item[1]["rate"]))[0]
    return {
        "action": "；".join(actions),
        "next_target": f"英语先把{weakest}补起来，同时保持{strongest}的稳定；" + "，".join(targets[:3]),
    }


def _material_has_data(material: EnhancedMaterial | None) -> bool:
    if material is None:
        return False
    detail = (material.detail or "").strip()
    image_url = (material.image_url or "").strip()
    image_name = (material.image_name or "").strip()
    return bool(detail or image_url or image_name)


def _subject_has_any_material(material: EnhancedMaterial | None) -> bool:
    if not _material_has_data(material):
        return False
    detail = (material.detail or "").strip()
    if detail:
        return True
    return bool((material.image_url or "").strip() or (material.image_name or "").strip())


def _normalize_subject_key(subject: str) -> str:
    return re.sub(r"\s+", "", str(subject or "")).strip().lower()


def _combine_material_detail(material: EnhancedMaterial | None) -> str:
    if not material:
        return ""
    parts = [
        (material.detail or "").strip(),
        (material.image_name or "").strip(),
    ]
    return "；".join([part for part in parts if part])


def _build_material_map(materials: list[EnhancedMaterial]) -> dict[str, EnhancedMaterial]:
    grouped: dict[str, list[EnhancedMaterial]] = {}
    for material in materials:
        key = _normalize_subject_key(material.subject)
        if not key:
            continue
        grouped.setdefault(key, []).append(material)

    merged: dict[str, EnhancedMaterial] = {}
    for key, group in grouped.items():
        merged[key] = EnhancedMaterial(
            subject=group[0].subject,
            input_type="mixed" if len(group) > 1 else (group[0].input_type or "text"),
            detail="\n".join(
                [
                    part
                    for part in [
                        (item.detail or "").strip() or (item.image_name or "").strip()
                        for item in group
                    ]
                    if part
                ]
            ),
            image_url="；".join([item.image_url for item in group if item.image_url]),
            image_name="；".join([item.image_name for item in group if item.image_name]),
        )
    return merged


def _get_material_for_subject(
    material_map: dict[str, EnhancedMaterial],
    subject: str,
) -> EnhancedMaterial | None:
    return material_map.get(_normalize_subject_key(subject))


def _build_history_trend_map(history_records: list[HistoryExamRecord]) -> dict[str, dict[str, object]]:
    subject_scores: dict[str, list[float]] = {}
    for record in history_records:
        for subject in record.subjects:
            subject_scores.setdefault(subject.name, []).append(subject.score)

    trend_map: dict[str, dict[str, object]] = {}
    for name, scores in subject_scores.items():
        latest = scores[-1] if scores else None
        previous = scores[-2] if len(scores) > 1 else None
        diff = round(latest - previous, 1) if latest is not None and previous is not None else None
        if diff is None:
            direction = "历史记录不足，暂不判断趋势。"
        elif diff > 0:
            direction = f"近期上升 {round(diff, 1)} 分。"
        elif diff < 0:
            direction = f"近期下降 {abs(round(diff, 1))} 分。"
        else:
            direction = "近期保持稳定。"
        trend_map[name] = {
            "scores": scores,
            "latest": latest,
            "previous": previous,
            "diff": diff,
            "direction": direction,
        }
    return trend_map


def _build_overall_trend_summary(score_input: ScoreInput, history_records: list[HistoryExamRecord]) -> str:
    current_total = round(sum(item.score for item in score_input.subjects), 1)
    if len(history_records) < 2:
        return f"当前总分 {current_total} 分；历史记录不足 2 次，暂以本次成绩作为主判断。"
    last_two = history_records[-2:]
    previous_total = round(last_two[0].total_score, 1)
    latest_total = round(last_two[-1].total_score, 1)
    diff = round(latest_total - previous_total, 1)
    if diff > 0:
        direction = "上升"
    elif diff < 0:
        direction = "下降"
    else:
        direction = "持平"
    return f"最近两次总分从 {previous_total} 分到 {latest_total} 分，整体{direction} {abs(diff)} 分。当前总分 {current_total} 分。"


def _format_trend_text(trend: dict[str, object] | None) -> str:
    if not trend:
        return "历史趋势不足，暂不判断变化方向。"
    direction = str(trend.get("direction") or "历史趋势不足，暂不判断变化方向。")
    return direction


def _build_subject_diagnosis(item: SubjectPerformance, material: EnhancedMaterial | None) -> str:
    if not _material_has_data(material):
        return "由于缺少数据，该科目无法进行深入分析。"
    modules = _extract_module_scores(material.detail or "")
    if modules:
        top_module = modules[0]
        return f"{item.name}当前失分更集中在 {top_module['name']}，优先先补这一类。"
    return f"{item.name}已有补充材料，但模块分数不够完整，先从题型和错因入手。"


def _build_subject_evidence(
    item: SubjectPerformance,
    trend: dict[str, object] | None,
    material: EnhancedMaterial | None,
) -> str:
    if not _material_has_data(material):
        return "由于缺少数据，该科目无法进行深入分析。"
    parts = [f"{item.name}得分率约 {round(item.rate * 100, 1)}%。"]
    trend_text = _format_trend_text(trend)
    if trend_text:
        parts.append(trend_text)
    module_summary = _format_extracted_modules(material.detail or "")
    if module_summary:
        parts.append(module_summary)
    return " ".join(parts)


def _build_subject_action(item: SubjectPerformance, material: EnhancedMaterial | None) -> str:
    if not _material_has_data(material):
        return "由于缺少数据，该科目无法进行深入分析。"
    return f"围绕{item.name}的薄弱模块做 20 到 30 分钟定向训练，并复盘同类错因。"


def _build_subject_target(item: SubjectPerformance, material: EnhancedMaterial | None) -> str:
    if not _material_has_data(material):
        return "由于缺少数据，该科目无法进行深入分析。"
    return f"下次把{item.name}提升 3 到 5 分，先验证薄弱模块是否改善。"


def _build_subject_gap_analysis(item: SubjectPerformance, base_report: ScoreReport) -> str:
    for comparison in base_report.subject_comparison:
        if comparison.name == item.name:
            if comparison.gap_to_reference is not None:
                return f"与参考高分相差 {comparison.gap_to_reference} 分，优先补中档题和关键失分点。"
            return f"当前得分率约 {round(item.rate * 100, 1)}%，可继续围绕题型细节提升。"
    return "暂无对比分差参考。"


def _build_loss_focus(subject_name: str, material: EnhancedMaterial | None) -> list[str]:
    if not _material_has_data(material):
        return ["由于缺少数据，该科目无法进行深入分析。"]
    modules = _extract_module_scores(material.detail or "")
    if modules:
        return [f"优先补 {modules[0]['name']} 一类模块。"]
    return [f"优先补 {subject_name} 的题型分布和错因。"]


def _build_stable_focus(subject_name: str, item: SubjectPerformance, material: EnhancedMaterial | None) -> list[str]:
    if not _material_has_data(material):
        return ["由于缺少数据，该科目无法进行深入分析。"]
    return [f"{subject_name}当前得分率约 {round(item.rate * 100, 1)}%，先稳住已有得分较高的部分。"]


def _build_source_basis(
    subject_name: str,
    trend: dict[str, object] | None,
    material: EnhancedMaterial | None,
) -> list[str]:
    if not _material_has_data(material):
        return ["由于缺少数据，该科目无法进行深入分析。"]
    basis = [f"基于{subject_name}补充材料和现有成绩。"]
    if trend:
        basis.append(str(trend.get("direction") or "历史趋势不足，暂不判断变化方向。"))
    return basis


def _build_subject_gap_lines(base_report: ScoreReport, weakest_subjects: list[str]) -> list[str]:
    comparison_map = {item.name: item for item in base_report.subject_comparison}
    lines: list[str] = []
    for subject in weakest_subjects[:3]:
        comparison = comparison_map.get(subject)
        if not comparison:
            continue
        if comparison.gap_to_reference is not None:
            lines.append(f"{subject}与参考高分相差 {comparison.gap_to_reference} 分。")
        else:
            lines.append(f"{subject}当前得分率约 {round(comparison.rate * 100, 1)}%。")
    return lines


def _build_strength_breakthroughs(best_subjects: list[str], performances: list[SubjectPerformance]) -> list[str]:
    performance_map = {item.name: item for item in performances}
    lines: list[str] = []
    for subject in best_subjects[:2]:
        item = performance_map.get(subject)
        if not item:
            continue
        lines.append(f"{subject}先稳住当前得分率约 {round(item.rate * 100, 1)}%，避免优势回落。")
    return lines


