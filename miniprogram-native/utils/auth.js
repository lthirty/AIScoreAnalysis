const { request } = require('./request')

const SESSION_KEY = 'AIScoreAnalysis:session'

function getSession() {
  return wx.getStorageSync(SESSION_KEY) || null
}

function setSession(value) {
  wx.setStorageSync(SESSION_KEY, value)
}

function clearSession() {
  wx.removeStorageSync(SESSION_KEY)
}

function isLoggedIn() {
  const session = getSession()
  return session && session.session_key
}

async function loginWechat() {
  return new Promise((resolve, reject) => {
    wx.login({
      timeout: 10000,
      success: async (res) => {
        if (!res.code) {
          reject({ detail: '微信登录code获取失败' })
          return
        }
        try {
          const result = await request({
            path: '/api/auth/wechat-login',
            method: 'POST',
            data: { code: res.code }
          })
          const session = {
            session_key: result.session_key,
            openid: result.openid,
            anonymous: result.anonymous || false
          }
          setSession(session)
          resolve(session)
        } catch (err) {
          reject(err)
        }
      },
      fail: () => {
        reject({ detail: '微信登录失败，请检查网络' })
      }
    })
  })
}

async function loginAnonymous() {
  const result = await request({
    path: '/api/auth/anonymous-login',
    method: 'POST'
  })
  const session = {
    session_key: result.session_key,
    openid: null,
    anonymous: true
  }
  setSession(session)
  return session
}

async function ensureSession() {
  const session = getSession()
  if (session && session.session_key) {
    try {
      const verify = await request({
        path: `/api/auth/session/${session.session_key}`,
        method: 'GET'
      })
      return session
    } catch (e) {
      clearSession()
    }
  }
  return loginAnonymous()
}

module.exports = {
  getSession,
  setSession,
  clearSession,
  isLoggedIn,
  loginWechat,
  loginAnonymous,
  ensureSession
}