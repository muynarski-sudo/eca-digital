import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { api } from '../../lib/api'
import Layout from '../../components/Layout'
import StatusBadge from '../../components/StatusBadge'
import RiscoTag from '../../components/RiscoTag'
import { checklistEdtech, SECOES, MODULO_NOME, MODULO_SUBTITULO, STATUS_OPTIONS } from '../../data/edtechContratual'
import { Save, ChevronDown, ChevronRight, Filter } from 'lucide-react'

export default function EdtechContratual() {
  const { user } = useAuth()
  const schoolId = user?.school_id
  const [progress, setProgress] = useState({})
  const [editItem, setEditItem] = useState(null)
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)
  const [filter, setFilter] = useState('all')
  const [openSecs, setOpenSecs] = useState({ S1: true })

  useEffect(() => {
    if (!schoolId) return
    api.getProgress(schoolId, 'edtech').then(rows => {
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
      await api.saveProgress(schoolId, 'edtech', editItem.id, form)
      setProgress(prev => ({ ...prev, [editItem.id]: { ...prev[editItem.id], ...form, item_id: editItem.id } }))
      setEditItem(null)
    } catch (err) { alert(err.message) }
    finally { setSaving(false) }
  }

  const filtered = filter === 'all'
    ? checklistEdtech
    : checklistEdtech.filter(i => (progress[i.id]?.status || 'nao_conforme') === filter)

  const grouped = {}
  filtered.forEach(item => {
    if (!grouped[item.secao]) grouped[item.secao] = []
    grouped[item.secao].push(item)
  })

  const total = checklistEdtech.length
  const conformes = checklistEdtech.filter(i => progress[i.id]?.status === 'conforme').length
  const emAndamento = checklistEdtech.filter(i => progress[i.id]?.status === 'em_andamento').length
  const pct = Math.round((conformes / total) * 100)

  return (
    <Layout
      title={MODULO_NOME}
      subtitle={MODULO_SUBTITULO}
      printable
    >
      {/* Info banner */}
      <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 mb-5">
        <p className="text-sm font-semibold text-indigo-800 mb-1">Para EdTechs que contratam com escolas</p>
        <p className="text-xs text-indigo-700">
          Este módulo trata das obrigações da EdTech como operadora de dados pessoais de alunos —
          não das obrigações da escola. Use-o para avaliar a adequação contratual e técnica do seu produto
          perante a LGPD e a Lei 15.211/2025 (ECA Digital).
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5 no-print">
        {[
          { label: 'Total', val: total, color: 'text-gray-700', bg: 'bg-white' },
          { label: 'Conformes', val: conformes, color: 'text-green-700', bg: 'bg-green-50' },
          { label: 'Em Andamento', val: emAndamento, color: 'text-yellow-700', bg: 'bg-yellow-50' },
          { label: 'Score', val: `${pct}%`, color: pct >= 70 ? 'text-green-700' : pct >= 40 ? 'text-yellow-700' : 'text-red-700', bg: 'bg-white' },
        ].map(({ label, val, color, bg }) => (
          <div key={label} className={`${bg} border border-gray-200 rounded-xl px-4 py-3`}>
            <p className="text-xs text-gray-500 mb-1">{label}</p>
            <p className={`text-2xl font-bold ${color}`}>{val}</p>
          </div>
        ))}
      </div>

      {/* Progress bar */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 mb-5">
        <div className="flex justify-between text-sm text-gray-600 mb-2">
          <span>Score de Conformidade Contratual</span>
          <span className="font-semibold">{pct}%</span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-3">
          <div className={`h-3 rounded-full transition-all ${pct >= 70 ? 'bg-green-500' : pct >= 40 ? 'bg-yellow-500' : 'bg-red-500'}`}
            style={{ width: `${pct}%` }} />
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 mb-4 no-print flex-wrap">
        <Filter className="w-4 h-4 text-gray-400" />
        {['all', 'nao_conforme', 'em_andamento', 'conforme', 'nao_aplicavel'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filter === f ? 'bg-brand-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-brand-300'
            }`}
          >
            {f === 'all' ? `Todos (${total})` : STATUS_OPTIONS.find(s => s.value === f)?.label.split(' ').slice(1).join(' ')}
          </button>
        ))}
      </div>

      {/* Sections */}
      <div className="space-y-3">
        {SECOES.map(sec => {
          const items = grouped[sec.id] || []
          if (items.length === 0) return null
          const isOpen = openSecs[sec.id]
          const secConformes = items.filter(i => (progress[i.id]?.status) === 'conforme').length

          return (
            <div key={sec.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <button
                onClick={() => setOpenSecs(prev => ({ ...prev, [sec.id]: !prev[sec.id] }))}
                className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-gray-50 no-print"
              >
                <div className="flex items-center gap-3">
                  {isOpen ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
                  <div className="text-left">
                    <p className="text-sm font-semibold text-gray-800">{sec.titulo}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{sec.descricao}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-3 flex-shrink-0">
                  <span className="text-xs text-gray-400">{secConformes}/{items.length}</span>
                </div>
              </button>

              <div className="print-only px-5 py-3 border-b border-gray-200">
                <p className="text-sm font-bold text-gray-800">{sec.titulo}</p>
              </div>

              {(isOpen || !Object.keys(openSecs).includes(sec.id)) && (
                <div className="divide-y divide-gray-100">
                  {items.map(item => {
                    const p = progress[item.id]
                    const status = p?.status || 'nao_conforme'
                    return (
                      <div key={item.id} className="px-5 py-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                              <span className="text-xs font-mono text-gray-400">{item.id}</span>
                              <RiscoTag nivel={item.prioridade} small />
                              <StatusBadge status={status} small />
                            </div>
                            <p className="text-sm font-semibold text-gray-800 mb-1">{item.item}</p>
                            <p className="text-xs text-gray-500 leading-relaxed mb-2">{item.descricao}</p>
                            <div className="flex flex-wrap gap-3 text-xs text-gray-400">
                              <span>📖 {item.artigos}</span>
                              <span>👤 {item.responsavel}</span>
                            </div>
                            <p className="text-xs text-blue-600 mt-1">📋 {item.entregavel}</p>
                            {p?.evidence && (
                              <p className="text-xs text-green-700 mt-1">📎 Evidência: {p.evidence}</p>
                            )}
                          </div>
                          <button
                            onClick={() => openEdit(item)}
                            className="no-print flex-shrink-0 text-xs px-3 py-1.5 bg-gray-100 hover:bg-brand-50 hover:text-brand-700 text-gray-600 rounded-lg transition-colors"
                          >
                            Atualizar
                          </button>
                        </div>
                      </div>
                    )
                  })}
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
            <h3 className="font-bold text-gray-900 mb-1">{editItem.id} — {editItem.item}</h3>
            <p className="text-sm text-gray-500 mb-4">{editItem.descricao}</p>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1.5 block">Status</label>
                <div className="grid grid-cols-2 gap-2">
                  {STATUS_OPTIONS.map(opt => (
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
                <label className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1.5 block">Evidência / Entregável</label>
                <input type="text" value={form.evidence} onChange={e => setForm(f => ({ ...f, evidence: e.target.value }))}
                  placeholder={editItem.entregavel}
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
