import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../../lib/api'
import Layout from '../../components/Layout'
import { Building2, Users, CheckCircle, BarChart2, ArrowRight } from 'lucide-react'

export default function AdminDashboard() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    api.getAdminStats().then(setStats).catch(console.error).finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <Layout title="Painel do Administrador" subtitle="Visão geral de todas as escolas">
      <div className="flex items-center justify-center h-64 text-gray-400">Carregando...</div>
    </Layout>
  )

  return (
    <Layout title="Painel do Administrador" subtitle="Visão geral de todas as escolas e EdTechs cadastradas">
      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Escolas / EdTechs', val: stats?.totalSchools ?? 0, icon: Building2, color: 'text-brand-600', bg: 'bg-brand-50' },
          { label: 'Usuários Ativos', val: stats?.totalUsers ?? 0, icon: Users, color: 'text-purple-600', bg: 'bg-purple-50' },
          { label: 'Itens Conformes', val: stats?.conformes ?? 0, icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50' },
          { label: 'Total de Registros', val: stats?.totalItems ?? 0, icon: BarChart2, color: 'text-gray-600', bg: 'bg-gray-50' },
        ].map(({ label, val, icon: Icon, color, bg }) => (
          <div key={label} className={`${bg} border border-gray-200 rounded-xl p-5`}>
            <div className="flex items-center gap-2 mb-2">
              <Icon className={`w-5 h-5 ${color}`} />
              <p className="text-xs text-gray-500">{label}</p>
            </div>
            <p className={`text-3xl font-bold ${color}`}>{val}</p>
          </div>
        ))}
      </div>

      {/* Schools compliance table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden mb-4">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-800">Compliance por Escola</h2>
          <button onClick={() => navigate('/admin/clientes')}
            className="flex items-center gap-1 text-xs text-brand-600 hover:text-brand-700 font-medium">
            Ver todas <ArrowRight className="w-3 h-3" />
          </button>
        </div>
        <div className="divide-y divide-gray-100">
          {(stats?.schoolStats || []).length === 0 && (
            <p className="px-5 py-8 text-center text-sm text-gray-400">Nenhuma escola cadastrada ainda.</p>
          )}
          {(stats?.schoolStats || []).map(school => {
            const totalExpected = 52
            const pct = school.total_items > 0 ? Math.round((school.conforme / totalExpected) * 100) : 0
            return (
              <div key={school.id} className="px-5 py-4 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-semibold text-gray-800 truncate">{school.name}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      school.type === 'edtech' ? 'bg-brand-100 text-brand-700' : 'bg-green-100 text-green-700'
                    }`}>{school.type}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                      <div className={`h-1.5 rounded-full ${
                        pct >= 70 ? 'bg-green-500' : pct >= 40 ? 'bg-yellow-500' : 'bg-red-500'
                      }`} style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-xs font-semibold text-gray-600 w-10 text-right">{pct}%</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {school.conforme || 0} conformes / {school.em_andamento || 0} em andamento — {school.total_items || 0} registros
                  </p>
                </div>
                <button onClick={() => navigate('/admin/clientes')}
                  className="text-xs text-brand-600 hover:text-brand-700 font-medium flex items-center gap-1">
                  Detalhes <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            )
          })}
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-4">
        <button onClick={() => navigate('/admin/clientes')}
          className="bg-brand-600 hover:bg-brand-700 text-white rounded-xl p-4 text-left transition-colors">
          <Building2 className="w-6 h-6 mb-2 opacity-80" />
          <p className="text-sm font-semibold">Gerenciar Clientes</p>
          <p className="text-xs opacity-75 mt-0.5">Adicionar, editar e remover escolas</p>
        </button>
        <button onClick={() => navigate('/admin/usuarios')}
          className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl p-4 text-left transition-colors">
          <Users className="w-6 h-6 mb-2 opacity-80" />
          <p className="text-sm font-semibold">Gerenciar Usuários</p>
          <p className="text-xs opacity-75 mt-0.5">Criar e gerenciar acessos</p>
        </button>
      </div>
    </Layout>
  )
}
