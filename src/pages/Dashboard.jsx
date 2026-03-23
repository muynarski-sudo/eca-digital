import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { api } from '../lib/api'
import Layout from '../components/Layout'
import StatusBadge from '../components/StatusBadge'
import {
  RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, Tooltip, Cell
} from 'recharts'
import { ClipboardList, AlertTriangle, CheckCircle, Clock, ArrowRight } from 'lucide-react'

const TOTAL_ITEMS = { principal: 52, implementacao: 15, riscos: 15, calor: 10, funcoes: 10 }

export default function Dashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [summary, setSummary] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user?.school_id) { setLoading(false); return }
    api.getSummary(user.school_id)
      .then(setSummary)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [user])

  function getTypeStats(type) {
    const row = summary.find(r => r.checklist_type === type)
    const total = TOTAL_ITEMS[type] || 52
    if (!row) return { conforme: 0, em_andamento: 0, nao_conforme: total, nao_aplicavel: 0, total, pct: 0 }
    const pct = Math.round((row.conforme / total) * 100)
    return { ...row, total, pct }
  }

  const modules = [
    { key: 'principal', label: 'Checklist Principal', path: '/checklist' },
    { key: 'implementacao', label: 'Implementação', path: '/implementacao' },
    { key: 'riscos', label: 'Mapa de Riscos', path: '/riscos' },
    { key: 'funcoes', label: 'Funções', path: '/funcoes' },
  ]

  const stats = modules.map(m => ({ ...m, ...getTypeStats(m.key) }))
  const globalConforme = stats.reduce((a, s) => a + (s.conforme || 0), 0)
  const globalTotal = stats.reduce((a, s) => a + s.total, 0)
  const globalPct = Math.round((globalConforme / globalTotal) * 100)

  const radarData = modules.map(m => {
    const s = getTypeStats(m.key)
    return { subject: m.label.split(' ')[0], value: s.pct }
  })

  const barData = stats.map(s => ({
    name: s.label.replace('Checklist ', '').replace('Mapa de ', ''),
    conforme: s.conforme || 0,
    em_andamento: s.em_andamento || 0,
    nao_conforme: s.nao_conforme || 0,
  }))

  if (loading) {
    return (
      <Layout title="Dashboard" subtitle="Visão geral do compliance">
        <div className="flex items-center justify-center h-64 text-gray-400">Carregando...</div>
      </Layout>
    )
  }

  return (
    <Layout title="Dashboard de Compliance" subtitle={`${user?.school_name || 'Minha Escola'} — ECA Digital (Lei 15.211/2025)`}>
      {/* Score geral */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="md:col-span-1 bg-white rounded-xl border border-gray-200 p-6 flex flex-col items-center justify-center text-center">
          <div className={`text-4xl font-bold mb-1 ${
            globalPct >= 70 ? 'text-green-600' : globalPct >= 40 ? 'text-yellow-600' : 'text-red-600'
          }`}>{globalPct}%</div>
          <p className="text-sm text-gray-500 font-medium">Score Global</p>
          <p className="text-xs text-gray-400 mt-1">{globalConforme}/{globalTotal} conformes</p>
          <div className="w-full bg-gray-100 rounded-full h-2 mt-3">
            <div
              className={`h-2 rounded-full transition-all ${
                globalPct >= 70 ? 'bg-green-500' : globalPct >= 40 ? 'bg-yellow-500' : 'bg-red-500'
              }`}
              style={{ width: `${globalPct}%` }}
            />
          </div>
        </div>

        {[
          { icon: CheckCircle, label: 'Itens Conformes', val: globalConforme, color: 'text-green-600', bg: 'bg-green-50' },
          { icon: Clock, label: 'Em Andamento', val: stats.reduce((a, s) => a + (s.em_andamento || 0), 0), color: 'text-yellow-600', bg: 'bg-yellow-50' },
          { icon: AlertTriangle, label: 'Não Conformes', val: stats.reduce((a, s) => a + (s.nao_conforme || 0), 0), color: 'text-red-600', bg: 'bg-red-50' },
        ].map(({ icon: Icon, label, val, color, bg }) => (
          <div key={label} className={`${bg} rounded-xl border border-gray-200 p-6`}>
            <div className="flex items-center gap-3 mb-3">
              <Icon className={`w-5 h-5 ${color}`} />
              <p className="text-sm text-gray-600 font-medium">{label}</p>
            </div>
            <p className={`text-3xl font-bold ${color}`}>{val}</p>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Radar de Compliance por Módulo</h2>
          <ResponsiveContainer width="100%" height={220}>
            <RadarChart data={radarData}>
              <PolarGrid />
              <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11 }} />
              <Radar dataKey="value" stroke="#2d5ff5" fill="#2d5ff5" fillOpacity={0.2} strokeWidth={2} />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Progresso por Módulo</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={barData} layout="vertical">
              <XAxis type="number" tick={{ fontSize: 10 }} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={80} />
              <Tooltip />
              <Bar dataKey="conforme" name="Conforme" stackId="a" fill="#22c55e" />
              <Bar dataKey="em_andamento" name="Em Andamento" stackId="a" fill="#f59e0b" />
              <Bar dataKey="nao_conforme" name="Não Conforme" stackId="a" fill="#ef4444" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Module cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {stats.map(s => (
          <button
            key={s.key}
            onClick={() => navigate(s.path)}
            className="bg-white rounded-xl border border-gray-200 p-5 text-left hover:border-brand-300 hover:shadow-sm transition-all group"
          >
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-gray-800">{s.label}</p>
              <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-brand-600 transition-colors" />
            </div>
            <div className={`text-2xl font-bold mb-1 ${
              s.pct >= 70 ? 'text-green-600' : s.pct >= 40 ? 'text-yellow-600' : 'text-red-600'
            }`}>{s.pct}%</div>
            <div className="w-full bg-gray-100 rounded-full h-1.5 mb-2">
              <div
                className={`h-1.5 rounded-full ${
                  s.pct >= 70 ? 'bg-green-500' : s.pct >= 40 ? 'bg-yellow-500' : 'bg-red-500'
                }`}
                style={{ width: `${s.pct}%` }}
              />
            </div>
            <p className="text-xs text-gray-500">{s.conforme}/{s.total} conformes</p>
          </button>
        ))}
      </div>

      {/* Warning banner if critical compliance is 0 */}
      {globalPct === 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-red-800">Início do processo de adequação</p>
              <p className="text-sm text-red-600 mt-1">
                Nenhum item marcado como conforme ainda. Comece pelo{' '}
                <button onClick={() => navigate('/checklist')} className="underline font-medium">
                  Checklist Principal
                </button>{' '}
                para avaliar a situação atual da sua instituição.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Alertas de prazo */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 mt-4">
        <p className="text-sm font-semibold text-amber-800 mb-2">⚠️ Prazos Críticos</p>
        <ul className="text-sm text-amber-700 space-y-1">
          <li>• <strong>17/03/2026 — VIGENTE:</strong> Lei 15.211/2025 e Decreto 12.880/2026 já em vigor</li>
          <li>• <strong>18/06/2026:</strong> Prazo para regularização de monetização de influenciadores mirins</li>
          <li>• <strong>Imediato:</strong> Verificação de idade, controle parental, proibição de perfilamento para ads</li>
        </ul>
      </div>
    </Layout>
  )
}
