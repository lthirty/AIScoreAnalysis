const SUBJECTS = ['语文', '数学', '英语', '物理', '化学', '生物', '历史', '地理', '政治']

function parseScoreText(text, student, exam) {
  const fullScoreHint = extractFullScoreHint(text)
  const subjects = []
  const seen = {}

  SUBJECTS.forEach((subject) => {
    const pattern = new RegExp(`${subject}\\D{0,8}(\\d+(?:\\.\\d+)?)`)
    const match = text.match(pattern)
    if (!match || seen[subject]) return
    const score = Number(match[1])
    if (Number.isNaN(score)) return
    seen[subject] = true
    subjects.push({
      name: subject,
      score,
      full_score: inferFullScore(subject, score, fullScoreHint)
    })
  })

  return {
    student: student || {},
    exam: exam || {},
    subjects,
    max_subjects: []
  }
}

function extractFullScoreHint(text) {
  const match = text.match(/满分\D{0,4}(\d+(?:\.\d+)?)/)
  return match ? Number(match[1]) : null
}

function inferFullScore(subject, score, fullScoreHint) {
  if (fullScoreHint && score <= fullScoreHint) return fullScoreHint
  if (subject === '语文' || subject === '数学' || subject === '英语' || score > 100) return 150
  return 100
}

module.exports = { parseScoreText }
