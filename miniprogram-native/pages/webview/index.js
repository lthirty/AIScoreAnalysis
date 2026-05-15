Page({
  data: {
    url: '',
    title: '教育局官网'
  },

  onLoad(options) {
    const url = options && options.url ? decodeURIComponent(options.url) : ''
    const title = options && options.title ? decodeURIComponent(options.title) : '教育局官网'
    this.setData({ url, title })
    wx.setNavigationBarTitle({ title })
  }
})
