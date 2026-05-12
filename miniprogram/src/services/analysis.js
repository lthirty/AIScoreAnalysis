import { request, uploadFile } from './api'

export function recognizeScoreSheet(filePath, type) {
  return uploadFile('/api/ocr/score-sheet', filePath, { type })
}

export function runBasicAnalysis(payload) {
  return request('/api/analysis/basic', {
    method: 'POST',
    data: payload,
    timeout: 120000
  })
}

export function runEnhancedAnalysis(payload) {
  return request('/api/analysis/enhanced', {
    method: 'POST',
    data: payload,
    timeout: 120000
  })
}

export function runSubjectTrendAnalysis(payload) {
  return request('/api/analysis/subject-trend', {
    method: 'POST',
    data: payload,
    timeout: 120000
  })
}
