import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { api } from '../../lib/api'
import Layout from '../../components/Layout'
import RiscoTag from '../../components/RiscoTag'
import StatusBadge from '../../components/StatusBadge'
import { mapaRiscos, NIVEIS } from '../../data/riscos'
import { Save, AlertTriangle, Shield, Filter } from 'lucide-react'

export default function MapaRiscos() {
  const { user } = useAuth()
  const schoolId = user?.school_id
  const [progress, setProgress] = useState({})
  const [editItem, setEditItem] = useState(null)
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)
  const [filterProb, setFilterProb] = useState('all')

  useEffect(() => {
    if (!schoolId) return
    api.getProgress(schoolId, 'riscos').then(rows => {
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
      await api.saveProgress(schoolId, 'riscos', editItem.id, form)
      setProgress(prev => ({ ...prev, [editItem.id]: { ...prev[editItem.id], ...form, item_id: editItem.id } }))
      setEditItem(null)
    } catch (err) { alert(err.message) }
    finally { setSaving(false) }
  }

  const filtered = filterProb === 'all' ? mapaRiscos : mapaRiscos.filter(r => r.probabilidade === filterProb)

  const criticos = mapaRiscos.filter(r => r.probabilidade === 'CRITICO' || r.impacto === 'CRITICO').length
  const mitigados = mapaRiscos.filter(r => progress[r.id]?.status === 'conforme').length

  const probColor = { CRITICO: 'border-l-red-500', ALTO: 'border-l-orange-400', MEDIO: 'border-l-yellow-400', BAIXO: 'border-l-green-400' }

  return (
    <Layout title="Mapa de Riscos" subtitle="15 riscos regulatórios e reputacionais — Escolas e EdTechs" printable>
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        {[
          { label: 'Total de Riscos', val: mapaRiscos.length, color: 'text-gray-700', bg: 'bg-white' },
          { label: 'Riscos Críticos/Altos', val: criticos, color: 'text-red-700', bg: 'bg-red-50', icon: AlertTriangle },
          { label: 'Riscos Mitigados', val: mitigados, color: 'text-green-700', bg: 'bg-green-50', icon: Shield },
        ].map(({ label, val, color, bg, icon: Icon }) => (
          <div key={label} className={`${bg} border border-gray-200 rounded-xl px-4 py-3 flex items-center gap-3`}>
            {Icon && <Icon className={`w-5 h-5 ${color} opacity-70`} />}
            <div>
              <p className="text-xs text-gray-500">{label}</p>
              <p className={`text-2xl font-bold ${color}`}>{val}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div className="flex items-center gap-2 mb-4 no-print flex-wrap">
        <Filter className="w-4 h-4 text-gray-400" />
        {['all', 'CRITICO', 'ALTO', 'MEDIO', 'BAIXO'].map(f => (
          <button key={f} onClick={() => setFilterProb(f)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filterProb === f ? 'bg-brand-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-brand-300'
            }`}>
            {f === 'all' ? 'Todos' : f}
          </button>
        ))}
      </div>

      {/* Risk cards */}
      <div className="space-y-3">
        {filtered.map(item => {
          const p = progress[item.id]
          const status = p?.status || 'nao_conforme'

          return (
            <div key={item.id} className={`bg-white border border-gray-200 border-l-4 ${probColor[item.probabilidade] || 'border-l-gray-200'} rounded-xl p-5`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span className="text-xs font-mono text-gray-400">{item.id}</span>
                    <span className="text-xs text-gray-500 font-medium bg-gray-100 rounded px-2 py-0.5">{item.categoria}</span>
                    <StatusBadge status={status} small />
                  </div>
                  <p className="text-sm font-semibold text-gray-900 mb-2">{item.risco}</p>
                  <p className="text-xs text-gray-600 leading-relaxed mb-3">{item.descricao}</p>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                    {[
                      { label: 'Probabilidade', val: item.probabilidade },
                      { label: 'Impacto', val: item.impacto },
                      { label: 'Remediação', val: item.remediacaoComplexidade },
                      { label: 'Prazo', val: item.prazo, isText: true },
                    ].map(({ label, val, isText }) => (
                      <div key={label} className="bg-gray-50 rounded-lg p-2.5">
                        <p className="text-xs text-gray-400 mb-1">{label}</p>
                        {isText ? (
                          <p className="text-xs font-semibold text-gray-700">{val}</p>
                        ) : (
                          <RiscoTag nivel={val} small />
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="bg-amber-50 border border-amber-100 rounded-lg p-3 mb-2">
                    <p className="text-xs font-semibold text-amber-800 mb-1">Ação Imediata Recomendada</p>
                    <p className="text-xs text-amber-700">{item.acaoImediata}</p>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-gray-400">
                    <span>Base legal: {item.leiRef}</span>
                  </div>
                  <p className="text-xs text-blue-600 mt-1">💡 {item.notaEdtech}</p>

                  {p?.evidence && <p className="text-xs text-green-700 mt-2">📎 {p.evidence}</p>}
                  {p?.responsible && <p className="text-xs text-blue-700 mt-1">👤 Responsável: {p.responsible}</p>}
                </div>
                <button onClick={() => openEdit(item)}
                  className="no-print flex-shrink-0 text-xs px-3 py-1.5 bg-gray-100 hover:bg-brand-50 hover:text-brand-700 text-gray-600 rounded-lg transition-colors">
                  Registrar
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Penalidades */}
      <div className="mt-6 bg-red-50 border border-red-200 rounded-xl p-5">
        <p className="text-sm font-semibold text-red-800 mb-3">Estrutura de Penalidades — Lei 15.211/2025</p>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {[
            { label: '1. Advertência', desc: 'Com prazo para correção', color: 'border-yellow-300 bg-yellow-50' },
            { label: '2. Multa', desc: 'Até 10% do faturamento ou R$ 50M', color: 'border-orange-300 bg-orange-50' },
            { label: '3. Suspensão', desc: 'Da funcionalidade ou plataforma', color: 'border-red-300 bg-red-50' },
            { label: '4. Proibição', desc: 'Do exercício das atividades', color: 'border-red-500 bg-red-100' },
          ].map(({ label, desc, color }) => (
            <div key={label} className={`border rounded-lg p-3 ${color}`}>
              <p className="text-xs font-bold text-gray-800">{label}</p>
              <p className="text-xs text-gray-600 mt-0.5">{desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Edit modal */}
      {editItem && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 no-print">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6">
            <h3 className="font-bold text-gray-900 mb-1">{editItem.id}</h3>
            <p className="text-sm text-gray-600 mb-4 leading-snug">{editItem.risco}</p>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1.5 block">Status da Mitigação</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: 'nao_conforme', label: '❌ Risco Não Mitigado' },
                    { value: 'em_andamento', label: '🔄 Mitigação em Andamento' },
                    { value: 'conforme', label: '✅ Risco Mitigado' },
                    { value: 'nao_aplicavel', label: '⚪ Não Aplicável' },
                  ].map(opt => (
                    <button key={opt.value} onClick={() => setForm(f => ({ ...f, status: opt.value }))}
                      className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                        form.status === opt.value ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-gray-200 text-gray-600'
                      }`}>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1.5 block">Responsável pela Mitigação</label>
                <input type="text" value={form.responsible} onChange={e => setForm(f => ({ ...f, responsible: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1.5 block">Evidência de Mitigação</label>
                <input type="text" value={form.evidence} onChange={e => setForm(f => ({ ...f, evidence: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1.5 block">Plano de Ação</label>
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
