import { Router } from 'express'
import db from '../db.js'
import { authenticate } from '../middleware/auth.js'

const router = Router()
router.use(authenticate)

// Get progress for a school + checklist type
router.get('/:schoolId/:type', (req, res) => {
  const { schoolId, type } = req.params
  // Clients can only see their own school
  if (req.user.role !== 'admin' && req.user.school_id != schoolId) {
    return res.status(403).json({ error: 'Acesso negado' })
  }
  const rows = db.prepare(`
    SELECT * FROM checklist_progress WHERE school_id = ? AND checklist_type = ?
  `).all(schoolId, type)
  res.json(rows)
})

// Save/update a single item
router.put('/:schoolId/:type/:itemId', (req, res) => {
  const { schoolId, type, itemId } = req.params
  const { status, evidence, responsible, notes } = req.body
  if (req.user.role !== 'admin' && req.user.school_id != schoolId) {
    return res.status(403).json({ error: 'Acesso negado' })
  }
  db.prepare(`
    INSERT INTO checklist_progress (school_id, checklist_type, item_id, status, evidence, responsible, notes, updated_by, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(school_id, item_id, checklist_type)
    DO UPDATE SET status=excluded.status, evidence=excluded.evidence,
      responsible=excluded.responsible, notes=excluded.notes,
      updated_by=excluded.updated_by, updated_at=CURRENT_TIMESTAMP
  `).run(schoolId, type, itemId, status || 'nao_conforme', evidence || null,
         responsible || null, notes || null, req.user.id)
  res.json({ ok: true })
})

// Get full dashboard summary for a school
router.get('/:schoolId/summary', (req, res) => {
  const { schoolId } = req.params
  if (req.user.role !== 'admin' && req.user.school_id != schoolId) {
    return res.status(403).json({ error: 'Acesso negado' })
  }
  const rows = db.prepare(`
    SELECT checklist_type,
      COUNT(*) as total,
      SUM(CASE WHEN status='conforme' THEN 1 ELSE 0 END) as conforme,
      SUM(CASE WHEN status='em_andamento' THEN 1 ELSE 0 END) as em_andamento,
      SUM(CASE WHEN status='nao_conforme' THEN 1 ELSE 0 END) as nao_conforme,
      SUM(CASE WHEN status='nao_aplicavel' THEN 1 ELSE 0 END) as nao_aplicavel
    FROM checklist_progress
    WHERE school_id = ?
    GROUP BY checklist_type
  `).all(schoolId)
  res.json(rows)
})

export default router
