// Templates de documentos para impressão/PDF
// Cada template gera HTML pronto para window.print()

const CSS_PRINT = `
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: 'Georgia', 'Times New Roman', serif;
      margin: 0;
      padding: 2cm;
      font-size: 11pt;
      line-height: 1.7;
      color: #111;
      background: white;
    }
    .cabecalho { text-align: center; margin-bottom: 2em; border-bottom: 2px solid #333; padding-bottom: 1em; }
    .cabecalho h1 { font-size: 16pt; margin: 0 0 0.3em; text-transform: uppercase; letter-spacing: 1px; }
    .cabecalho .instituicao { font-size: 13pt; font-weight: bold; margin: 0.2em 0; }
    .cabecalho .versao { font-size: 9pt; color: #666; margin-top: 0.5em; }
    h2 { font-size: 13pt; margin-top: 1.8em; margin-bottom: 0.5em; border-bottom: 1px solid #ccc; padding-bottom: 3px; text-transform: uppercase; letter-spacing: 0.5px; }
    h3 { font-size: 11pt; margin-top: 1.2em; font-style: italic; }
    p { margin: 0.6em 0; text-align: justify; }
    ul, ol { margin: 0.5em 0 0.5em 1.5em; }
    li { margin: 0.3em 0; }
    .rodape { margin-top: 3em; border-top: 1px solid #ccc; padding-top: 1em; font-size: 9pt; color: #666; }
    .assinatura { display: flex; gap: 3em; margin-top: 3em; }
    .assinatura .linha { flex: 1; border-top: 1px solid #333; padding-top: 0.5em; text-align: center; font-size: 10pt; }
    .destaque { background: #f5f5f5; border-left: 3px solid #333; padding: 0.8em 1em; margin: 1em 0; }
    @page { size: A4; margin: 0; }
    @media screen { body { max-width: 21cm; margin: 1cm auto; padding: 2cm; box-shadow: 0 0 10px rgba(0,0,0,0.1); } }
  </style>
`

export function gerarPoliticaPrivacidade(escola) {
  const { nome, cnpj, responsible, email, dpoNome, dpoEmail, cidade, estado, data } = escola
  const dataDoc = data || new Date().toLocaleDateString('pt-BR')
  return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>Política de Privacidade — ${nome}</title>${CSS_PRINT}</head><body>
<div class="cabecalho">
  <div class="instituicao">${nome || '[NOME DA ESCOLA]'}</div>
  ${cnpj ? `<div style="font-size:10pt;color:#555">CNPJ: ${cnpj}</div>` : ''}
  <h1>Política de Privacidade e Proteção de Dados</h1>
  <div class="versao">Versão 1.0 — ${dataDoc} — Em conformidade com a LGPD (Lei 13.709/2018) e ECA Digital (Lei 15.211/2025)</div>
</div>

<h2>1. Identificação do Controlador</h2>
<p>A presente Política de Privacidade é adotada por <strong>${nome || '[NOME DA ESCOLA]'}</strong>${cnpj ? `, inscrita no CNPJ sob o nº ${cnpj}` : ''}, localizada em ${cidade || '[CIDADE]'}/${estado || '[UF]'} (doravante denominada <strong>"Escola"</strong>), na qualidade de controladora de dados pessoais, conforme a Lei Geral de Proteção de Dados (LGPD — Lei 13.709/2018) e a Lei 15.211/2025 (ECA Digital).</p>

<p>O Encarregado de Proteção de Dados (DPO) da Escola é <strong>${dpoNome || '[NOME DO DPO]'}</strong>, cujo contato é: <strong>${dpoEmail || '[EMAIL DO DPO]'}</strong>.</p>

<h2>2. Dados Coletados e Finalidades</h2>
<p>A Escola coleta e trata dados pessoais nas seguintes situações:</p>
<ul>
  <li><strong>Dados de matrícula:</strong> nome completo, data de nascimento, RG/CPF, endereço, filiação — para cumprimento de obrigação legal (matrícula, registros escolares, Censo Escolar/INEP), com base no Art. 7º, II da LGPD.</li>
  <li><strong>Dados de desempenho pedagógico:</strong> notas, frequência, relatórios de aprendizagem — para fins estritamente pedagógicos, com base no Art. 7º, II (obrigação legal) e Art. 7º, IX (interesse legítimo).</li>
  <li><strong>Dados de saúde:</strong> alergias, medicações, laudos médicos — para proteção da saúde e segurança do aluno, com base no Art. 7º, VII da LGPD e Arts. 11, §1º.</li>
  <li><strong>Imagens e voz:</strong> fotos, vídeos e gravações de aulas — somente com autorização expressa dos responsáveis legais, com base no Art. 7º, I (consentimento).</li>
  <li><strong>Dados de uso de plataformas digitais:</strong> login, acesso e atividades em sistemas escolares — para fins pedagógicos e de segurança, com base no Art. 7º, II e IX da LGPD.</li>
</ul>

<h2>3. Proteção Especial de Crianças e Adolescentes</h2>
<p>Em conformidade com o Art. 14 da LGPD e a Lei 15.211/2025 (ECA Digital), a Escola adota as seguintes medidas de proteção para alunos menores de 18 anos:</p>
<ul>
  <li>O tratamento de dados de menores de 16 anos requer consentimento específico e destacado dos pais ou responsáveis legais;</li>
  <li>Perfis digitais de alunos menores são configurados como privados por padrão;</li>
  <li>É vedado qualquer perfilamento comportamental de alunos menores para fins publicitários;</li>
  <li>Os dados utilizados para verificação de idade são mantidos em ambiente segregado e não utilizados para outras finalidades;</li>
  <li>A Escola não cede, vende ou compartilha dados de alunos com terceiros para fins comerciais.</li>
</ul>

<h2>4. Compartilhamento de Dados</h2>
<p>Os dados dos alunos podem ser compartilhados exclusivamente com:</p>
<ul>
  <li>Secretarias municipais ou estaduais de educação, para cumprimento de obrigações legais;</li>
  <li>Fornecedores de tecnologia (sistemas de gestão escolar, plataformas de EAD) vinculados por contrato de tratamento de dados (DPA) com cláusulas de proteção;</li>
  <li>Autoridades públicas, quando exigido por lei ou ordem judicial.</li>
</ul>
<p>A Escola não vende, aluga ou cede dados pessoais de alunos para fins comerciais ou publicitários.</p>

<h2>5. Direitos dos Titulares</h2>
<p>Alunos, pais e responsáveis legais podem exercer, a qualquer momento, os seguintes direitos:</p>
<ul>
  <li><strong>Acesso:</strong> saber quais dados a Escola possui sobre o aluno;</li>
  <li><strong>Correção:</strong> retificar dados incompletos, inexatos ou desatualizados;</li>
  <li><strong>Eliminação:</strong> solicitar a exclusão de dados tratados com base no consentimento;</li>
  <li><strong>Portabilidade:</strong> receber os dados em formato estruturado e interoperável;</li>
  <li><strong>Revogação de consentimento:</strong> revogar o consentimento para finalidades específicas, sem prejudicar o tratamento realizado anteriormente.</li>
</ul>
<p>As solicitações devem ser encaminhadas ao DPO pelo email <strong>${dpoEmail || '[EMAIL DO DPO]'}</strong> e serão respondidas em até 15 (quinze) dias úteis.</p>

<h2>6. Segurança e Retenção</h2>
<p>A Escola adota medidas técnicas e administrativas para proteger os dados pessoais contra acesso não autorizado, destruição, perda ou alteração. Os dados são mantidos pelo período necessário à finalidade de coleta, respeitando os prazos legais (registros escolares: mínimo 5 anos após conclusão do curso).</p>

<h2>7. Canal de Denúncias e Atendimento</h2>
<p>Em caso de suspeita de uso indevido de dados ou conteúdo inadequado envolvendo alunos, acesse nosso canal de denúncias: <strong>${email || '[EMAIL DA ESCOLA]'}</strong>. O prazo de resposta é de até 72 horas.</p>

<h2>8. Atualizações desta Política</h2>
<p>Esta Política pode ser atualizada periodicamente. As famílias serão notificadas sobre mudanças relevantes. A versão vigente está sempre disponível no site e na secretaria escolar.</p>

<div class="rodape">
  <p>${nome || '[NOME DA ESCOLA]'} — ${cidade || '[CIDADE]'}/${estado || '[UF]'} — ${email || ''}</p>
  <p>DPO: ${dpoNome || '[NOME DO DPO]'} — ${dpoEmail || '[EMAIL DO DPO]'}</p>
  <p>Documento em conformidade com LGPD (Lei 13.709/2018), ECA Digital (Lei 15.211/2025) e Decreto 12.880/2026</p>
</div>
</body></html>`
}

export function gerarTermoAutorizacaoParental(escola) {
  const { nome, cnpj, data } = escola
  const dataDoc = data || new Date().toLocaleDateString('pt-BR')
  return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>Termo de Autorização Parental — ${nome}</title>${CSS_PRINT}</head><body>
<div class="cabecalho">
  <div class="instituicao">${nome || '[NOME DA ESCOLA]'}</div>
  ${cnpj ? `<div style="font-size:10pt;color:#555">CNPJ: ${cnpj}</div>` : ''}
  <h1>Termo de Autorização Parental para Uso Digital e Imagem</h1>
  <div class="versao">Em conformidade com a LGPD Art. 14, §1º e Lei 15.211/2025 (ECA Digital)</div>
</div>

<p>Eu, <strong>_______________________________________________</strong>, CPF nº <strong>___________________</strong>, na qualidade de pai/mãe/responsável legal pelo(a) aluno(a) <strong>_______________________________________________</strong>, matriculado(a) na turma <strong>_____________</strong>, AUTORIZO, nos termos abaixo descritos:</p>

<h2>1. Uso de Plataformas Digitais Escolares</h2>
<p><strong>( ) AUTORIZO &nbsp;&nbsp; ( ) NÃO AUTORIZO</strong></p>
<p>O cadastro e uso do(a) aluno(a) nas seguintes plataformas digitais adotadas pela escola: sistemas de gestão escolar, plataformas de EAD, aplicativos de comunicação e atividades pedagógicas digitais, exclusivamente para fins educacionais.</p>

<h2>2. Uso de Imagem em Materiais Escolares</h2>
<p><strong>( ) AUTORIZO &nbsp;&nbsp; ( ) NÃO AUTORIZO</strong></p>
<p>O uso da imagem e voz do(a) aluno(a) em: fotografias de eventos escolares para comunicação interna, vídeos pedagógicos de acesso restrito à comunidade escolar, transmissões ao vivo de eventos exclusivos para pais e responsáveis.</p>

<h2>3. Publicação em Redes Sociais da Escola</h2>
<p><strong>( ) AUTORIZO &nbsp;&nbsp; ( ) NÃO AUTORIZO</strong></p>
<p>A publicação de imagens do(a) aluno(a) nas redes sociais institucionais da escola (Instagram, Facebook e YouTube), sempre de forma contextualizada e sem exposição desnecessária ou identificação de dados sensíveis.</p>

<h2>4. Gravação de Aulas Síncronas</h2>
<p><strong>( ) AUTORIZO &nbsp;&nbsp; ( ) NÃO AUTORIZO</strong></p>
<p>A gravação de aulas online em que o(a) aluno(a) participe, para fins exclusivamente pedagógicos (revisão de conteúdo por alunos ausentes). As gravações não serão compartilhadas externamente.</p>

<div class="destaque">
  <strong>Direitos garantidos:</strong> Este termo pode ser revogado a qualquer momento mediante comunicação escrita à secretaria escolar. A revogação não afeta os tratamentos realizados anteriormente com base nesta autorização. Para dúvidas, contate o DPO da escola.
</div>

<h2>5. Declaração de Ciência</h2>
<p>Declaro ter lido e compreendido a Política de Privacidade da escola, e estar ciente de que os dados do(a) aluno(a) são tratados exclusivamente para finalidades pedagógicas, nunca para fins comerciais ou publicitários.</p>

<div class="assinatura">
  <div class="linha">
    <p>___________________________________</p>
    <p>Assinatura do Responsável Legal</p>
    <p>Nome: ___________________________</p>
    <p>Data: ___/___/_____</p>
  </div>
  <div class="linha">
    <p>___________________________________</p>
    <p>Secretaria / Direção da Escola</p>
    <p>Data: ___/___/_____</p>
    <p>Carimbo</p>
  </div>
</div>

<div class="rodape">
  <p>${nome || '[NOME DA ESCOLA]'} — Documento em conformidade com LGPD Art. 14 e Lei 15.211/2025 — Versão ${dataDoc}</p>
</div>
</body></html>`
}

export function gerarGuiaProfessores(escola) {
  const { nome, data } = escola
  const dataDoc = data || new Date().toLocaleDateString('pt-BR')
  return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>Guia de Conduta Digital — ${nome}</title>${CSS_PRINT}</head><body>
<div class="cabecalho">
  <div class="instituicao">${nome || '[NOME DA ESCOLA]'}</div>
  <h1>Guia de Conduta Digital para Professores e Funcionários</h1>
  <div class="versao">Em conformidade com a Lei 15.211/2025 (ECA Digital) e LGPD — ${dataDoc}</div>
</div>

<p>Este guia estabelece as diretrizes de conduta digital para toda a equipe de <strong>${nome || '[NOME DA ESCOLA]'}</strong>. O cumprimento destas normas é obrigatório e protege tanto os alunos quanto os próprios professores e a instituição.</p>

<h2>1. Comunicação com Alunos e Famílias</h2>
<ul>
  <li><strong>Use apenas canais oficiais</strong> da escola (email institucional, aplicativo oficial, plataforma escolar). É vedado comunicar-se com alunos menores via WhatsApp pessoal, Instagram ou redes sociais privadas;</li>
  <li>Grupos de comunicação devem sempre incluir <strong>pelo menos um responsável legal</strong> e um coordenador. Nunca crie grupos somente com alunos;</li>
  <li>Mensagens a alunos fora do horário escolar devem ser evitadas, exceto urgências devidamente justificadas;</li>
  <li>Não solicite o número pessoal de celular de alunos menores. Use o contato do responsável cadastrado na escola.</li>
</ul>

<h2>2. Uso de Imagem dos Alunos</h2>
<ul>
  <li>Antes de fotografar ou filmar alunos para qualquer finalidade, verifique se o Termo de Autorização Parental foi assinado para aquela finalidade específica;</li>
  <li>Nunca publique imagens de alunos em suas redes sociais pessoais, mesmo de forma "discreta";</li>
  <li>Fotografias de eventos escolares devem ser encaminhadas à coordenação para validação antes de qualquer publicação;</li>
  <li>Em caso de dúvida sobre a autorização, não registre e consulte a coordenação.</li>
</ul>

<h2>3. Plataformas e Ferramentas Digitais</h2>
<ul>
  <li>Utilize apenas as plataformas aprovadas pela escola. A adoção de novos aplicativos deve ser validada pela coordenação e TI antes de qualquer uso com alunos;</li>
  <li>Não solicite cadastro de alunos em plataformas externas sem aprovação prévia da escola;</li>
  <li>Aplicativos gratuitos com publicidade ou coleta de dados de comportamento não devem ser usados com alunos menores sem avaliação prévia do DPO;</li>
  <li>Em caso de suspeita de incidente de segurança (vazamento, acesso não autorizado), notifique imediatamente a TI e a direção.</li>
</ul>

<h2>4. Dados de Alunos — Sigilo e Uso</h2>
<ul>
  <li>Dados pedagógicos (notas, laudos, relatórios) são sigilosos e não devem ser compartilhados com terceiros não autorizados;</li>
  <li>Não discuta dados individuais de alunos em grupos ou chats públicos — use apenas canais seguros e restritos;</li>
  <li>Laudos, relatórios psicológicos e dados de saúde têm proteção especial — acesso restrito aos profissionais diretamente envolvidos;</li>
  <li>Ao encerrar o vínculo com a escola, devolver ou excluir todos os dados de alunos armazenados em dispositivos pessoais.</li>
</ul>

<h2>5. Situações de Risco — Como Agir</h2>
<ul>
  <li><strong>Suspeita de abuso ou exploração:</strong> notificar imediatamente a direção e, se necessário, o Conselho Tutelar — não investigar por conta própria;</li>
  <li><strong>Cyberbullying:</strong> documentar e acionar o canal de denúncias da escola. Não excluir as evidências digitais;</li>
  <li><strong>Conteúdo inadequado na plataforma:</strong> reportar ao TI imediatamente para remoção e preservação de evidências;</li>
  <li><strong>Suspeita de CSAM</strong> (conteúdo de exploração sexual de menores): acionar direção e advogado da escola — notificação obrigatória à Polícia Federal.</li>
</ul>

<h2>6. Responsabilidade Individual</h2>
<p>O descumprimento destas diretrizes pode acarretar medidas disciplinares internas, bem como responsabilidade civil e penal do profissional, independente das responsabilidades institucionais da escola.</p>

<div class="destaque">
  <strong>Lembre-se:</strong> A Lei 15.211/2025 (ECA Digital) e a LGPD estabelecem que a proteção de crianças e adolescentes no ambiente digital é responsabilidade de todos — escola, professores, famílias e fornecedores de tecnologia.
</div>

<p>Declaro ter lido, compreendido e que me comprometo a cumprir integralmente este Guia de Conduta Digital.</p>

<div class="assinatura">
  <div class="linha">
    <p>___________________________________</p>
    <p>Professor(a) / Funcionário(a)</p>
    <p>Nome: ___________________________</p>
    <p>Cargo: __________________________</p>
    <p>Data: ___/___/_____</p>
  </div>
  <div class="linha">
    <p>___________________________________</p>
    <p>Direção / RH</p>
    <p>Data: ___/___/_____</p>
    <p>Carimbo</p>
  </div>
</div>

<div class="rodape">
  <p>${nome || '[NOME DA ESCOLA]'} — Guia de Conduta Digital — ${dataDoc} — Versão 1.0</p>
</div>
</body></html>`
}

export function gerarPoliticaCiberbullying(escola) {
  const { nome, email, data } = escola
  const dataDoc = data || new Date().toLocaleDateString('pt-BR')
  return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>Política Anticiberbullying — ${nome}</title>${CSS_PRINT}</head><body>
<div class="cabecalho">
  <div class="instituicao">${nome || '[NOME DA ESCOLA]'}</div>
  <h1>Política Anticiberbullying e de Proteção Digital</h1>
  <div class="versao">Em conformidade com a Lei 15.211/2025 (ECA Digital), Art. 5º e 7º — ${dataDoc}</div>
</div>

<h2>1. Objetivo e Alcance</h2>
<p>Esta política define as regras, procedimentos e responsabilidades para prevenção e resposta ao cyberbullying e outras formas de violência digital no âmbito de <strong>${nome || '[NOME DA ESCOLA]'}</strong>, alcançando todos os alunos, professores, funcionários e responsáveis legais.</p>

<h2>2. O Que É Cyberbullying</h2>
<p>Considera-se cyberbullying qualquer ação intencional, repetida e prejudicial praticada por meio eletrônico contra alunos, incluindo:</p>
<ul>
  <li>Envio de mensagens ofensivas, ameaçadoras ou humilhantes;</li>
  <li>Publicação de fotos ou vídeos com intuito de ridicularizar;</li>
  <li>Criação de perfis falsos para prejudicar a reputação de alguém;</li>
  <li>Exclusão intencional de grupos digitais e redes sociais;</li>
  <li>Compartilhamento de imagens íntimas sem consentimento (sexting).</li>
</ul>

<h2>3. Canal de Denúncia</h2>
<p>Qualquer aluno, professor, funcionário ou responsável pode reportar casos de cyberbullying pelos seguintes canais:</p>
<ul>
  <li><strong>Email:</strong> ${email || '[EMAIL DA ESCOLA]'}</li>
  <li><strong>Formulário:</strong> disponível no site da escola e na secretaria</li>
  <li><strong>Pessoalmente:</strong> Coordenação Pedagógica ou Direção</li>
</ul>
<p>As denúncias podem ser anônimas. O prazo de resposta inicial é de <strong>48 horas úteis</strong>.</p>

<h2>4. Procedimento de Resposta</h2>
<ol>
  <li><strong>Recebimento:</strong> Coordenação registra a denúncia e notifica os responsáveis dos envolvidos;</li>
  <li><strong>Investigação:</strong> Coleta de evidências digitais (prints, logs), ouvindo todas as partes envolvidas com confidencialidade;</li>
  <li><strong>Apoio psicológico:</strong> Encaminhamento da vítima ao serviço de apoio disponível, se necessário;</li>
  <li><strong>Medidas disciplinares:</strong> Conforme o Regimento Escolar, podendo incluir advertência, suspensão ou desligamento;</li>
  <li><strong>Comunicação às famílias:</strong> Registro formal e comunicação documentada aos responsáveis legais de todas as partes;</li>
  <li><strong>Encaminhamento às autoridades:</strong> Nos casos de natureza criminal (CSAM, ameaças graves), acionamento da Polícia Civil/Federal.</li>
</ol>

<h2>5. Prevenção</h2>
<ul>
  <li>Programas de educação digital integrados ao currículo escolar;</li>
  <li>Treinamento anual de professores sobre identificação e resposta ao cyberbullying;</li>
  <li>Comunicação semestral às famílias sobre boas práticas de uso da internet;</li>
  <li>Ambientes digitais escolares moderados por adultos responsáveis.</li>
</ul>

<h2>6. Responsabilidades</h2>
<ul>
  <li><strong>Alunos:</strong> tratar colegas com respeito no ambiente digital e reportar situações de bullying de que tiverem conhecimento;</li>
  <li><strong>Professores e funcionários:</strong> identificar sinais de cyberbullying e acionar o canal de denúncia imediatamente;</li>
  <li><strong>Famílias:</strong> supervisionar o uso digital doméstico e comunicar à escola qualquer situação identificada;</li>
  <li><strong>Escola:</strong> investigar com imparcialidade, proteger a privacidade dos envolvidos e aplicar medidas proporcionais.</li>
</ul>

<div class="rodape">
  <p>${nome || '[NOME DA ESCOLA]'} — Política Anticiberbullying — ${dataDoc} — Lei 15.211/2025 Art. 5º e 7º</p>
</div>
</body></html>`
}

export const DOCUMENTOS_DISPONIVEIS = [
  {
    id: 'DOC-01',
    titulo: 'Política de Privacidade',
    subtitulo: 'Completa — LGPD + ECA Digital',
    descricao: 'Documento principal exigido pela Lei 15.211/2025. Cobre coleta de dados, bases legais, direitos dos titulares e proteção de menores.',
    obrigatorio: true,
    itensRelacionados: ['PE-23'],
    gerador: gerarPoliticaPrivacidade,
    icone: '🔒',
  },
  {
    id: 'DOC-02',
    titulo: 'Termo de Autorização Parental',
    subtitulo: 'Uso Digital e Imagem',
    descricao: 'Obtém consentimento dos responsáveis para uso de plataformas digitais, publicação de imagem e gravação de aulas.',
    obrigatorio: true,
    itensRelacionados: ['PE-13', 'PE-03'],
    gerador: gerarTermoAutorizacaoParental,
    icone: '✍️',
  },
  {
    id: 'DOC-03',
    titulo: 'Guia de Conduta Digital para Professores',
    subtitulo: 'Comunicação, imagem e plataformas',
    descricao: 'Define regras de conduta para professores e funcionários no uso de ferramentas digitais, comunicação com alunos e proteção de dados.',
    obrigatorio: true,
    itensRelacionados: ['PE-04'],
    gerador: gerarGuiaProfessores,
    icone: '👩‍🏫',
  },
  {
    id: 'DOC-04',
    titulo: 'Política Anticiberbullying',
    subtitulo: 'Canal de denúncia e procedimentos',
    descricao: 'Política formal com definição de cyberbullying, canal de denúncia, procedimento de resposta e responsabilidades de cada parte.',
    obrigatorio: true,
    itensRelacionados: ['PE-05', 'PE-21'],
    gerador: gerarPoliticaCiberbullying,
    icone: '🛡️',
  },
]
