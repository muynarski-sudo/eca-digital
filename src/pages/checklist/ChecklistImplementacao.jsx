import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { api } from '../../lib/api'
import Layout from '../../components/Layout'
import StatusBadge from '../../components/StatusBadge'
import RiscoTag from '../../components/RiscoTag'
import { checklistImplementacao, DIMENSOES } from '../../data/checklistImplementacao'
import { Save, ChevronDown, ChevronRight } from 'lucide-react'

export default function ChecklistImplementacao() {
  const { user } = useAuth()
  const schoolId = user?.school_id
  const [progress, setProgress] = useState({})
  const [editItem, setEditItem] = useState(null)
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)
  const [openItems, setOpenItems] = useState({})

  useEffect(() => {
    if (!schoolId) return
    api.getProgress(schoolId, 'implementacao').then(rows => {
      const map = {}
      rows.forEach(r => { map[r.item_id] = r })
      setProgress(map)
    })
  }, [schoolId])

  function openEdit(item) {
    const current = progress[item.id] || {}
    setForm({
      status: current.status || 'nao_conforme',
      responsible: current.responsible || '',
      evidence: current.evidence || '',
      notes: current.notes || '',
    })
    setEditItem(item)
  }

  async function saveItem() {
    if (!schoolId || !editItem) return
    setSaving(true)
    try {
      await api.saveProgress(schoolId, 'implementacao', editItem.id, form)
      setProgress(prev => ({ ...prev, [editItem.id]: { ...prev[editItem.id], ...form, item_id: editItem.id } }))
      setEditItem(null)
    } catch (err) { alert(err.message) }
    finally { setSaving(false) }
  }

  const statusOpts = [
    { value: 'nao_conforme', label: '❌ Pendente' },
    { value: 'em_andamento', label: '🔄 Em Andamento' },
    { value: 'conforme', label: '✅ Implementado' },
    { value: 'nao_aplicavel', label: '⚪ Não Aplicável' },
  ]

  const total = checklistImplementacao.length
  const done = checklistImplementacao.filter(i => progress[i.id]?.status === 'conforme').length
  const pct = Math.round((done / total) * 100)

  return (
    <Layout
      title="Plano de Implementação"
      subtitle="15 obrigações operacionais × 7 dimensões — EdTechs e Escolas"
      printable
    >
      {/* Progress */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 mb-5">
        <div className="flex justify-between text-sm text-gray-600 mb-2">
          <span>Progresso de Implementação</span>
          <span className="font-semibold">{done}/{total} implementados ({pct}%)</span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-3">
          <div className={`h-3 rounded-full transition-all ${pct >= 70 ? 'bg-green-500' : pct >= 40 ? 'bg-yellow-500' : 'bg-red-500'}`}
            style={{ width: `${pct}%` }} />
        </div>
      </div>

      {/* Guide */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-5 text-sm text-blue-800">
        <p className="font-semibold mb-1">Como usar este checklist</p>
        <p>Para cada obrigação, expanda o item para ver as 7 dimensões operacionais: ação de compliance, processo, documentação necessária, solução tecnológica, responsável e evidência mínima exigida.</p>
      </div>

      {/* Items */}
      <div className="space-y-3">
        {checklistImplementacao.map(item => {
          const p = progress[item.id]
          const status = p?.status || 'nao_conforme'
          const isOpen = openItems[item.id]

          return (
            <div key={item.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <button
                    onClick={() => setOpenItems(prev => ({ ...prev, [item.id]: !prev[item.id] }))}
                    className="no-print flex-shrink-0 text-gray-400 hover:text-gray-600"
                  >
                    {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </button>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-xs font-mono text-gray-400">{item.id}</span>
                      <RiscoTag nivel={item.prioridade} small />
                      <StatusBadge status={status} small />
                    </div>
                    <p className="text-sm font-semibold text-gray-800 truncate">{item.obrigacao}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{item.artigos}</p>
                  </div>
                </div>
                <button
                  onClick={() => openEdit(item)}
                  className="no-print ml-3 flex-shrink-0 text-xs px-3 py-1.5 bg-gray-100 hover:bg-brand-50 hover:text-brand-700 text-gray-600 rounded-lg transition-colors"
                >
                  Atualizar
                </button>
              </div>

              {/* Expanded dimensions */}
              {isOpen && (
                <div className="border-t border-gray-100 px-5 py-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {DIMENSOES.map(dim => (
                      <div key={dim.key} className="bg-gray-50 rounded-lg p-3">
                        <p className="text-xs font-semibold text-gray-600 mb-1.5">{dim.label}</p>
                        <p className="text-xs text-gray-700 leading-relaxed">{item[dim.key]}</p>
                      </div>
                    ))}
                  </div>
                  {p?.evidence && (
                    <p className="text-xs text-green-700 mt-3">📎 Evidência registrada: {p.evidence}</p>
                  )}
                  {p?.responsible && (
                    <p className="text-xs text-blue-700 mt-1">👤 Responsável: {p.responsible}</p>
                  )}
                  {p?.notes && (
                    <p className="text-xs text-gray-600 mt-1">💬 {p.notes}</p>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Edit modal */}
      {editItem && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 no-print">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6">
            <h3 className="font-bold text-gray-900 mb-1">{editItem.id} — {editItem.obrigacao}</h3>
            <div className="space-y-4 mt-4">
              <div>
                <label className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1.5 block">Status</label>
                <div className="grid grid-cols-2 gap-2">
                  {statusOpts.map(opt => (
                    <button key={opt.value} onClick={() => setForm(f => ({ ...f, status: opt.value }))}
                      className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                        form.status === opt.value ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'
                      }`}>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1.5 block">Responsável</label>
                <input type="text" value={form.responsible} onChange={e => setForm(f => ({ ...f, responsible: e.target.value }))}
                  placeholder={editItem.responsavel}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1.5 block">Evidência</label>
                <input type="text" value={form.evidence} onChange={e => setForm(f => ({ ...f, evidence: e.target.value }))}
                  placeholder={editItem.evidencia}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1.5 block">Observações</label>
                <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none" />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setEditItem(null)} className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-600 rounded-lg text-sm">Cancelar</button>
              <button onClick={saveItem} disabled={saving}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-brand-600 text-white rounded-lg text-sm font-semibold hover:bg-brand-700 disabled:opacity-60">
                <Save className="w-4 h-4" />{saving ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}
