// Anamnese Inicial — Diagnóstico de conformidade da escola
// Mapeamento: resposta → itens do Protocolo ECA Escolar + Plano de Implementação

export const BLOCOS = [
  { id: 'B1', num: 1, titulo: 'Perfil da Escola', descricao: 'Conte um pouco sobre a sua instituição' },
  { id: 'B2', num: 2, titulo: 'O Que Você Já Tem', descricao: 'Documentos, políticas e processos existentes' },
  { id: 'B3', num: 3, titulo: 'Perfil de Risco Digital', descricao: 'Como os alunos usam o digital na sua escola' },
  { id: 'B4', num: 4, titulo: 'Resultado', descricao: 'Seu diagnóstico inicial e plano personalizado' },
]

// Cada mapeamento: { valor: string | string[], itens: [{ type, id, status }] }
export const perguntas = [
  // ── BLOCO 1: Perfil ───────────────────────────────────────────────────────
  {
    id: 'A01',
    bloco: 'B1',
    pergunta: 'Qual o tipo da sua instituição?',
    subtext: 'Isso ajuda a personalizar os documentos e o diagnóstico',
    tipo: 'opcao_unica',
    opcoes: [
      { value: 'escola_publica', label: 'Escola Pública', sub: 'Municipal, estadual ou federal' },
      { value: 'escola_privada', label: 'Escola Privada', sub: 'Escola particular com fins lucrativos' },
      { value: 'escola_confessional', label: 'Escola Confessional/Comunitária', sub: 'Filantrópica, religiosa ou comunitária' },
      { value: 'edtech', label: 'EdTech / Plataforma Digital', sub: 'Empresa de tecnologia educacional' },
      { value: 'sistema_ensino', label: 'Sistema de Ensino / Rede', sub: 'Franquia ou rede de escolas' },
    ],
    mapeamentos: [],
    perfil: true,
  },
  {
    id: 'A02',
    bloco: 'B1',
    pergunta: 'Quantos alunos menores de 18 anos a escola atende?',
    tipo: 'opcao_unica',
    opcoes: [
      { value: 'ate100', label: 'Até 100 alunos' },
      { value: '100a500', label: '100 a 500 alunos' },
      { value: '500a2000', label: '500 a 2.000 alunos' },
      { value: 'acima2000', label: 'Acima de 2.000 alunos' },
    ],
    mapeamentos: [],
    perfil: true,
  },
  {
    id: 'A03',
    bloco: 'B1',
    pergunta: 'Quais faixas etárias a escola atende?',
    subtext: 'Selecione todas que se aplicam',
    tipo: 'multipla',
    opcoes: [
      { value: 'infantil', label: 'Educação Infantil (0–5 anos)' },
      { value: 'fund1', label: 'Ensino Fundamental I (6–10 anos)' },
      { value: 'fund2', label: 'Ensino Fundamental II (11–14 anos)' },
      { value: 'medio', label: 'Ensino Médio (15–17 anos)' },
      { value: 'superior', label: 'Ensino Superior' },
    ],
    mapeamentos: [],
    perfil: true,
  },
  {
    id: 'A04',
    bloco: 'B1',
    pergunta: 'A escola usa plataformas digitais de ensino (LMS, EAD, apps)?',
    tipo: 'opcao_unica',
    opcoes: [
      { value: 'nao', label: 'Não, apenas presencial' },
      { value: 'basico', label: 'Sim, apenas para comunicação (WhatsApp, email)' },
      { value: 'moderado', label: 'Sim, plataforma de gestão e atividades (Google Classroom, etc.)' },
      { value: 'extenso', label: 'Sim, plataforma completa com login de alunos e conteúdo digital' },
    ],
    mapeamentos: [
      {
        valores: ['moderado', 'extenso'],
        itens: [{ type: 'principal', id: 'PE-01', status: 'conforme' }],
      },
    ],
    perfil: true,
  },

  // ── BLOCO 2: O Que Você Já Tem ────────────────────────────────────────────
  {
    id: 'A05',
    bloco: 'B2',
    pergunta: 'A escola possui Política de Privacidade publicada e acessível às famílias?',
    tipo: 'opcao_unica',
    opcoes: [
      { value: 'sim', label: 'Sim, publicada e atualizada (2025 ou 2026)' },
      { value: 'antiga', label: 'Sim, mas está desatualizada' },
      { value: 'nao', label: 'Não possuo' },
    ],
    mapeamentos: [
      { valores: ['sim'], itens: [
        { type: 'principal', id: 'PE-23', status: 'conforme' },
        { type: 'implementacao', id: 'F2-01', status: 'conforme' },
      ]},
      { valores: ['antiga'], itens: [
        { type: 'principal', id: 'PE-23', status: 'em_andamento' },
        { type: 'implementacao', id: 'F2-01', status: 'em_andamento' },
      ]},
    ],
  },
  {
    id: 'A06',
    bloco: 'B2',
    pergunta: 'Existe Política de Uso de Imagem de Alunos e Conduta Digital para Professores?',
    subtext: 'Documento que rege publicações em redes sociais, grupos de WhatsApp, etc.',
    tipo: 'opcao_unica',
    opcoes: [
      { value: 'sim_ambas', label: 'Sim, tenho as duas políticas' },
      { value: 'sim_imagem', label: 'Só tenho política de uso de imagem' },
      { value: 'sim_conduta', label: 'Só tenho conduta digital para professores' },
      { value: 'nao', label: 'Não possuo nenhuma' },
    ],
    mapeamentos: [
      { valores: ['sim_ambas'], itens: [
        { type: 'principal', id: 'PE-03', status: 'conforme' },
        { type: 'principal', id: 'PE-04', status: 'conforme' },
        { type: 'implementacao', id: 'F2-06', status: 'conforme' },
        { type: 'implementacao', id: 'F2-02', status: 'conforme' },
      ]},
      { valores: ['sim_imagem'], itens: [
        { type: 'principal', id: 'PE-03', status: 'conforme' },
        { type: 'implementacao', id: 'F2-06', status: 'conforme' },
        { type: 'principal', id: 'PE-04', status: 'em_andamento' },
        { type: 'implementacao', id: 'F2-02', status: 'em_andamento' },
      ]},
      { valores: ['sim_conduta'], itens: [
        { type: 'principal', id: 'PE-04', status: 'conforme' },
        { type: 'implementacao', id: 'F2-02', status: 'conforme' },
        { type: 'principal', id: 'PE-03', status: 'em_andamento' },
        { type: 'implementacao', id: 'F2-06', status: 'em_andamento' },
      ]},
    ],
  },
  {
    id: 'A07',
    bloco: 'B2',
    pergunta: 'A escola possui DPO (Encarregado de Proteção de Dados) nomeado?',
    subtext: 'Pode ser interno ou externo (escritório especializado)',
    tipo: 'opcao_unica',
    opcoes: [
      { value: 'sim_publicado', label: 'Sim, com dados de contato publicados no site' },
      { value: 'sim_interno', label: 'Sim, mas sem publicação oficial' },
      { value: 'nao', label: 'Não possuo DPO' },
    ],
    mapeamentos: [
      { valores: ['sim_publicado'], itens: [
        { type: 'principal', id: 'PE-26', status: 'conforme' },
        { type: 'implementacao', id: 'F2-05', status: 'conforme' },
        { type: 'edtech', id: 'ET-02', status: 'conforme' },
      ]},
      { valores: ['sim_interno'], itens: [
        { type: 'principal', id: 'PE-26', status: 'em_andamento' },
        { type: 'implementacao', id: 'F2-05', status: 'em_andamento' },
      ]},
    ],
  },
  {
    id: 'A08',
    bloco: 'B2',
    pergunta: 'O formulário de matrícula inclui cláusula de consentimento e finalidade de uso de dados?',
    tipo: 'opcao_unica',
    opcoes: [
      { value: 'sim', label: 'Sim, com consentimento específico para cada finalidade' },
      { value: 'parcial', label: 'Parcialmente — tem algum consentimento mas não cobre tudo' },
      { value: 'nao', label: 'Não' },
    ],
    mapeamentos: [
      { valores: ['sim'], itens: [
        { type: 'principal', id: 'PE-13', status: 'conforme' },
        { type: 'implementacao', id: 'F2-04', status: 'conforme' },
      ]},
      { valores: ['parcial'], itens: [
        { type: 'principal', id: 'PE-13', status: 'em_andamento' },
        { type: 'implementacao', id: 'F2-04', status: 'em_andamento' },
      ]},
    ],
  },
  {
    id: 'A09',
    bloco: 'B2',
    pergunta: 'Existe canal oficial para pais/alunos reportarem violações ou solicitar exclusão de dados?',
    subtext: 'Email dedicado, formulário no site ou outro meio formal',
    tipo: 'opcao_unica',
    opcoes: [
      { value: 'sim', label: 'Sim, canal funcionando com prazo de resposta definido' },
      { value: 'informal', label: 'Sim, mas é informal (apenas via secretaria)' },
      { value: 'nao', label: 'Não possuo' },
    ],
    mapeamentos: [
      { valores: ['sim'], itens: [
        { type: 'principal', id: 'PE-21', status: 'conforme' },
        { type: 'implementacao', id: 'F2-07', status: 'conforme' },
        { type: 'edtech', id: 'ET-12', status: 'conforme' },
      ]},
      { valores: ['informal'], itens: [
        { type: 'principal', id: 'PE-21', status: 'em_andamento' },
        { type: 'implementacao', id: 'F2-07', status: 'em_andamento' },
      ]},
    ],
  },
  {
    id: 'A10',
    bloco: 'B2',
    pergunta: 'A equipe escolar recebeu treinamento sobre proteção de dados e ECA Digital?',
    tipo: 'opcao_unica',
    opcoes: [
      { value: 'sim', label: 'Sim, treinamento formal realizado (com lista de presença)' },
      { value: 'informal', label: 'Parcialmente — orientações informais, sem documentação' },
      { value: 'nao', label: 'Não foi realizado' },
    ],
    mapeamentos: [
      { valores: ['sim'], itens: [
        { type: 'principal', id: 'PE-27', status: 'conforme' },
        { type: 'implementacao', id: 'F3-01', status: 'conforme' },
      ]},
      { valores: ['informal'], itens: [
        { type: 'principal', id: 'PE-27', status: 'em_andamento' },
        { type: 'implementacao', id: 'F3-01', status: 'em_andamento' },
      ]},
    ],
  },

  // ── BLOCO 3: Perfil de Risco Digital ──────────────────────────────────────
  {
    id: 'A11',
    bloco: 'B3',
    pergunta: 'A plataforma permite contato/chat entre alunos ou com pessoas externas?',
    subtext: 'Fóruns, mensagens diretas, comentários abertos',
    tipo: 'opcao_unica',
    risco4c: 'contato',
    opcoes: [
      { value: 'sim_sem_mod', label: 'Sim, sem moderação', risco: 'alto' },
      { value: 'sim_com_mod', label: 'Sim, com moderação ativa', risco: 'medio' },
      { value: 'apenas_prof', label: 'Apenas com professores/equipe escolar', risco: 'baixo' },
      { value: 'nao', label: 'Não usa plataforma com interação', risco: 'baixo' },
    ],
    mapeamentos: [
      { valores: ['apenas_prof', 'sim_com_mod'], itens: [
        { type: 'principal', id: 'PE-05', status: 'em_andamento' },
      ]},
    ],
  },
  {
    id: 'A12',
    bloco: 'B3',
    pergunta: 'Alunos têm acesso a conteúdo externo não moderado nas plataformas da escola?',
    subtext: 'YouTube embeds, links externos, fóruns abertos, redes sociais',
    tipo: 'opcao_unica',
    risco4c: 'conteudo',
    opcoes: [
      { value: 'sim_aberto', label: 'Sim, conteúdo externo aberto sem restrições', risco: 'alto' },
      { value: 'sim_filtrado', label: 'Sim, mas com filtros ou curadoria', risco: 'medio' },
      { value: 'nao', label: 'Não — apenas conteúdo produzido pela escola', risco: 'baixo' },
    ],
    mapeamentos: [
      { valores: ['nao', 'sim_filtrado'], itens: [
        { type: 'principal', id: 'PE-19', status: 'em_andamento' },
      ]},
      { valores: ['nao'], itens: [
        { type: 'principal', id: 'PE-19', status: 'conforme' },
      ]},
    ],
  },
  {
    id: 'A13',
    bloco: 'B3',
    pergunta: 'Existem espaços onde alunos interagem entre si (comentários, grupos, fóruns)?',
    subtext: 'Considera também grupos de WhatsApp escolares e turmas em redes sociais',
    tipo: 'opcao_unica',
    risco4c: 'conduta',
    opcoes: [
      { value: 'sim_sem_mod', label: 'Sim, sem moderação sistemática', risco: 'alto' },
      { value: 'sim_com_mod', label: 'Sim, com acompanhamento de professores', risco: 'medio' },
      { value: 'nao', label: 'Não existem espaços de interação entre alunos', risco: 'baixo' },
    ],
    mapeamentos: [
      { valores: ['sim_com_mod'], itens: [
        { type: 'principal', id: 'PE-05', status: 'em_andamento' },
        { type: 'implementacao', id: 'F3-04', status: 'em_andamento' },
      ]},
    ],
  },
  {
    id: 'A14',
    bloco: 'B3',
    pergunta: 'Dados dos alunos são compartilhados com fornecedores ou apps externos?',
    subtext: 'Sistemas de gestão escolar, Google Workspace, Microsoft 365, apps de comunicação',
    tipo: 'opcao_unica',
    risco4c: 'contrato',
    opcoes: [
      { value: 'sim_dpa', label: 'Sim, mas com contratos e DPAs assinados', risco: 'medio' },
      { value: 'sim_sem_dpa', label: 'Sim, mas sem contratos formais de proteção de dados', risco: 'alto' },
      { value: 'nao', label: 'Não compartilhamos dados com externos', risco: 'baixo' },
    ],
    mapeamentos: [
      { valores: ['sim_dpa'], itens: [
        { type: 'principal', id: 'PE-28', status: 'em_andamento' },
        { type: 'edtech', id: 'ET-01', status: 'em_andamento' },
        { type: 'edtech', id: 'ET-05', status: 'em_andamento' },
      ]},
      { valores: ['sim_sem_dpa'], itens: [
        { type: 'implementacao', id: 'F1-02', status: 'em_andamento' },
      ]},
    ],
  },
  {
    id: 'A15',
    bloco: 'B3',
    pergunta: 'Qual a principal base legal usada para tratar dados dos alunos?',
    subtext: 'Conforme a Lei Geral de Proteção de Dados (LGPD)',
    tipo: 'opcao_unica',
    opcoes: [
      { value: 'consentimento', label: 'Consentimento dos pais/responsáveis (Art. 7º, I)' },
      { value: 'obrigacao_legal', label: 'Obrigação legal — LDB, ECA, regulações do MEC (Art. 7º, II)' },
      { value: 'interesse_legitimo', label: 'Interesse legítimo (Art. 7º, IX)' },
      { value: 'nao_sei', label: 'Não sei / Não foi definido formalmente' },
    ],
    mapeamentos: [
      { valores: ['consentimento', 'obrigacao_legal', 'interesse_legitimo'], itens: [
        { type: 'implementacao', id: 'F2-04', status: 'em_andamento' },
      ]},
    ],
    perfil: true,
  },
]

// Computa atualizações de checklist a partir das respostas da anamnese
export function computarAtualizacoes(respostas) {
  const updates = []
  const seen = new Set()

  for (const pergunta of perguntas) {
    const resposta = respostas[pergunta.id]
    if (!resposta) continue

    for (const mapeamento of (pergunta.mapeamentos || [])) {
      const valores = Array.isArray(resposta) ? resposta : [resposta]
      const match = mapeamento.valores.some(v => valores.includes(v))
      if (!match) continue

      for (const item of mapeamento.itens) {
        const key = `${item.type}:${item.id}`
        // If we already have this item at 'conforme', don't downgrade to 'em_andamento'
        const existing = updates.find(u => u.type === item.type && u.id === item.id)
        if (existing) {
          if (item.status === 'conforme') existing.status = 'conforme'
        } else {
          if (!seen.has(key)) {
            seen.add(key)
            updates.push({ ...item })
          }
        }
      }
    }
  }
  return updates
}

// Computa perfil de risco 4 Cs a partir das respostas
export function computarPerfil4Cs(respostas) {
  const nivelMap = {
    'sim_sem_mod': 'alto', 'sim_aberto': 'alto', 'sim_sem_dpa': 'alto',
    'sim_com_mod': 'medio', 'sim_filtrado': 'medio', 'sim_dpa': 'medio',
    'apenas_prof': 'baixo', 'nao': 'baixo',
  }

  return {
    contato: nivelMap[respostas.A11] || 'baixo',
    conteudo: nivelMap[respostas.A12] || 'baixo',
    conduta: nivelMap[respostas.A13] || 'baixo',
    contrato: nivelMap[respostas.A14] || 'baixo',
  }
}

// Computa score percentual de conformidade inicial
export function computarScore(respostas) {
  const conforme = ['sim', 'sim_ambas', 'sim_publicado', 'sim_dpa']
  const pergsAvaliadas = perguntas.filter(p => p.mapeamentos?.length > 0)
  let pontos = 0
  for (const p of pergsAvaliadas) {
    const r = respostas[p.id]
    if (r && conforme.includes(r)) pontos++
  }
  return Math.round((pontos / Math.max(pergsAvaliadas.length, 1)) * 100)
}
