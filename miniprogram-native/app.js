App({
  globalData: {},
  onLaunch() {
    const { cloudEnv, cloudResourceAppid } = require('./utils/config')
    if (wx.cloud && cloudEnv) {
      const config = {
        env: cloudEnv,
        traceUser: true
      }
      if (cloudResourceAppid) {
        config.resourceAppid = cloudResourceAppid
      }
      wx.cloud.init(config)
    }
  }
})
