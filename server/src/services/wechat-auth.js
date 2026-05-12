import { config } from '../config.js'

export async function exchangeWechatCode(code) {
  if (!config.wechat.appId || !config.wechat.appSecret) {
    throw new Error('服务端未配置 WECHAT_APP_ID 或 WECHAT_APP_SECRET')
  }

  const url = new URL('https://api.weixin.qq.com/sns/jscode2session')
  url.searchParams.set('appid', config.wechat.appId)
  url.searchParams.set('secret', config.wechat.appSecret)
  url.searchParams.set('js_code', code)
  url.searchParams.set('grant_type', 'authorization_code')

  const response = await fetch(url)
  const data = await response.json()

  if (!response.ok || data.errcode) {
    throw new Error(data.errmsg || '微信登录换取 openid 失败')
  }

  return data
}
