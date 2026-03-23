import { Router } from 'express'
import db from '../db.js'
import { authenticate } from '../middleware/auth.js'

const router = Router()
router.use(authenticate)

function checkAccess(req, schoolId) {
  return req.user.role === 'admin' || req.user.school_id == schoolId
}

// Get anamnese for a school
router.get('/:schoolId/anamnese', (req, res) => {
  const { schoolId } = req.params
  if (!checkAccess(req, schoolId)) return res.status(403).json({ error: 'Acesso negado' })
  const row = db.prepare(`SELECT * FROM anamnese WHERE school_id = ?`).get(schoolId)
  if (!row) return res.json({ concluida: false, respostas: {}, perfil_4cs: {} })
  res.json({
    concluida: !!row.concluida,
    respostas: JSON.parse(row.respostas || '{}'),
    perfil_4cs: JSON.parse(row.perfil_4cs || '{}'),
    updated_at: row.updated_at,
  })
})

// Save anamnese + bulk update checklist
router.post('/:schoolId/anamnese', (req, res) => {
  const { schoolId } = req.params
  if (!checkAccess(req, schoolId)) return res.status(403).json({ error: 'Acesso negado' })
  const { respostas, perfil_4cs, updates } = req.body

  db.prepare(`
    INSERT INTO anamnese (school_id, respostas, perfil_4cs, concluida, updated_at)
    VALUES (?, ?, ?, 1, CURRENT_TIMESTAMP)
    ON CONFLICT(school_id)
    DO UPDATE SET respostas=excluded.respostas, perfil_4cs=excluded.perfil_4cs,
      concluida=1, updated_at=CURRENT_TIMESTAMP
  `).run(schoolId, JSON.stringify(respostas || {}), JSON.stringify(perfil_4cs || {}))

  // Bulk update checklist items (only upgrade, never downgrade)
  if (Array.isArray(updates) && updates.length > 0) {
    const upsert = db.prepare(`
      INSERT INTO checklist_progress (school_id, checklist_type, item_id, status, notes, updated_by, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(school_id, item_id, checklist_type)
      DO UPDATE SET
        status = CASE
          WHEN excluded.status = 'conforme' THEN 'conforme'
          WHEN excluded.status = 'em_andamento' AND status = 'nao_conforme' THEN 'em_andamento'
          ELSE status
        END,
        notes = COALESCE(excluded.notes, notes),
        updated_by = excluded.updated_by,
        updated_at = CURRENT_TIMESTAMP
    `)
    const bulk = db.transaction((items) => {
      for (const u of items) {
        upsert.run(schoolId, u.type, u.id, u.status, u.notes || 'Preenchido via anamnese inicial', req.user.id)
      }
    })
    bulk(updates)
  }

  res.json({ ok: true, updated: updates?.length || 0 })
})

// Get dashboard summary
router.get('/:schoolId/summary', (req, res) => {
  const { schoolId } = req.params
  if (!checkAccess(req, schoolId)) return res.status(403).json({ error: 'Acesso negado' })
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

// Get progress for a school + checklist type
router.get('/:schoolId/:type', (req, res) => {
  const { schoolId, type } = req.params
  if (!checkAccess(req, schoolId)) return res.status(403).json({ error: 'Acesso negado' })
  const rows = db.prepare(`
    SELECT * FROM checklist_progress WHERE school_id = ? AND checklist_type = ?
  `).all(schoolId, type)
  res.json(rows)
})

// Save/update a single item
router.put('/:schoolId/:type/:itemId', (req, res) => {
  const { schoolId, type, itemId } = req.params
  const { status, evidence, responsible, notes } = req.body
  if (!checkAccess(req, schoolId)) return res.status(403).json({ error: 'Acesso negado' })
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

export default router
