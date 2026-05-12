import jwt from 'jsonwebtoken'
import { config } from '../config.js'

export function requireAuth(req, res, next) {
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : ''

  if (!token) {
    res.status(401).json({ message: '未登录' })
    return
  }

  try {
    req.user = jwt.verify(token, config.jwtSecret)
    next()
  } catch (error) {
    res.status(401).json({ message: '登录已失效' })
  }
}
