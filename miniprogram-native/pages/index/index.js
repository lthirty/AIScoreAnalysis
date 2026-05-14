const { getHistoryRecords, getPreferences, setPreferences } = require('../../utils/storage')
const { buildTrendSummary } = require('../../utils/trend')
const { drawLineChart } = require('../../utils/trendCanvas')

Page({
  data: {
    city: '杭州',
    historyRecords: [],
    subjectTrendRows: [],
    showTrendEmpty: true
  },

  onShow() {
    const preferences = getPreferences()
    const city = preferences.city || '杭州'
    const historyRecords = getHistoryRecords()
    const trendSummary = buildTrendSummary(historyRecords)
    this.setData({
      city,
      historyRecords,
      trendSummary,
      subjectTrendRows: (trendSummary && trendSummary.subjects) || [],
      showTrendEmpty: historyRecords.length === 0
    })
    if (historyRecords.length > 0) {
      wx.nextTick(() => this.renderTrendCharts())
    }
  },

  onCityInput(event) {
    const city = event.detail.value.trim()
    this.setData({ city })
    setPreferences({ city })
  },

  renderTrendCharts() {
    this.renderTrendChart()
    this.renderSubjectTrendCharts()
  },

  renderTrendChart() {
    const points = this.data.trendSummary && this.data.trendSummary.total && this.data.trendSummary.total.points
    if (!points || !points.length) return
    const query = wx.createSelectorQuery()
    query.select('#totalTrendCanvas').fields({ node: true, size: true }).exec((res) => {
      const target = res && res[0]
      if (!target || !target.node) return
      drawLineChart(target.node, target.width, target.height, points, {
        lineColor: '#4f46e5',
        pointColor: '#2563eb',
        showLabels: true
      })
    })
  },

  renderSubjectTrendCharts() {
    const rows = this.data.subjectTrendRows || []
    if (!rows.length) return
    const query = wx.createSelectorQuery()
    query.selectAll('.subject-trend-canvas').fields({ node: true, size: true }).exec((res) => {
      const nodes = res && res[0]
      if (!nodes || !nodes.length) return
      nodes.forEach((target, index) => {
        const row = rows[index]
        if (!row || !row.points || !row.points.length || !target.node) return
        drawLineChart(target.node, target.width, target.height, row.points, {
          lineColor: '#22c55e',
          pointColor: '#16a34a',
          showLabels: false,
          pointRadius: 3,
          lineWidth: 2,
          padding: { top: 12, right: 12, bottom: 18, left: 12 }
        })
      })
    })
  },

  goInput() {
    wx.navigateTo({ url: '/pages/input/index' })
  },
  goLastReport() {
    wx.navigateTo({ url: '/pages/report/index' })
  },
  goPrivacy() {
    wx.navigateTo({ url: '/pages/privacy/index' })
  }
})
