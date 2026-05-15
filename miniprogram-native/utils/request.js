const { useCloudContainer, cloudEnv, cloudService, cloudResourceAppid, publicBaseUrl, localBaseUrl } = require('./config')
const { getPreferences } = require('./storage')

function buildAiHeaders() {
  const preferences = getPreferences()
  const aiConfig = preferences.aiConfig || {}
  const headers = {}

  if (aiConfig.endpoint) headers['X-AI-ENDPOINT'] = aiConfig.endpoint
  if (aiConfig.apiKey) headers['X-AI-API-KEY'] = aiConfig.apiKey
  if (aiConfig.analyzeModel) headers['X-AI-ANALYZE-MODEL'] = aiConfig.analyzeModel
  if (aiConfig.ocrModel) headers['X-AI-OCR-MODEL'] = aiConfig.ocrModel

  return headers
}

function request({ path, method = 'GET', data = {}, header = {} }) {
  const aiHeaders = buildAiHeaders()
  if (useCloudContainer) {
    const config = cloudResourceAppid
      ? { env: cloudEnv, resourceAppid: cloudResourceAppid }
      : { env: cloudEnv }

    return wx.cloud.callContainer({
      config,
      path,
      method,
      data,
      header: {
        'X-WX-SERVICE': cloudService,
        'content-type': 'application/json',
        ...aiHeaders,
        ...header
      }
    }).then((res) => {
      if (res.statusCode && (res.statusCode < 200 || res.statusCode >= 300)) {
        return Promise.reject({
          statusCode: res.statusCode,
          data: res.data
        })
      }
      return typeof res.data === 'string' ? JSON.parse(res.data) : res.data
    })
  }

  return requestByUrl({
    baseUrl: publicBaseUrl || localBaseUrl,
    path,
    method,
    data,
    header: {
      ...aiHeaders,
      ...header
    }
  })
}

function requestByUrl({ baseUrl, path, method = 'GET', data = {}, header = {} }) {
  return new Promise((resolve, reject) => {
    wx.request({
      url: `${baseUrl}${path}`,
      method,
      data,
      header: {
        'content-type': 'application/json',
        ...header
      },
      success(res) {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data)
          return
        }
        reject(res)
      },
      fail: reject
    })
  })
}

module.exports = { request }
