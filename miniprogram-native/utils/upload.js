const { request } = require('./request')

const OCR_POLL_INTERVAL_MS = 2000
const OCR_MAX_WAIT_MS = 90000

function uploadToCloud(filePath, type, folder = 'score-ocr') {
  const extension = filePath.toLowerCase().includes('.png') ? 'png' : 'jpg'
  const cloudPath = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}-${type}.${extension}`
  return wx.cloud.uploadFile({
    cloudPath,
    filePath
  })
}

function getTempFileURL(fileID) {
  return wx.cloud.getTempFileURL({
    fileList: [fileID]
  }).then((res) => {
    const file = res.fileList && res.fileList[0]
    if (!file || !file.tempFileURL) {
      return Promise.reject({ detail: '图片临时访问链接生成失败' })
    }
    return file.tempFileURL
  })
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function pollOcrJob(jobId) {
  const startedAt = Date.now()
  while (Date.now() - startedAt < OCR_MAX_WAIT_MS) {
    await sleep(OCR_POLL_INTERVAL_MS)
    const job = await request({
      path: `/api/ocr-score-job/${jobId}`,
      method: 'GET'
    })
    if (job.status === 'done') {
      return job.result
    }
    if (job.status === 'failed') {
      return Promise.reject({ detail: job.error || '图片识别任务失败' })
    }
  }
  return Promise.reject({ detail: '图片识别仍在处理中，请稍后重试或使用文字录入。' })
}

async function uploadScoreImage({ filePath, type }) {
  const uploadResult = await uploadToCloud(filePath, type)
  const fileUrl = await getTempFileURL(uploadResult.fileID)
  const job = await request({
    path: '/api/ocr-score-job',
    method: 'POST',
    data: {
      file_url: fileUrl,
      type
    }
  })
  return pollOcrJob(job.job_id)
}

async function uploadFileForUrl({ filePath, type, folder = 'enhanced-materials' }) {
  const uploadResult = await uploadToCloud(filePath, type, folder)
  const fileUrl = await getTempFileURL(uploadResult.fileID)
  return {
    fileID: uploadResult.fileID,
    fileUrl
  }
}

module.exports = { uploadScoreImage, uploadFileForUrl }
