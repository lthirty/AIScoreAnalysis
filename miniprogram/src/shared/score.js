export function toNumber(value) {
  if (value === '' || value === null || value === undefined) return null

  const numeric = Number(value)
  return Number.isNaN(numeric) ? null : numeric
}

export function calculateTotalScore(scores) {
  return (scores || []).reduce((sum, item) => sum + (toNumber(item.score) || 0), 0)
}

export function normalizeScoreRows(rows) {
  return (rows || [])
    .map(item => ({
      subject: String(item.subject || '').trim(),
      score: toNumber(item.score),
      fullScore: toNumber(item.fullScore),
      maxScore: toNumber(item.maxScore)
    }))
    .filter(item => item.subject && item.score !== null)
}
