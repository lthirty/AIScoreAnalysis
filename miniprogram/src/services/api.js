import Taro from '@tarojs/taro'
import { API_BASE_URL } from '../shared/constants'
import { getStorage } from './storage'

const TOKEN_KEY = 'AIScoreAnalysis:token'

export async function request(path, options = {}) {
  const token = getStorage(TOKEN_KEY, '')
  const response = await Taro.request({
    url: `${API_BASE_URL}${path}`,
    method: options.method || 'GET',
    data: options.data || {},
    header: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.header || {})
    },
    timeout: options.timeout || 30000
  })

  if (response.statusCode < 200 || response.statusCode >= 300) {
    throw new Error(response.data?.message || `请求失败：${response.statusCode}`)
  }

  return response.data
}

export function uploadFile(path, filePath, formData = {}) {
  const token = getStorage(TOKEN_KEY, '')
  return Taro.uploadFile({
    url: `${API_BASE_URL}${path}`,
    filePath,
    name: 'file',
    formData,
    header: token ? { Authorization: `Bearer ${token}` } : {}
  })
}
