import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { api } from '../../lib/api'
import Layout from '../../components/Layout'
import { DOCUMENTOS_DISPONIVEIS } from '../../data/documentoTemplates'
import { FileText, Printer, ChevronDown, ChevronRight, Info } from 'lucide-react'

export default function Documentos() {
  const { user } = useAuth()
  const schoolId = user?.school_id
  const [schoolData, setSchoolData] = useState(null)
  const [form, setForm] = useState({
    dpoNome: '',
    dpoEmail: '',
    data: new Date().toLocaleDateString('pt-BR'),
  })
  const [openInfo, setOpenInfo] = useState(false)

  useEffect(() => {
    if (!schoolId) return
    // Get school info from admin endpoint
    api.getSchool(schoolId).then(data => {
      setSchoolData(data)
    }).catch(() => {
      // fallback to user context
      setSchoolData({ name: user?.school_name })
    })
  }, [schoolId])

  function getEscolaParams() {
    return {
      nome: schoolData?.name || user?.school_name || '',
      cnpj: schoolData?.cnpj || '',
      responsible: schoolData?.responsible || '',
      email: schoolData?.email || '',
      cidade: schoolData?.city || '',
      estado: schoolData?.state || '',
      dpoNome: form.dpoNome,
      dpoEmail: form.dpoEmail,
      data: form.data,
    }
  }

  function imprimirDocumento(doc) {
    const escola = getEscolaParams()
    if (!escola.dpoNome || !escola.dpoEmail) {
      alert('Preencha o nome e email do DPO antes de gerar o documento.')
      return
    }
    const html = doc.gerador(escola)
    const win = window.open('', '_blank', 'width=900,height=700')
    if (!win) {
      alert('Permita pop-ups para gerar o PDF.')
      return
    }
    win.document.write(html)
    win.document.close()
    setTimeout(() => win.print(), 500)
  }

  return (
    <Layout
      title="Documentos de Compliance"
      subtitle="Gere e imprima os documentos necessários para adequação à Lei 15.211/2025"
    >
      {/* DPO config */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 mb-5">
        <button
          onClick={() => setOpenInfo(!openInfo)}
          className="w-full flex items-center justify-between text-left"
        >
          <div>
            <p className="text-sm font-semibold text-gray-800">Dados para os documentos</p>
            <p className="text-xs text-gray-500">Nome e contato do DPO — necessário para gerar os documentos</p>
          </div>
          {openInfo ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
        </button>

        {openInfo && (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1.5 block">Nome do DPO *</label>
              <input type="text" value={form.dpoNome}
                onChange={e => setForm(f => ({ ...f, dpoNome: e.target.value }))}
                placeholder="Ex: Dr. João Silva"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1.5 block">Email do DPO *</label>
              <input type="email" value={form.dpoEmail}
                onChange={e => setForm(f => ({ ...f, dpoEmail: e.target.value }))}
                placeholder="dpo@escola.com.br"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1.5 block">Data do Documento</label>
              <input type="text" value={form.data}
                onChange={e => setForm(f => ({ ...f, data: e.target.value }))}
                placeholder="DD/MM/AAAA"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
            </div>
          </div>
        )}

        {!openInfo && (
          <div className="mt-3 flex items-center gap-2">
            {form.dpoNome && form.dpoEmail ? (
              <span className="text-xs text-green-700 bg-green-50 border border-green-200 px-2 py-1 rounded-lg">
                ✅ DPO: {form.dpoNome} — {form.dpoEmail}
              </span>
            ) : (
              <span className="text-xs text-amber-700 bg-amber-50 border border-amber-200 px-2 py-1 rounded-lg flex items-center gap-1">
                <Info className="w-3 h-3" /> Preencha os dados do DPO para gerar os documentos
              </span>
            )}
          </div>
        )}
      </div>

      {/* Info banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-5 text-xs text-blue-700">
        <p className="font-semibold text-blue-800 mb-1">Como usar os documentos</p>
        Clique em "Gerar PDF" para abrir o documento em nova aba formatado para impressão A4.
        Use <strong>Ctrl+P</strong> (ou Cmd+P no Mac) para imprimir ou salvar como PDF.
        Personalize o conteúdo conforme a realidade da sua escola antes de publicar oficialmente.
      </div>

      {/* Document list */}
      <div className="space-y-4">
        {DOCUMENTOS_DISPONIVEIS.map(doc => (
          <div key={doc.id} className="bg-white border border-gray-200 rounded-xl p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center text-xl flex-shrink-0">
                  {doc.icone}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-0.5">
                    <p className="text-sm font-bold text-gray-800">{doc.titulo}</p>
                    {doc.obrigatorio && (
                      <span className="text-xs px-1.5 py-0.5 bg-red-100 text-red-700 rounded font-medium">Obrigatório</span>
                    )}
                  </div>
                  <p className="text-xs text-brand-600 mb-1">{doc.subtitulo}</p>
                  <p className="text-xs text-gray-500 leading-relaxed">{doc.descricao}</p>
                  <div className="flex gap-1 mt-2 flex-wrap">
                    {doc.itensRelacionados.map(id => (
                      <span key={id} className="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded font-mono">{id}</span>
                    ))}
                  </div>
                </div>
              </div>
              <button
                onClick={() => imprimirDocumento(doc)}
                className="flex-shrink-0 flex items-center gap-2 px-4 py-2.5 bg-brand-600 text-white rounded-lg text-xs font-semibold hover:bg-brand-700 transition-colors"
              >
                <Printer className="w-3.5 h-3.5" />
                Gerar PDF
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Legal bases tip */}
      <div className="mt-6 bg-gray-50 border border-gray-200 rounded-xl p-5">
        <div className="flex items-start gap-3">
          <FileText className="w-5 h-5 text-gray-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-gray-700 mb-1">Documentos adicionais recomendados</p>
            <ul className="text-xs text-gray-600 space-y-1">
              <li>• <strong>Contrato DPA com EdTechs/Fornecedores</strong> — exija de cada fornecedor de tecnologia (ver módulo EdTech Contratual)</li>
              <li>• <strong>RIPD</strong> (Relatório de Impacto à Proteção de Dados) — para tratamentos de maior risco (PE-09)</li>
              <li>• <strong>Ato de Designação do DPO</strong> — documento formal assinado pela direção (PE-26)</li>
              <li>• <strong>Plano de Resposta a Incidentes</strong> — procedimento interno com SLA de 72h para ANPD (PE-29)</li>
            </ul>
            <p className="text-xs text-gray-400 mt-2">Consulte o módulo <strong>EdTech Contratual</strong> para modelos de cláusulas contratuais e DPA.</p>
          </div>
        </div>
      </div>
    </Layout>
  )
}
