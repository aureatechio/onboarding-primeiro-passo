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
  greeting: 'Olá, ${clientName}. Bem-vindo.',
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
    body: 'O Aceleraí não é uma agência de publicidade tradicional. Nós produzimos os criativos com a celebridade, mas a divulgação, o planejamento e o tráfego pago ficam por sua conta (ou da sua agência/equipe de marketing).',
    cardLabel: 'PENSE ASSIM',
    aceleraiLabel: 'ACELERAÍ',
    aceleraiDesc: 'Entrega a munição',
    voceLabel: 'VOCÊ',
    voceDesc: 'Aponta e dispara',
  },

  // ── Slide 2.2 ──
  slide2: {
    body: 'A celebridade já realizou sessões de filmagem onde registramos diversos textos. A partir dessas gravações, combinamos com o briefing da sua empresa para criar os criativos da sua campanha.',
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
    body: 'O sucesso da sua campanha é uma parceria entre o Aceleraí e a sua empresa. Cada lado tem um papel fundamental.',
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
    'Entendi que o Aceleraí produz os criativos com a celebridade e que a divulgação e o tráfego são de minha responsabilidade.',
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
    readTime: '4 minutos',
    alert: 'Ao concluir esta etapa, os 15 dias de preparação começam a contar',
  },

  slideTags: ['SLIDE 3.1', 'SLIDE 3.2', 'SLIDE 3.3', 'SLIDE 3.4', 'SLIDE 3.5'],
  slideTitles: [
    'A linha do tempo da sua campanha',
    'Prazos reais de cada fase',
    'Preparação: 15 dias para tudo acontecer',
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
    { label: 'Aprovação da celebridade', status: 'future' },
    { label: 'Entrega final', status: 'future' },
    { label: 'Uso da campanha', status: 'future' },
  ],

  // ── Slide 3.2 — Prazos de Produção ──
  prazosProducao: {
    cardTitle: 'Prazos de cada etapa',
    items: [
      { label: 'Roteiro pronto', prazo: 'Até 1 dia útil após envio do briefing', icon: 'fileText' },
      { label: 'Ajuste de roteiro', prazo: 'Até 1 dia útil por rodada (ilimitados nessa fase)', icon: 'penLine' },
      { label: 'Após aprovação do roteiro', prazo: 'Não é mais possível alterar', icon: 'lock', alert: true },
      { label: 'Campanha pronta', prazo: 'Até 3 dias úteis após roteiro aprovado', icon: 'clapperboard' },
      { label: 'Ajuste de peças', prazo: 'Até 1 dia útil por rodada (2 levas contratuais)', icon: 'refreshCw' },
      { label: 'Aprovação da celebridade', prazo: 'Até 3 dias úteis', icon: 'star' },
      { label: 'Após aprovação da celebridade', prazo: 'Não é mais possível alterar', icon: 'lock', alert: true },
      { label: 'Troca de oferta', prazo: 'Até 1 dia útil', icon: 'shuffle' },
    ],
    alertTip: 'Os prazos acima são dias úteis e contam a partir da ação anterior. Sua agilidade nas respostas acelera todo o processo.',
  },

  // ── Slide 3.3 — Responsabilidades ──
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
    label: 'A parte do Aceleraí',
    items: [
      'Criar o roteiro e direção criativa',
      'Produzir as peças com a celebridade',
      'Entregar dentro do prazo combinado',
    ],
  },

  // ── Slide 3.4 — Cenários ──
  warningText: 'O prazo do contrato começa a contar a partir da assinatura, não da entrega. Por isso, agilidade é tudo.',
  clienteAgil: {
    label: 'CLIENTE ÁGIL',
    desc: 'Responde rápido, envia materiais no prazo, aprova sem demora. Resultado: campanha entregue dentro do previsto, com tempo de sobra para usar.',
  },
  clienteDemorou: {
    label: 'CLIENTE QUE DEMOROU',
    desc: 'Demora para responder, atrasa o envio de materiais e pede muitas alterações fora do escopo. Resultado: o prazo do contrato corre, e o tempo de uso da campanha diminui.',
  },
  agilidadeTip: 'Sua agilidade é o que garante o melhor resultado. O tempo é seu aliado — use-o bem.',

  // ── Slide 3.5 — Canais ──
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
  quizTitle: 'Confirme o entendimento',
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
    description: 'A partir de agora, os 15 dias de preparação da sua campanha com ${celebName} começaram a contar. Fique atento aos prazos e responda rápido.',
    badge: '15 DIAS DE PREPARAÇÃO',
    cardLabel: 'O QUE ACONTECE AGORA',
    items: [
      { icon: 'mail', title: 'Entraremos em contato', desc: 'Nossa equipe vai te procurar nos canais combinados.' },
      { icon: 'zap', title: 'Responda rápido', desc: 'Quanto mais rápido você responder, mais rápido sua campanha sai.' },
      { icon: 'clapperboard', title: 'A produção começa', desc: 'Assim que tudo estiver alinhado, iniciamos as peças.' },
    ],
    nextStepText: 'Na próxima etapa, você conhecerá as regras de uso da imagem da celebridade.',
    ctaButton: 'Continuar para Etapa 4',
    stepLabel: (totalSteps) => `ETAPA 3 DE ${totalSteps} CONCLUÍDA`,
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
    { tag: 'SLIDE 4.1', title: 'Onde e como você pode usar sua celebridade', readTime: '4 minutos' },
    { tag: 'SLIDE 4.3', title: 'Como funciona a aprovação das peças' },
    { tag: 'SLIDE 4.4', title: 'Franquias, filiais e outras mídias' },
    { tag: 'SLIDE 4.5', title: 'Prazo de uso e o que acontece no fim do contrato' },
    { tag: 'SLIDE 4.6', title: 'Quiz — Regras de uso da celebridade' },
  ],

  // ── Slide 4.1 — Exclusividade ──
  slide1: {
    body: 'A imagem de ${celebName} é um ativo valioso. Seu contrato garante exclusividade dentro de regras bem definidas de praça e segmento. Veja exatamente o que está no seu contrato:',
    contractLabel: 'SEU CONTRATO',
    exclusivityTitle: 'Exclusividade geográfica e de segmento',
    exclusivityBody: 'Dentro da sua praça e segmento, nenhum concorrente pode usar ${celebName}. Essa exclusividade é garantida pelo contrato e protege o investimento da sua campanha.',
    exampleTitle: 'Exemplo prático do seu contrato',
    exampleBody: 'Você contratou ${celebName} para a praça ${praca} no segmento ${segmento}. Isso significa que somente você pode veicular peças com essa celebridade nessa região e nesse ramo de atuação.',
  },

  // ── Slide 4.3 — Aprovação ──
  slide2: {
    body: 'Toda peça que usa a imagem da celebridade precisa passar por um fluxo de aprovação. Entenda cada etapa:',
    flowLabel: 'FLUXO DE APROVAÇÃO',
    steps: [
      { icon: 'clapperboard', label: 'Produção cria a peça', desc: 'Nossa equipe desenvolve o material criativo.' },
      { icon: 'eye', label: 'Você revisa e aprova', desc: 'Você analisa e pede ajustes, se necessário.' },
      { icon: 'star', label: 'Celebridade aprova', desc: 'A celebridade valida o uso da sua imagem.' },
      { icon: 'circleCheck', label: 'Entrega liberada', desc: 'Peça aprovada e liberada para veiculação.' },
    ],
    ajustesTitle: '2 rodadas de ajustes por peça',
    ajustesBody: 'Cada peça tem direito a até 2 rodadas de ajustes incluídas no contrato. Ajustes adicionais podem gerar custos extras.',
    celebAjustesTitle: 'Celebridade pode pedir ajustes',
    celebAjustesBody: 'A celebridade tem o direito contratual de solicitar alterações na peça antes de aprovar. O prazo de aprovação pela celebridade é de até 3 dias úteis.',
    regraOuroTitle: 'Regra de ouro',
    regraOuroBody: 'Nenhuma peça pode ser veiculada sem a aprovação final da celebridade. Veicular sem aprovação pode gerar penalidades contratuais.',
  },

  // ── Slide 4.4 — Franquias e mídias ──
  slide3: {
    body: 'Se você tem mais de uma unidade ou usa diferentes canais, veja o que pode e o que não pode:',
    franquias: {
      title: 'Franquias e filiais',
      allowed: 'Unidades na mesma região da praça contratada podem usar as peças normalmente.',
      forbidden: 'Unidades em outras regiões precisam de contrato próprio para usar a celebridade.',
    },
    canaisDigitais: {
      title: 'Canais digitais',
      allowed: 'Instagram, Facebook, TikTok, YouTube, LinkedIn, Google, site e tráfego pago — uso liberado com peças aprovadas.',
      forbidden: 'WhatsApp e e-mail marketing — não é permitido usar a imagem da celebridade nesses canais.',
    },
    regrasPublicacao: {
      title: 'Regras de publicação',
      noTag: 'Não é permitido marcar a celebridade nas publicações em redes sociais.',
      canaisOficiais: 'Só é permitida a veiculação da celebridade nos canais oficiais da marca.\n\nColaboradores podem republicar o conteúdo, mas não podem publicar em suas redes sociais pessoais.',
    },
    tvRadioOutdoor: {
      title: 'TV, rádio e outdoor',
      warning: 'Consulte a equipe antes de veicular nesses meios. Cada formato pode ter regras específicas.',
      tags: ['TV aberta', 'TV fechada', 'Rádio', 'Outdoor', 'Busdoor', 'Painel LED'],
    },
  },

  // ── Slide 4.5 — Prazo e encerramento ──
  slide4: {
    body: 'Seu contrato tem prazo definido. Saiba o que acontece na renovação e no encerramento:',
    renovacao: {
      title: 'Renovação do contrato',
      steps: [
        'A equipe entra em contato antes do vencimento para negociar a renovação.',
        'Você pode manter a mesma celebridade ou trocar por outra disponível para sua praça e segmento.',
      ],
    },
    naoDisponivel: {
      title: 'Celebridade não disponível',
      opcaoA: {
        title: 'Opção A — Trocar de celebridade',
        desc: 'Você pode escolher outra celebridade disponível sem custo adicional de troca.',
      },
      opcaoB: {
        title: 'Opção B — Créditos',
        desc: 'Se preferir, você pode converter o valor restante em créditos para uso futuro.',
      },
    },
    encerramento: {
      title: 'Fim do contrato — obrigações',
      items: [
        'Todas as peças com a imagem da celebridade devem ser excluídas.',
        'Remover de redes sociais, site, tráfego pago e qualquer mídia ativa.',
        'O uso após o vencimento configura violação contratual.',
      ],
    },
    multa: {
      title: 'Multa de até 10x',
      desc: 'O uso indevido da imagem após o fim do contrato pode gerar multa de até 10 vezes o valor contratual.',
    },
  },

  // ── Quiz ──
  quizIntro: 'Confirme que você entendeu as regras de uso da imagem de ${celebName}:',
  quizTitle: 'Confirme o entendimento',
  quizSubtitle: 'Marque todos os itens para concluir',
  quizQuestions: [
    'Entendo que a exclusividade de ${celebName} é válida para minha praça (${praca}) e meu segmento (${segmento}).',
    'Sei que toda peça precisa de aprovação da celebridade e que tenho até 2 rodadas de ajustes por peça.',
    'Não vou marcar a celebridade nas redes sociais nem usar sua imagem por WhatsApp ou e-mail marketing.',
    'Ao encerrar o contrato, vou excluir todas as peças com a imagem da celebridade de todos os canais.',
    'Estou ciente de que o uso indevido pode gerar multa de até 10x o valor contratual.',
  ],
  quizConfirmMessage: 'Tudo certo! Você pode concluir esta etapa.',

  // ── Completion ──
  completionTitle: 'Etapa 4 concluída!',
  completionDescription:
    'Agora você conhece todas as regras de uso da imagem de ${celebName}. Esse conhecimento é essencial para uma campanha de sucesso.',
  completionSummary: (celebName, praca, segmento) => [
    { icon: 'clapperboard', label: 'Celebridade', value: celebName },
    { icon: 'mapPin', label: 'Praça', value: praca },
    { icon: 'tag', label: 'Segmento', value: segmento },
    { icon: 'penLine', label: 'Ajustes', value: '2 rodadas por peça' },
    { icon: 'clock', label: 'Aprovação da celebridade', value: 'Até 3 dias úteis' },
  ],

  // ── Navigation ──
  navNextSlide: 'Próximo',
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
    stepLabel: 'ETAPA 6.1 DE 7',
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
    stepLabel: 'ETAPA 6.2 DE 7',
  },

  // ── Bonificação intro ──
  bonificacaoTitle: 'GANHE UMA BONIFICAÇÃO DE PRAZO DE VEICULAÇÃO DA SUA CAMPANHA',
  bonificacaoBody: 'O QUE VOCÊ PRECISA CONCLUIR? Adicione os arquivos nos campos abaixo e agilize o atendimento.',
  startKitInfo: 'O QUE VOCÊ VAI RECEBER? Em até 24 horas, você receberá o START KIT com 4 peças estáticas com conteúdo da sua campanha gerado por IA.',

  // ── Como funciona ──
  comoFunciona: {
    title: 'Como funciona',
    body: 'Dentro do prazo de 15 dias após a assinatura do seu contrato, você recebe, ao final dos três meses de contrato, os dias que você conseguiu antecipar de prazo.',
    exemploA: 'Exemplo A: preenchendo ainda hoje (dia do Primeiro Passo), você ganha +15 dias de bonificação.',
    exemploB: 'Exemplo B: preenchendo 5 dias corridos a partir da data do contrato, você ganha +10 dias de bonificação.',
  },

  // ── Logo (modo simplificado) ──
  logoLabel: 'Logo da sua marca',
  logoPlaceholder: 'Selecionar logo',
  logoHint: 'PNG, JPG, PDF, WebP, SVG, HEIC ou HEIF (máx. 5 MB)',
  logoChangeButton: 'Trocar arquivo',

  // ── Paleta de cores ──
  colorPaletteLabel: 'Cores da sua marca',
  colorPaletteHint: 'Extraídas automaticamente do logo. Edite ou adicione novas.',
  colorPaletteAddButton: 'Adicionar cor',
  colorPaletteExtracting: 'Extraindo cores...',
  colorPaletteMax: 'Máximo de 8 cores atingido.',

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
  navConfirmPending: 'Quero a bonificação',
  navContinueLater: 'Prefiro fazer depois',
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
  },

  // ── Próximos passos ──
  proximosPassosLabel: 'PRÓXIMOS PASSOS',
  nextSteps: (atendente, genero = 'f') => [
    {
      num: '1',
      title: `${genero === 'm' ? 'Seu atendente' : 'Sua atendente'} ${atendente} vai entrar em contato`,
      desc: 'Em até 1 dia útil para iniciar a produção da sua campanha.',
    },
    {
      num: '2',
      title: 'START KIT em personalização',
      desc: 'Em breve, você receberá exemplos de peças para aumentar a eficiência da sua campanha com ajuda de agentes de IA desenvolvidos pelo nosso time.',
    },
    {
      num: '3',
      title: 'Responda rápido',
      desc: 'Quanto mais ágil for a comunicação, mais rápido suas peças ficam prontas.',
    },
  ],

  // ── Card atendente ──
  atendenteLabel: (genero = 'f') => genero === 'm' ? 'SEU ATENDENTE' : 'SUA ATENDENTE',
  atendenteContactTime: 'Entrará em contato em até 1 dia útil',

  // ── Botão final ──
  ctaButton: 'Concluir Primeiro Passo',
  ctaMicro: 'Ao concluir, seu perfil completo é gerado automaticamente.',

  // ── Tela de parabéns ──
  parabens: {
    badge: 'CONCLUÍDO',
    title: 'Parabéns!',
    body: 'Você está entre os poucos empresários do Brasil que contam com uma celebridade na sua comunicação.',
    cta: 'Agora é hora de fazer esse investimento virar resultado.',
    stepLabel: 'PRIMEIRO PASSO CONCLUÍDO',
    atendenteContact: 'Vai entrar em contato em até 1 dia útil para iniciar a produção da sua campanha.',
    closing: 'A gente está junto com você. Boa campanha!',
  },
}
