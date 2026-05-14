from app.schemas import EnhancedScoreReport, EnhancedSubjectInsight, PriorityItem, ScoreInput, ScoreReport, SubjectPerformance


def build_mock_report(score_input: ScoreInput) -> ScoreReport:
    performances = [_build_subject_performance(item) for item in score_input.subjects]
    sorted_by_rate = sorted(performances, key=lambda item: item.rate)
    priority = [
        PriorityItem(
            name=item.name,
            reason=f"当前得分率为 {round(item.rate * 100)}%，是短期提分优先级较高的学科。",
            action=f"先整理{item.name}最近一次考试的错题类型，每天安排20分钟定向练习。",
        )
        for item in sorted_by_rate[:2]
    ]

    total_score = sum(item.score for item in score_input.subjects)
    total_full_score = sum(item.full_score for item in score_input.subjects)
    overall_rate = total_score / total_full_score if total_full_score else 0
    grade = score_input.student.grade or "当前年级"
    city = score_input.student.city or "所在城市"
    comparison_note = ""
    if score_input.max_subjects:
        comparison_note = " 已纳入班级/年段最好成绩作为对比参考。"

    return ScoreReport(
        summary=(
            f"本次{grade}成绩总分 {round(total_score, 1)}/{round(total_full_score, 1)}，"
            f"总体得分率约 {round(overall_rate * 100)}%。建议先抓最薄弱的1-2科，"
            f"通过错题归因和针对性练习验证是否能形成稳定改进。{comparison_note}"
        ),
        subject_performance=performances,
        priority=priority,
        parent_advice=(
            "家长可以重点关注孩子是否说得清楚错因，而不是只追问分数。"
            "如果孩子能把错题归因讲具体，后续提分路径会更稳定。"
        ),
        elective_advice=(
            f"MVP阶段暂不输出强结论选科建议。建议结合{city}选科政策、学校课程资源、"
            "孩子兴趣和连续多次成绩趋势再判断。"
        ),
    )


def build_mock_enhanced_report(score_input: ScoreInput) -> EnhancedScoreReport:
    performances = [_build_subject_performance(item) for item in score_input.subjects]
    sorted_by_rate = sorted(performances, key=lambda item: item.rate)
    insights = [
        EnhancedSubjectInsight(
            name=item.name,
            trend_judgment="历史材料不足，暂以当前成绩结构为主判断。",
            diagnosis=(
                f"{item.name}当前得分率约 {round(item.rate * 100)}%。"
                "现有材料只能判断总分和学科分数层面的短板，不能直接定位具体题型或知识点。"
            ),
            evidence=f"本次得分 {item.score}/{item.full_score}，等级判断为“{item.level}”。",
            action=f"优先补充{item.name}试卷照片或按题型记录得分、失分原因，再做下一轮细化归因。",
            next_target=f"下次先把{item.name}中最常失分的两类题型单独记录下来，再观察是否稳定回升。",
        )
        for item in sorted_by_rate[:3]
    ]

    return EnhancedScoreReport(
        summary="增强分析已基于当前结构化成绩生成。由于暂未提供各科试卷或题型得分，结论会克制在学科分数、分差和材料补充建议范围内。",
        overall_trend="当前增强分析尚未拿到足够历史记录时，只能把本次成绩作为基线。后续连续保存考试后，会进一步判断持续上升、持续下降或波动明显的科目。",
        subject_insights=insights,
        risk_alerts=[
            "未提供题型级材料时，不能准确定位具体知识点失分。",
            "如果历史记录少于2次，趋势判断只作为弱提示，不作为硬结论。"
        ],
        followup_materials=[
            "补充优先学科的试卷照片、答题卡或错题截图。",
            "按题型记录每部分满分、得分和主要失分原因。",
            "补充最近2-3次同类考试成绩，用于判断趋势是否稳定。",
        ],
        parent_focus="家长下一步重点不是追问为什么没考好，而是帮助孩子把错因分成会做做错、不会做、时间不够和表达不规范四类。",
        elective_note="选科判断需要连续成绩、兴趣、学校课程资源和当地政策共同验证；当前增强分析只提示风险点，不输出绝对结论。",
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
