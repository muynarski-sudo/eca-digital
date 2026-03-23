import { Router } from 'express'
import bcrypt from 'bcryptjs'
import db from '../db.js'
import { authenticate, requireAdmin } from '../middleware/auth.js'

const router = Router()
router.use(authenticate, requireAdmin)

// ─── Schools ──────────────────────────────────────────────────────────────────
router.get('/schools', (_req, res) => {
  const schools = db.prepare(`
    SELECT s.*, COUNT(u.id) as user_count
    FROM schools s
    LEFT JOIN users u ON u.school_id = s.id AND u.active = 1
    WHERE s.active = 1
    GROUP BY s.id
    ORDER BY s.name
  `).all()
  res.json(schools)
})

router.get('/schools/:id', (req, res) => {
  const school = db.prepare(`SELECT * FROM schools WHERE id = ?`).get(req.params.id)
  if (!school) return res.status(404).json({ error: 'Escola não encontrada' })
  res.json(school)
})

router.post('/schools', (req, res) => {
  const { name, cnpj, type, email, phone, responsible, city, state, notes } = req.body
  if (!name) return res.status(400).json({ error: 'Nome é obrigatório' })
  const r = db.prepare(`
    INSERT INTO schools (name, cnpj, type, email, phone, responsible, city, state, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(name, cnpj || null, type || 'escola', email || null, phone || null,
         responsible || null, city || null, state || null, notes || null)
  res.status(201).json({ id: r.lastInsertRowid })
})

router.put('/schools/:id', (req, res) => {
  const { name, cnpj, type, email, phone, responsible, city, state, notes } = req.body
  db.prepare(`
    UPDATE schools SET name=?, cnpj=?, type=?, email=?, phone=?, responsible=?, city=?, state=?, notes=?
    WHERE id=?
  `).run(name, cnpj || null, type || 'escola', email || null, phone || null,
         responsible || null, city || null, state || null, notes || null, req.params.id)
  res.json({ ok: true })
})

router.delete('/schools/:id', (req, res) => {
  db.prepare(`UPDATE schools SET active = 0 WHERE id = ?`).run(req.params.id)
  res.json({ ok: true })
})

// ─── Users ────────────────────────────────────────────────────────────────────
router.get('/users', (_req, res) => {
  const users = db.prepare(`
    SELECT u.id, u.name, u.email, u.role, u.active, u.created_at,
           u.school_id, s.name as school_name
    FROM users u
    LEFT JOIN schools s ON u.school_id = s.id
    ORDER BY u.name
  `).all()
  res.json(users)
})

router.post('/users', (req, res) => {
  const { name, email, password, role, school_id } = req.body
  if (!name || !email || !password) return res.status(400).json({ error: 'Nome, email e senha são obrigatórios' })
  const hashed = bcrypt.hashSync(password, 10)
  try {
    const r = db.prepare(`
      INSERT INTO users (name, email, password, role, school_id)
      VALUES (?, ?, ?, ?, ?)
    `).run(name, email.toLowerCase(), hashed, role || 'client', school_id || null)
    res.status(201).json({ id: r.lastInsertRowid })
  } catch {
    res.status(409).json({ error: 'Email já cadastrado' })
  }
})

router.put('/users/:id', (req, res) => {
  const { name, email, role, school_id, active, password } = req.body
  if (password) {
    const hashed = bcrypt.hashSync(password, 10)
    db.prepare(`UPDATE users SET name=?, email=?, role=?, school_id=?, active=?, password=? WHERE id=?`)
      .run(name, email.toLowerCase(), role, school_id || null, active ?? 1, hashed, req.params.id)
  } else {
    db.prepare(`UPDATE users SET name=?, email=?, role=?, school_id=?, active=? WHERE id=?`)
      .run(name, email.toLowerCase(), role, school_id || null, active ?? 1, req.params.id)
  }
  res.json({ ok: true })
})

router.delete('/users/:id', (req, res) => {
  db.prepare(`UPDATE users SET active = 0 WHERE id = ?`).run(req.params.id)
  res.json({ ok: true })
})

// ─── Admin Dashboard Stats ────────────────────────────────────────────────────
router.get('/stats', (_req, res) => {
  const totalSchools   = db.prepare(`SELECT COUNT(*) as c FROM schools WHERE active=1`).get().c
  const totalUsers     = db.prepare(`SELECT COUNT(*) as c FROM users WHERE active=1 AND role='client'`).get().c
  const totalItems     = db.prepare(`SELECT COUNT(*) as c FROM checklist_progress`).get().c
  const conformes      = db.prepare(`SELECT COUNT(*) as c FROM checklist_progress WHERE status='conforme'`).get().c
  const emAndamento    = db.prepare(`SELECT COUNT(*) as c FROM checklist_progress WHERE status='em_andamento'`).get().c

  // Per-school compliance summary
  const schoolStats = db.prepare(`
    SELECT s.id, s.name, s.type,
      COUNT(cp.id) as total_items,
      SUM(CASE WHEN cp.status='conforme' THEN 1 ELSE 0 END) as conforme,
      SUM(CASE WHEN cp.status='em_andamento' THEN 1 ELSE 0 END) as em_andamento
    FROM schools s
    LEFT JOIN checklist_progress cp ON cp.school_id = s.id
    WHERE s.active = 1
    GROUP BY s.id
    ORDER BY s.name
  `).all()

  res.json({ totalSchools, totalUsers, totalItems, conformes, emAndamento, schoolStats })
})

export default router
