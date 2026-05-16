from app.schemas import (
    ElectiveAdvice,
    ElectiveOption,
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
        _build_enhanced_subject_insight(item, trend_map.get(item.name), material_map.get(item.name), base_report)
        for item in performances
    ]
    if not insights:
        insights = [
            EnhancedSubjectInsight(
                name="未录入学科",
                trend_judgment="由于缺少数据，因此无法进行深入分析。",
                diagnosis="由于缺少数据，因此无法进行深入分析。",
                evidence="由于缺少数据，因此无法进行深入分析。",
                action="由于缺少数据，因此无法进行深入分析。",
                next_target="由于缺少数据，因此无法进行深入分析。",
                score_gap_analysis="由于缺少数据，因此无法进行深入分析。",
                loss_focus=["由于缺少数据，因此无法进行深入分析。"],
                stable_focus=["由于缺少数据，因此无法进行深入分析。"],
                source_basis=["由于缺少数据，因此无法进行深入分析。"],
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
        core_diagnosis=_build_core_diagnosis(score_input, history_records, material_map, weakest_subjects) or [
            "当前增强材料较少，先从最弱学科和最常见失分类型入手。"
        ],
        subject_gap_analysis=_build_subject_gap_lines(base_report, weakest_subjects) or [
            "当前先以总分差和得分率作为判断依据，后续补充题型材料后再细化。"
        ],
        strength_breakthroughs=_build_strength_breakthroughs(best_subjects, performances) or [
            "先稳定优势科目，避免分数回落稀释总分提升。"
        ],
        execution_plan=_build_execution_plan(weakest_subjects, material_map) or [
            "先把当前输入科目拆成题型模块，找出最集中的失分点。"
        ],
        stage_goals=_build_stage_goals(score_input, weakest_subjects) or [
            "下一次考试先验证当前补救动作是否生效。"
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
        parent_focus=(
            "家长下一步重点不是追问为什么没考好，而是要求孩子把每一科的失分整理成“概念不清、"
            "审题失误、计算不稳、时间不够、表达不规范”五类，并只盯住下一次考试最影响总分的 1 到 2 科。"
        ),
        elective_note="选科建议需要连续成绩、兴趣、学校课程资源和当地政策共同验证；当前增强分析给出的是优先建议、依据和备选方向，不是绝对承诺。",
    )


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
        missing = "由于缺少数据，因此无法进行深入分析。"
        return EnhancedSubjectInsight(
            name=item.name,
            trend_judgment=missing,
            diagnosis=missing,
            evidence=missing,
            action=missing,
            next_target=missing,
            score_gap_analysis=missing,
            loss_focus=[missing],
            stable_focus=[missing],
            source_basis=[missing],
        )

    module_summary = _format_extracted_modules(material.detail or "")
    trend_text = _format_trend_text(trend)
    gap_text = _build_subject_gap_analysis(item, base_report)
    diagnosis = (
        f"{item.name}当前得分率约 {round(item.rate * 100, 1)}%，"
        f"{module_summary if module_summary != '未提取到明确的模块分数。' else '补充材料可以继续细化为题型或模块分数。'}"
    )
    evidence = "；".join([part for part in [trend_text, module_summary] if part])
    action = (
        f"围绕{item.name}最弱模块做 20 到 30 分钟定向训练，"
        "优先整理错因、步骤和易错题型，再做 1 组限时题。"
    )
    next_target = f"下次先把{item.name}提升 3 到 5 分，并确认同类错因是否减少。"
    return EnhancedSubjectInsight(
        name=item.name,
        trend_judgment=trend_text,
        diagnosis=diagnosis,
        evidence=evidence or diagnosis,
        action=action,
        next_target=next_target,
        score_gap_analysis=gap_text,
        loss_focus=_build_loss_focus(item.name, material),
        stable_focus=_build_stable_focus(item.name, item, material),
        source_basis=_build_source_basis(item.name, trend, material),
    )


def _material_has_data(material: EnhancedMaterial | None) -> bool:
    if material is None:
        return False
    return bool((material.detail or "").strip() or (material.image_url or "").strip())


def _build_material_map(materials: list[EnhancedMaterial]) -> dict[str, EnhancedMaterial]:
    return {material.subject: material for material in materials if material.subject}


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
        return "由于缺少数据，因此无法进行深入分析。"
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
        return "由于缺少数据，因此无法进行深入分析。"
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
        return "由于缺少数据，因此无法进行深入分析。请补充试卷照片或题型得分。"
    return f"围绕{item.name}的薄弱模块做 20 到 30 分钟定向训练，并复盘同类错因。"


def _build_subject_target(item: SubjectPerformance, material: EnhancedMaterial | None) -> str:
    if not _material_has_data(material):
        return "由于缺少数据，因此无法进行深入分析。"
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
        return ["由于缺少数据，因此无法进行深入分析。"]
    modules = _extract_module_scores(material.detail or "")
    if modules:
        return [f"优先补 {modules[0]['name']} 一类模块。"]
    return [f"优先补 {subject_name} 的题型分布和错因。"]


def _build_stable_focus(subject_name: str, item: SubjectPerformance, material: EnhancedMaterial | None) -> list[str]:
    if not _material_has_data(material):
        return ["由于缺少数据，因此无法进行深入分析。"]
    return [f"{subject_name}当前得分率约 {round(item.rate * 100, 1)}%，先稳住已有得分较高的部分。"]


def _build_source_basis(
    subject_name: str,
    trend: dict[str, object] | None,
    material: EnhancedMaterial | None,
) -> list[str]:
    if not _material_has_data(material):
        return ["由于缺少数据，因此无法进行深入分析。"]
    basis = [f"基于{subject_name}补充材料和现有成绩。"]
    if trend:
        basis.append(str(trend.get("direction") or "历史趋势不足，暂不判断变化方向。"))
    return basis


def _build_core_diagnosis(
    score_input: ScoreInput,
    history_records: list[HistoryExamRecord],
    material_map: dict[str, EnhancedMaterial],
    weakest_subjects: list[str],
) -> list[str]:
    total_score = round(sum(item.score for item in score_input.subjects), 1)
    lines = [f"本次总分 {total_score} 分，先围绕 {', '.join(weakest_subjects[:3]) or '当前最弱学科'} 处理。"]
    missing = [item.name for item in score_input.subjects if not _material_has_data(material_map.get(item.name))]
    if missing:
        lines.append(f"{'、'.join(missing)}科目由于缺少数据，因此无法进行深入分析。")
    if len(history_records) >= 2:
        lines.append("历史记录已足够形成弱趋势判断，可继续观察连续变化。")
    else:
        lines.append("历史记录较少，趋势判断先作为辅助，不作为稳定结论。")
    return lines


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


def _build_execution_plan(weakest_subjects: list[str], material_map: dict[str, EnhancedMaterial]) -> list[str]:
    lines: list[str] = []
    for subject in weakest_subjects[:3]:
        material = material_map.get(subject)
        if not _material_has_data(material):
            lines.append(f"{subject}由于缺少数据，因此无法进行深入分析。")
        else:
            lines.append(f"{subject}先用 20 到 30 分钟拆题型训练，再做 1 组限时题。")
    return lines


def _build_stage_goals(score_input: ScoreInput, weakest_subjects: list[str]) -> list[str]:
    total_score = round(sum(item.score for item in score_input.subjects), 1)
    lines = [f"下一次考试先把总分目标定在 {total_score + 10:.1f} 分以上。"]
    if weakest_subjects:
        lines.append(f"{weakest_subjects[0]}优先提升 5 到 10 分。")
    return lines
