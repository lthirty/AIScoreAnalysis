import { request } from './api'

export function getExamRecords() {
  return request('/api/exam-records')
}

export function createExamRecord(payload) {
  return request('/api/exam-records', {
    method: 'POST',
    data: payload
  })
}

export function updateExamRecord(recordId, payload) {
  return request(`/api/exam-records/${recordId}`, {
    method: 'PUT',
    data: payload
  })
}

export function deleteExamRecord(recordId) {
  return request(`/api/exam-records/${recordId}`, {
    method: 'DELETE'
  })
}
