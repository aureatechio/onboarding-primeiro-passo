import { useState } from "react"
import { COLORS } from "../theme/colors"
import { useOnboarding } from "../context/OnboardingContext"
import { motion } from "framer-motion"
import PageLayout from "../components/PageLayout"
import StepHeader from "../components/StepHeader"
import SlideDots from "../components/SlideDots"
import SlideTransition from "../components/SlideTransition"
import NavButtons from "../components/NavButtons"
import QuizConfirmation from "../components/QuizConfirmation"
import CompletionScreen from "../components/CompletionScreen"
import Icon from "../components/Icon"
import StickyFooter from "../components/StickyFooter"
import ProcessingOverlay from "../components/ProcessingOverlay"

export default function Etapa4() {
  const { userData, goNext } = useOnboarding()
  const { celebName, praca, segmento } = userData

  const [currentSlide, setCurrentSlide] = useState(0)
  const [showQuiz, setShowQuiz] = useState(false)
  const [completed, setCompleted] = useState(false)
  const [slideDirection, setSlideDirection] = useState(1)
  const [quizReady, setQuizReady] = useState(false)
  const [processing, setProcessing] = useState(false)

  const totalSlides = 4

  const goToSlide = (index) => {
    setSlideDirection(index > currentSlide ? 1 : -1)
    setCurrentSlide(index)
    setShowQuiz(false)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const nextSlide = () => {
    if (showQuiz) {
      if (quizReady) setProcessing(true)
      return
    }
    if (currentSlide < totalSlides - 1) {
      setSlideDirection(1)
      setCurrentSlide((s) => s + 1)
      window.scrollTo({ top: 0, behavior: "smooth" })
    } else {
      setShowQuiz(true)
      window.scrollTo({ top: 0, behavior: "smooth" })
    }
  }

  const prevSlide = () => {
    if (showQuiz) {
      setShowQuiz(false)
      window.scrollTo({ top: 0, behavior: "smooth" })
      return
    }
    if (currentSlide > 0) {
      setSlideDirection(-1)
      setCurrentSlide((s) => s - 1)
      window.scrollTo({ top: 0, behavior: "smooth" })
    }
  }

  // ─── Completion ─────────────────────────────────────────────
  if (completed) {
    return (
      <CompletionScreen
        icon="star"
        title="Etapa 4 concluida!"
        description={`Agora voce conhece todas as regras de uso da imagem de ${celebName}. Esse conhecimento e essencial para uma campanha de sucesso.`}
        summaryItems={[
          { icon: "clapperboard", label: "Celebridade", value: celebName },
          { icon: "mapPin", label: "Praca", value: praca },
          { icon: "tag", label: "Segmento", value: segmento },
          { icon: "penLine", label: "Ajustes", value: "2 rodadas por peca" },
          { icon: "clock", label: "Aprovacao celebridade", value: "Ate 3 dias uteis" },
        ]}
      />
    )
  }

  // ─── Slides ─────────────────────────────────────────────────
  const slideHeaders = [
    { tag: "SLIDE 4.1", title: "Onde e como voce pode usar sua celebridade", readTime: "4 minutos" },
    { tag: "SLIDE 4.3", title: "Como funciona a aprovacao das pecas" },
    { tag: "SLIDE 4.4", title: "Franquias, filiais e outras midias" },
    { tag: "SLIDE 4.5", title: "Prazo de uso e o que acontece no fim do contrato" },
    { tag: "SLIDE 4.6", title: "Quiz — Regras de uso da celebridade" },
  ]

  const currentHeader = showQuiz ? slideHeaders[4] : slideHeaders[currentSlide]

  // ─── Reusable card style ────────────────────────────────────
  const cardStyle = {
    background: COLORS.card,
    borderRadius: 14,
    border: `1px solid ${COLORS.border}`,
    padding: 20,
    marginBottom: 16,
  }

  const labelStyle = {
    color: COLORS.textDim,
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: "0.08em",
    margin: "0 0 8px 0",
    fontFamily: "'JetBrains Mono', monospace",
  }

  const bodyText = {
    color: COLORS.textMuted,
    fontSize: 14,
    lineHeight: 1.7,
    margin: 0,
  }

  // ─── Slide 4.1 ─────────────────────────────────────────────
  const renderSlide41 = () => (
    <div>
      <p style={{ ...bodyText, marginBottom: 16 }}>
        A imagem de <strong style={{ color: COLORS.text }}>{celebName}</strong> e um ativo valioso.
        Seu contrato garante exclusividade dentro de regras bem definidas de praca e segmento.
        Veja exatamente o que esta no seu contrato:
      </p>

      {/* Contract card */}
      <div
        style={{
          background: `linear-gradient(135deg, ${COLORS.card}, #1a1a1a)`,
          borderRadius: 16,
          border: `1px solid ${COLORS.border}`,
          padding: 24,
          marginBottom: 16,
        }}
      >
        <p style={labelStyle}>SEU CONTRATO</p>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <p style={{ ...labelStyle, color: COLORS.textDim, marginBottom: 4 }}>CELEBRIDADE</p>
            <p style={{ color: COLORS.text, fontSize: 18, fontWeight: 800, margin: 0 }}>
              {celebName}
            </p>
          </div>
          <div>
            <p style={{ ...labelStyle, color: COLORS.textDim, marginBottom: 4 }}>PRACA</p>
            <p style={{ color: COLORS.accent, fontSize: 16, fontWeight: 700, margin: 0 }}>
              {praca}
            </p>
          </div>
          <div>
            <p style={{ ...labelStyle, color: COLORS.textDim, marginBottom: 4 }}>SEGMENTO</p>
            <p style={{ color: COLORS.warning, fontSize: 16, fontWeight: 700, margin: 0 }}>
              {segmento}
            </p>
          </div>
        </div>
      </div>

      {/* Exclusivity box */}
      <div
        style={{
          ...cardStyle,
          borderColor: `${COLORS.accent}30`,
          background: `${COLORS.accent}08`,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
          <Icon name="lock" size={18} color={COLORS.accent} />
          <p style={{ color: COLORS.accent, fontSize: 15, fontWeight: 800, margin: 0 }}>
            Exclusividade geografica e de segmento
          </p>
        </div>
        <p style={bodyText}>
          Dentro da sua praca e segmento, nenhum concorrente pode usar{" "}
          <strong style={{ color: COLORS.text }}>{celebName}</strong>. Essa exclusividade e
          garantida pelo contrato e protege o investimento da sua campanha.
        </p>
      </div>

      {/* Practical example */}
      <div style={cardStyle}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
          <Icon name="mapPin" size={18} color={COLORS.text} />
          <p style={{ color: COLORS.text, fontSize: 15, fontWeight: 800, margin: 0 }}>
            Exemplo pratico do seu contrato
          </p>
        </div>
        <p style={bodyText}>
          Voce contratou <strong style={{ color: COLORS.text }}>{celebName}</strong> para a
          praca <strong style={{ color: COLORS.accent }}>{praca}</strong> no segmento{" "}
          <strong style={{ color: COLORS.warning }}>{segmento}</strong>. Isso significa que
          somente voce pode veicular pecas com essa celebridade nessa regiao e nesse ramo de
          atuacao.
        </p>
      </div>
    </div>
  )

  // ─── Slide 4.3 ─────────────────────────────────────────────
  const renderSlide43 = () => {
    const steps = [
      { icon: "clapperboard", label: "Producao cria a peca", color: COLORS.red, desc: "Nossa equipe desenvolve o material criativo." },
      { icon: "eye", label: "Voce revisa e aprova", color: COLORS.accent, desc: "Voce analisa e pede ajustes se necessario." },
      { icon: "star", label: "Celebridade aprova", color: COLORS.warning, desc: "A celebridade valida o uso da sua imagem." },
      { icon: "circleCheck", label: "Entrega liberada", color: COLORS.success, desc: "Peca aprovada e liberada para veiculacao." },
    ]

    return (
      <div>
        <p style={{ ...bodyText, marginBottom: 20 }}>
          Toda peca que usa a imagem da celebridade precisa passar por um fluxo de aprovacao.
          Entenda cada etapa:
        </p>

        {/* Timeline */}
        <div style={{ ...cardStyle, padding: 24 }}>
          <p style={labelStyle}>FLUXO DE APROVACAO</p>
          <div style={{ position: "relative", paddingLeft: 32 }}>
            {/* Vertical line */}
            <div
              style={{
                position: "absolute",
                left: 11,
                top: 8,
                bottom: 8,
                width: 2,
                background: COLORS.border,
              }}
            />
            {steps.map((step, i) => (
              <div
                key={i}
                style={{
                  position: "relative",
                  paddingBottom: i < steps.length - 1 ? 24 : 0,
                }}
              >
                {/* Dot */}
                <div
                  style={{
                    position: "absolute",
                    left: -32 + 3,
                    top: 4,
                    width: 18,
                    height: 18,
                    borderRadius: "50%",
                    background: `${step.color}20`,
                    border: `2px solid ${step.color}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    zIndex: 1,
                  }}
                >
                  <Icon name={step.icon} size={9} color={step.color} />
                </div>
                <div>
                  <p
                    style={{
                      color: step.color,
                      fontSize: 14,
                      fontWeight: 700,
                      margin: "0 0 2px 0",
                    }}
                  >
                    {i + 1}. {step.label}
                  </p>
                  <p style={{ ...bodyText, fontSize: 13 }}>{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 2 rodadas box */}
        <div
          style={{
            ...cardStyle,
            borderColor: `${COLORS.accent}30`,
            background: `${COLORS.accent}08`,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
            <Icon name="penLine" size={16} color={COLORS.accent} />
            <p style={{ color: COLORS.accent, fontSize: 14, fontWeight: 800, margin: 0 }}>
              2 rodadas de ajustes por peca
            </p>
          </div>
          <p style={{ ...bodyText, fontSize: 13 }}>
            Cada peca tem direito a ate 2 rodadas de ajustes inclusos no contrato.
            Ajustes adicionais podem gerar custos extras.
          </p>
        </div>

        {/* Celebridade pode pedir ajustes */}
        <div
          style={{
            ...cardStyle,
            borderColor: `${COLORS.warning}30`,
            background: `${COLORS.warning}08`,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
            <Icon name="alertTriangle" size={16} color={COLORS.warning} />
            <p style={{ color: COLORS.warning, fontSize: 14, fontWeight: 800, margin: 0 }}>
              Celebridade pode pedir ajustes
            </p>
          </div>
          <p style={{ ...bodyText, fontSize: 13 }}>
            A celebridade tem o direito contratual de solicitar alteracoes na peca antes de
            aprovar. O prazo de aprovacao pela celebridade e de ate 3 dias uteis.
          </p>
        </div>

        {/* Regra de ouro */}
        <div
          style={{
            ...cardStyle,
            borderColor: `${COLORS.red}30`,
            background: `${COLORS.red}08`,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Icon name="gem" size={16} color={COLORS.red} />
            <p style={{ color: COLORS.red, fontSize: 14, fontWeight: 800, margin: 0 }}>
              Regra de ouro
            </p>
          </div>
          <p style={{ ...bodyText, fontSize: 13, marginTop: 8 }}>
            Nenhuma peca pode ser veiculada sem a aprovacao final da celebridade.
            Veicular sem aprovacao pode gerar penalidades contratuais.
          </p>
        </div>
      </div>
    )
  }

  // ─── Slide 4.4 ─────────────────────────────────────────────
  const renderSlide44 = () => (
    <div>
      <p style={{ ...bodyText, marginBottom: 20 }}>
        Se voce tem mais de uma unidade ou usa diferentes canais, veja o que pode e o que
        nao pode:
      </p>

      {/* Franquias */}
      <div style={cardStyle}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
          <Icon name="building2" size={20} color={COLORS.text} />
          <p style={{ color: COLORS.text, fontSize: 15, fontWeight: 800, margin: 0 }}>
            Franquias e filiais
          </p>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
            <Icon name="circleCheck" size={16} color={COLORS.success} />
            <p style={{ ...bodyText, fontSize: 13 }}>
              Unidades na <strong style={{ color: COLORS.accent }}>mesma regiao</strong> da
              praca contratada podem usar as pecas normalmente.
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
            <Icon name="ban" size={16} color={COLORS.danger} />
            <p style={{ ...bodyText, fontSize: 13 }}>
              Unidades em <strong style={{ color: COLORS.danger }}>outras regioes</strong>{" "}
              precisam de contrato proprio para usar a celebridade.
            </p>
          </div>
        </div>
      </div>

      {/* Canais digitais */}
      <div style={cardStyle}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
          <Icon name="smartphone" size={20} color={COLORS.text} />
          <p style={{ color: COLORS.text, fontSize: 15, fontWeight: 800, margin: 0 }}>
            Canais digitais
          </p>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
            <Icon name="circleCheck" size={16} color={COLORS.success} />
            <p style={{ ...bodyText, fontSize: 13 }}>
              Incluir os canais tiktok, youtube, linkedin e google;
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
            <Icon name="ban" size={16} color={COLORS.danger} />
            <p style={{ ...bodyText, fontSize: 13 }}>
              WhatsApp e E-mail marketing — nao e permitido usar a imagem da celebridade
              nesses canais.
            </p>
          </div>
        </div>
      </div>

      {/* Regras de marcacao e veiculacao */}
      <div style={cardStyle}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
          <Icon name="ban" size={20} color={COLORS.text} />
          <p style={{ color: COLORS.text, fontSize: 15, fontWeight: 800, margin: 0 }}>
            Regras de publicação
          </p>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
            <Icon name="ban" size={16} color={COLORS.danger} />
            <p style={{ ...bodyText, fontSize: 13 }}>
              Não é permitido marcar a <strong style={{ color: COLORS.text }}>Celebridade nas publicações em redes sociais</strong>.
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
            <Icon name="alertTriangle" size={16} color={COLORS.warning} />
            <p style={{ ...bodyText, fontSize: 13 }}>
              Só é permitida a veiculação da celebridade nos canais oficiais da marca.
              <br />
              <br />
              Colaboradores podem republicar o conteúdo mas não podem publicar em suas redes sociais pessoais.
            </p>
          </div>
        </div>
      </div>

      {/* TV / Outdoor */}
      <div style={cardStyle}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
          <Icon name="tv" size={20} color={COLORS.text} />
          <p style={{ color: COLORS.text, fontSize: 15, fontWeight: 800, margin: 0 }}>
            TV, Radio e Outdoor
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 12 }}>
          <Icon name="alertTriangle" size={16} color={COLORS.warning} />
          <p style={{ ...bodyText, fontSize: 13 }}>
            Consulte a equipe antes de veicular nesses meios. Cada formato pode ter regras
            especificas.
          </p>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {["TV aberta", "TV fechada", "Radio", "Outdoor", "Busdoor", "Painel LED"].map(
            (tag) => (
              <span
                key={tag}
                style={{
                  background: `${COLORS.warning}12`,
                  border: `1px solid ${COLORS.warning}25`,
                  borderRadius: 100,
                  padding: "4px 12px",
                  color: COLORS.warning,
                  fontSize: 11,
                  fontWeight: 600,
                }}
              >
                {tag}
              </span>
            )
          )}
        </div>
      </div>
    </div>
  )

  // ─── Slide 4.5 ─────────────────────────────────────────────
  const renderSlide45 = () => (
    <div>
      <p style={{ ...bodyText, marginBottom: 20 }}>
        Seu contrato tem prazo definido. Saiba o que acontece na renovacao e no encerramento:
      </p>

      {/* Renovacao */}
      <div style={cardStyle}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
          <Icon name="refreshCw" size={20} color={COLORS.text} />
          <p style={{ color: COLORS.text, fontSize: 15, fontWeight: 800, margin: 0 }}>
            Renovacao do contrato
          </p>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
            <span
              style={{
                background: COLORS.accent,
                color: COLORS.bg,
                width: 22,
                height: 22,
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 12,
                fontWeight: 800,
                flexShrink: 0,
              }}
            >
              1
            </span>
            <p style={{ ...bodyText, fontSize: 13 }}>
              A equipe entra em contato antes do vencimento para negociar a renovacao.
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
            <span
              style={{
                background: COLORS.accent,
                color: COLORS.bg,
                width: 22,
                height: 22,
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 12,
                fontWeight: 800,
                flexShrink: 0,
              }}
            >
              2
            </span>
            <p style={{ ...bodyText, fontSize: 13 }}>
              Voce pode manter a mesma celebridade ou trocar por outra disponivel para sua
              praca e segmento.
            </p>
          </div>
        </div>
      </div>

      {/* Celebridade nao disponivel */}
      <div style={cardStyle}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
          <Icon name="shuffle" size={20} color={COLORS.text} />
          <p style={{ color: COLORS.text, fontSize: 15, fontWeight: 800, margin: 0 }}>
            Celebridade nao disponivel
          </p>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div
            style={{
              background: `${COLORS.accent}08`,
              border: `1px solid ${COLORS.accent}20`,
              borderRadius: 10,
              padding: 14,
            }}
          >
            <p style={{ color: COLORS.accent, fontSize: 13, fontWeight: 700, margin: "0 0 4px 0" }}>
              Opcao A — Trocar de celebridade
            </p>
            <p style={{ ...bodyText, fontSize: 12 }}>
              Voce pode escolher outra celebridade disponivel sem custo adicional de troca.
            </p>
          </div>
          <div
            style={{
              background: `${COLORS.warning}08`,
              border: `1px solid ${COLORS.warning}20`,
              borderRadius: 10,
              padding: 14,
            }}
          >
            <p style={{ color: COLORS.warning, fontSize: 13, fontWeight: 700, margin: "0 0 4px 0" }}>
              Opcao B — Creditos
            </p>
            <p style={{ ...bodyText, fontSize: 12 }}>
              Se preferir, voce pode converter o valor restante em creditos para uso futuro.
            </p>
          </div>
        </div>
      </div>

      {/* Encerramento */}
      <div
        style={{
          ...cardStyle,
          borderColor: `${COLORS.danger}30`,
          background: `${COLORS.danger}08`,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
          <Icon name="alertTriangle" size={20} color={COLORS.danger} />
          <p style={{ color: COLORS.danger, fontSize: 15, fontWeight: 800, margin: 0 }}>
            Fim do contrato — obrigacoes
          </p>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {[
            "Todas as pecas com a imagem da celebridade devem ser excluidas.",
            "Remover de redes sociais, site, trafego pago e qualquer midia ativa.",
            "O uso apos o vencimento configura violacao contratual.",
          ].map((item, i) => (
            <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
              <span style={{ color: COLORS.danger, fontSize: 14, flexShrink: 0 }}>
                {i + 1}.
              </span>
              <p style={{ ...bodyText, fontSize: 13 }}>{item}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Multa */}
      <div
        style={{
          ...cardStyle,
          borderColor: `${COLORS.danger}40`,
          background: `${COLORS.danger}10`,
          textAlign: "center",
        }}
      >
        <Icon name="scale" size={22} color={COLORS.danger} />
        <p
          style={{
            color: COLORS.danger,
            fontSize: 16,
            fontWeight: 900,
            margin: "8px 0 4px 0",
          }}
        >
          Multa de ate 10x
        </p>
        <p style={{ ...bodyText, fontSize: 12, textAlign: "center" }}>
          O uso indevido da imagem apos o fim do contrato pode gerar multa de ate 10 vezes o
          valor contratual.
        </p>
      </div>
    </div>
  )

  // ─── Quiz 4.6 ───────────────────────────────────────────────
  const quizQuestions = [
    `Entendo que a exclusividade de ${celebName} e valida para minha praca (${praca}) e meu segmento (${segmento}).`,
    "Sei que toda peca precisa de aprovacao da celebridade e que tenho ate 2 rodadas de ajustes por peca.",
    "Nao vou marcar a celebridade nas redes sociais nem usar sua imagem por WhatsApp ou e-mail marketing.",
    "Ao encerrar o contrato, vou excluir todas as pecas com a imagem da celebridade de todos os canais.",
    "Estou ciente de que o uso indevido pode gerar multa de ate 10x o valor contratual.",
  ]

  const renderQuiz = () => (
    <div>
      <p style={{ ...bodyText, marginBottom: 20 }}>
        Confirme que voce entendeu as regras de uso da imagem de{" "}
        <strong style={{ color: COLORS.text }}>{celebName}</strong>:
      </p>
      <QuizConfirmation
        questions={quizQuestions}
        icon="star"
        title="Confirme o entendimento"
        subtitle="Marque todos os itens para concluir"
        iconBg={`${COLORS.warning}15`}
        onAllConfirmed={(ready) => setQuizReady(ready)}
        confirmMessage="Tudo certo! Voce pode concluir esta etapa."
      />
    </div>
  )

  // ─── Slide renderer ────────────────────────────────────────
  const slides = [renderSlide41, renderSlide43, renderSlide44, renderSlide45]

  const renderCurrentContent = () => {
    if (showQuiz) return renderQuiz()
    return slides[currentSlide]()
  }

  return (
    <PageLayout>
      <StepHeader
        tag={currentHeader.tag}
        title={currentHeader.title}
        readTime={currentHeader.readTime}
      />

      <SlideDots
        total={totalSlides}
        current={showQuiz ? totalSlides : currentSlide}
        onSelect={(i) => {
          if (i < totalSlides) goToSlide(i)
        }}
      />

      <SlideTransition
        slideKey={showQuiz ? "quiz" : `slide-${currentSlide}`}
        direction={slideDirection}
        onSwipeLeft={showQuiz ? undefined : nextSlide}
        onSwipeRight={currentSlide > 0 || showQuiz ? prevSlide : undefined}
      >
        {renderCurrentContent()}
      </SlideTransition>

      <StickyFooter>
        <NavButtons
          onPrev={currentSlide > 0 || showQuiz ? prevSlide : undefined}
          onNext={nextSlide}
          nextLabel={
            showQuiz
              ? quizReady
                ? "Concluir etapa"
                : "Confirme todos os itens"
              : currentSlide === totalSlides - 1
                ? "Ir para o quiz"
                : "Proximo"
          }
          nextDisabled={showQuiz && !quizReady}
          nextVariant={showQuiz && quizReady ? "warning" : "red"}
        />
      </StickyFooter>
      <ProcessingOverlay
        show={processing}
        messages={["Salvando respostas...", "Concluído!"]}
        duration={1200}
        onComplete={() => {
          setProcessing(false)
          setCompleted(true)
        }}
      />
    </PageLayout>
  )
}
