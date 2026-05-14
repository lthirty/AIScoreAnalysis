from app.schemas import PriorityItem, ScoreInput, ScoreReport, SubjectPerformance


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
            f"用两周时间验证是否能形成稳定改进。{comparison_note}"
        ),
        subject_performance=performances,
        priority=priority,
        two_week_plan=[
            "第1-2天：把各科错题按知识点、审题、计算、表达四类重新归因。",
            "第3-7天：围绕优先学科做小题组训练，每天记录正确率和耗时。",
            "第8-12天：复做同类错题，并补一套限时训练检查迁移效果。",
            "第13-14天：和家长一起复盘有效方法，决定下次考试前保留哪些动作。",
        ],
        parent_advice=(
            "家长可以重点关注孩子是否说得清楚错因，而不是只追问分数。"
            "如果孩子能把错题归因讲具体，后续提分路径会更稳定。"
        ),
        elective_advice=(
            f"MVP阶段暂不输出强结论选科建议。建议结合{city}选科政策、学校课程资源、"
            "孩子兴趣和连续多次成绩趋势再判断。"
        ),
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
