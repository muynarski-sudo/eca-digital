import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import db from '../db.js'

const router = Router()
const SECRET = process.env.JWT_SECRET || 'eca-digital-secret-2026'

router.post('/login', (req, res) => {
  const { email, password } = req.body
  if (!email || !password) return res.status(400).json({ error: 'Email e senha são obrigatórios' })

  const user = db.prepare(`
    SELECT u.*, s.name as school_name, s.type as school_type
    FROM users u
    LEFT JOIN schools s ON u.school_id = s.id
    WHERE u.email = ? AND u.active = 1
  `).get(email.toLowerCase())

  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ error: 'Credenciais inválidas' })
  }

  const payload = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    school_id: user.school_id,
    school_name: user.school_name,
    school_type: user.school_type
  }
  const token = jwt.sign(payload, SECRET, { expiresIn: '8h' })
  res.json({ token, user: payload })
})

router.post('/change-password', (req, res) => {
  const { email, oldPassword, newPassword } = req.body
  const user = db.prepare(`SELECT * FROM users WHERE email = ?`).get(email)
  if (!user || !bcrypt.compareSync(oldPassword, user.password)) {
    return res.status(401).json({ error: 'Senha atual incorreta' })
  }
  const hashed = bcrypt.hashSync(newPassword, 10)
  db.prepare(`UPDATE users SET password = ? WHERE id = ?`).run(hashed, user.id)
  res.json({ ok: true })
})

export default router
