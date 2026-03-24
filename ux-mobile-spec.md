# Spec de Melhorias UX Mobile-First — Projeto "Primeiro Passo"

> **Objetivo**: Corrigir problemas de usabilidade mobile, adicionar gestos nativos, melhorar feedback de interações, garantir acessibilidade básica e implementar persistência de estado. Nenhuma mudança de copy, lógica de negócio ou identidade visual.
>
> **Contexto**: Este documento complementa o `REFACTOR_SPEC.md` (refatoração visual). Podem ser executados em paralelo ou sequencialmente. Em caso de conflito, este documento tem prioridade sobre questões de UX/interação.
>
> **Viewport alvo**: 320px (iPhone SE) a 430px (iPhone Pro Max). Testar sempre em 375px como baseline.

---

## 1. Barra de Progresso Global

### Problema
Os progress dots na TopBar são pequenos demais pra comunicar progresso em mobile. O usuário não tem percepção clara de "quanto falta".

### Solução
Adicionar uma barra de progresso contínua de 3px no topo absoluto da viewport, acima da TopBar. Ela preenche proporcionalmente ao avanço no onboarding.

**Arquivo**: `src/components/TopBar.jsx`

```jsx
import { motion } from 'framer-motion'
import { useOnboarding } from '../context/OnboardingContext'
import { COLORS } from '../theme/colors'

export default function TopBar({ showCompleted = false }) {
  const { currentStep, completedSteps, totalSteps } = useOnboarding()
  const stepNum = typeof currentStep === 'number' ? currentStep : totalSteps
  const progress = (stepNum / totalSteps) * 100

  return (
    <>
      {/* Barra de progresso global — topo absoluto */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          height: 3,
          background: COLORS.border,
          zIndex: 100,
        }}
      >
        <motion.div
          initial={false}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
          style={{
            height: '100%',
            background: `linear-gradient(90deg, ${COLORS.red}, ${COLORS.accent})`,
            borderRadius: '0 2px 2px 0',
          }}
        />
      </div>

      {/* TopBar existente — adicionar paddingTop pra compensar a barra */}
      <div
        style={{
          position: 'sticky',
          top: 3, // altura da barra de progresso
          zIndex: 10,
          // ... resto dos estilos existentes
        }}
      >
        {/* conteúdo existente da TopBar */}
      </div>
    </>
  )
}
```

> **Nota**: Manter os progress dots existentes como indicador secundário. A barra global é o indicador primário de progresso.

---

## 2. Safe Areas (iPhone Notch / Dynamic Island)

### Problema
A TopBar e os botões de ação no bottom não respeitam safe areas. No iPhone com notch, conteúdo fica coberto.

### 2.1. Viewport meta tag

**Arquivo**: `index.html`

Alterar a meta tag viewport para:

```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
```

### 2.2. CSS safe areas

**Arquivo**: `src/theme/global.css`

Adicionar ao final do arquivo:

```css
/* Safe areas para iPhone notch/Dynamic Island */
.safe-top {
  padding-top: env(safe-area-inset-top, 0px);
}

.safe-bottom {
  padding-bottom: env(safe-area-inset-bottom, 0px);
}
```

### 2.3. Aplicar na TopBar

**Arquivo**: `src/components/TopBar.jsx`

A barra de progresso fixa no topo deve respeitar o safe area:

```jsx
<div style={{
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  paddingTop: 'env(safe-area-inset-top, 0px)',
  zIndex: 100,
}}>
  {/* barra de progresso de 3px */}
</div>
```

A TopBar sticky deve compensar:

```jsx
<div style={{
  position: 'sticky',
  top: 'calc(3px + env(safe-area-inset-top, 0px))',
  // ... resto
}}>
```

### 2.4. Aplicar nos botões de ação (NavButtons)

O footer sticky (seção 3 abaixo) deve incluir:

```jsx
paddingBottom: 'max(24px, env(safe-area-inset-bottom, 0px))'
```

---

## 3. Botões de Ação Sticky no Bottom

### Problema
Em slides longos (Etapa 3 timeline, Etapa 4 franquias), o usuário precisa rolar até o final da página pra encontrar os botões de navegação. Isso causa atrito e desorientação.

### Solução
Tornar o `NavButtons` sticky no bottom da viewport, com um gradiente fade que indica conteúdo rolável acima.

### 3.1. Criar wrapper `src/components/StickyFooter.jsx`

```jsx
import { COLORS } from '../theme/colors'

export default function StickyFooter({ children }) {
  return (
    <div
      style={{
        position: 'sticky',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 5,
        paddingTop: 24,
        paddingBottom: 'max(24px, env(safe-area-inset-bottom, 0px))',
        paddingLeft: 24,
        paddingRight: 24,
        background: `linear-gradient(to top, ${COLORS.bg} 60%, ${COLORS.bg}EE 80%, transparent 100%)`,
        // O gradiente cria um fade suave que não corta o conteúdo abruptamente
      }}
    >
      {children}
    </div>
  )
}
```

### 3.2. Aplicar nas páginas

Em TODOS os arquivos de etapa (`Etapa2.jsx` até `EtapaFinal.jsx`), substituir o wrapper dos NavButtons:

```jsx
// ANTES:
<div style={{ marginTop: 24 }}>
  <NavButtons ... />
</div>

// DEPOIS:
import StickyFooter from '../components/StickyFooter'

<StickyFooter>
  <NavButtons ... />
</StickyFooter>
```

### 3.3. Ajustar o PageLayout

**Arquivo**: `src/components/PageLayout.jsx`

Remover o `padding-bottom: 40px` do container principal e adicionar um spacer no final pra que o conteúdo não fique escondido atrás do footer sticky:

```jsx
export default function PageLayout({ children, bg }) {
  return (
    <div style={{ minHeight: '100vh', background: bg || COLORS.bg }}>
      <TopBar />
      <div style={{ maxWidth: 520, margin: '0 auto', padding: '28px 24px 0' }}>
        {children}
        {/* Spacer para o footer sticky não cobrir conteúdo */}
        <div style={{ height: 100 }} />
      </div>
    </div>
  )
}
```

---

## 4. Navegação por Swipe nos Slides

### Problema
Os slides internos (Etapa 2, 3, 4) só navegam por botão. Em mobile, o gesto natural pra carrosséis é swipe horizontal.

### Solução
Adicionar suporte a swipe usando `drag` do framer-motion no `SlideTransition`.

**Arquivo**: `src/components/SlideTransition.jsx`

```jsx
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

export default function SlideTransition({
  children,
  slideKey,
  direction = 1,
  onSwipeLeft,   // callback: avançar slide
  onSwipeRight,  // callback: voltar slide
}) {
  const [isDragging, setIsDragging] = useState(false)

  const swipeThreshold = 50 // px mínimos pra considerar swipe
  const swipeVelocity = 200 // velocidade mínima

  const handleDragEnd = (e, info) => {
    setIsDragging(false)
    const { offset, velocity } = info

    if (offset.x > swipeThreshold || velocity.x > swipeVelocity) {
      onSwipeRight?.()
    } else if (offset.x < -swipeThreshold || velocity.x < -swipeVelocity) {
      onSwipeLeft?.()
    }
  }

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={slideKey}
        initial={{ opacity: 0, x: direction > 0 ? 30 : -30 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: direction > 0 ? -30 : 30 }}
        transition={{ duration: 0.25, ease: 'easeInOut' }}
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.15}
        onDragStart={() => setIsDragging(true)}
        onDragEnd={handleDragEnd}
        style={{
          touchAction: 'pan-y', // permite scroll vertical, captura horizontal
          cursor: isDragging ? 'grabbing' : 'grab',
        }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}
```

### Aplicar nas páginas com slides

Em `Etapa2.jsx`, `Etapa3.jsx`, `Etapa4.jsx`, passar os callbacks de swipe:

```jsx
<SlideTransition
  slideKey={currentSlide}
  direction={slideDirection}
  onSwipeLeft={nextSlide}
  onSwipeRight={currentSlide > 0 ? prevSlide : undefined}
>
  {slideContents[currentSlide]}
</SlideTransition>
```

---

## 5. Áreas de Toque Maiores

### Problema
Checkboxes do `QuizConfirmation` têm 24x24px de toque visual. SlideDots têm 4px de altura. Ambos são pequenos demais para dedos em mobile (mínimo recomendado: 44x44px).

### 5.1. QuizConfirmation — aumentar checkbox

**Arquivo**: `src/components/QuizConfirmation.jsx`

Aumentar o checkbox visual de 24px para 28px, e garantir que o ícone de check acompanhe:

```jsx
// Checkbox container:
width: 28,
height: 28,
borderRadius: 8,
// ... resto igual

// Check icon dentro:
fontSize: 15,  // era 13
fontWeight: 800,
```

> O card inteiro já é clicável (`<motion.button>` no card), então a área de toque real já é grande. A mudança aqui é só no feedback visual.

### 5.2. SlideDots — aumentar área de toque invisível

**Arquivo**: `src/components/SlideDots.jsx`

Os dots visuais podem continuar com 4px de altura, mas o botão precisa de padding vertical pra aumentar a área de toque:

```jsx
<button
  key={i}
  onClick={() => onSelect?.(i)}
  style={{
    flex: 1,
    height: 4,
    borderRadius: 2,
    border: 'none',
    cursor: 'pointer',
    background: /* ... cores existentes ... */,
    transition: 'all 0.3s ease',
    // ADICIONAR: área de toque invisível
    padding: '14px 0',       // 14 + 4 + 14 = 32px de área de toque
    backgroundClip: 'content-box', // background só no conteúdo de 4px
    WebkitBackgroundClip: 'content-box',
  }}
/>
```

**Alternativa mais simples** se `backgroundClip` causar problemas:

```jsx
// Wrapper com padding, dot visual separado
<button
  onClick={() => onSelect?.(i)}
  style={{
    flex: 1,
    padding: '14px 0',
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
  }}
>
  <div style={{
    height: 4,
    borderRadius: 2,
    background: /* cor */,
    transition: 'all 0.3s ease',
  }} />
</button>
```

### 5.3. Radio buttons (Etapas 5, 6, 7) — feedback visual de toque

Nos botões de seleção tipo radio, adicionar feedback visual no toque. Se estiver usando framer-motion (já está em algumas etapas):

```jsx
<motion.button
  whileTap={{ scale: 0.98, opacity: 0.9 }}
  transition={{ duration: 0.1 }}
  // ... resto
>
```

Se não estiver usando motion no botão, envolver com `<motion.button>`.

---

## 6. Scroll Restoration

### Problema
Ao trocar de slide DENTRO de uma etapa, o scroll não reseta. Se o usuário scrollou até o fim do slide 3.3 (longo) e avança pro 3.4, ele começa no meio da página.

### Solução

### 6.1. Nas funções de troca de slide

Em TODOS os arquivos que têm `nextSlide()` e `prevSlide()` (`Etapa2.jsx`, `Etapa3.jsx`, `Etapa4.jsx`), adicionar scroll reset:

```jsx
const nextSlide = () => {
  if (currentSlide < totalSlides - 1) {
    setSlideDirection(1)
    setCurrentSlide((s) => s + 1)
    window.scrollTo({ top: 0, behavior: 'smooth' }) // ADICIONAR
  } else {
    setShowQuiz(true)
    window.scrollTo({ top: 0, behavior: 'smooth' }) // ADICIONAR
  }
}

const prevSlide = () => {
  if (currentSlide > 0) {
    setSlideDirection(-1)
    setCurrentSlide((s) => s - 1)
    window.scrollTo({ top: 0, behavior: 'smooth' }) // ADICIONAR
  }
}
```

### 6.2. Na função goToSlide

```jsx
const goToSlide = (index) => {
  setSlideDirection(index > currentSlide ? 1 : -1)
  setCurrentSlide(index)
  window.scrollTo({ top: 0, behavior: 'smooth' }) // ADICIONAR
}
```

---

## 7. Persistência de Estado (localStorage)

### Problema
Se o usuário fechar o navegador/app no meio do onboarding e voltar, ele recomeça da Etapa 1.

### Solução

**Arquivo**: `src/context/OnboardingContext.jsx`

### 7.1. Salvar estado a cada mudança

```jsx
import { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react'

const STORAGE_KEY = 'primeiro-passo-state'

// Função pra ler estado salvo
function loadSavedState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (!saved) return null
    const parsed = JSON.parse(saved)
    return {
      currentStep: parsed.currentStep,
      completedSteps: new Set(parsed.completedSteps || []),
      userData: parsed.userData,
    }
  } catch {
    return null
  }
}

// Função pra salvar estado
function saveState(currentStep, completedSteps, userData) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      currentStep,
      completedSteps: [...completedSteps],
      userData,
      savedAt: Date.now(),
    }))
  } catch {
    // localStorage pode falhar em modo privado
  }
}
```

### 7.2. Inicializar com estado salvo

No `OnboardingProvider`, substituir os `useState` iniciais:

```jsx
export function OnboardingProvider({ children }) {
  const saved = loadSavedState()

  const [currentStep, setCurrentStep] = useState(saved?.currentStep || 1)
  const [completedSteps, setCompletedSteps] = useState(saved?.completedSteps || new Set())
  const [direction, setDirection] = useState(1)
  const [userData, setUserData] = useState(saved?.userData || {
    clientName: 'Roberto',
    celebName: 'Rodrigo Faro',
    praca: 'São Paulo - Capital',
    segmento: 'Odontologia',
    pacote: '2 vídeos (1 vertical + 1 horizontal) e 4 peças estáticas',
    vigencia: '3 meses',
    atendente: 'Yasmin',
    trafficChoice: null,
    productionPath: null,
  })

  // Salvar automaticamente a cada mudança relevante
  useEffect(() => {
    saveState(currentStep, completedSteps, userData)
  }, [currentStep, completedSteps, userData])

  // ... resto do provider igual
}
```

### 7.3. Função de reset (pra testes)

Adicionar no context uma função pra limpar o estado salvo:

```jsx
const resetOnboarding = useCallback(() => {
  localStorage.removeItem(STORAGE_KEY)
  window.location.reload()
}, [])

// Incluir no value do Provider:
value={{
  // ... tudo existente
  resetOnboarding,
}}
```

---

## 8. Feedback de Confirmação nos Momentos-Chave

### Problema
Quando o usuário confirma ações importantes (quiz completo, ativação da preparação), a transição é instantânea. Não há feedback de que "algo significativo aconteceu".

### Solução

### 8.1. Criar componente `src/components/ProcessingOverlay.jsx`

```jsx
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { COLORS } from '../theme/colors'

/**
 * Overlay de processamento com mensagens progressivas.
 * 
 * Props:
 * - show: boolean
 * - messages: string[] — mensagens que aparecem em sequência
 * - duration: número total em ms (default 2000)
 * - onComplete: callback quando terminar
 */
export default function ProcessingOverlay({ show, messages = [], duration = 2000, onComplete }) {
  const [currentMsg, setCurrentMsg] = useState(0)

  useEffect(() => {
    if (!show) {
      setCurrentMsg(0)
      return
    }

    const interval = duration / messages.length
    const timer = setInterval(() => {
      setCurrentMsg((prev) => {
        if (prev >= messages.length - 1) {
          clearInterval(timer)
          setTimeout(() => onComplete?.(), 400) // pequeno delay antes de fechar
          return prev
        }
        return prev + 1
      })
    }, interval)

    return () => clearInterval(timer)
  }, [show, messages.length, duration, onComplete])

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 200,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: `${COLORS.bg}F5`,
            backdropFilter: 'blur(8px)',
          }}
        >
          {/* Spinner */}
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            style={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              border: `3px solid ${COLORS.border}`,
              borderTopColor: COLORS.accent,
              marginBottom: 24,
            }}
          />

          {/* Mensagem atual */}
          <AnimatePresence mode="wait">
            <motion.p
              key={currentMsg}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              style={{
                color: COLORS.textMuted,
                fontSize: 14,
                fontWeight: 600,
                textAlign: 'center',
                padding: '0 40px',
              }}
            >
              {messages[currentMsg]}
            </motion.p>
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
```

### 8.2. Usar na Etapa 3 (ativação da preparação)

**Arquivo**: `src/pages/Etapa3.jsx`

```jsx
import ProcessingOverlay from '../components/ProcessingOverlay'

// Dentro do componente, adicionar state:
const [processing, setProcessing] = useState(false)

// No botão de "Confirmar e ativar preparação":
// ANTES:
onNext={() => setActivated(true)}

// DEPOIS:
onNext={() => setProcessing(true)}

// No JSX, adicionar o overlay:
<ProcessingOverlay
  show={processing}
  messages={[
    'Ativando preparação...',
    'Notificando sua atendente...',
    'Registrando prazos...',
    'Tudo pronto!',
  ]}
  duration={2500}
  onComplete={() => {
    setProcessing(false)
    setActivated(true)
  }}
/>
```

### 8.3. Usar nas CompletionScreens (transição entre etapas)

Em qualquer etapa onde `setCompleted(true)` é chamado após o quiz, adicionar um delay mínimo de 300ms com o overlay:

```jsx
const handleConfirmAndAdvance = useCallback(() => {
  setProcessing(true)
}, [])

<ProcessingOverlay
  show={processing}
  messages={['Salvando respostas...', 'Concluído!']}
  duration={1200}
  onComplete={() => {
    setProcessing(false)
    setCompleted(true)
  }}
/>
```

---

## 9. Tipografia Responsiva

### Problema
Títulos de 48px (Hero) e 36px (EtapaFinal) são fixos e podem quebrar mal em telas de 320px.

### Solução
Substituir valores fixos por `clamp()` nos títulos grandes.

### 9.1. Adicionar utilidades no `src/theme/tokens.js`

```js
export const RESPONSIVE_TYPE = {
  hero: {
    fontSize: 'clamp(32px, 10vw, 48px)',
    fontWeight: 900,
    letterSpacing: '-0.04em',
    lineHeight: 1.1,
  },
  pageTitle: {
    fontSize: 'clamp(24px, 6vw, 36px)',
    fontWeight: 900,
    letterSpacing: '-0.03em',
    lineHeight: 1.15,
  },
  sectionTitle: {
    fontSize: 'clamp(18px, 5vw, 28px)',
    fontWeight: 900,
    letterSpacing: '-0.03em',
    lineHeight: 1.2,
  },
}
```

### 9.2. Aplicar nos componentes

**Arquivo**: `src/pages/Etapa1Hero.jsx`

```jsx
// ANTES:
fontSize: '48px',

// DEPOIS:
import { RESPONSIVE_TYPE } from '../theme/tokens'
// ...
style={{ ...RESPONSIVE_TYPE.hero, color: COLORS.text, margin: '0 0 24px 0' }}
```

**Arquivo**: `src/pages/EtapaFinal.jsx`

```jsx
// ANTES:
fontSize: 36,

// DEPOIS:
style={{ ...RESPONSIVE_TYPE.pageTitle, color: COLORS.text, margin: '0 0 12px 0' }}
```

---

## 10. Contraste de Texto (WCAG)

### Problema
`textDim: #666666` sobre fundo `#0A0A0A` tem ratio de contraste ~3.9:1. Falha no WCAG AA pra texto normal (precisa de 4.5:1).

### Solução

**Arquivo**: `src/theme/colors.js`

```js
// ANTES:
textDim: '#666666',    // ratio 3.9:1 — FALHA WCAG AA

// DEPOIS:
textDim: '#787878',    // ratio 5.0:1 — PASSA WCAG AA
```

**Arquivo**: `src/theme/global.css`

```css
/* ANTES: */
--color-text-dim: #666666;

/* DEPOIS: */
--color-text-dim: #787878;
```

> **Nota**: Essa mudança é sutil visualmente mas corrige acessibilidade. O `textMuted` (#AAAAAA, ratio ~7.5:1) não precisa de alteração.

---

## 11. Acessibilidade (ARIA)

### Problema
Nenhum componente interativo customizado tem atributos ARIA. Usuários de VoiceOver/TalkBack não conseguem navegar.

### 11.1. QuizConfirmation — checkboxes

**Arquivo**: `src/components/QuizConfirmation.jsx`

Nos botões de checkbox:

```jsx
<motion.button
  role="checkbox"
  aria-checked={confirmations[i]}
  aria-label={q}
  // ... resto das props
>
```

### 11.2. SlideDots — navegação

**Arquivo**: `src/components/SlideDots.jsx`

```jsx
<div
  role="tablist"
  aria-label="Navegação entre slides"
  style={{ display: 'flex', gap: 6, marginBottom: 20 }}
>
  {Array.from({ length: total }).map((_, i) => (
    <button
      key={i}
      role="tab"
      aria-selected={i === current}
      aria-label={`Slide ${i + 1} de ${total}`}
      onClick={() => onSelect?.(i)}
      // ... resto
    />
  ))}
</div>
```

### 11.3. NavButtons — botões de navegação

**Arquivo**: `src/components/NavButtons.jsx`

```jsx
// Botão anterior:
<button
  type="button"
  aria-label="Voltar para o passo anterior"
  // ...
>

// Botão próximo:
<button
  type="button"
  aria-label={nextDisabled ? 'Complete os itens para avançar' : 'Avançar para o próximo passo'}
  aria-disabled={nextDisabled}
  // ...
>
```

### 11.4. TopBar — progresso

**Arquivo**: `src/components/TopBar.jsx`

Na barra de progresso global:

```jsx
<div
  role="progressbar"
  aria-valuenow={stepNum}
  aria-valuemin={1}
  aria-valuemax={totalSteps}
  aria-label={`Progresso: etapa ${stepNum} de ${totalSteps}`}
  style={{ /* ... */ }}
>
```

### 11.5. Radio buttons (Etapas 5, 6, 7)

Nos botões de seleção tipo radio:

```jsx
<button
  role="radio"
  aria-checked={selected === 'option-id'}
  aria-label="Descrição da opção"
  // ...
>
```

---

## 12. Navegação entre Etapas Concluídas

### Problema
Não existe forma de voltar pra uma etapa já concluída pra revisar conteúdo.

### Solução
Ao tocar no indicador de etapa na TopBar, abrir um mini-drawer com as etapas.

### 12.1. Criar `src/components/StepDrawer.jsx`

```jsx
import { motion, AnimatePresence } from 'framer-motion'
import { useOnboarding } from '../context/OnboardingContext'
import { COLORS } from '../theme/colors'

export default function StepDrawer({ isOpen, onClose }) {
  const { currentStep, completedSteps, totalSteps, stepTitles, goToStep } = useOnboarding()

  const handleSelect = (step) => {
    if (completedSteps.has(step) || step === currentStep) {
      goToStep(step)
      onClose()
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.6)',
              zIndex: 50,
            }}
          />

          {/* Drawer */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            style={{
              position: 'fixed',
              bottom: 0,
              left: 0,
              right: 0,
              zIndex: 51,
              background: COLORS.card,
              borderRadius: '20px 20px 0 0',
              padding: '20px 24px',
              paddingBottom: 'max(24px, env(safe-area-inset-bottom, 0px))',
              maxHeight: '60vh',
              overflowY: 'auto',
            }}
          >
            {/* Handle bar */}
            <div style={{
              width: 40,
              height: 4,
              borderRadius: 2,
              background: COLORS.border,
              margin: '0 auto 20px',
            }} />

            <p style={{
              color: COLORS.textDim,
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.1em',
              fontFamily: "'JetBrains Mono', monospace",
              marginBottom: 16,
            }}>
              NAVEGAÇÃO
            </p>

            {Array.from({ length: totalSteps }).map((_, i) => {
              const step = i + 1
              const isCompleted = completedSteps.has(step)
              const isCurrent = step === currentStep
              const isAccessible = isCompleted || isCurrent

              return (
                <button
                  key={step}
                  onClick={() => handleSelect(step)}
                  disabled={!isAccessible}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 14,
                    padding: '14px 0',
                    border: 'none',
                    borderBottom: i < totalSteps - 1 ? `1px solid ${COLORS.border}` : 'none',
                    background: 'transparent',
                    cursor: isAccessible ? 'pointer' : 'default',
                    opacity: isAccessible ? 1 : 0.4,
                  }}
                >
                  {/* Indicador */}
                  <div style={{
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    background: isCompleted
                      ? `${COLORS.success}20`
                      : isCurrent
                        ? `${COLORS.red}20`
                        : COLORS.border,
                    border: `2px solid ${
                      isCompleted ? COLORS.success : isCurrent ? COLORS.red : COLORS.border
                    }`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    {isCompleted ? (
                      <span style={{ color: COLORS.success, fontSize: 13, fontWeight: 800 }}>✓</span>
                    ) : (
                      <span style={{
                        color: isCurrent ? COLORS.red : COLORS.textDim,
                        fontSize: 12,
                        fontWeight: 700,
                        fontFamily: "'JetBrains Mono', monospace",
                      }}>
                        {step}
                      </span>
                    )}
                  </div>

                  {/* Título */}
                  <div style={{ textAlign: 'left' }}>
                    <p style={{
                      color: isCurrent ? COLORS.text : isCompleted ? COLORS.textMuted : COLORS.textDim,
                      fontSize: 14,
                      fontWeight: isCurrent ? 700 : 500,
                      margin: 0,
                    }}>
                      {stepTitles[step]}
                    </p>
                    {isCurrent && (
                      <span style={{
                        color: COLORS.red,
                        fontSize: 10,
                        fontWeight: 700,
                        letterSpacing: '0.05em',
                      }}>
                        ATUAL
                      </span>
                    )}
                  </div>
                </button>
              )
            })}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
```

### 12.2. Integrar na TopBar

**Arquivo**: `src/components/TopBar.jsx`

```jsx
import { useState } from 'react'
import StepDrawer from './StepDrawer'

export default function TopBar({ showCompleted = false }) {
  const [drawerOpen, setDrawerOpen] = useState(false)
  // ... resto

  return (
    <>
      {/* ... barra de progresso */}
      <div style={{ /* ... TopBar */ }}>
        <div style={{ /* ... container */ }}>
          <span>PRIMEIRO PASSO</span>

          {/* Tornar os dots clicáveis pra abrir o drawer */}
          <button
            onClick={() => setDrawerOpen(true)}
            aria-label="Abrir navegação entre etapas"
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '8px 0' }}
          >
            {/* progress dots existentes */}
          </button>
        </div>
      </div>

      <StepDrawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </>
  )
}
```

---

## 13. Checklist de Execução

- [ ] Barra de progresso global adicionada na TopBar (fixa, 3px, gradient)
- [ ] `viewport-fit=cover` no `index.html`
- [ ] Safe areas aplicadas na TopBar e no footer
- [ ] `StickyFooter.jsx` criado e aplicado em TODAS as etapas
- [ ] Spacer de 100px adicionado no `PageLayout`
- [ ] `SlideTransition.jsx` atualizado com suporte a swipe (drag + callbacks)
- [ ] Swipe conectado em Etapa2, Etapa3, Etapa4
- [ ] Checkboxes do `QuizConfirmation` aumentados pra 28px
- [ ] SlideDots com área de toque expandida (padding 14px)
- [ ] `window.scrollTo` adicionado em TODAS as funções `nextSlide`, `prevSlide`, `goToSlide`
- [ ] Persistência com localStorage implementada no `OnboardingContext`
- [ ] Função `resetOnboarding` disponível no context
- [ ] `ProcessingOverlay.jsx` criado
- [ ] ProcessingOverlay usado na Etapa 3 (ativação da preparação)
- [ ] ProcessingOverlay usado nas transições de conclusão de etapa
- [ ] `RESPONSIVE_TYPE` criado em `tokens.js`
- [ ] Títulos do Hero e EtapaFinal usando `clamp()`
- [ ] `textDim` atualizado de `#666666` para `#787878` (colors.js + global.css)
- [ ] Atributos ARIA adicionados no QuizConfirmation, SlideDots, NavButtons, TopBar
- [ ] `StepDrawer.jsx` criado
- [ ] StepDrawer integrado na TopBar (dots clicáveis abrem o drawer)
- [ ] Testado em viewport 375px (iPhone baseline)
- [ ] Testado em viewport 320px (iPhone SE)
- [ ] Nenhum texto ou lógica de negócio foi alterado