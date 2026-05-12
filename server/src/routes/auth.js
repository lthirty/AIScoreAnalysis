import express from 'express'
import jwt from 'jsonwebtoken'
import { config } from '../config.js'
import { exchangeWechatCode } from '../services/wechat-auth.js'
import { upsertWechatUser } from '../services/users.js'

export const authRouter = express.Router()

authRouter.post('/wechat-login', async (req, res, next) => {
  try {
    const { code } = req.body
    if (!code) {
      res.status(400).json({ message: '缺少微信登录 code' })
      return
    }

    const session = await exchangeWechatCode(code)
    const user = await upsertWechatUser(session)
    const token = jwt.sign({ userId: user.id, openid: user.openid }, config.jwtSecret, { expiresIn: '30d' })

    res.json({ token, user })
  } catch (error) {
    next(error)
  }
})
