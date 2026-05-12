import Taro from '@tarojs/taro'
import { request } from './api'
import { setStorage, removeStorage } from './storage'

const TOKEN_KEY = 'AIScoreAnalysis:token'
const USER_KEY = 'AIScoreAnalysis:user'

export async function loginWithWechat() {
  const loginResult = await Taro.login()
  if (!loginResult.code) {
    throw new Error('微信登录失败，未获取到 code')
  }

  const data = await request('/api/auth/wechat-login', {
    method: 'POST',
    data: { code: loginResult.code }
  })

  setStorage(TOKEN_KEY, data.token)
  setStorage(USER_KEY, data.user)
  return data.user
}

export function logout() {
  removeStorage(TOKEN_KEY)
  removeStorage(USER_KEY)
}
