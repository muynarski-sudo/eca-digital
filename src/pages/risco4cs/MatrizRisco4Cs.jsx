import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import { api } from '../../lib/api'
import Layout from '../../components/Layout'
import { QUATRO_CS, BASES_LEGAIS, getCorNivel } from '../../data/matrizRisco4cs'
import { ChevronDown, ChevronRight, AlertTriangle, Shield, ExternalLink } from 'lucide-react'

export default function MatrizRisco4Cs() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const schoolId = user?.school_id
  const [perfil4cs, setPerfil4cs] = useState({})
  const [anamnese, setAnamnese] = useState(null)
  const [loading, setLoading] = useState(true)
  const [openC, setOpenC] = useState({})
  const [activeTab, setActiveTab] = useState('matriz')

  useEffect(() => {
    if (!schoolId) return
    api.getAnamnese(schoolId).then(data => {
      setAnamnese(data)
      setPerfil4cs(data.perfil_4cs || {})
    }).catch(() => {}).finally(() => setLoading(false))
  }, [schoolId])

  if (loading) return (
    <Layout title="Matriz 4 Cs" subtitle="Carregando...">
      <div className="flex justify-center items-center h-48 text-gray-400">Carregando...</div>
    </Layout>
  )

  if (!anamnese?.concluida) return (
    <Layout title="Matriz de Risco 4 Cs" subtitle="Framework de riscos online — Sonia Livingstone">
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-center">
        <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto mb-3" />
        <p className="font-semibold text-amber-800 mb-2">Diagnóstico não realizado</p>
        <p className="text-sm text-amber-700 mb-4">Complete o Diagnóstico Inicial para visualizar o perfil de risco personalizado da sua escola na Matriz 4 Cs.</p>
        <button onClick={() => navigate('/anamnese')} className="px-5 py-2.5 bg-brand-600 text-white rounded-lg text-sm font-semibold hover:bg-brand-700">
          Realizar Diagnóstico
        </button>
      </div>
    </Layout>
  )

  const countAlto = Object.values(perfil4cs).filter(v => v === 'alto').length
  const countMedio = Object.values(perfil4cs).filter(v => v === 'medio').length

  return (
    <Layout title="Matriz de Risco 4 Cs" subtitle="Framework baseado em Sonia Livingstone (EU Kids Online)" printable>
      {/* Info */}
      <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 mb-5 text-xs text-indigo-700">
        <p className="font-semibold text-indigo-800 mb-1">Sobre os 4 Cs</p>
        Os "4 Cs" de risco online foram desenvolvidos pela pesquisadora Sonia Livingstone (EU Kids Online) e classificam os riscos que crianças enfrentam em quatro dimensões: <strong>Conteúdo</strong> (o que veem), <strong>Contato</strong> (com quem falam), <strong>Conduta</strong> (o que fazem) e <strong>Contrato</strong> (como seus dados são usados). Os níveis exibidos foram calculados com base no seu Diagnóstico Inicial.
      </div>

      {/* Summary grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        {QUATRO_CS.map(c => {
          const nivel = perfil4cs[c.id] || 'baixo'
          const cor = getCorNivel(nivel)
          return (
            <button key={c.id}
              onClick={() => { setOpenC(prev => ({ ...prev, [c.id]: !prev[c.id] })); setActiveTab('matriz') }}
              className={`rounded-xl border p-4 text-left transition-all hover:shadow-sm ${c.bgClass} ${c.borderClass}`}>
              <p className="text-2xl mb-1">{c.icone}</p>
              <p className={`text-sm font-bold ${c.textClass}`}>{c.titulo}</p>
              <p className="text-xs text-gray-500 mb-2">{c.subtitulo}</p>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${cor.bg} ${cor.text} ${cor.border}`}>
                {cor.label}
              </span>
            </button>
          )
        })}
      </div>

      {/* Alert if alto */}
      {countAlto > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-5 flex gap-3 no-print">
          <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">
            <strong>{countAlto} dimensão{countAlto > 1 ? 'ões' : ''} com risco ALTO</strong> detectad{countAlto > 1 ? 'as' : 'a'}.
            Consulte as ações prioritárias de mitigação abaixo.
          </p>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-5 no-print">
        {['matriz', 'bases'].map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === tab ? 'bg-brand-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-brand-300'}`}>
            {tab === 'matriz' ? '🎯 Análise por Dimensão' : '⚖️ Bases Legais LGPD'}
          </button>
        ))}
      </div>

      {activeTab === 'matriz' && (
        <div className="space-y-4">
          {QUATRO_CS.map(c => {
            const nivel = perfil4cs[c.id] || 'baixo'
            const cor = getCorNivel(nivel)
            const isOpen = openC[c.id]

            return (
              <div key={c.id} className={`rounded-xl border overflow-hidden ${c.borderClass}`}>
                <button
                  onClick={() => setOpenC(prev => ({ ...prev, [c.id]: !prev[c.id] }))}
                  className={`w-full flex items-center justify-between px-5 py-4 ${c.bgClass} no-print`}>
                  <div className="flex items-center gap-3">
                    {isOpen ? <ChevronDown className={`w-4 h-4 ${c.textClass}`} /> : <ChevronRight className={`w-4 h-4 ${c.textClass}`} />}
                    <div className="text-left">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-bold ${c.textClass}`}>{c.icone} {c.titulo}</span>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${cor.bg} ${cor.text} ${cor.border}`}>{cor.label}</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">{c.subtitulo}</p>
                    </div>
                  </div>
                </button>

                {/* Print always visible */}
                <div className={`print-only px-5 py-3 border-b ${c.borderClass}`}>
                  <p className={`text-sm font-bold ${c.textClass}`}>{c.icone} {c.titulo} — {cor.label}</p>
                </div>

                {(isOpen) && (
                  <div className="p-5 bg-white">
                    <p className="text-xs text-gray-600 mb-4 leading-relaxed">{c.definicao}</p>

                    {/* Exemplos */}
                    <div className="mb-4">
                      <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">Exemplos de riscos nesta dimensão</p>
                      <ul className="space-y-1">
                        {c.exemplos.map((ex, i) => (
                          <li key={i} className="text-xs text-gray-600 flex gap-2">
                            <span className="text-gray-400 flex-shrink-0">•</span> {ex}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Riscos identificados */}
                    <div className="mb-4">
                      <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">Riscos identificados na sua escola</p>
                      <div className="space-y-2">
                        {c.riscos.map(risco => {
                          const resp = anamnese?.respostas?.[risco.perguntaAnamnese]
                          const isAlto = risco.valoresRisco?.includes(resp)
                          const isMedio = risco.valoresMedio?.includes(resp)
                          const nivelRisco = isAlto ? 'alto' : isMedio ? 'medio' : 'baixo'
                          const corR = getCorNivel(nivelRisco)
                          return (
                            <div key={risco.id} className={`flex items-start gap-2 p-3 rounded-lg border ${corR.bg} ${corR.border}`}>
                              <span className={`text-xs font-bold mt-0.5 flex-shrink-0 ${corR.text}`}>{corR.label}</span>
                              <p className={`text-xs ${corR.text}`}>{risco.descricao}</p>
                            </div>
                          )
                        })}
                      </div>
                    </div>

                    {/* Mitigações */}
                    <div>
                      <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">
                        <Shield className="w-3 h-3 inline mr-1" />Ações de mitigação recomendadas
                      </p>
                      <ul className="space-y-1.5">
                        {c.mitigacoes.map((m, i) => (
                          <li key={i} className="text-xs text-gray-700 flex gap-2">
                            <Check className="w-3 h-3 text-green-600 flex-shrink-0 mt-0.5" />
                            {m}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <p className="text-xs text-gray-400 mt-4">Base legal: {c.referencia}</p>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {activeTab === 'bases' && (
        <div className="space-y-4">
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-xs text-gray-600 mb-4">
            A LGPD exige que cada atividade de tratamento de dados tenha uma base legal definida. Para dados de crianças e adolescentes, aplica-se proteção reforçada do Art. 14 da LGPD e da Lei 15.211/2025.
          </div>
          {BASES_LEGAIS.map(base => (
            <div key={base.id} className="bg-white border border-gray-200 rounded-xl p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-sm font-bold text-gray-800">{base.icone} {base.base}</p>
                  <p className="text-xs text-blue-600 mt-0.5">{base.artigo}</p>
                </div>
              </div>
              <p className="text-xs text-gray-600 mb-3 leading-relaxed">{base.descricao}</p>
              <p className="text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide">Atividades que se enquadram:</p>
              <ul className="space-y-1">
                {base.atividades.map((a, i) => (
                  <li key={i} className="text-xs text-gray-600 flex gap-2">
                    <span className="text-gray-400">•</span> {a}
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-xs text-blue-700">
            <strong>Dica prática:</strong> Para cada atividade de tratamento, defina formalmente a base legal e documente em seu RIPD (Relatório de Impacto à Proteção de Dados). Acesse o item PE-09 do Protocolo ECA Escolar.
          </div>
        </div>
      )}
    </Layout>
  )
}

// Import Check locally since not imported above
function Check({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  )
}
