const SCORE_DRAFT_KEY = 'AIScoreAnalysis:scoreDraft'
const REPORT_KEY = 'AIScoreAnalysis:lastReport'
const ENHANCED_REPORT_KEY = 'AIScoreAnalysis:enhancedReport'
const HISTORY_KEY = 'AIScoreAnalysis:historyRecords'
const PREFERENCES_KEY = 'AIScoreAnalysis:preferences'

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

function setEnhancedReport(value) {
  wx.setStorageSync(ENHANCED_REPORT_KEY, value)
}

function getEnhancedReport() {
  return wx.getStorageSync(ENHANCED_REPORT_KEY) || null
}

function setHistoryRecords(value) {
  wx.setStorageSync(HISTORY_KEY, value)
}

function getHistoryRecords() {
  return wx.getStorageSync(HISTORY_KEY) || []
}

function appendHistoryRecord(record) {
  const next = [...getHistoryRecords(), record]
    .sort((a, b) => new Date(a.examDate || a.createdAt || 0).getTime() - new Date(b.examDate || b.createdAt || 0).getTime())
    .slice(-30)
  setHistoryRecords(next)
}

function updateHistoryRecord(recordId, updater) {
  const next = getHistoryRecords().map((record) => {
    if (record.id !== recordId) return record
    const updatedRecord = typeof updater === 'function' ? updater(record) : { ...record, ...updater }
    return {
      ...record,
      ...updatedRecord
    }
  })
  setHistoryRecords(next)
  return next
}

function removeHistoryRecord(recordId) {
  const next = getHistoryRecords().filter((record) => record.id !== recordId)
  setHistoryRecords(next)
  return next
}

function setPreferences(value) {
  wx.setStorageSync(PREFERENCES_KEY, value)
}

function getPreferences() {
  return wx.getStorageSync(PREFERENCES_KEY) || {}
}

module.exports = {
  setScoreDraft,
  getScoreDraft,
  setLastReport,
  getLastReport,
  setEnhancedReport,
  getEnhancedReport,
  setHistoryRecords,
  getHistoryRecords,
  appendHistoryRecord,
  updateHistoryRecord,
  removeHistoryRecord,
  setPreferences,
  getPreferences
}
