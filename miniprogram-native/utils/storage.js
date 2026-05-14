const SCORE_DRAFT_KEY = 'AIScoreAnalysis:scoreDraft'
const REPORT_KEY = 'AIScoreAnalysis:lastReport'

function setScoreDraft(value) {
  wx.setStorageSync(SCORE_DRAFT_KEY, value)
}

function getScoreDraft() {
  return wx.getStorageSync(SCORE_DRAFT_KEY) || null
}

function setLastReport(value) {
  wx.setStorageSync(REPORT_KEY, value)
}

function getLastReport() {
  return wx.getStorageSync(REPORT_KEY) || null
}

module.exports = {
  setScoreDraft,
  getScoreDraft,
  setLastReport,
  getLastReport
}
