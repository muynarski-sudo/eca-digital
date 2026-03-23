import { useState } from 'react'
import Layout from '../../components/Layout'
import { principiosInclusao, perfilEdtech, perfilEscola, setoresExcluidos, setoresIncluidos, datasChave } from '../../data/criterios'
import { BookOpen, CheckCircle, XCircle, Clock } from 'lucide-react'

const riscoColor = { CRITICO: 'bg-red-100 text-red-700', ALTO: 'bg-orange-100 text-orange-700', MEDIO: 'bg-yellow-100 text-yellow-700', BAIXO: 'bg-green-100 text-green-700' }

export default function CriteriosMetodologicos() {
  const [activeTab, setActiveTab] = useState('principios')

  const tabs = [
    { key: 'principios', label: '4 Princípios de Inclusão' },
    { key: 'perfis', label: 'Perfil Escolas & EdTechs' },
    { key: 'setores', label: '12 Setores + Excluídos' },
    { key: 'datas', label: 'Datas-Chave' },
  ]

  return (
    <Layout title="Critérios Metodológicos" subtitle="Seleção e delimitação de setores — adaptado para Escolas e EdTechs" printable>
      {/* Tabs */}
      <div className="flex gap-2 mb-5 no-print flex-wrap">
        {tabs.map(({ key, label }) => (
          <button key={key} onClick={() => setActiveTab(key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === key ? 'bg-brand-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-brand-300'
            }`}>
            {label}
          </button>
        ))}
      </div>

      {activeTab === 'principios' && (
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-2">
            <p className="text-sm font-semibold text-blue-800 mb-1">4 Princípios de Inclusão Setorial</p>
            <p className="text-sm text-blue-700">Critérios usados para determinar quais setores estão sujeitos às obrigações da Lei 15.211/2025. Escolas e EdTechs atendem todos os quatro princípios.</p>
          </div>
          {principiosInclusao.map(p => (
            <div key={p.id} className="bg-white border border-gray-200 rounded-xl p-5">
              <div className="flex items-center gap-3 mb-3">
                <span className="w-8 h-8 bg-brand-600 text-white rounded-lg flex items-center justify-center text-sm font-bold">{p.id}</span>
                <h3 className="text-sm font-bold text-gray-900">{p.nome}</h3>
              </div>
              <p className="text-sm text-gray-700 mb-3 leading-relaxed">{p.descricao}</p>
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-3">
                <p className="text-xs font-semibold text-green-800 mb-1">Aplicação para Escolas e EdTechs</p>
                <p className="text-xs text-green-700">{p.aplicacaoEdtech}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 mb-2">Exemplos de escolas/EdTechs:</p>
                <div className="flex flex-wrap gap-1.5">
                  {p.exemplos.map(e => <span key={e} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{e}</span>)}
                </div>
              </div>
              <p className="text-xs text-gray-400 mt-3">Base legal: {p.baseLegal}</p>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'perfis' && (
        <div className="space-y-5">
          {[
            { perfil: perfilEdtech, icon: '🎓', color: 'border-brand-300 bg-brand-50', headerColor: 'bg-brand-600' },
            { perfil: perfilEscola, icon: '🏫', color: 'border-green-300 bg-green-50', headerColor: 'bg-green-600' },
          ].map(({ perfil, icon, color, headerColor }) => (
            <div key={perfil.setor} className={`border-2 ${color} rounded-xl overflow-hidden`}>
              <div className={`${headerColor} text-white px-5 py-3`}>
                <span className="text-lg mr-2">{icon}</span>
                <span className="font-bold text-sm">{perfil.setor}</span>
              </div>
              <div className="p-5">
                <p className="text-sm text-gray-700 mb-4">{perfil.descricao}</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">Público Primário</p>
                    <p className="text-sm text-gray-800 bg-white rounded-lg px-3 py-2 border border-gray-200">{perfil.perfilRisco.publicoPrimario}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">Dados Coletados</p>
                    <p className="text-sm text-gray-800 bg-white rounded-lg px-3 py-2 border border-gray-200">{perfil.perfilRisco.dadosColetados}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">Risco Principal</p>
                    <p className="text-sm text-red-700 bg-red-50 rounded-lg px-3 py-2 border border-red-100">{perfil.perfilRisco.riscoPrincipal}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">Prioridade de Fiscalização</p>
                    <p className="text-sm text-orange-700 bg-orange-50 rounded-lg px-3 py-2 border border-orange-100">{perfil.perfilRisco.fiscalizacaoPrioritaria}</p>
                  </div>
                </div>
                {perfil.exemplosBrasil && (
                  <div className="mt-4">
                    <p className="text-xs font-semibold text-gray-500 mb-2">Exemplos Brasil:</p>
                    <div className="flex flex-wrap gap-1.5">
                      {perfil.exemplosBrasil.map(e => <span key={e} className="text-xs bg-white border border-gray-200 text-gray-600 px-2 py-0.5 rounded">{e}</span>)}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'setores' && (
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-600" /> 12 Setores Incluídos
            </h3>
            <div className="overflow-x-auto bg-white border border-gray-200 rounded-xl">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Setor</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Exemplos</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Risco</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Relevância EdTech</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {setoresIncluidos.map(s => (
                    <tr key={s.id} className={s.id === 'S8' ? 'bg-brand-50' : 'hover:bg-gray-50'}>
                      <td className="px-4 py-3 font-semibold text-gray-800">
                        <span className="text-xs text-gray-400 mr-1">{s.id}</span> {s.nome}
                        {s.id === 'S8' && <span className="ml-2 text-xs bg-brand-600 text-white px-1.5 py-0.5 rounded">VOCÊ</span>}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">{s.exemplos}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${riscoColor[s.risco] || ''}`}>{s.risco}</span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-700">{s.relevanciaEdtech}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
              <XCircle className="w-4 h-4 text-red-500" /> Setores Excluídos (com justificativa)
            </h3>
            <div className="space-y-2">
              {setoresExcluidos.map(s => (
                <div key={s.setor} className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold text-gray-700">{s.setor}</p>
                    <div className="flex gap-1 flex-shrink-0">
                      {s.principios.map(p => <span key={p} className="text-xs bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded">{p}</span>)}
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{s.motivo}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'datas' && (
        <div className="space-y-3">
          {datasChave.map(d => {
            const configs = {
              vigente: { icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50 border-green-200' },
              proximo: { icon: Clock, color: 'text-orange-600', bg: 'bg-orange-50 border-orange-200' },
              aguardando: { icon: Clock, color: 'text-gray-500', bg: 'bg-gray-50 border-gray-200' },
              revisao: { icon: BookOpen, color: 'text-blue-600', bg: 'bg-blue-50 border-blue-200' },
              auditoria: { icon: BookOpen, color: 'text-purple-600', bg: 'bg-purple-50 border-purple-200' },
              regulamentacao: { icon: Clock, color: 'text-yellow-600', bg: 'bg-yellow-50 border-yellow-200' },
            }
            const cfg = configs[d.tipo] || configs.aguardando
            const Icon = cfg.icon
            return (
              <div key={d.data} className={`border rounded-xl p-4 ${cfg.bg}`}>
                <div className="flex items-center gap-3">
                  <Icon className={`w-5 h-5 ${cfg.color} flex-shrink-0`} />
                  <div>
                    <p className="text-xs font-bold text-gray-500 uppercase">{d.data}</p>
                    <p className="text-sm font-semibold text-gray-800">{d.evento}</p>
                    <span className={`text-xs font-medium ${cfg.color}`}>{d.urgencia}</span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </Layout>
  )
}
