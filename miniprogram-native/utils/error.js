function formatError(error) {
  if (!error) return '未知错误'
  if (typeof error === 'string') return error
  if (error.errMsg) return error.errMsg
  if (error.data && error.data.detail) {
    return typeof error.data.detail === 'string' ? error.data.detail : JSON.stringify(error.data.detail)
  }
  if (error.detail) {
    return typeof error.detail === 'string' ? error.detail : JSON.stringify(error.detail)
  }
  if (error.statusCode) return `请求失败：${error.statusCode}`
  try {
    return JSON.stringify(error)
  } catch (formatError) {
    return '请求失败'
  }
}

function showError(title, error) {
  wx.showModal({
    title,
    content: formatError(error).slice(0, 500),
    showCancel: false
  })
}

module.exports = { formatError, showError }
