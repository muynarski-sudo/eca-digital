// Critérios Metodológicos — adaptado para Escolas e EdTechs (Setor S8)

export const principiosInclusao = [
  {
    id: 'P1',
    nome: 'Acesso Provável por Crianças e Adolescentes',
    descricao: 'O serviço deve atender 3 critérios cumulativos: (1) real probabilidade de uso/atratividade por menores; (2) facilidade de acesso considerável; (3) risco significativo à privacidade, segurança ou desenvolvimento.',
    baseLegal: 'Art. 1º, parágrafo único, Lei 15.211/2025',
    aplicacaoEdtech: 'Escolas e EdTechs atendem P1 de forma PRIMÁRIA — crianças e adolescentes são o público-alvo central, não incidental.',
    exemplos: ['LMS escolar', 'App de aprendizado', 'Plataforma de videoaulas', 'Sistema de gestão escolar com acesso de alunos'],
  },
  {
    id: 'P2',
    nome: 'Obrigações Específicas e Diferenciadas',
    descricao: 'O setor gera obrigações não totalmente cobertas por outros setores; diferenciação por tipo de conteúdo, processo ou autoridade regulatória.',
    baseLegal: 'Arts. 5–17, 18–33, Lei 15.211/2025',
    aplicacaoEdtech: 'EdTechs têm obrigações específicas relacionadas à coleta de dados de desempenho, comportamento de aprendizagem e interação pedagógica — tratamentos únicos deste setor.',
    exemplos: ['Analytics de aprendizagem', 'Dados de frequência e desempenho', 'Interações tutor-aluno', 'Gamificação educacional'],
  },
  {
    id: 'P3',
    nome: 'Risco Específico a Menores',
    descricao: 'Setores incluídos mesmo que C&A não sejam o público-alvo caso haja evidências de risco elevado (conteúdo, design, modelo de dados, dinâmica de interação).',
    baseLegal: 'Arts. 6–13, Lei 15.211/2025',
    aplicacaoEdtech: 'EdTechs têm menores como público PRINCIPAL, com dados comportamentais ricos (atenção, desempenho, padrões de uso). Risco P3 é máximo neste setor.',
    exemplos: ['Rastreamento de atenção por câmera', 'Analytics de engajamento', 'Sistemas de recomendação adaptativa'],
  },
  {
    id: 'P4',
    nome: 'Proporcionalidade Regulatória',
    descricao: 'A inclusão deve ser proporcional à densidade de obrigações efetivas do ECA Digital; evita diluição do compliance e amplitude excessiva.',
    baseLegal: 'Art. 10, Lei 15.211/2025; Decreto 12.880/2026',
    aplicacaoEdtech: 'Obrigações do ECA Digital para EdTechs são densas e específicas — não se trata de aplicação residual, mas de regulação central ao setor.',
    exemplos: ['Proibição de publicidade comportamental', 'Obrigação de controle parental', 'Requisitos de verificação de idade'],
  },
]

export const perfilEdtech = {
  setor: 'S8 — EdTech (Tecnologia Educacional)',
  descricao: 'Plataformas digitais com foco educacional cujo público primário são crianças e adolescentes: apps de aprendizado, LMS (Learning Management Systems), plataformas de videoaulas, cursos online, tutoria digital.',
  exemplosGlobais: ['Duolingo', 'Khan Academy', 'Coursera for Kids', 'Character.ai (uso educacional)'],
  exemplosBrasil: ['Descomplica', 'Me Salva!', 'Stoodi', 'Geekie', 'Educare', 'QConcursos', 'Plurall'],
  principiosAplicaveis: ['P1', 'P2', 'P3'],
  perfilRisco: {
    publicoPrimario: 'C&A são o público-alvo central',
    dadosColetados: 'Dados comportamentais ricos: atenção, desempenho, padrões de uso, interações com conteúdo',
    riscoPrincipal: 'Proibição crítica de publicidade comportamental baseada em dados de aprendizagem',
    fiscalizacaoPrioritaria: 'Alta — EdTechs são mencionadas explicitamente na legislação',
  },
}

export const perfilEscola = {
  setor: 'Instituição de Ensino (Escola)',
  descricao: 'Escolas de educação básica e superior que utilizam ferramentas digitais para ensino, comunicação com pais e gestão de alunos.',
  exemplos: ['Redes de colégios privados', 'Escolas públicas com plataformas digitais', 'Universidades com alunos menores'],
  principiosAplicaveis: ['P1', 'P2', 'P3', 'P4'],
  perfilRisco: {
    publicoPrimario: 'Alunos menores de 18 anos em sua grande maioria',
    dadosColetados: 'Dados de matrícula, frequência, desempenho, notas, interações digitais, dados de saúde (merenda, necessidades especiais)',
    riscoPrincipal: 'Responsabilidade solidária pelos fornecedores de tecnologia (Google Workspace, Microsoft 365, LMS)',
    fiscalizacaoPrioritaria: 'Muito alta — escolas têm acesso a dados sensíveis de menores em escala',
  },
}

export const setoresExcluidos = [
  {
    setor: 'ISPs (Claro, Vivo, Tim, Oi)',
    motivo: 'Obrigações residuais apenas (bloqueio por ordem judicial); não são destinatários primários',
    principios: ['P1', 'P2', 'P4'],
  },
  {
    setor: 'Serviços Financeiros Digitais',
    motivo: 'BACEN/CMN/CVM como regulação lex specialis; obrigações cobertas por setores S6 e S7',
    principios: ['P2', 'P4'],
  },
  {
    setor: 'Streaming de Áudio (Spotify, Podcasts)',
    motivo: '"Mídias sem imagem/vídeo não são consideradas conteúdo pornográfico" (FAQ ANPD 18/03/2026); obrigações idênticas ao S3',
    principios: ['P2', 'P4'],
  },
  {
    setor: 'Email e Armazenamento em Nuvem (Gmail, Google Drive)',
    motivo: 'Obrigações ECA Digital mínimas; risco genérico, não específico do setor',
    principios: ['P2', 'P3', 'P4'],
  },
  {
    setor: 'Infraestrutura (AWS, CDN, Cloudflare)',
    motivo: 'Funcionalidades essenciais para funcionamento da internet — expressamente excluídas; sem interface com usuário',
    principios: ['P1', 'P2'],
  },
]

export const setoresIncluidos = [
  { id: 'S1', nome: 'Redes Sociais e UGC', exemplos: 'Facebook, Instagram, TikTok, YouTube', risco: 'CRITICO', relevanciaEdtech: 'Média (integração de login social)' },
  { id: 'S2', nome: 'Mensageria e Comunicação', exemplos: 'WhatsApp, Telegram, Discord', risco: 'ALTO', relevanciaEdtech: 'Alta (comunicação escola-família)' },
  { id: 'S3', nome: 'Streaming Audiovisual', exemplos: 'Netflix, Disney+, Globoplay', risco: 'MEDIO', relevanciaEdtech: 'Média (vídeo educacional)' },
  { id: 'S4', nome: 'Gaming e Live Streaming', exemplos: 'Twitch, YouTube Gaming', risco: 'ALTO', relevanciaEdtech: 'Baixa' },
  { id: 'S5', nome: 'Jogos Eletrônicos', exemplos: 'Mobile, console, PC', risco: 'ALTO', relevanciaEdtech: 'Alta (gamificação educacional)' },
  { id: 'S6', nome: 'Apostas Online', exemplos: 'Bets, Fantasy Sports', risco: 'CRITICO', relevanciaEdtech: 'Nenhuma' },
  { id: 'S7', nome: 'Marketplaces e E-commerce', exemplos: 'Mercado Livre, Shopee, iFood', risco: 'ALTO', relevanciaEdtech: 'Baixa (compra de materiais)' },
  { id: 'S8', nome: 'EdTech', exemplos: 'Duolingo, Khan Academy, LMS', risco: 'ALTO', relevanciaEdtech: 'SETOR PRINCIPAL — obrigações primárias' },
  { id: 'S9', nome: 'Saúde Digital', exemplos: 'Calm, Headspace, apps fitness', risco: 'MEDIO', relevanciaEdtech: 'Média (bem-estar de alunos)' },
  { id: 'S10', nome: 'Lojas de Apps e SOs', exemplos: 'App Store, Google Play', risco: 'ALTO', relevanciaEdtech: 'Alta (apps educacionais mobile)' },
  { id: 'S11', nome: 'Busca e Agregadores', exemplos: 'Google Search, Bing', risco: 'MEDIO', relevanciaEdtech: 'Média (pesquisa escolar)' },
  { id: 'S12', nome: 'IA Generativa e Assistentes', exemplos: 'ChatGPT, Gemini, Character.AI', risco: 'CRITICO', relevanciaEdtech: 'MUITO Alta — uso crescente por alunos' },
]

export const datasChave = [
  { data: '17/03/2026', evento: 'Lei 15.211/2025 e Decreto 12.880/2026 em vigor', urgencia: 'VIGENTE', tipo: 'vigencia' },
  { data: '18/03/2026', evento: 'FAQ ANPD/MJSP publicado com orientações setoriais', urgencia: 'VIGENTE', tipo: 'orientacao' },
  { data: '18/06/2026', evento: 'Prazo para regularização de monetização de influenciadores mirins', urgencia: 'PROXIMO', tipo: 'prazo' },
  { data: 'A definir (ANPD)', evento: 'Publicação de regulamentação técnica sobre APIs de sinal de idade', urgencia: 'AGUARDANDO', tipo: 'regulamentacao' },
  { data: 'Semestral', evento: 'Revisão recomendada das políticas de privacidade e compliance', urgencia: 'RECORRENTE', tipo: 'revisao' },
  { data: 'Anual', evento: 'Auditoria interna de compliance ECA Digital + LGPD', urgencia: 'RECORRENTE', tipo: 'auditoria' },
]
