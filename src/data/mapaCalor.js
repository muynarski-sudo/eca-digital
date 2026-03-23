// Mapa de Calor — Escolas e EdTechs (S8)
// 5 dimensões de risco × categorias de compliance

export const DIMENSOES_CALOR = [
  { key: 'A', label: 'Probabilidade de Fiscalização', desc: 'Probabilidade de fiscalização pela ANPD nos primeiros 12 meses' },
  { key: 'B', label: 'Impacto Financeiro', desc: 'Impacto máximo das penalidades financeiras' },
  { key: 'C', label: 'Complexidade Técnica', desc: 'Complexidade de implementação técnica' },
  { key: 'D', label: 'Risco Reputacional', desc: 'Risco reputacional e de marca com pais/alunos' },
  { key: 'E', label: 'Urgência de Prazo', desc: 'Urgência dos prazos legais' },
]

export const ESCALA = [
  { valor: 4, label: 'Crítico', color: '#dc2626', bg: '#fef2f2' },
  { valor: 3, label: 'Alto',    color: '#d97706', bg: '#fffbeb' },
  { valor: 2, label: 'Médio',   color: '#ca8a04', bg: '#fefce8' },
  { valor: 1, label: 'Baixo',   color: '#16a34a', bg: '#f0fdf4' },
]

export const mapaCalorEdtech = [
  {
    categoria: 'Aferição de Idade',
    itemId: 'MCA-01',
    A: 4, B: 4, C: 3, D: 4, E: 4,
    descricao: 'Risco máximo: proibição de autodeclaração é obrigação expressa e prioritária para fiscalização ANPD',
    acaoRecomendada: 'Implementar verificação via CPF do responsável ou dados da matrícula imediatamente',
  },
  {
    categoria: 'Perfilamento e Publicidade',
    itemId: 'MCA-02',
    A: 4, B: 4, C: 2, D: 4, E: 4,
    descricao: 'Proibição absoluta de perfilamento comportamental de menores para publicidade. Complexidade técnica baixa (remover pixels), mas impacto crítico',
    acaoRecomendada: 'Auditoria de pixels e tags de marketing; remoção imediata dos que rastreiam menores',
  },
  {
    categoria: 'Supervisão Parental',
    itemId: 'MCA-03',
    A: 3, B: 3, C: 3, D: 4, E: 4,
    descricao: 'Portal do responsável é obrigação legal; ausência gera alto impacto reputacional com pais',
    acaoRecomendada: 'Desenvolver portal do responsável com acesso ao histórico e ferramentas de controle',
  },
  {
    categoria: 'Privacidade por Design',
    itemId: 'MCA-04',
    A: 4, B: 3, C: 3, D: 3, E: 4,
    descricao: 'Configurações protetoras por padrão são obrigação legal imediata para plataformas EdTech',
    acaoRecomendada: 'Revisar e ajustar defaults de privacidade para contas de menores em todos os sistemas',
  },
  {
    categoria: 'Isolamento de Dados de Verificação',
    itemId: 'MCA-05',
    A: 4, B: 4, C: 4, D: 3, E: 4,
    descricao: 'Alto risco técnico: dados de verificação não podem se misturar com dados pedagógicos/analytics',
    acaoRecomendada: 'Arquitetura de banco de dados segregada; controles de acesso rigorosos',
  },
  {
    categoria: 'Conteúdo Prejudicial e CSAM',
    itemId: 'MCA-06',
    A: 4, B: 4, C: 2, D: 4, E: 4,
    descricao: 'Obrigação de remoção imediata de CSAM é inegociável; exposição penal para gestores',
    acaoRecomendada: 'Playbook de CSAM + canal de denúncia + treinamento de moderação',
  },
  {
    categoria: 'Documentação (RIPD, Políticas)',
    itemId: 'MCA-07',
    A: 3, B: 3, C: 2, D: 2, E: 4,
    descricao: 'Documentação é condição para defesa administrativa; ausência agrava penalidades',
    acaoRecomendada: 'RIPD, Política de Privacidade específica para menores, Política Anticiberbullying',
  },
  {
    categoria: 'Governança (DPO, Treinamentos)',
    itemId: 'MCA-08',
    A: 3, B: 3, C: 1, D: 2, E: 4,
    descricao: 'DPO é requisito legal; ausência impede interlocução com ANPD',
    acaoRecomendada: 'Designar DPO interno ou contratar externo; publicar contato no site; treinar equipe',
  },
  {
    categoria: 'Dark Patterns e Gamificação',
    itemId: 'MCA-09',
    A: 3, B: 3, C: 3, D: 3, E: 3,
    descricao: 'EdTechs gamificadas têm risco elevado de dark patterns; auditoria UX necessária',
    acaoRecomendada: 'Auditoria UX com checklist de dark patterns; eliminação dos encontrados',
  },
  {
    categoria: 'Cadeia de Fornecedores',
    itemId: 'MCA-10',
    A: 2, B: 3, C: 2, D: 2, E: 3,
    descricao: 'Responsabilidade solidária da escola pelos fornecedores que tratam dados dos alunos',
    acaoRecomendada: 'Revisar contratos com Google, Microsoft, Zoom, LMS providers; incluir cláusulas ECA',
  },
]

// Calcula score total e risco consolidado para a instituição
export function calcularScoreCalor(respostas = {}) {
  const totalMax = mapaCalorEdtech.length * 5 * 4 // itens × dimensões × score máximo
  let totalScore = 0

  mapaCalorEdtech.forEach(item => {
    DIMENSOES_CALOR.forEach(dim => {
      const override = respostas[`${item.itemId}_${dim.key}`]
      totalScore += override !== undefined ? override : item[dim.key]
    })
  })

  const pct = (totalScore / totalMax) * 100
  if (pct >= 70) return { score: totalScore, pct, nivel: 'CRITICO', label: 'Exposição Crítica' }
  if (pct >= 50) return { score: totalScore, pct, nivel: 'ALTO', label: 'Exposição Alta' }
  if (pct >= 30) return { score: totalScore, pct, nivel: 'MEDIO', label: 'Exposição Moderada' }
  return { score: totalScore, pct, nivel: 'BAIXO', label: 'Exposição Baixa' }
}
