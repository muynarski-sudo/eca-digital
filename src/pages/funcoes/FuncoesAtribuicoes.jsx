import { useState } from 'react'
import Layout from '../../components/Layout'
import { funcoes, processosCriticos } from '../../data/funcoes'
import { ChevronDown, ChevronRight, Users, GitBranch } from 'lucide-react'

export default function FuncoesAtribuicoes() {
  const [openFuncoes, setOpenFuncoes] = useState({})
  const [openProcessos, setOpenProcessos] = useState({})
  const [activeTab, setActiveTab] = useState('funcoes')

  const toggleFuncao = id => setOpenFuncoes(prev => ({ ...prev, [id]: !prev[id] }))
  const toggleProcesso = id => setOpenProcessos(prev => ({ ...prev, [id]: !prev[id] }))

  return (
    <Layout title="Funções e Atribuições" subtitle="Papéis, responsabilidades e processos críticos — Escolas e EdTechs" printable>
      {/* Tabs */}
      <div className="flex gap-2 mb-5 no-print">
        {[
          { key: 'funcoes', label: 'Cargos e Responsabilidades', icon: Users },
          { key: 'processos', label: 'Processos Cross-Funcionais', icon: GitBranch },
        ].map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setActiveTab(key)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              activeTab === key ? 'bg-brand-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-brand-300'
            }`}>
            <Icon className="w-4 h-4" />{label}
          </button>
        ))}
      </div>

      {activeTab === 'funcoes' && (
        <div className="space-y-3">
          {/* RACI Matrix summary */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4">
            <p className="text-sm font-semibold text-blue-800 mb-1">Sobre este documento</p>
            <p className="text-sm text-blue-700">Cada cargo possui atribuições específicas decorrentes da Lei 15.211/2025 e do Decreto 12.880/2026. Identifique os responsáveis na sua instituição e documente a designação formal para fins de compliance.</p>
          </div>

          {funcoes.map(f => (
            <div key={f.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <button
                onClick={() => toggleFuncao(f.id)}
                className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 no-print"
              >
                <div className="flex items-center gap-3">
                  {openFuncoes[f.id] ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
                  <div className="text-left">
                    <p className="text-sm font-bold text-gray-900">{f.cargo}</p>
                    <p className="text-xs text-gray-400">{f.equivalente}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {f.criado && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">Novo papel</span>}
                  {f.obrigatorio && <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">Obrigatório</span>}
                  <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded">{f.prazo}</span>
                </div>
              </button>

              {/* Print header */}
              <div className="print-only px-5 py-3 border-b border-gray-200">
                <p className="text-sm font-bold">{f.cargo} — {f.equivalente}</p>
                <p className="text-xs text-gray-500">Base legal: {f.baseLegal}</p>
              </div>

              {(openFuncoes[f.id]) && (
                <div className="border-t border-gray-100 px-5 py-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div className="bg-brand-50 border border-brand-100 rounded-lg p-4">
                      <p className="text-xs font-semibold text-brand-800 mb-2 uppercase tracking-wide">Visão Estratégica</p>
                      <p className="text-sm text-brand-900 leading-relaxed">{f.visaoEstrategica}</p>
                    </div>
                    <div className="bg-amber-50 border border-amber-100 rounded-lg p-4">
                      <p className="text-xs font-semibold text-amber-800 mb-2 uppercase tracking-wide">Mudança com o ECA Digital</p>
                      <p className="text-sm text-amber-900 leading-relaxed">{f.mudancaECA}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">Atribuições Específicas</p>
                      <ul className="space-y-1.5">
                        {f.atribuicoes.map((a, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                            <span className="text-brand-500 font-bold mt-0.5 flex-shrink-0">•</span>
                            <span>{a}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">Entregáveis Mínimos</p>
                      <ul className="space-y-1.5">
                        {f.entregaveis.map((e, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                            <span className="text-green-500 font-bold mt-0.5 flex-shrink-0">✓</span>
                            <span>{e}</span>
                          </li>
                        ))}
                      </ul>
                      <p className="text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide mt-4">Interações Principais</p>
                      <div className="flex flex-wrap gap-1.5">
                        {f.interacoes.map(i => (
                          <span key={i} className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full">{i}</span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center gap-2 text-xs text-gray-400">
                    <span>Base legal: {f.baseLegal}</span>
                    <span>•</span>
                    <span>Prazo: {f.prazo}</span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {activeTab === 'processos' && (
        <div className="space-y-3">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
            <p className="text-sm font-semibold text-amber-800 mb-1">Processos Cross-Funcionais Críticos</p>
            <p className="text-sm text-amber-700">Estes processos envolvem múltiplos departamentos e devem ser documentados, treinados e testados regularmente. São os mais fiscalizados pela ANPD.</p>
          </div>

          {processosCriticos.map(p => (
            <div key={p.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <button
                onClick={() => toggleProcesso(p.id)}
                className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 no-print"
              >
                <div className="flex items-center gap-3">
                  {openProcessos[p.id] ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
                  <div className="text-left">
                    <p className="text-sm font-bold text-gray-900">{p.id} — {p.processo}</p>
                    <p className="text-xs text-gray-400">Prazo: {p.prazo}</p>
                  </div>
                </div>
                <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">{p.id}</span>
              </button>

              {openProcessos[p.id] && (
                <div className="border-t border-gray-100 px-5 py-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wide">Gatilho</p>
                      <p className="text-sm text-gray-800 bg-gray-50 rounded-lg px-3 py-2">{p.gatilho}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wide">Risco Sem Processo</p>
                      <p className="text-sm text-red-700 bg-red-50 rounded-lg px-3 py-2">{p.riscoSeSemProcesso}</p>
                    </div>
                  </div>

                  <p className="text-xs font-semibold text-gray-600 mb-3 uppercase tracking-wide">Fluxo de Execução</p>
                  <div className="space-y-2">
                    {p.fluxo.map((step, i) => (
                      <div key={i} className="flex items-start gap-3">
                        <span className="flex-shrink-0 w-6 h-6 bg-brand-100 text-brand-700 rounded-full text-xs font-bold flex items-center justify-center">{i + 1}</span>
                        <p className="text-sm text-gray-700 pt-0.5">{step}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </Layout>
  )
}
