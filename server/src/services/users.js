import { pool } from '../db/pool.js'

export async function upsertWechatUser(session) {
  const result = await pool.query(
    `
      INSERT INTO users(openid, unionid)
      VALUES ($1, $2)
      ON CONFLICT(openid)
      DO UPDATE SET unionid = COALESCE(EXCLUDED.unionid, users.unionid), updated_at = now()
      RETURNING id, openid, unionid, nickname, avatar_url
    `,
    [session.openid, session.unionid || null]
  )

  return result.rows[0]
}
