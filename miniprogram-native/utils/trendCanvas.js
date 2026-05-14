function getDpr() {
  try {
    return (wx.getWindowInfo && wx.getWindowInfo().pixelRatio) || 2
  } catch (error) {
    return 2
  }
}

function drawLineChart(canvas, width, height, points, options = {}) {
  if (!canvas || !points || !points.length) return
  const ctx = canvas.getContext('2d')
  const dpr = getDpr()
  canvas.width = width * dpr
  canvas.height = height * dpr
  ctx.scale(dpr, dpr)
  ctx.clearRect(0, 0, width, height)

  const padding = options.padding || { top: 18, right: 18, bottom: 28, left: 30 }
  const chartWidth = width - padding.left - padding.right
  const chartHeight = height - padding.top - padding.bottom
  const scores = points.map((point) => Number(point.score) || 0)
  const minScore = Math.min(...scores)
  const maxScore = Math.max(...scores)
  const yMin = Math.max(0, Math.floor((minScore - 10) / 10) * 10)
  const yMax = Math.ceil((maxScore + 10) / 10) * 10
  const yRange = Math.max(10, yMax - yMin)

  ctx.strokeStyle = options.gridColor || '#dbe4ee'
  ctx.lineWidth = 1
  for (let i = 0; i < 3; i += 1) {
    const y = padding.top + (chartHeight * i) / 2
    ctx.beginPath()
    ctx.moveTo(padding.left, y)
    ctx.lineTo(width - padding.right, y)
    ctx.stroke()
  }

  const pointNodes = points.map((point, index) => {
    const x = points.length === 1
      ? padding.left + chartWidth / 2
      : padding.left + (chartWidth * index) / (points.length - 1)
    const y = padding.top + chartHeight - (((point.score - yMin) / yRange) * chartHeight)
    return {
      x,
      y,
      label: point.label || point.date || '',
      score: point.score
    }
  })

  ctx.strokeStyle = options.lineColor || '#4f46e5'
  ctx.lineWidth = options.lineWidth || 2
  ctx.beginPath()
  pointNodes.forEach((point, index) => {
    if (index === 0) {
      ctx.moveTo(point.x, point.y)
    } else {
      ctx.lineTo(point.x, point.y)
    }
  })
  ctx.stroke()

  const showLabels = options.showLabels !== false
  pointNodes.forEach((point) => {
    ctx.fillStyle = '#ffffff'
    ctx.beginPath()
    ctx.arc(point.x, point.y, options.pointRadius || 3.5, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = options.pointColor || options.lineColor || '#2563eb'
    ctx.lineWidth = 2
    ctx.stroke()

    if (showLabels) {
      ctx.fillStyle = options.textColor || '#334155'
      ctx.font = `${options.fontSize || 11}px sans-serif`
      ctx.fillText(String(point.score), point.x - 12, point.y - 10)

      ctx.fillStyle = '#94a3b8'
      const label = point.label && point.label.length > 8 ? point.label.slice(5) : point.label
      ctx.fillText(label, point.x - 12, height - 8)
    }
  })
}

module.exports = {
  drawLineChart
}
