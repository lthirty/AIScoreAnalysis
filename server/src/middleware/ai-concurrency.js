import { config } from '../config.js'

const activeJobsByUser = new Map()

export function withAiConcurrencyLimit(handler) {
  return async (req, res, next) => {
    const userId = req.user?.userId
    const activeCount = activeJobsByUser.get(userId) || 0

    if (activeCount >= config.limits.aiConcurrentPerUser) {
      res.status(429).json({ message: '当前账号已有AI任务处理中，请稍后再试' })
      return
    }

    activeJobsByUser.set(userId, activeCount + 1)
    try {
      await handler(req, res, next)
    } catch (error) {
      next(error)
    } finally {
      const nextCount = (activeJobsByUser.get(userId) || 1) - 1
      if (nextCount <= 0) activeJobsByUser.delete(userId)
      else activeJobsByUser.set(userId, nextCount)
    }
  }
}
