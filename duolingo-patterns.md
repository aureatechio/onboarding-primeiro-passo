# Duolingo UX Patterns — Multistep Forms (Mobile-First)

> **Document purpose:** Technical reference and implementation guide for AI coding agents.  
> **Target:** React / TypeScript, mobile-first web, multistep onboarding or survey forms.  
> **Source inspiration:** Duolingo's engagement design system adapted for general SaaS onboarding.

---

## Agent Instructions

When implementing a multistep form using this document:

1. Read all pattern definitions before generating any component.
2. Map each question to a pattern type (see §3 — Pattern Catalog).
3. Apply the animation token system from §5 consistently — never use arbitrary durations.
4. Wire state using the shape defined in §6 — State Architecture.
5. Respect all mobile-first constraints in §7 before finalizing layout.
6. Add gamification layer (§4) after core form logic is working.

Do not skip patterns. Do not invent new animation durations. Do not mix layout paradigms within a single form step.

---

## 1. Core Design Principles

### 1.1 One Question Per Screen
**Rule:** Every form step renders exactly one question or input group. Never stack multiple unrelated fields on a single step.

**Why it works:** Reduces cognitive load. User focuses on one decision at a time. Completion rate increases because each tap feels like progress.

**Implementation rule for agents:**
```
if (fieldsInStep > 1) → split into multiple steps UNLESS fields are tightly coupled (e.g., firstName + lastName)
tightly coupled = fields that describe the same atomic concept
```

### 1.2 Sections Over Step Numbers
**Rule:** Group steps into named sections (e.g., "Perfil da empresa", "Seus objetivos", "Configuração final"). Display section name, not raw step number.

**Anti-pattern:** "Etapa 7 de 14" — communicates length, kills motivation.  
**Correct pattern:** "Objetivos · 2 de 3" — communicates position within a meaningful context.

**Progress display hierarchy:**
```
[Section Name]          ← primary label, always visible
[Segmented progress bar] ← one segment per section, fill shows intra-section progress
[Overall % or x/y]      ← secondary, smaller, below the bar
```

### 1.3 Immediate Feedback Before Advancing
**Rule:** Every interaction produces visual feedback before the "Continue" button is enabled. The user must see that their choice was registered.

**Feedback chain for option selection:**
```
user taps option → option border changes color (16ms) → checkmark animates in (200ms) → 
button enables (0ms, same frame) → encouragement text fades in (300ms delay)
```

**Feedback chain for text input:**
```
user types ≥ 1 char → button enables → user types name → 
personalized encouragement appears (debounce 600ms)
```

### 1.4 Forward-Only Navigation (with Exit Safety)
**Rule:** Default flow is forward-only on mobile. Back navigation is available but not prominent. No back swipe that accidentally loses data.

**Implementation:**
- Back button: top-left, icon only (chevron), 44px touch target.
- All answers are persisted in state immediately on selection — back navigation restores previous answer.
- Never clear an answer when navigating back.

### 1.5 Optimistic Progression
**Rule:** Assume the user will complete. Never show warnings about completion length upfront. Show estimated time only if it's ≤ 2 minutes ("Leva cerca de 2 min").

---

## 2. Information Architecture

### 2.1 Section Structure
```typescript
interface FormSection {
  id: string               // unique key
  label: string            // human-readable section name
  color: string            // accent color for this section's tag/dot
  xpReward: number         // XP awarded on section completion
  questions: Question[]
}
```

### 2.2 Question Types (canonical list)
```typescript
type QuestionType =
  | 'single-choice'        // tap one option from a list
  | 'multi-choice'         // tap one or more options (explicitly labeled)
  | 'single-choice-grid'   // 2-column grid of compact cards
  | 'text-short'           // single-line free text input
  | 'text-long'            // multiline textarea (rare in onboarding)
  | 'scale'                // 1–5 or 1–10 tap scale (NPS-style)
  | 'boolean'              // two large option cards: Yes / No
```

### 2.3 Full Question Schema
```typescript
interface Question {
  id: string
  type: QuestionType
  prompt: string              // main question text, max 60 chars
  hint?: string               // secondary guidance, max 80 chars
  placeholder?: string        // for text inputs only
  options?: Option[]          // for choice types
  cols?: 1 | 2               // grid columns (default 1)
  required: boolean           // default true
  skippable?: boolean         // renders "Pular" link if true
  validationMessage?: string  // shown below input on invalid state
}

interface Option {
  id: string
  icon: string                // emoji or SVG string
  title: string               // max 24 chars
  sub?: string                // optional subtitle, max 40 chars
}
```

### 2.4 Answer Storage Shape
```typescript
type AnswerMap = Record<string, string | string[] | number | null>
// key: question.id
// value: option.id (string), option.id[] (multi), raw text, scale number, or null

// Example:
const answers: AnswerMap = {
  "company-size": "2-10",
  "segment": "ecommerce",
  "main-goal": "automate",
  "user-name": "Rafael",
}
```

---

## 3. Pattern Catalog

### Pattern 1 — Single Choice List
**Use when:** 3–5 mutually exclusive options, each with meaningful differences.  
**Layout:** Vertical stack of full-width cards.

**Card anatomy:**
```
┌─────────────────────────────────────────────┐
│  [icon 24px]  [title 15px bold]             │
│               [sub 13px muted]   [check 20px]│
└─────────────────────────────────────────────┘
```

**States:**
```
default  → border: 1.5px solid #E5E5E5, bg: white
hover    → border: 1.5px solid {sectionColor}, bg: #F9F9F9, translateY(-1px)
selected → border: 1.5px solid {sectionColor}, bg: #F9F9F9, checkmark visible
```

**Checkmark animation:** scale from 0.3 to 1 with spring easing (cubic-bezier(.34,1.56,.64,1)), 200ms.  
**Card tap animation:** scale 1 → 1.08 → 0.97 → 1, 300ms.

**React component signature:**
```typescript
<SingleChoiceList
  question={question}
  value={answers[question.id]}
  onChange={(optionId) => setAnswer(question.id, optionId)}
  accentColor={section.color}
/>
```

---

### Pattern 2 — Single Choice Grid (2 columns)
**Use when:** 4–8 options, short labels (≤ 12 chars), icons are self-explanatory.  
**Layout:** CSS grid, 2 columns, equal width cards.

**Card anatomy (compact):**
```
┌──────────────┐
│  [icon 28px] │
│  [title]     │
└──────────────┘
```

**Rules:**
- Remove subtitle in grid mode — not enough space.
- Minimum card height: 72px.
- Selected state: same border + checkmark in top-right corner.

**CSS:**
```css
.options-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}
.option-card-compact {
  padding: 16px 12px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 6px;
  border-radius: 14px;
  border: 1.5px solid var(--border-default);
  background: white;
  cursor: pointer;
  transition: border-color 160ms, transform 160ms;
  position: relative;
  min-height: 72px;
}
```

---

### Pattern 3 — Text Short Input
**Use when:** Answer is a name, email, company name, or short free-form text.  
**Never use for:** Questions answerable by tapping a choice — always prefer choice patterns.

**Input behavior:**
```
onFocus   → border transitions to accent color (200ms)
onInput   → button enables after first valid character
onInput   → debounce 600ms → show personalized encouragement
onBlur    → validate → show error message if invalid (red border + message below)
```

**Layout:**
```
[question prompt]
[hint text]
[input field — full width, 48px height on mobile]
[encouragement text — fades in after typing]
[continue button]
```

**Input CSS:**
```css
.text-input {
  width: 100%;
  height: 48px;
  border: 1.5px solid var(--border-default);
  border-radius: 12px;
  padding: 0 16px;
  font-size: 16px; /* prevents iOS zoom on focus */
  outline: none;
  transition: border-color 200ms;
}
.text-input:focus { border-color: var(--accent); }
.text-input.error  { border-color: #FF4B4B; }
```

**Critical:** `font-size: 16px` on mobile inputs — anything smaller triggers iOS auto-zoom.

---

### Pattern 4 — Boolean (Yes / No)
**Use when:** Binary decision with high emotional weight (e.g., "Você já usa alguma ferramenta de CRM?").  
**Layout:** Two large cards side-by-side or stacked.

**Card sizing:** Minimum 80px height. Icon large (36px). Auto-advance on selection (no explicit Continue tap needed for boolean).

**Auto-advance rule:**
```
onSelect → answer registered → wait 400ms → automatically call next()
```
This creates a "game-like" feel — the form responds to the tap immediately.

---

### Pattern 5 — Scale (NPS / Rating)
**Use when:** Measuring intensity, satisfaction, or priority on a numeric scale.  
**Layout:** Row of tappable circles or pills (1–5 preferred over 1–10 on mobile).

**Selection behavior:** Tapped number and all previous numbers fill in accent color (cumulative fill), not just the selected one. This communicates "up to" semantics visually.

**Labels:** Show only endpoints (e.g., "Nada importante" left, "Muito importante" right). Never label every number.

---

## 4. Gamification Layer

### 4.1 XP System
**Rule:** Award XP for every completed question and bonus XP for section completion.

**XP values (recommended):**
```
answer any question   → +10 XP
complete a section    → +20 XP (bonus, shown on celebration screen)
complete entire form  → +50 XP (bonus, shown on final screen)
```

**XP counter display:**
```
Position: top-right of header
Format:   ⚡ {total} XP
Animation: on XP gain → badge scales 1 → 1.35 → 0.92 → 1, 500ms
```

**State:**
```typescript
const [xp, setXp] = useState(0)
const addXP = (amount: number) => {
  setXp(prev => prev + amount)
  triggerXPAnimation()
}
```

### 4.2 Progress Segmented Bar
**Rule:** One segment per section. Active segment fills proportionally to progress within the section.

**CSS implementation:**
```css
.progress-bar {
  display: flex;
  gap: 4px;
  height: 6px;
}
.segment {
  flex: 1;
  background: #E5E5E5;
  border-radius: 4px;
  overflow: hidden;
}
.segment-fill {
  height: 100%;
  background: var(--accent);
  border-radius: 4px;
  transition: width 400ms cubic-bezier(.34,1.56,.64,1);
}
```

**Fill width calculation:**
```typescript
const getSegmentWidth = (sectionIndex: number): string => {
  if (sectionIndex < currentSectionIndex) return '100%'
  if (sectionIndex > currentSectionIndex) return '0%'
  return `${(currentQuestionIndex / sections[currentSectionIndex].questions.length) * 100}%`
}
```

### 4.3 Encouragement Copy System
**Rule:** After each answered question, display a short encouraging message below the Continue button. Never repeat the same message twice in a row.

**Message pool (rotate, never repeat consecutively):**
```typescript
const ENCOURAGEMENTS = [
  "Perfeito! Essa informação é muito valiosa.",
  "Ótima escolha! Já estamos personalizando pra você.",
  "Excelente! Tudo certo por aqui.",
  "Mandou bem! Continua assim.",
  "Boa! Mais um passo e você já vê o painel.",
  "Incrível! Você está quase lá.",
]

// For text inputs — use personalized copy when name is known:
const nameEncouragement = (name: string) =>
  `Prazer em te conhecer, ${name.split(' ')[0]}! 👋`
```

**Animation:** `opacity: 0 → 1`, `translateY: 8px → 0`, 300ms, 200ms delay after answer registered.

### 4.4 Section Completion Celebration
**Rule:** When the last question of a section is answered and it is NOT the final section, display a full-screen celebration modal before advancing to the next section.

**Modal anatomy:**
```
[backdrop: rgba(0,0,0,0.45), animated fadeIn 250ms]
  └─ [card: white, border-radius 24px, animated spring scale 0.5→1.1→1, 400ms]
       ├─ [confetti particles: 12 colored squares, float upward, staggered 0–400ms]
       ├─ [section icon: 52px emoji]
       ├─ [title: "Seção concluída!"]
       ├─ [subtitle: context-specific message]
       ├─ [XP badge: "+30 XP ganhos!"]
       └─ [continue button: auto-focuses for accessibility]
```

**Confetti particle implementation:**
```typescript
const CONFETTI_COLORS = ['#58CC02','#FFB800','#1CB0F6','#FF9600','#FF4B4B','#CE82FF']

const particles = Array.from({ length: 12 }, (_, i) => ({
  color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
  x: 20 + Math.random() * 260,
  delay: Math.random() * 0.4,
  duration: 0.7 + Math.random() * 0.5,
}))
```

**CSS for particles:**
```css
@keyframes particle-float {
  0%   { transform: translateY(0) rotate(0deg); opacity: 1; }
  100% { transform: translateY(-80px) rotate(720deg); opacity: 0; }
}
.particle {
  position: absolute;
  width: 8px;
  height: 8px;
  border-radius: 2px;
  animation: particle-float var(--dur) ease forwards;
  animation-delay: var(--delay);
}
```

**Do not show celebration modal for the last section** — use the final completion screen instead.

### 4.5 Section-Specific Copy Map
```typescript
const SECTION_COMPLETE_MESSAGES: Record<string, { icon: string; title: string; sub: string }> = {
  company:  { icon: '🏢', title: 'Empresa configurada!',   sub: 'Agora vamos entender o que você quer alcançar.' },
  goals:    { icon: '🎯', title: 'Objetivos definidos!',   sub: 'Só mais algumas perguntas rápidas para finalizar.' },
  setup:    { icon: '✅', title: 'Quase lá!',              sub: 'Revisando suas informações...' },
  default:  { icon: '⭐', title: 'Seção concluída!',       sub: 'Você está indo muito bem.' },
}
```

---

## 5. Animation Token System

**Rule:** All animations use tokens from this table. Never use arbitrary durations or easings.

| Token | Duration | Easing | Use case |
|-------|----------|--------|----------|
| `duration.instant` | 16ms | linear | State flag changes, no visual |
| `duration.fast` | 150ms | ease-out | Hover states, border color |
| `duration.normal` | 250ms | ease-in-out | Backdrop fade, text fade |
| `duration.emphasis` | 300ms | ease-in-out | Card tap feedback, slide-up |
| `duration.spring` | 400ms | cubic-bezier(.34,1.56,.64,1) | Checkmark, button enable, celebration modal |
| `duration.slow` | 500ms | ease-in-out | XP counter bounce |
| `duration.exit` | 200ms | ease-in | Screen exit transition |
| `duration.enter` | 300ms | ease-out | Screen enter transition |

**Screen transition:**
```css
/* Exit current step */
@keyframes step-exit {
  from { opacity: 1; transform: translateX(0); }
  to   { opacity: 0; transform: translateX(-24px); }
}

/* Enter new step */
@keyframes step-enter {
  from { opacity: 0; transform: translateX(24px) translateY(12px); }
  to   { opacity: 1; transform: translateX(0) translateY(0); }
}

.step-enter { animation: step-enter 300ms ease-out; }
.step-exit  { animation: step-exit  200ms ease-in forwards; }
```

**React implementation with useEffect:**
```typescript
const [transitioning, setTransitioning] = useState(false)

const goToNext = () => {
  setTransitioning(true)
  setTimeout(() => {
    advanceStep()
    setTransitioning(false)
  }, 200) // match step-exit duration
}
```

**Button enable animation:**
```css
@keyframes button-enable {
  0%   { transform: scale(1); }
  40%  { transform: scale(1.04); }
  70%  { transform: scale(0.98); }
  100% { transform: scale(1); }
}
.btn-continue.enabled {
  animation: button-enable 300ms cubic-bezier(.34,1.56,.64,1);
}
```

**Reduced motion:** Always wrap non-essential animations:
```css
@media (prefers-reduced-motion: reduce) {
  .step-enter, .step-exit, .particle, .opt-card { animation: none !important; transition: none !important; }
}
```

---

## 6. State Architecture

### 6.1 Top-Level Form State
```typescript
interface MultiStepFormState {
  // Navigation
  sectionIndex: number
  questionIndex: number
  direction: 'forward' | 'backward'     // for transition animations

  // Answers
  answers: AnswerMap

  // Gamification
  xp: number
  completedSections: string[]           // section ids

  // UI
  isTransitioning: boolean
  showSectionComplete: boolean
  currentSectionCompleteData: SectionCompleteData | null
}
```

### 6.2 Derived State (compute, do not store)
```typescript
// Always compute, never store these in state:
const currentSection = sections[state.sectionIndex]
const currentQuestion = currentSection.questions[state.questionIndex]
const currentAnswer = state.answers[currentQuestion.id]
const isAnswered = currentAnswer !== null && currentAnswer !== undefined && currentAnswer !== ''
const totalQuestions = sections.reduce((acc, s) => acc + s.questions.length, 0)
const answeredCount = Object.keys(state.answers).filter(k => state.answers[k] !== null).length
const overallProgress = answeredCount / totalQuestions
const isLastQuestionInSection = state.questionIndex === currentSection.questions.length - 1
const isLastSection = state.sectionIndex === sections.length - 1
const isLastQuestion = isLastQuestionInSection && isLastSection
```

### 6.3 Action Handlers
```typescript
// Advance to next question or section
const handleNext = () => {
  addXP(10)
  if (isLastQuestion) {
    addXP(50) // completion bonus
    navigateTo('complete')
    return
  }
  if (isLastQuestionInSection) {
    addXP(20) // section bonus
    setState(s => ({ ...s, showSectionComplete: true }))
    return
  }
  setState(s => ({
    ...s,
    questionIndex: s.questionIndex + 1,
    direction: 'forward',
    isTransitioning: true,
  }))
}

// Register answer
const setAnswer = (questionId: string, value: AnswerValue) => {
  setState(s => ({ ...s, answers: { ...s.answers, [questionId]: value } }))
}

// Dismiss section complete and advance
const handleSectionContinue = () => {
  setState(s => ({
    ...s,
    sectionIndex: s.sectionIndex + 1,
    questionIndex: 0,
    completedSections: [...s.completedSections, currentSection.id],
    showSectionComplete: false,
    currentSectionCompleteData: null,
  }))
}

// Navigate back
const handleBack = () => {
  if (state.questionIndex > 0) {
    setState(s => ({ ...s, questionIndex: s.questionIndex - 1, direction: 'backward' }))
    return
  }
  if (state.sectionIndex > 0) {
    const prevSection = sections[state.sectionIndex - 1]
    setState(s => ({
      ...s,
      sectionIndex: s.sectionIndex - 1,
      questionIndex: prevSection.questions.length - 1,
      direction: 'backward',
    }))
  }
}
```

### 6.4 Persistence (Optional)
```typescript
// Persist answers to localStorage on every change
useEffect(() => {
  localStorage.setItem('onboarding_answers', JSON.stringify(state.answers))
  localStorage.setItem('onboarding_progress', JSON.stringify({
    sectionIndex: state.sectionIndex,
    questionIndex: state.questionIndex,
    xp: state.xp,
  }))
}, [state.answers, state.sectionIndex, state.questionIndex, state.xp])

// Restore on mount
useEffect(() => {
  const savedAnswers = localStorage.getItem('onboarding_answers')
  const savedProgress = localStorage.getItem('onboarding_progress')
  if (savedAnswers && savedProgress) {
    const answers = JSON.parse(savedAnswers)
    const progress = JSON.parse(savedProgress)
    setState(s => ({ ...s, answers, ...progress }))
  }
}, [])
```

---

## 7. Mobile-First Constraints

### 7.1 Touch Target Sizes
```
Minimum touch target: 44px × 44px (Apple HIG / WCAG 2.5.5)
Option cards: minimum 64px height
Continue button: minimum 52px height
Back button: 44px × 44px (icon only)
```

### 7.2 Viewport & Safe Areas
```css
.form-container {
  min-height: 100dvh;                      /* dvh: dynamic viewport height (iOS Safari safe) */
  padding-bottom: env(safe-area-inset-bottom, 16px);
  padding-top: env(safe-area-inset-top, 0px);
}

/* Sticky bottom CTA pattern */
.cta-area {
  position: sticky;
  bottom: 0;
  padding: 12px 20px;
  padding-bottom: max(12px, env(safe-area-inset-bottom));
  background: rgba(255,255,255,0.92);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  border-top: 0.5px solid rgba(0,0,0,0.06);
}
```

### 7.3 Keyboard Handling (Text Inputs)
```typescript
// Scroll active input into view above keyboard
const inputRef = useRef<HTMLInputElement>(null)

useEffect(() => {
  if (currentQuestion.type === 'text-short') {
    const timeout = setTimeout(() => {
      inputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      inputRef.current?.focus()
    }, 350) // wait for step enter animation
    return () => clearTimeout(timeout)
  }
}, [currentQuestion.id])
```

**Critical iOS rule:** Never use `position: fixed` on elements that appear near the keyboard. Use `position: sticky` with `bottom: 0` instead.

### 7.4 Tap vs Click
```css
/* Remove tap highlight on mobile */
* { -webkit-tap-highlight-color: transparent; }

/* Active state for immediate visual feedback on touch */
.option-card:active { transform: scale(0.97); transition: transform 80ms; }
.btn-continue:active { transform: scale(0.98); }
```

### 7.5 Font Size Rules
```css
/* Prevents iOS auto-zoom on input focus */
input, select, textarea { font-size: 16px; }

/* Typographic scale */
.question-prompt  { font-size: 22px; font-weight: 600; line-height: 1.3; }
.question-hint    { font-size: 15px; font-weight: 400; color: var(--text-muted); }
.option-title     { font-size: 15px; font-weight: 500; }
.option-sub       { font-size: 13px; font-weight: 400; color: var(--text-muted); }
.encouragement    { font-size: 13px; color: var(--text-muted); text-align: center; }
.btn-continue     { font-size: 16px; font-weight: 600; }
```

### 7.6 Layout Spacing Scale
```css
:root {
  --space-xs:  4px;
  --space-sm:  8px;
  --space-md:  12px;
  --space-lg:  16px;
  --space-xl:  24px;
  --space-2xl: 32px;
  --space-3xl: 48px;
}

/* Standard step layout */
.step-layout {
  padding: 0 20px;
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}
```

---

## 8. Component Structure

### 8.1 Recommended File Structure
```
src/
  components/
    multistep-form/
      MultiStepForm.tsx          ← root orchestrator
      FormHeader.tsx             ← progress bar + XP badge + section label
      FormStep.tsx               ← animated wrapper for individual steps
      SectionCompleteModal.tsx   ← celebration overlay
      FormComplete.tsx           ← final completion screen
      questions/
        SingleChoiceList.tsx
        SingleChoiceGrid.tsx
        TextShortInput.tsx
        BooleanChoice.tsx
        ScaleInput.tsx
      shared/
        OptionCard.tsx           ← base card used by choice patterns
        ContinueButton.tsx       ← sticky CTA with enable animation
        EncouragementText.tsx    ← animated message below CTA
  hooks/
    useFormState.ts              ← state + actions
    useXP.ts                     ← XP logic + animation trigger
    useFormPersistence.ts        ← localStorage save/restore
  types/
    form.types.ts                ← Question, Option, FormSection, AnswerMap
  data/
    form-sections.ts             ← the actual form configuration
```

### 8.2 MultiStepForm Root Component
```typescript
export const MultiStepForm: React.FC<{ sections: FormSection[] }> = ({ sections }) => {
  const { state, actions } = useFormState(sections)
  const currentSection = sections[state.sectionIndex]
  const currentQuestion = currentSection?.questions[state.questionIndex]

  if (!currentQuestion) return <FormComplete xp={state.xp} />

  return (
    <div className="form-container">
      <FormHeader
        sections={sections}
        sectionIndex={state.sectionIndex}
        questionIndex={state.questionIndex}
        xp={state.xp}
        onBack={actions.handleBack}
      />

      <FormStep
        key={`${state.sectionIndex}-${state.questionIndex}`}
        direction={state.direction}
        question={currentQuestion}
        answer={state.answers[currentQuestion.id]}
        sectionColor={currentSection.color}
        sectionLabel={currentSection.label}
        onChange={(value) => actions.setAnswer(currentQuestion.id, value)}
        onNext={actions.handleNext}
      />

      {state.showSectionComplete && (
        <SectionCompleteModal
          section={currentSection}
          onContinue={actions.handleSectionContinue}
        />
      )}
    </div>
  )
}
```

### 8.3 FormStep Question Dispatcher
```typescript
// FormStep.tsx — dispatches to correct pattern component
const QuestionRenderer: React.FC<{ question: Question; ... }> = ({ question, ...props }) => {
  switch (question.type) {
    case 'single-choice':      return <SingleChoiceList  question={question} {...props} />
    case 'single-choice-grid': return <SingleChoiceGrid  question={question} {...props} />
    case 'text-short':         return <TextShortInput    question={question} {...props} />
    case 'boolean':            return <BooleanChoice     question={question} {...props} />
    case 'scale':              return <ScaleInput        question={question} {...props} />
    default:                   return <SingleChoiceList  question={question} {...props} />
  }
}
```

---

## 9. Copy Writing Rules

**Rule:** Copy follows Duolingo's coach-like voice. Never bureaucratic, never neutral.

| Context | ❌ Avoid | ✅ Use |
|---------|---------|-------|
| Question prompt | "Selecione uma opção" | "Qual dessas opções é mais você?" |
| Required field error | "Campo obrigatório" | "Precisamos dessa informação para continuar" |
| Continue button | "Próximo" | "Continuar →" |
| Skip link | "Pular etapa" | "Agora não" |
| Loading | "Carregando..." | "Preparando tudo pra você..." |
| Final CTA | "Enviar formulário" | "Ver meu painel →" |
| Back button | "Voltar" | ← (icon only) |
| Completion title | "Formulário concluído" | "Tudo pronto, [nome]! 🎉" |

**Encouragement copy rules:**
- Always affirm the answer, never just the action ("Ótima escolha!" not "Resposta registrada")
- Use "você" consistently — never "o senhor / a senhora"
- Maximum 60 characters per encouragement message
- Rotate through the pool — same message twice in a row breaks the illusion of intelligence

---

## 10. Accessibility Checklist

```
[ ] All option cards have role="radio" or role="button" with aria-checked
[ ] Continue button has aria-disabled (not disabled attr) to keep it focusable for screen readers
[ ] Progress bar has role="progressbar" with aria-valuenow, aria-valuemin, aria-valuemax
[ ] Section complete modal traps focus on open, restores on close
[ ] All animations wrapped in prefers-reduced-motion: reduce media query
[ ] Minimum contrast ratio 4.5:1 for all text (especially muted text on white bg)
[ ] Touch targets minimum 44×44px
[ ] font-size: 16px on all inputs (iOS zoom prevention)
[ ] Form is keyboard-navigable: Tab moves between options, Space/Enter selects
[ ] Error messages announced via aria-live="polite"
```

---

## 11. Anti-Patterns (Never Do)

```
❌ Multiple questions on one screen
❌ Raw step counter as primary progress label ("Etapa 7 de 14")
❌ Clearing answers on back navigation
❌ Disabling back navigation entirely
❌ Showing total estimated time if > 3 minutes
❌ Celebration modal on the very last step (use completion screen instead)
❌ Auto-advancing on choice questions (except boolean) — user may need to reconsider
❌ font-size < 16px on input fields
❌ Using placeholder text as a label
❌ Progress bar that jumps from 0% to 100% without intermediate fills
❌ Same encouragement message twice in a row
❌ Generic completion copy ("Obrigado pela resposta")
❌ position: fixed near the keyboard on mobile
❌ Asking for optional info without labeling it "(opcional)" explicitly
❌ Showing all validation errors at once — show them one by one, after interaction
```

---

## 12. Quick Reference — Decision Tree

```
New question to add to form?
│
├─ Is it binary? (yes/no, true/false)
│   └─ → Pattern: boolean (auto-advance)
│
├─ Is it a number or intensity rating?
│   └─ → Pattern: scale
│
├─ Is the answer open-ended (name, email, company)?
│   └─ → Pattern: text-short
│
├─ Are there 3–5 options with meaningful differences?
│   └─ → Pattern: single-choice-list (full width cards)
│
└─ Are there 4–8 short options (icon + short label)?
    └─ → Pattern: single-choice-grid (2 columns)
```

```
Section has ≥ 4 questions?
│
├─ YES → split into 2 sections with distinct labels and colors
└─ NO  → keep as one section
```

```
Total form has ≥ 10 questions?
│
├─ YES → ensure at least 3 sections + show estimated time ≤ 2 min upfront
└─ NO  → 2 sections is fine, no time estimate needed
```

---

*Document version: 1.0 — Last updated: March 2026*  
*Maintained for use with AI coding agents in React/TypeScript multistep form implementations.*