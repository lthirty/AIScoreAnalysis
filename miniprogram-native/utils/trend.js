function toNumber(value) {
  const numeric = Number(value)
  return Number.isNaN(numeric) ? null : numeric
}

function calculateTotalScore(subjects) {
  return Math.round((subjects || []).reduce((sum, item) => sum + (toNumber(item.score) || 0), 0) * 10) / 10
}

function sortExamRecords(records) {
  return [...(records || [])].sort((a, b) => {
    const aTime = new Date(a.examDate || a.date || a.createdAt || 0).getTime()
    const bTime = new Date(b.examDate || b.date || b.createdAt || 0).getTime()
    return aTime - bTime
  })
}

function buildTrendDataset(records) {
  const chronologicalRecords = sortExamRecords(records || [])
  const totalPoints = chronologicalRecords.map((record) => ({
    date: record.examDate || record.date || '',
    score: toNumber(record.totalScore) || calculateTotalScore(record.subjects || []),
    label: record.examName || record.examDate || record.date || ''
  }))

  const subjectMap = {}
  chronologicalRecords.forEach((record) => {
    ;(record.subjects || []).forEach((item) => {
      if (!subjectMap[item.name]) subjectMap[item.name] = []
      subjectMap[item.name].push({
        date: record.examDate || record.date || '',
        score: toNumber(item.score) || 0,
        label: record.examName || record.examDate || record.date || ''
      })
    })
  })

  return {
    total: { points: totalPoints },
    subjects: Object.keys(subjectMap).map((name) => ({
      label: name,
      points: subjectMap[name]
    }))
  }
}

function analyzeScoreSeries(points) {
  if (!points || points.length <= 1) {
    return {
      diff: 0,
      direction: '数据不足',
      volatility: 0,
      maxDrop: 0,
      risingCount: 0,
      fallingCount: 0
    }
  }

  const deltas = []
  for (let i = 1; i < points.length; i += 1) {
    deltas.push(Math.round((points[i].score - points[i - 1].score) * 10) / 10)
  }
  const risingCount = deltas.filter((delta) => delta > 0).length
  const fallingCount = deltas.filter((delta) => delta < 0).length
  const maxDrop = Math.min(...deltas, 0)
  const maxRise = Math.max(...deltas, 0)
  const scores = points.map((point) => point.score)
  const volatility = Math.round((Math.max(...scores) - Math.min(...scores)) * 10) / 10
  const diff = Math.round((points[points.length - 1].score - points[0].score) * 10) / 10

  let direction = '基本稳定'
  if (risingCount >= fallingCount + 2 && diff > 0) {
    direction = '持续上升'
  } else if (fallingCount >= risingCount + 2 && diff < 0) {
    direction = '持续下降'
  } else if (Math.abs(maxRise) >= 8 && Math.abs(maxDrop) >= 8) {
    direction = '波动明显'
  } else if (diff > 0) {
    direction = '震荡上升'
  } else if (diff < 0) {
    direction = '震荡下降'
  }

  return {
    diff,
    direction,
    volatility,
    maxDrop: Math.abs(maxDrop),
    risingCount,
    fallingCount
  }
}

function buildTrendSummary(records) {
  const series = buildTrendDataset(records)
  if (!series.total.points.length) {
    return {
      total: null,
      subjects: [],
      summary: '暂无历史成绩记录。'
    }
  }
  if (series.total.points.length === 1) {
    return {
      total: {
        current: series.total.points[0].score,
        direction: '首条记录'
      },
      subjects: series.subjects.map((seriesItem) => ({
        subject: seriesItem.label,
        current: seriesItem.points[0].score,
        direction: '首条记录'
      })),
      summary: '目前只有一次考试记录，后续保存新成绩后会显示变化趋势。'
    }
  }

  const totalTrend = analyzeScoreSeries(series.total.points)
  const subjectSummaries = series.subjects.map((seriesItem) => {
    const trend = analyzeScoreSeries(seriesItem.points)
      return {
        subject: seriesItem.label,
        current: seriesItem.points[seriesItem.points.length - 1].score,
        diff: trend.diff,
        direction: trend.direction,
        volatility: trend.volatility,
        points: seriesItem.points
      }
    })

  return {
    total: {
      current: series.total.points[series.total.points.length - 1].score,
      diff: totalTrend.diff,
      direction: totalTrend.direction,
      volatility: totalTrend.volatility,
      points: series.total.points
    },
    subjects: subjectSummaries,
    summary: `已保存 ${series.total.points.length} 次考试：总分${totalTrend.diff >= 0 ? '提升' : '下降'} ${Math.abs(totalTrend.diff)} 分，当前趋势${totalTrend.direction}。`
  }
}

function formatTrendSummaryForPrompt(records) {
  const series = buildTrendDataset(records)
  if (!series.total.points.length) return '暂无历史成绩记录。'
  if (series.total.points.length === 1) return `仅有一次记录：${series.total.points[0].date}:${series.total.points[0].score}`

  const totalTrend = analyzeScoreSeries(series.total.points)
  const lines = [
    `总分：${series.total.points.map((point) => `${point.date}:${point.score}`).join(' -> ')}，变化${totalTrend.diff >= 0 ? '+' : ''}${totalTrend.diff}分，趋势${totalTrend.direction}，波动${totalTrend.volatility}分。`
  ]
  series.subjects.forEach((seriesItem) => {
    const trend = analyzeScoreSeries(seriesItem.points)
    lines.push(
      `${seriesItem.label}：${seriesItem.points.map((point) => `${point.date}:${point.score}`).join(' -> ')}，变化${trend.diff >= 0 ? '+' : ''}${trend.diff}分，趋势${trend.direction}。`
    )
  })
  return lines.join('\n')
}

module.exports = {
  calculateTotalScore,
  sortExamRecords,
  buildTrendDataset,
  analyzeScoreSeries,
  buildTrendSummary,
  formatTrendSummaryForPrompt
}
