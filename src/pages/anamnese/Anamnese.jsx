import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import { api } from '../../lib/api'
import Layout from '../../components/Layout'
import { BLOCOS, perguntas, computarAtualizacoes, computarPerfil4Cs, computarScore } from '../../data/anamnese'
import { ChevronRight, ChevronLeft, Check, AlertTriangle, Loader } from 'lucide-react'

const NIVEL_COR = {
  alto: 'bg-red-100 text-red-800 border-red-300',
  medio: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  baixo: 'bg-green-100 text-green-800 border-green-300',
}
const NIVEL_LABEL = { alto: '⚠️ ALTO', medio: '🔶 MÉDIO', baixo: '✅ BAIXO' }

export default function Anamnese() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const schoolId = user?.school_id
  const [step, setStep] = useState(0) // 0=B1, 1=B2, 2=B3, 3=resultado
  const [respostas, setRespostas] = useState({})
  const [jaRealizada, setJaRealizada] = useState(false)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [savedPerfil, setSavedPerfil] = useState(null)

  useEffect(() => {
    if (!schoolId) return
    api.getAnamnese(schoolId).then(data => {
      if (data.concluida) {
        setJaRealizada(true)
        setRespostas(data.respostas || {})
        setSavedPerfil(data.perfil_4cs)
      }
    }).catch(() => {}).finally(() => setLoading(false))
  }, [schoolId])

  const blocoIds = BLOCOS.slice(0, 3).map(b => b.id)
  const perguntasBloco = (bId) => perguntas.filter(p => p.bloco === bId)
  const currentBlocoId = blocoIds[step]
  const currentPerguntas = currentBlocoId ? perguntasBloco(currentBlocoId) : []

  function responder(perguntaId, valor, tipo) {
    setRespostas(prev => {
      if (tipo === 'multipla') {
        const atual = prev[perguntaId] || []
        return {
          ...prev,
          [perguntaId]: atual.includes(valor)
            ? atual.filter(v => v !== valor)
            : [...atual, valor],
        }
      }
      return { ...prev, [perguntaId]: valor }
    })
  }

  function isRespondida(pid) {
    const r = respostas[pid]
    if (Array.isArray(r)) return r.length > 0
    return !!r
  }

  function blocoCompleto(bId) {
    return perguntasBloco(bId).every(p => isRespondida(p.id))
  }

  function avancar() {
    if (step < 2) setStep(s => s + 1)
    else setStep(3)
  }

  async function salvar() {
    if (!schoolId) return
    setSaving(true)
    const perfil_4cs = computarPerfil4Cs(respostas)
    const updates = computarAtualizacoes(respostas)
    try {
      await api.saveAnamnese(schoolId, { respostas, perfil_4cs, updates })
      setJaRealizada(true)
      setSavedPerfil(perfil_4cs)
      navigate('/dashboard')
    } catch (err) {
      alert('Erro ao salvar: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return (
    <Layout title="Diagnóstico Inicial" subtitle="Carregando...">
      <div className="flex justify-center items-center h-48"><Loader className="animate-spin text-gray-400" /></div>
    </Layout>
  )

  const perfil4cs = computarPerfil4Cs(respostas)
  const score = computarScore(respostas)
  const updates = computarAtualizacoes(respostas)

  return (
    <Layout
      title="Diagnóstico Inicial"
      subtitle="Mapeie o que sua escola já possui e receba um plano personalizado"
    >
      {jaRealizada && step === 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-5">
          <p className="text-sm font-semibold text-blue-800 mb-1">Diagnóstico já realizado</p>
          <p className="text-xs text-blue-700">Você pode refazer o diagnóstico a qualquer momento. Os itens do checklist serão atualizados com base nas novas respostas.</p>
          <button onClick={() => setStep(3)} className="mt-2 text-xs text-blue-700 underline font-medium">Ver resultado anterior →</button>
        </div>
      )}

      {/* Progress bar */}
      {step < 3 && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            {BLOCOS.slice(0, 3).map((b, i) => (
              <div key={b.id} className="flex items-center gap-1 flex-1">
                <div className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold transition-colors ${
                  i < step ? 'bg-green-500 text-white' : i === step ? 'bg-brand-600 text-white' : 'bg-gray-200 text-gray-500'
                }`}>
                  {i < step ? <Check className="w-3.5 h-3.5" /> : b.num}
                </div>
                <div className="hidden md:block">
                  <p className={`text-xs font-semibold ${i === step ? 'text-brand-700' : 'text-gray-500'}`}>{b.titulo}</p>
                </div>
                {i < 2 && <div className={`flex-1 h-0.5 mx-2 ${i < step ? 'bg-green-400' : 'bg-gray-200'}`} />}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Questions */}
      {step < 3 && (
        <div>
          <div className="mb-5">
            <h2 className="text-lg font-bold text-gray-900">{BLOCOS[step].titulo}</h2>
            <p className="text-sm text-gray-500">{BLOCOS[step].descricao}</p>
          </div>

          <div className="space-y-6">
            {currentPerguntas.map(pergunta => {
              const resposta = respostas[pergunta.id]
              return (
                <div key={pergunta.id} className="bg-white border border-gray-200 rounded-xl p-5">
                  <p className="text-sm font-semibold text-gray-800 mb-1">{pergunta.pergunta}</p>
                  {pergunta.subtext && <p className="text-xs text-gray-500 mb-3">{pergunta.subtext}</p>}
                  {!pergunta.subtext && <div className="mb-3" />}

                  {pergunta.tipo === 'multipla' ? (
                    <div className="space-y-2">
                      {pergunta.opcoes.map(opt => {
                        const selecionado = Array.isArray(resposta) && resposta.includes(opt.value)
                        return (
                          <button key={opt.value} onClick={() => responder(pergunta.id, opt.value, 'multipla')}
                            className={`w-full text-left px-4 py-3 rounded-lg border transition-colors flex items-center gap-3 ${
                              selecionado ? 'border-brand-500 bg-brand-50 text-brand-800' : 'border-gray-200 hover:border-gray-300 text-gray-700'
                            }`}>
                            <div className={`w-4 h-4 rounded flex-shrink-0 border-2 flex items-center justify-center transition-colors ${
                              selecionado ? 'bg-brand-600 border-brand-600' : 'border-gray-300'
                            }`}>
                              {selecionado && <Check className="w-2.5 h-2.5 text-white" />}
                            </div>
                            <span className="text-sm">{opt.label}</span>
                          </button>
                        )
                      })}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {pergunta.opcoes.map(opt => {
                        const selecionado = resposta === opt.value
                        return (
                          <button key={opt.value} onClick={() => responder(pergunta.id, opt.value, 'opcao_unica')}
                            className={`w-full text-left px-4 py-3 rounded-lg border transition-colors ${
                              selecionado ? 'border-brand-500 bg-brand-50' : 'border-gray-200 hover:border-gray-300'
                            }`}>
                            <div className="flex items-center gap-3">
                              <div className={`w-4 h-4 rounded-full flex-shrink-0 border-2 flex items-center justify-center transition-colors ${
                                selecionado ? 'border-brand-600' : 'border-gray-300'
                              }`}>
                                {selecionado && <div className="w-2 h-2 rounded-full bg-brand-600" />}
                              </div>
                              <div>
                                <p className={`text-sm font-medium ${selecionado ? 'text-brand-800' : 'text-gray-700'}`}>{opt.label}</p>
                                {opt.sub && <p className="text-xs text-gray-400 mt-0.5">{opt.sub}</p>}
                              </div>
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          <div className="flex gap-3 mt-6">
            {step > 0 && (
              <button onClick={() => setStep(s => s - 1)}
                className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 text-gray-600 rounded-lg text-sm hover:bg-gray-50">
                <ChevronLeft className="w-4 h-4" /> Anterior
              </button>
            )}
            <button
              onClick={avancar}
              disabled={!blocoCompleto(currentBlocoId)}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-brand-600 text-white rounded-lg text-sm font-semibold hover:bg-brand-700 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {step < 2 ? 'Próximo' : 'Ver Resultado'} <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Result step */}
      {step === 3 && (
        <div>
          <div className="bg-white border border-gray-200 rounded-xl p-6 mb-5 text-center">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Score de Conformidade Inicial</p>
            <div className={`text-5xl font-bold mb-2 ${score >= 60 ? 'text-green-600' : score >= 30 ? 'text-yellow-600' : 'text-red-600'}`}>
              {savedPerfil ? computarScore(respostas) : score}%
            </div>
            <p className="text-sm text-gray-500">Baseado nas suas respostas</p>
            <div className="w-full bg-gray-100 rounded-full h-3 mt-3">
              <div className={`h-3 rounded-full ${score >= 60 ? 'bg-green-500' : score >= 30 ? 'bg-yellow-500' : 'bg-red-500'}`}
                style={{ width: `${score}%` }} />
            </div>
          </div>

          {/* 4 Cs Profile */}
          <div className="mb-5">
            <h3 className="text-sm font-bold text-gray-700 mb-3">Perfil de Risco — Matriz 4 Cs</h3>
            <div className="grid grid-cols-2 gap-3">
              {[
                { key: 'conteudo', label: 'Conteúdo', icon: '📺' },
                { key: 'contato', label: 'Contato', icon: '👤' },
                { key: 'conduta', label: 'Conduta', icon: '🤝' },
                { key: 'contrato', label: 'Contrato', icon: '📋' },
              ].map(({ key, label, icon }) => {
                const nivel = (savedPerfil || perfil4cs)[key] || 'baixo'
                return (
                  <div key={key} className={`rounded-xl border p-3 ${NIVEL_COR[nivel]}`}>
                    <p className="text-xs font-bold mb-0.5">{icon} {label}</p>
                    <p className="text-sm font-bold">{NIVEL_LABEL[nivel]}</p>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Items to be updated */}
          {updates.length > 0 && !jaRealizada && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-5">
              <p className="text-sm font-semibold text-green-800 mb-2">
                ✅ {updates.length} item{updates.length > 1 ? 's' : ''} serão marcados automaticamente no checklist
              </p>
              <div className="space-y-1">
                {updates.slice(0, 6).map(u => (
                  <p key={`${u.type}:${u.id}`} className="text-xs text-green-700">
                    • {u.id} — {u.status === 'conforme' ? 'Conforme' : 'Em Andamento'}
                  </p>
                ))}
                {updates.length > 6 && <p className="text-xs text-green-600">...e mais {updates.length - 6} itens</p>}
              </div>
            </div>
          )}

          {/* Priorities */}
          {Object.values(savedPerfil || perfil4cs).includes('alto') && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-5">
              <div className="flex gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-red-800">Riscos críticos identificados</p>
                  <p className="text-xs text-red-700 mt-1">Acesse a Matriz 4 Cs para ver os riscos detalhados e as ações prioritárias recomendadas para sua escola.</p>
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-3">
            {!jaRealizada && (
              <button onClick={() => setStep(0)} className="px-4 py-2.5 border border-gray-200 text-gray-600 rounded-lg text-sm">
                Revisar Respostas
              </button>
            )}
            <button
              onClick={salvar}
              disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-brand-600 text-white rounded-lg text-sm font-semibold hover:bg-brand-700 disabled:opacity-60"
            >
              {saving ? <><Loader className="w-4 h-4 animate-spin" /> Salvando...</> : jaRealizada ? 'Atualizar Diagnóstico' : 'Salvar e Atualizar Checklist'}
            </button>
            {jaRealizada && (
              <button onClick={() => navigate('/risco4cs')} className="px-4 py-2.5 border border-gray-200 text-gray-700 rounded-lg text-sm font-medium">
                Ver Matriz 4 Cs
              </button>
            )}
          </div>
        </div>
      )}
    </Layout>
  )
}
