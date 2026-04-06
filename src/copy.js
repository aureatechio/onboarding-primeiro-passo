/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║  COPY CENTRALIZADA — Onboarding "Primeiro Passo"               ║
 * ║                                                                  ║
 * ║  Edite APENAS este arquivo para alterar textos do formulário.   ║
 * ║  Os componentes de cada etapa importam daqui.                   ║
 * ║                                                                  ║
 * ║  Convenções:                                                     ║
 * ║  - Strings simples: texto estático                               ║
 * ║  - Funções (celebName) => ...: texto dinâmico com interpolação  ║
 * ║  - Arrays: listas ordenadas de itens                             ║
 * ║  - Objetos com icon/title/desc: cards e list items              ║
 * ╚══════════════════════════════════════════════════════════════════╝
 */

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ETAPA 1 — Boas-vindas (Hero)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export const ETAPA1 = {
  greeting: (clientName) => `Olá, ${clientName}. Bem-vindo.`,
  title: 'Primeiro Passo',
  subtitle: 'Falta um passo entre você e a sua campanha com',
  estimatedTime: 'Tempo estimado: 15 minutos',
  ctaButton: 'COMEÇAR AGORA',
  microCopy: 'Ao completar, sua equipe de produção é ativada automaticamente.',
  stepLabel: 'ETAPA 1 DE 7',
  valueProps: [
    'Entender como funciona a sua campanha',
    'Conhecer os prazos e combinados',
    'Saber as regras de uso da celebridade',
    'Liberar a produção das suas peças',
  ],
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ETAPA 2 — Como funciona sua campanha
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export const ETAPA2 = {
  header: {
    title: 'Como funciona sua campanha',
    readTime: '3 minutos',
  },

  pacoteResumo: '2 vídeos (de 30 segundos) e 4 peças estáticas.',

  slideTitles: [
    'Entenda o que você contratou',
    'Como a celebridade aparece na sua campanha',
    'Seu pacote de campanha',
    'Seu resultado depende de nós dois',
  ],

  // ── Slide 2.1 ──
  slide1: {
    body: 'A Aceleraí não é uma agência de publicidade tradicional. Nós produzimos os criativos com a celebridade, mas a divulgação, o planejamento e o tráfego pago ficam por sua conta (ou da sua agência/equipe de marketing).',
    cardLabel: 'PENSE ASSIM',
    aceleraiLabel: 'ACELERAÍ',
    aceleraiDesc: 'Entrega a munição',
    voceLabel: 'VOCÊ',
    voceDesc: 'Aponta e dispara',
  },

  // ── Slide 2.2 ──
  slide2: {
    body: (celebName) =>
      `A celebridade já realizou sessões de filmagem onde registramos diversos textos. A partir dessas gravações, combinamos com o briefing da sua empresa para criar os criativos da sua campanha.`,
    steps: [
      { num: '1', title: 'Gravação', desc: 'A celebridade grava sessões de vídeo e foto em estúdio profissional' },
      { num: '2', title: 'Seu briefing', desc: 'Você envia as informações da sua empresa, produto e público-alvo' },
      { num: '3', title: 'Produção', desc: 'Nossa equipe combina as gravações com seu briefing para criar os criativos' },
      { num: '4', title: 'Sua campanha', desc: 'Você recebe os materiais prontos para rodar sua campanha' },
    ],
    footer: 'Assim, você tem acesso a materiais com uma celebridade por uma fração do custo de uma contratação direta.',
  },

  // ── Slide 2.3 ──
  slide3: {
    body: 'No seu contrato, você tem direito a:',
    footer: 'Todos os materiais são produzidos pela nossa equipe de produção profissional, garantindo qualidade e consistência.',
  },

  // ── Slide 2.4 ──
  slide4: {
    body: 'O sucesso da sua campanha é uma parceria entre a Aceleraí e a sua empresa. Cada lado tem um papel fundamental.',
    nossaParte: {
      label: 'Da nossa parte',
      items: [
        'Produção dos criativos com a celebridade',
        'Edição e finalização profissional',
        'Entrega dentro do prazo combinado',
        'Suporte durante toda a campanha',
      ],
    },
    suaParte: {
      label: 'Da sua parte',
      items: [
        'Enviar o briefing completo da empresa',
        'Rodar a divulgação e o tráfego pago',
        'Responder os leads gerados pela campanha',
        'Manter comunicação ativa com nosso time',
      ],
    },
    closingTip: 'Quanto mais rápido a gente se comunicar, melhor vai ser o resultado.',
  },

  // ── Quiz ──
  quizQuestions: [
    'Entendi que a Aceleraí produz os criativos com a celebridade e que a divulgação e o tráfego são de minha responsabilidade.',
    'Entendi que os criativos são produzidos a partir de gravações pré-realizadas pela celebridade, combinadas com o briefing da minha empresa.',
    'Entendi o que vou receber no meu pacote de campanha.',
  ],
  quizTitle: 'Confirme o entendimento',
  quizSubtitle: 'Marque todos para avançar',
  quizConfirmMessage: 'Tudo confirmado. Você pode avançar.',

  // ── Completion ──
  completionTitle: 'Etapa 2 concluída!',
  completionDescription: 'Agora você sabe exatamente como funciona a sua campanha. No próximo passo, vamos alinhar os prazos e combinados.',

  // ── Navigation ──
  navNextDefault: 'Próximo',
  navNextLast: 'Ir para confirmação',
  navConfirm: 'Confirmar e avançar',

  // ── Processing ──
  processingMessages: ['Salvando respostas...', 'Concluído!'],
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ETAPA 3 — Prazos e combinados
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export const ETAPA3 = {
  header: {
    title: 'Prazos e combinados',
    readTime: '3 minutos',
    alert: 'Ao concluir esta etapa, os 15 dias de preparação começam a contar',
  },

  slideTags: ['SLIDE 3.1', 'SLIDE 3.2', 'SLIDE 3.3', 'SLIDE 3.4'],
  slideTitles: [
    'A linha do tempo da sua campanha',
    'Preparação: 15 dias pra tudo acontecer',
    'O tempo é seu aliado (se você for rápido)',
    'Onde a gente se fala',
  ],

  // ── Slide 3.1 — Timeline ──
  timeline: [
    { label: 'Assinatura do contrato', status: 'done' },
    { label: 'Primeiro Passo', status: 'current', tag: 'AGORA' },
    { label: 'Preparação (Start Kit)', status: 'next', tag: 'EM BREVE' },
    { label: 'Briefing criativo', status: 'future' },
    { label: 'Produção das peças', status: 'future' },
    { label: 'Aprovação do cliente', status: 'future' },
    { label: 'Aprovação com a Celebridade', status: 'future' },
    { label: 'Entrega final', status: 'future' },
    { label: 'Uso da campanha', status: 'future' },
  ],

  // ── Slide 3.2 — Responsabilidades ──
  suaParte: {
    label: 'A sua parte',
    items: [
      'Responder ao briefing criativo',
      'Enviar materiais solicitados (logo, textos, referências)',
      'Aprovar ou solicitar ajustes nas peças',
      'Cumprir os prazos de cada fase',
    ],
  },
  nossaParte: {
    label: 'A parte da Aceleraí',
    items: [
      'Criar o roteiro e direção criativa',
      'Produzir as peças com a celebridade',
      'Entregar dentro do prazo combinado',
    ],
  },

  // ── Slide 3.3 — Cenários ──
  warningText: 'O prazo do contrato começa a contar a partir da assinatura, não da entrega. Por isso, agilidade é tudo.',
  clienteAgil: {
    label: 'CLIENTE ÁGIL',
    desc: 'Responde rápido, envia materiais no prazo, aprova sem demora. Resultado: campanha entregue dentro do previsto, com tempo de sobra para usar.',
  },
  clienteDemorou: {
    label: 'CLIENTE QUE DEMOROU',
    desc: 'Demora pra responder, atrasa envio de materiais, pede muitas alterações fora do escopo. Resultado: prazo do contrato corre, e o tempo de uso da campanha diminui.',
  },
  agilidadeTip: 'Sua agilidade é o que garante o melhor resultado. O tempo é seu aliado — use-o bem.',

  // ── Slide 3.4 — Canais ──
  whatsapp: {
    title: 'WhatsApp',
    subtitle: 'Canal principal de comunicação',
    desc: 'Todas as atualizações, solicitações de materiais e aprovações serão enviadas por WhatsApp. Mantenha as notificações ativas e responda o mais rápido possível.',
  },
  plataforma: {
    title: 'Plataforma Aceleraí',
    subtitle: 'Acompanhamento e entregas',
    desc: 'Pela plataforma você acompanha o status da campanha, faz upload de materiais e visualiza as entregas finais.',
  },
  canaisTip: 'Mantenha os dois canais ativos. Demora na resposta impacta diretamente o prazo da sua campanha.',

  // ── Quiz ──
  quizSubtitle: 'Ao confirmar, a preparação de 15 dias inicia',
  quizQuestions: [
    'Entendi que o prazo do contrato conta a partir da assinatura e que minha agilidade impacta diretamente o resultado.',
    'Sei que terei 15 dias de preparação e que preciso responder rapidamente a todas as solicitações.',
    'Compreendo que atrasos da minha parte podem reduzir o tempo de uso da campanha.',
  ],
  quizConfirmMessage: 'Tudo certo! Você pode ativar a preparação.',
  navConfirmQuiz: 'Confirmar e ativar preparação',
  navNextDefault: 'Próximo',
  navNextLast: 'Revisar e confirmar',

  // ── Processing ──
  processingMessages: [
    'Ativando preparação...',
    'Notificando seu(a) atendente...',
    'Registrando prazos...',
    'Tudo pronto!',
  ],

  // ── Activation Screen ──
  activation: {
    title: 'Preparação ativada!',
    description: (celebName) =>
      `A partir de agora, os 15 dias de preparação da sua campanha com ${celebName} começaram a contar. Fique atento aos prazos e responda rápido.`,
    badge: '15 DIAS DE PREPARAÇÃO',
    cardLabel: 'O QUE ACONTECE AGORA',
    items: [
      { icon: 'mail', title: 'Entraremos em contato', desc: 'Nossa equipe vai te procurar nos canais combinados.' },
      { icon: 'zap', title: 'Responda rápido', desc: 'Quanto mais rápido você responder, mais rápido sua campanha sai.' },
      { icon: 'clapperboard', title: 'A produção começa', desc: 'Assim que tudo estiver alinhado, iniciamos as peças.' },
    ],
    nextStepText: 'Na próxima etapa, você conhecerá as regras de uso da imagem da celebridade.',
    ctaButton: 'Continuar para Etapa 4',
    stepLabel: (totalSteps) => `ETAPA 3 DE ${totalSteps} CONCLUIDA`,
  },
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ETAPA 4 — Regras de uso da celebridade
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export const ETAPA4 = {
  header: {
    readTime: '4 minutos',
  },

  slideHeaders: [
    { tag: 'SLIDE 4.1', title: 'Onde e como voce pode usar sua celebridade', readTime: '4 minutos' },
    { tag: 'SLIDE 4.3', title: 'Como funciona a aprovacao das pecas' },
    { tag: 'SLIDE 4.4', title: 'Franquias, filiais e outras midias' },
    { tag: 'SLIDE 4.5', title: 'Prazo de uso e o que acontece no fim do contrato' },
    { tag: 'SLIDE 4.6', title: 'Quiz — Regras de uso da celebridade' },
  ],

  // ── Slide 4.1 — Exclusividade ──
  slide1: {
    body: (celebName) =>
      `A imagem de ${celebName} e um ativo valioso. Seu contrato garante exclusividade dentro de regras bem definidas de praca e segmento. Veja exatamente o que esta no seu contrato:`,
    contractLabel: 'SEU CONTRATO',
    exclusivityTitle: 'Exclusividade geografica e de segmento',
    exclusivityBody: (celebName) =>
      `Dentro da sua praca e segmento, nenhum concorrente pode usar ${celebName}. Essa exclusividade e garantida pelo contrato e protege o investimento da sua campanha.`,
    exampleTitle: 'Exemplo pratico do seu contrato',
    exampleBody: (celebName, praca, segmento) =>
      `Voce contratou ${celebName} para a praca ${praca} no segmento ${segmento}. Isso significa que somente voce pode veicular pecas com essa celebridade nessa regiao e nesse ramo de atuacao.`,
  },

  // ── Slide 4.3 — Aprovação ──
  slide2: {
    body: 'Toda peca que usa a imagem da celebridade precisa passar por um fluxo de aprovacao. Entenda cada etapa:',
    flowLabel: 'FLUXO DE APROVACAO',
    steps: [
      { icon: 'clapperboard', label: 'Producao cria a peca', desc: 'Nossa equipe desenvolve o material criativo.' },
      { icon: 'eye', label: 'Voce revisa e aprova', desc: 'Voce analisa e pede ajustes se necessario.' },
      { icon: 'star', label: 'Celebridade aprova', desc: 'A celebridade valida o uso da sua imagem.' },
      { icon: 'circleCheck', label: 'Entrega liberada', desc: 'Peca aprovada e liberada para veiculacao.' },
    ],
    ajustesTitle: '2 rodadas de ajustes por peca',
    ajustesBody: 'Cada peca tem direito a ate 2 rodadas de ajustes inclusos no contrato. Ajustes adicionais podem gerar custos extras.',
    celebAjustesTitle: 'Celebridade pode pedir ajustes',
    celebAjustesBody: 'A celebridade tem o direito contratual de solicitar alteracoes na peca antes de aprovar. O prazo de aprovacao pela celebridade e de ate 3 dias uteis.',
    regraOuroTitle: 'Regra de ouro',
    regraOuroBody: 'Nenhuma peca pode ser veiculada sem a aprovacao final da celebridade. Veicular sem aprovacao pode gerar penalidades contratuais.',
  },

  // ── Slide 4.4 — Franquias e mídias ──
  slide3: {
    body: 'Se voce tem mais de uma unidade ou usa diferentes canais, veja o que pode e o que nao pode:',
    franquias: {
      title: 'Franquias e filiais',
      allowed: 'Unidades na mesma regiao da praca contratada podem usar as pecas normalmente.',
      forbidden: 'Unidades em outras regioes precisam de contrato proprio para usar a celebridade.',
    },
    canaisDigitais: {
      title: 'Canais digitais',
      allowed: 'Instagram, Facebook, Tiktok, Youtube, Linkedin, Google, Site e Tráfego Pago - Uso liberado com peças aprovadas;',
      forbidden: 'WhatsApp e E-mail marketing — nao e permitido usar a imagem da celebridade nesses canais.',
    },
    regrasPublicacao: {
      title: 'Regras de publicação',
      noTag: 'Não é permitido marcar a Celebridade nas publicações em redes sociais.',
      canaisOficiais: 'Só é permitida a veiculação da celebridade nos canais oficiais da marca.\n\nColaboradores podem republicar o conteúdo mas não podem publicar em suas redes sociais pessoais.',
    },
    tvRadioOutdoor: {
      title: 'TV, Radio e Outdoor',
      warning: 'Consulte a equipe antes de veicular nesses meios. Cada formato pode ter regras especificas.',
      tags: ['TV aberta', 'TV fechada', 'Radio', 'Outdoor', 'Busdoor', 'Painel LED'],
    },
  },

  // ── Slide 4.5 — Prazo e encerramento ──
  slide4: {
    body: 'Seu contrato tem prazo definido. Saiba o que acontece na renovacao e no encerramento:',
    renovacao: {
      title: 'Renovacao do contrato',
      steps: [
        'A equipe entra em contato antes do vencimento para negociar a renovacao.',
        'Voce pode manter a mesma celebridade ou trocar por outra disponivel para sua praca e segmento.',
      ],
    },
    naoDisponivel: {
      title: 'Celebridade nao disponivel',
      opcaoA: {
        title: 'Opcao A — Trocar de celebridade',
        desc: 'Voce pode escolher outra celebridade disponivel sem custo adicional de troca.',
      },
      opcaoB: {
        title: 'Opcao B — Creditos',
        desc: 'Se preferir, voce pode converter o valor restante em creditos para uso futuro.',
      },
    },
    encerramento: {
      title: 'Fim do contrato — obrigacoes',
      items: [
        'Todas as pecas com a imagem da celebridade devem ser excluidas.',
        'Remover de redes sociais, site, trafego pago e qualquer midia ativa.',
        'O uso apos o vencimento configura violacao contratual.',
      ],
    },
    multa: {
      title: 'Multa de ate 10x',
      desc: 'O uso indevido da imagem apos o fim do contrato pode gerar multa de ate 10 vezes o valor contratual.',
    },
  },

  // ── Quiz ──
  quizIntro: (celebName) =>
    `Confirme que voce entendeu as regras de uso da imagem de ${celebName}:`,
  quizTitle: 'Confirme o entendimento',
  quizSubtitle: 'Marque todos os itens para concluir',
  quizQuestions: (celebName, praca, segmento) => [
    `Entendo que a exclusividade de ${celebName} e valida para minha praca (${praca}) e meu segmento (${segmento}).`,
    'Sei que toda peca precisa de aprovacao da celebridade e que tenho ate 2 rodadas de ajustes por peca.',
    'Nao vou marcar a celebridade nas redes sociais nem usar sua imagem por WhatsApp ou e-mail marketing.',
    'Ao encerrar o contrato, vou excluir todas as pecas com a imagem da celebridade de todos os canais.',
    'Estou ciente de que o uso indevido pode gerar multa de ate 10x o valor contratual.',
  ],
  quizConfirmMessage: 'Tudo certo! Voce pode concluir esta etapa.',

  // ── Completion ──
  completionTitle: 'Etapa 4 concluida!',
  completionDescription: (celebName) =>
    `Agora voce conhece todas as regras de uso da imagem de ${celebName}. Esse conhecimento e essencial para uma campanha de sucesso.`,
  completionSummary: (celebName, praca, segmento) => [
    { icon: 'clapperboard', label: 'Celebridade', value: celebName },
    { icon: 'mapPin', label: 'Praca', value: praca },
    { icon: 'tag', label: 'Segmento', value: segmento },
    { icon: 'penLine', label: 'Ajustes', value: '2 rodadas por peca' },
    { icon: 'clock', label: 'Aprovacao celebridade', value: 'Ate 3 dias uteis' },
  ],

  // ── Navigation ──
  navNextSlide: 'Proximo',
  navGoToQuiz: 'Ir para o quiz',
  navConfirmAll: 'Confirme todos os itens',
  navConcluir: 'Concluir etapa',

  // ── Processing ──
  processingMessages: ['Salvando respostas...', 'Concluído!'],
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ETAPA 5 — Sua presença digital
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export const ETAPA5 = {
  header: {
    title: 'Sua presença digital',
    readTime: '2 minutos',
  },

  // ── Card 1 — Palco ──
  palco: {
    title: 'Seus criativos precisam de um palco',
    body: 'De nada adianta ter vídeos incríveis com uma celebridade se seus canais digitais não estão preparados para receber essa audiência. Suas redes sociais, site e landing pages precisam estar prontos para converter.',
  },

  // ── Card 2 — Pense Assim ──
  penseAssim: {
    label: 'PENSE ASSIM',
    celebLabel: 'A CELEBRIDADE',
    celebDesc: 'Atrai os olhares',
    canaisLabel: 'SEUS CANAIS',
    canaisDesc: 'Convertem em resultado',
    warningTip: 'Imagine investir em uma vitrine incrível... e manter a loja trancada. Seus canais digitais são a porta de entrada.',
  },

  // ── Card 3 — Tráfego ──
  trafego: {
    title: 'Como acelerar seus resultados',
    body: 'Empresas que investem em tráfego pago junto com criativos de celebridade têm até 21x mais visibilidade do que quem apenas posta organicamente.',
    question: 'Quer aprender mais sobre tráfego?',
    optionYes: 'Sim, quero receber as 10 superdicas de tráfego pago',
    optionYesBadge: 'PDF GRATUITO',
    optionNo: 'Agora não, quero seguir para a próxima etapa',
  },

  // ── Navigation ──
  navNext: 'Concluir e avançar',
  navNextSubmitting: 'Enviando...',

  // ── Completion ──
  completionTitle: 'Etapa 5 concluída!',
  completionYes: 'Excelente escolha! Você vai receber o PDF com as 10 superdicas de tráfego pago diretamente no seu WhatsApp. Enquanto isso, vamos seguir para a próxima etapa.',
  completionNo: 'Sem problemas! Você pode solicitar o material sobre tráfego a qualquer momento com seu atendente. Vamos seguir para a próxima etapa.',
  completionBadge: 'PDF SUPERDICAS SOLICITADO',
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ETAPA 6 — Sua identidade visual
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export const ETAPA6 = {
  header: {
    title: 'Sua identidade visual',
    readTime: '2 minutos',
    stepLabel: 'ETAPA 6.1 DE 8',
  },

  // ── Card 1 — Intro ──
  intro: {
    title: 'Suas peças ficam muito melhores com a sua cara',
    body: 'Para que os criativos da sua campanha fiquem alinhados com a identidade da sua marca, precisamos de algumas referências visuais. Quanto mais material você enviar, mais personalizado e profissional será o resultado.',
  },

  // ── Card 2 — Diferença na prática ──
  diferenca: {
    label: 'A DIFERENÇA NA PRÁTICA',
    comReferencias: {
      label: 'COM REFERÊNCIAS',
      desc: 'Peça alinhada com a identidade da sua marca, cores corretas, fontes consistentes e resultado profissional.',
    },
    semReferencias: {
      label: 'SEM REFERÊNCIAS',
      desc: 'Produção genérica, sem personalidade da marca, cores e fontes aproximadas e resultado que não representa sua empresa.',
    },
  },

  // ── Card 3 — Itens ──
  itensTitle: 'Separe esses itens',
  items: [
    { icon: 'palette', title: 'Logo em alta resolução', desc: 'PNG com fundo transparente, de preferência' },
    { icon: 'palette', title: 'Cores principais da marca', desc: 'Códigos hex (ex: #FF0000) ou referência visual' },
    { icon: 'type', title: 'Fontes da comunicação', desc: 'Nome das fontes usadas nos materiais da marca' },
    { icon: 'camera', title: 'Referências visuais', desc: 'Exemplos de peças, posts ou anúncios que você gosta' },
  ],

  // ── Reassuring box ──
  reassuringTip: 'Não tem nada disso organizado? Sem problema! Seu atendente vai te ajudar a reunir tudo. O importante é começar.',

  // ── Checkbox ──
  acknowledgement: 'Entendi que preciso separar os materiais de identidade visual da minha marca para enviar ao atendente.',

  // ── Navigation ──
  navConfirm: 'Confirmar e avançar',

  // ── Completion ──
  completionTitle: 'Etapa 6.1 concluída!',
  completionDescription: (atendente) =>
    `Seu atendente ${atendente} vai te ajudar a organizar todos os materiais de identidade visual. Se tiver dúvidas sobre o que enviar, é só perguntar.`,
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ETAPA 6.2 — Bonificação de prazo (identidade visual avançada)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export const ETAPA62 = {
  header: {
    title: 'Bonificação de prazo da sua campanha',
    readTime: '2 minutos',
    stepLabel: 'ETAPA 6.2 DE 8',
  },

  // ── Bonificação intro ──
  bonificacaoTitle: 'GANHE UMA BONIFICAÇÃO DE PRAZO DE VEICULAÇÃO DA SUA CAMPANHA',
  bonificacaoBody: 'O QUE VC PRECISA CONCLUIR? Adicione os arquivos nos campos abaixo e agilize o atendimento.',
  startKitInfo: 'O QUE VOCÊ VAI RECEBER? Em até 24h, você receberá o START KIT com 4 peças estáticas com conteúdo da sua campanha gerado por IA.',

  // ── Como funciona ──
  comoFunciona: {
    title: 'Como funciona',
    body: 'Dentro do prazo de 15 dias após a assinatura do seu contrato, você recebe, ao final dos três meses de contrato, os dias que você conseguiu antecipar de prazo.',
    exemploA: 'Exemplo A): Preenchendo ainda hoje (DIA DO PRIMEIRO PASSO) você ganha + 15 dias de bonificação.',
    exemploB: 'Exemplo B): Preenchendo 5 dias corridos a partir da data do contrato, você ganha + 10 dias de bonificação.',
  },

  // ── Escolha ──
  choiceAddNow: 'Vou adicionar as minhas referências da identidade visual',
  choiceLater: 'Prefiro deixar para depois tendo ciência que o prazo do meu contrato está correndo desde já.',

  // ── Slide labels ──
  slideLabels: ['Logo', 'Cores', 'Fonte', 'Imagens', 'Observações'],

  // ── Slide: Logo ──
  logoLabel: 'Envie o logo da sua marca',
  logoPlaceholder: 'Selecionar logo',
  logoHint: 'PNG, JPG, SVG ou WebP (max. 5 MB)',
  logoChangeButton: 'Trocar arquivo',
  extractingColors: 'Extraindo cores...',

  // ── Slide: Cores ──
  coresTitle: 'Cores da sua marca',
  coresExtracted: (count) => `Extraídas do logo (${count})`,
  coresNoExtraction: 'Não foi possível extrair cores do logo. Adicione as cores da sua marca manualmente.',
  coresCustomLabel: (count) => `Suas cores ${count > 0 ? `(${count})` : ''}`,
  coresLimit: (remaining) => `Máximo 5 cores no total (extraídas + adicionadas) · ${remaining} restantes`,

  // ── Slide: Fonte ──
  fonteTitle: 'Escolha a fonte',
  fontOptions: [
    { id: 'inter', label: 'Inter', preview: 'Aa Bb Cc 123', family: "'Inter', sans-serif" },
    { id: 'jetbrains', label: 'JetBrains Mono', preview: 'Aa Bb Cc 123', family: "'JetBrains Mono', monospace" },
    { id: 'georgia', label: 'Georgia', preview: 'Aa Bb Cc 123', family: 'Georgia, serif' },
  ],

  // ── Slide: Imagens ──
  imagensTitle: 'Imagens de campanha',
  imagensAdd: 'Adicionar mais imagens',
  imagensSelect: 'Selecionar imagens',
  imagensHint: 'Peças da campanha para referência (max. 5)',

  // ── Slide: Observações ──
  notesTitle: 'Observações para a campanha',
  notesPlaceholder: 'Descreva o objetivo, tom ou qualquer detalhe que ajude na criação das peças...',

  // ── Status chips ──
  statusObrigatorio: 'Obrigatório',
  statusOpcional: 'Opcional',
  statusConcluido: 'Concluído',

  // ── Modo simplificado ──
  modoSimplificado: {
    siteLabel: 'Site da sua empresa',
    sitePlaceholder: 'www.seusite.com.br',
    siteError: 'URL inválida. Verifique o endereço digitado.',
    instagramLabel: 'Perfil do Instagram',
    instagramPrefix: 'https://www.instagram.com/',
    instagramPlaceholder: 'seuperfil',
    instagramError: 'Handle inválido. Use apenas letras, números, pontos e underscores (ex: minha_marca).',
  },

  // ── Navigation ──
  navConfirm: 'Confirmar e enviar',
  navConfirmPending: 'Confirmar e avançar',
  navContinueLater: 'Continuar depois (marcar etapa como pendente)',
  navSaving: 'Salvando...',

  // ── Processing ──
  processingMessages: [
    'Enviando identidade visual...',
    'Salvando logo e cores...',
    'Quase pronto...',
  ],

  // ── Completion ──
  completionDone: {
    title: 'Etapa 6.2 concluída!',
    description: 'Perfeito. Sua etapa de bonificação foi preenchida e isso agiliza o atendimento para envio do seu Start Kit.',
    badge: 'BONIFICAÇÃO ATIVA',
  },
  completionPending: {
    title: 'Etapa 6.2 marcada como pendente',
    description: 'Você decidiu continuar depois. O prazo do contrato segue correndo e você pode completar os itens de identidade visual na sequência com seu atendente.',
    badge: 'PENDENTE',
  },
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ETAPA 7 — Modo avançado (Briefing da campanha)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export const ETAPA7 = {
  header: {
    title: 'Modo avançado',
    readTime: '3 minutos',
    stepLabel: 'ETAPA 8 DE 8',
  },

  // ── Card 1 — Intro ──
  intro: {
    title: 'Você tem estrutura para ir além?',
    body: 'Alguns clientes possuem equipe de design ou produção própria e preferem ter mais controle sobre os criativos finais. Se esse é o seu caso, temos uma opção avançada para você.',
  },

  // ── Escolha de caminho ──
  pathLabel: 'Escolha seu caminho de produção:',
  standard: {
    title: 'Produção pela Aceleraí',
    badge: 'PADRÃO',
    desc: 'Nossa equipe cuida de tudo: roteiro, edição, design e entrega final dos criativos.',
  },
  hybrid: {
    title: 'Personalizado (Avançado)',
    badge: 'AVANÇADO',
    desc: 'Você personaliza sua campanha com informações essenciais.',
  },

  // ── Hybrid rules ──
  hybridRules: {
    aprovacao: {
      title: 'Aprovação obrigatória',
      body: 'Todo material editado pela sua equipe precisa ser aprovado pela Aceleraí antes de ir ao ar. Publicar sem aprovação pode resultar em suspensão da campanha.',
    },
    prazo: {
      title: '3 dias úteis por lote',
      body: 'Cada lote de materiais enviado para aprovação tem um prazo de até 3 dias úteis para revisão e feedback.',
    },
    rejeicao: {
      title: 'A celebridade pode rejeitar materiais que:',
      items: [
        'Alterem a aparência ou voz da celebridade de forma inadequada',
        'Associem a imagem a conteúdo ofensivo ou polêmico',
        'Desrespeitem as diretrizes de uso da imagem',
        'Incluam promessas ou alegações não autorizadas',
      ],
    },
    recomendacoes: {
      title: 'Recomendações para produção híbrida:',
      items: [
        'Mantenha a qualidade visual dos materiais originais',
        'Não distorça ou altere as proporções dos vídeos/fotos',
        'Use as fontes e cores da marca de forma consistente',
        'Envie os materiais para aprovação com antecedência',
      ],
    },
    briefingAvancado: {
      title: 'Briefing avançado',
      body: 'Na produção híbrida, você receberá um briefing avançado com todas as especificações técnicas, formatos aceitos e diretrizes de edição para sua equipe seguir.',
    },
  },

  // ── Standard confirmation ──
  standardConfirmation: {
    title: 'Produção completa pela Aceleraí',
    body: 'Nossa equipe vai cuidar de toda a produção dos seus criativos. Você só precisa enviar o briefing e aprovar os materiais finais.',
  },

  // ── Navigation ──
  navConcluir: 'Concluir e avançar',
  navGerarIA: 'Gerar briefing IA',
  navConcluirSemIA: 'Concluir sem briefing IA',

  // ── Processing ──
  processingSubmit: [
    'Enviando briefing...',
    'Salvando dados da campanha...',
    'Quase pronto...',
  ],
  processingGenerate: [
    'Gerando briefing com IA...',
    'Salvando dados da campanha...',
    'Quase pronto...',
  ],

  // ── Completion ──
  completionTitle: 'Etapa 8 concluída!',
  completionHybrid: 'A partir de agora, já estamos cuidando da produção do START KIT no modo personalizado. Em até 24h, você receberá sugestões de criativos para iniciar sua jornada com equipes exclusivas para aperfeiçoar sua campanha.',
  completionStandard: 'A partir de agora, já estamos cuidando da produção do START KIT. Em até 24h, você receberá sugestões de criativos para iniciar sua jornada com equipes exclusivas para aperfeiçoar sua campanha.',
  completionBadgeHybrid: 'PRODUÇÃO HÍBRIDA',
  completionBadgeStandard: 'PRODUÇÃO ACELERAÍ',
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ETAPA FINAL — Resumo + Parabéns
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export const ETAPA_FINAL = {
  // ── Tela de resumo ──
  resumo: {
    title: 'Tudo pronto. Sua campanha vai começar.',
    subtitle: 'Você completou todas as etapas. Aqui está o resumo.',
    cardLabel: 'RESUMO DA SUA CAMPANHA',
    pacoteValue: '2 vídeos + 4 estáticas',
    preparacaoValue: '15 dias (ativados)',
    productionHybrid: 'Personalizado',
    productionStandard: 'Aceleraí',
    briefModes: {
      both: 'Texto + Áudio',
      audio: 'Áudio',
      text: 'Texto',
    },
    iaBriefDone: 'Gerado com IA',
    iaBriefError: 'Falha na geração IA',
  },

  // ── Próximos passos ──
  proximosPassosLabel: 'PRÓXIMOS PASSOS',
  nextSteps: (atendente, genero = 'f') => [
    {
      num: '1',
      title: `${genero === 'm' ? 'Seu atendente' : 'Sua atendente'} ${atendente} vai entrar em contato`,
      desc: 'Em até 1 dia útil pra iniciar a produção da sua campanha',
    },
    {
      num: '2',
      title: 'START KIT em personalização',
      desc: 'Em breve você receberá exemplos de peças para aumentar a eficiencia da sua campanha com ajuda de Agentes de IA desenvolvidos pelo nosso time.',
    },
    {
      num: '3',
      title: 'Responda rápido',
      desc: 'Quanto mais ágil for a comunicação, mais rápido suas peças ficam prontas',
    },
  ],

  // ── Card atendente ──
  atendenteLabel: (genero = 'f') => genero === 'm' ? 'SEU ATENDENTE' : 'SUA ATENDENTE',
  atendenteContactTime: (atendente) =>
    `Entrará em contato em até 1 dia útil`,

  // ── Botão final ──
  ctaButton: 'Concluir Primeiro Passo',
  ctaMicro: 'Ao concluir, seu perfil completo é gerado automaticamente.',

  // ── Tela de parabéns ──
  parabens: {
    badge: 'CONCLUÍDO',
    title: 'Parabéns!',
    body: 'Você está entre os poucos empresários do Brasil que contam com uma celebridade na sua comunicação.',
    cta: 'Agora é hora de fazer esse investimento virar resultado.',
    stepLabel: 'PRIMEIRO PASSO CONCLUIDO',
    atendenteContact: (atendente) =>
      `Vai entrar em contato em até 1 dia útil pra iniciar a produção da sua campanha.`,
    closing: 'A gente está junto com você. Boa campanha!',
  },
}
