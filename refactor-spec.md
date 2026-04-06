# Spec de Refatoração Visual — Projeto "Primeiro Passo"

> **Objetivo**: Eliminar a aparência genérica de "feito por IA" do onboarding, substituindo emojis por ícones vetoriais, criando um design system consistente, melhorando animações e adicionando profundidade visual real.
>
> **Regra geral**: Nenhuma dessas mudanças deve alterar a lógica de negócio, o fluxo de etapas ou os textos/copy do onboarding. Apenas visual, componentes e estrutura de estilização.

### Branding já aplicado (prevalece sobre qualquer instrução anterior nesta spec)

As seguintes mudanças de marca já foram implementadas e **não devem ser revertidas**:


| Item                  | Estado atual                                                                                     | Arquivos                                                                                     |
| --------------------- | ------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------- |
| **Vermelho da marca** | `#E8356D` (substitui o antigo `#E63333` em toda a base)                                          | `src/theme/design-tokens.js`, `src/theme/global.css`                                         |
| **Gradientes CTA**    | Início `#C42A56` (`COLORS.redGradientStart`), fim escuro `#9E2645` (`COLORS.redGradientEndDark`) | `design-tokens.js`, `NavButtons.jsx`, `CompletionScreen.jsx`, `Etapa1Hero.jsx`, `Etapa3.jsx` |
| **Logo na TopBar**    | Componente `src/components/TopBarLogo.jsx` renderiza `public/logo_acelerai_white_transp.png`     | `TopBar.jsx`, `EtapaFinal.jsx`, `TudoPronto.jsx`                                             |
| **Logo no Hero**      | Badge do Etapa1Hero usa `<TopBarLogo>` sem pill/container                                        | `Etapa1Hero.jsx`                                                                             |


Toda referência a `#E63333`, `#CC2222` ou `#B22222` nesta spec deve ser lida como `#E8356D`, `COLORS.redGradientStart` e `COLORS.redGradientEndDark`, respectivamente. Toda referência a texto "ACELERAÍ" ou "PRIMEIRO PASSO" nas topbars deve ser lida como o componente `<TopBarLogo />`.

---

## 1. Instalar dependências

```bash
npm install lucide-react lottie-react clsx
npm install -D tailwindcss @tailwindcss/vite
```

---

## 2. Configurar Tailwind CSS v4

### 2.1. Registrar o plugin no Vite

**Arquivo**: `vite.config.js`

```js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
})
```

### 2.2. Importar Tailwind no CSS global

**Arquivo**: `src/theme/global.css`

Adicionar no topo do arquivo, antes de qualquer outra regra:

```css
@import "tailwindcss";
```

### 2.3. Configurar o tema customizado via CSS

**Arquivo**: `src/theme/global.css`

Adicionar logo após o `@import "tailwindcss"`, dentro de um bloco `@theme`:

```css
@theme {
  --color-bg: #0A0A0A;
  --color-card: #141414;
  --color-accent: #C8FF00;
  --color-magenta: #FF00FF;
  --color-red: #E8356D;
  --color-red-gradient-start: #C42A56;
  --color-red-gradient-end-dark: #9E2645;
  --color-text: #F5F5F5;
  --color-text-muted: #AAAAAA;
  --color-text-dim: #666666;
  --color-border: #222222;
  --color-input-bg: #111111;
  --color-success: #00E676;
  --color-warning: #FFD600;
  --color-danger: #FF4444;
  --color-whatsapp: #25D366;

  --font-primary: 'Inter', system-ui, sans-serif;
  --font-mono: 'JetBrains Mono', monospace;
}
```

> **Nota**: O Tailwind v4 não usa `tailwind.config.js`. Toda configuração é via CSS com `@theme`.

### 2.4. Migração gradual

- **NÃO** remover os inline styles de uma vez. Migrar componente por componente.
- Prioridade de migração: `PageLayout` → `TopBar` → `StepHeader` → `NavButtons` → `CompletionScreen` → páginas de etapa.
- Manter o arquivo `src/theme/colors.js` (re-export de `design-tokens.js`) funcionando em paralelo durante a migração. Remover somente quando todos os componentes estiverem usando classes Tailwind.
- **Preservar `TopBarLogo.jsx`**: a TopBar já renderiza o logo da marca via este componente. Não reverter para texto.

---

## 3. Criar Design System de tipografia e espaçamento

### 3.1. Consolidar tokens no arquivo existente `src/theme/design-tokens.js`

O projeto já possui `src/theme/design-tokens.js` com `colorHex`, `designTokens` (radius, space, fontSize, fontWeight, lineHeight, letterSpacing, motion, gradient, elevation). **Não criar um segundo arquivo de tokens.** Em vez disso, adicionar os aliases de tipografia semântica (`TYPE`) como export nomeado no arquivo existente:

```js
// Adicionar ao final de src/theme/design-tokens.js:

export const TYPE = {
  hero: {
    fontSize: designTokens.fontSize.display + 14, // 48
    fontWeight: designTokens.fontWeight.black,
    letterSpacing: '-0.04em',
    lineHeight: 1.1,
  },
  h1: {
    fontSize: 28,
    fontWeight: designTokens.fontWeight.black,
    letterSpacing: '-0.03em',
    lineHeight: 1.2,
  },
  h2: {
    fontSize: 20,
    fontWeight: designTokens.fontWeight.extrabold,
    letterSpacing: '-0.02em',
    lineHeight: 1.3,
  },
  h3: {
    fontSize: designTokens.fontSize.titleMd,
    fontWeight: designTokens.fontWeight.extrabold,
    lineHeight: 1.3,
  },
  body: {
    fontSize: designTokens.fontSize.bodyLg,
    fontWeight: 400,
    lineHeight: designTokens.lineHeight.loose,
  },
  bodySmall: {
    fontSize: designTokens.fontSize.body,
    fontWeight: 400,
    lineHeight: designTokens.lineHeight.relaxed,
  },
  caption: {
    fontSize: designTokens.fontSize.caption,
    fontWeight: designTokens.fontWeight.semibold,
    letterSpacing: designTokens.letterSpacing.wide,
    fontFamily: designTokens.fontFamily.mono,
  },
  label: {
    fontSize: designTokens.fontSize.label,
    fontWeight: designTokens.fontWeight.bold,
    letterSpacing: designTokens.letterSpacing.label,
    fontFamily: designTokens.fontFamily.mono,
  },
}
```

### 3.2. Usar tokens nos componentes

Em vez de repetir `fontSize: 13, lineHeight: 1.6` manualmente, usar:

```jsx
import { TYPE } from '../theme/design-tokens'
import { COLORS } from '../theme/colors'

<p style={{ ...TYPE.bodySmall, color: COLORS.textMuted, marginBottom: 16 }}>
```

> **Nota**: para espaçamento, usar `designTokens.space` do mesmo arquivo, ou os valores numéricos diretamente. Não criar um arquivo `tokens.js` separado.

---

## 4. Substituir TODOS os emojis por ícones Lucide

### 4.1. Criar componente wrapper `src/components/Icon.jsx`

```jsx
import { COLORS } from '../theme/colors'

/**
 * Wrapper para ícones Lucide com estilo padrão do design system.
 * 
 * Props:
 * - icon: Componente Lucide (ex: Clapperboard)
 * - size: número (default 20)
 * - color: cor do ícone (default COLORS.textMuted)
 * - bg: cor de fundo do container (opcional — se fornecido, renderiza com container)
 * - containerSize: tamanho do container (default size * 2)
 * - radius: border-radius do container (default 10)
 * - className: classes extras
 */
export default function Icon({
  icon: LucideIcon,
  size = 20,
  color = COLORS.textMuted,
  bg,
  containerSize,
  radius = 10,
  strokeWidth = 2,
  className = '',
}) {
  if (!bg) {
    return <LucideIcon size={size} color={color} strokeWidth={strokeWidth} className={className} />
  }

  const cSize = containerSize || size * 2
  return (
    <div
      style={{
        width: cSize,
        height: cSize,
        borderRadius: radius,
        background: bg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
      className={className}
    >
      <LucideIcon size={size} color={color} strokeWidth={strokeWidth} />
    </div>
  )
}
```

### 4.2. Mapeamento de emojis para ícones Lucide

Substituir **todos** os emojis no projeto seguindo este mapeamento. Onde um emoji aparece como `<span style={{ fontSize: N }}>EMOJI</span>`, trocar por `<Icon icon={LucideComponent} ... />`.


| Emoji atual         | Contexto no projeto         | Ícone Lucide    | Import                                         |
| ------------------- | --------------------------- | --------------- | ---------------------------------------------- |
| 🎬                  | Produção / Aceleraí         | `Clapperboard`  | `import { Clapperboard } from 'lucide-react'`  |
| 🎯                  | Você / Cliente              | `Target`        | `import { Target } from 'lucide-react'`        |
| ⭐                   | Celebridade / Destaque      | `Star`          | `import { Star } from 'lucide-react'`          |
| 📱                  | Canais digitais / Mobile    | `Smartphone`    | `import { Smartphone } from 'lucide-react'`    |
| 🚀                  | Acelerar resultados         | `TrendingUp`    | `import { TrendingUp } from 'lucide-react'`    |
| 📍                  | Praça / Localização         | `MapPin`        | `import { MapPin } from 'lucide-react'`        |
| 🏷                  | Segmento                    | `Tag`           | `import { Tag } from 'lucide-react'`           |
| ✏️                  | Ajustes / Edição            | `PenLine`       | `import { PenLine } from 'lucide-react'`       |
| ⏱                   | Prazo / Tempo               | `Clock`         | `import { Clock } from 'lucide-react'`         |
| 📅                  | Vigência / Calendário       | `CalendarDays`  | `import { CalendarDays } from 'lucide-react'`  |
| 📩                  | Contato / Mensagem          | `Mail`          | `import { Mail } from 'lucide-react'`          |
| ⚡                   | Responda rápido             | `Zap`           | `import { Zap } from 'lucide-react'`           |
| 💬                  | WhatsApp / Chat             | `MessageCircle` | `import { MessageCircle } from 'lucide-react'` |
| 🖥                  | Plataforma                  | `Monitor`       | `import { Monitor } from 'lucide-react'`       |
| 🔒                  | Exclusividade               | `Lock`          | `import { Lock } from 'lucide-react'`          |
| 👁                  | Revisão                     | `Eye`           | `import { Eye } from 'lucide-react'`           |
| ✅                   | Aprovado / Entrega          | `CircleCheck`   | `import { CircleCheck } from 'lucide-react'`   |
| 🚫                  | Proibido                    | `Ban`           | `import { Ban } from 'lucide-react'`           |
| ⚠️                  | Alerta / Warning            | `AlertTriangle` | `import { AlertTriangle } from 'lucide-react'` |
| 💎                  | Regra de ouro               | `Gem`           | `import { Gem } from 'lucide-react'`           |
| 🏢                  | Franquias                   | `Building2`     | `import { Building2 } from 'lucide-react'`     |
| 📺                  | TV / Mídia                  | `Tv`            | `import { Tv } from 'lucide-react'`            |
| 🔄                  | Renovação                   | `RefreshCw`     | `import { RefreshCw } from 'lucide-react'`     |
| 🔀                  | Troca                       | `Shuffle`       | `import { Shuffle } from 'lucide-react'`       |
| ⚖️                  | Multa / Jurídico            | `Scale`         | `import { Scale } from 'lucide-react'`         |
| 🎨                  | Identidade visual           | `Palette`       | `import { Palette } from 'lucide-react'`       |
| 🔤                  | Fontes                      | `Type`          | `import { Type } from 'lucide-react'`          |
| 📸                  | Referências visuais         | `Camera`        | `import { Camera } from 'lucide-react'`        |
| 🤝                  | Produção híbrida            | `Handshake`     | `import { Handshake } from 'lucide-react'`     |
| 👋                  | Atendente                   | `Hand`          | `import { Hand } from 'lucide-react'`          |
| 🎉                  | Parabéns / Conclusão        | `PartyPopper`   | `import { PartyPopper } from 'lucide-react'`   |
| ✓ (texto)           | Checkmark em botões/badges  | `Check`         | `import { Check } from 'lucide-react'`         |
| ✦ (texto)           | Bullet decorativo em listas | `ChevronRight`  | `import { ChevronRight } from 'lucide-react'`  |
| → (texto em botões) | Seta de navegação           | `ArrowRight`    | `import { ArrowRight } from 'lucide-react'`    |
| ← (texto em botões) | Seta de voltar              | `ArrowLeft`     | `import { ArrowLeft } from 'lucide-react'`     |


### 4.3. Regras para o ícone dentro de container

Quando o emoji original estava dentro de um `div` com background colorido (aqueles quadrados de 36px, 40px, 48px), usar o componente `<Icon>` com a prop `bg`:

```jsx
// ANTES (genérico, cara de IA):
<div style={{ width: 48, height: 48, borderRadius: 12, background: `${COLORS.red}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
  <span style={{ fontSize: 22 }}>🎬</span>
</div>

// DEPOIS (profissional):
<Icon icon={Clapperboard} size={22} color={COLORS.red} bg={`${COLORS.red}15`} containerSize={48} radius={12} />
```

### 4.4. Regras para checkmarks em QuizConfirmation e similares

No `QuizConfirmation.jsx`, o `✓` dentro dos checkboxes animados deve ser substituído por:

```jsx
import { Check } from 'lucide-react'

// Dentro do AnimatePresence onde aparece o ✓:
<Check size={14} color={COLORS.bg} strokeWidth={3} />
```

### 4.5. Regras para setas em botões (NavButtons)

No `NavButtons.jsx`, substituir as setas textuais nos labels por ícones inline:

```jsx
import { ArrowRight, ArrowLeft } from 'lucide-react'

// Nos botões, usar ícones ao lado do texto:
<button>
  <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
    <ArrowLeft size={16} /> Anterior
  </span>
</button>

<button>
  <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
    Próximo <ArrowRight size={16} />
  </span>
</button>
```

> **Importante**: remover os caracteres `→` e `←` de TODOS os `nextLabel` e `prevLabel` passados como props nos componentes de página (Etapa2, Etapa3, etc). As setas agora são ícones dentro do NavButtons.

---

## 5. Adicionar animações Lottie nos momentos-chave

### 5.1. Animação de sucesso no CompletionScreen

**Arquivo**: `src/components/CompletionScreen.jsx`

Substituir o círculo com emoji de checkmark por uma animação Lottie de sucesso.

```jsx
import Lottie from 'lottie-react'
import successAnimation from '../assets/lottie/success.json'

// No lugar do div com o ícone de checkmark:
<Lottie
  animationData={successAnimation}
  loop={false}
  style={{ width: 96, height: 96, margin: '0 auto 24px' }}
/>
```

### 5.2. Animação de celebração na EtapaFinal

**Arquivo**: `src/pages/EtapaFinal.jsx`

Na tela de "Parabéns!", substituir o emoji 🎉 por uma animação Lottie de confetti/celebration.

```jsx
import Lottie from 'lottie-react'
import celebrationAnimation from '../assets/lottie/celebration.json'

<Lottie
  animationData={celebrationAnimation}
  loop={false}
  style={{ width: 120, height: 120, margin: '0 auto 28px' }}
/>
```

### 5.3. Obter os arquivos JSON de animação

Criar o diretório `src/assets/lottie/` e baixar animações de [https://lottiefiles.com](https://lottiefiles.com):

- **success.json**: Buscar por "success checkmark" — escolher uma animação limpa, verde, sem fundo.
- **celebration.json**: Buscar por "confetti" ou "celebration" — escolher algo colorido mas sutil.

> **Alternativa**: Se não quiser baixar manualmente, usar o pacote `lottie-react` com URLs remotas via `fetch` e carregar no `useEffect`. Mas o JSON local é preferível por performance.

---

## 6. Melhorar animações do Framer Motion

### 6.1. Usar `layoutId` para transição dos progress dots

**Arquivo**: `src/components/TopBar.jsx`

> A TopBar já exibe o logo da marca via `<TopBarLogo />`. Esta melhoria é apenas nos dots de progresso.

Os dots de progresso na TopBar devem usar `layoutId` para animar suavemente a transição entre etapas:

```jsx
import { motion } from 'framer-motion'

// Dentro do map dos dots:
<motion.div
  key={i}
  layoutId={`progress-dot-${i}`}
  style={{
    width: isActive ? 16 : 6,
    height: 3,
    borderRadius: 2,
    background: isCompleted ? COLORS.success : isCurrent ? COLORS.red : COLORS.border,
  }}
  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
/>
```

### 6.2. Adicionar micro-interações nos cards clicáveis

Nos botões de seleção (radio buttons das Etapas 5, 6, 7), adicionar `whileHover` e `whileTap` mais expressivos:

```jsx
<motion.button
  whileHover={{ scale: 1.01, y: -2 }}
  whileTap={{ scale: 0.98 }}
  transition={{ type: 'spring', stiffness: 400, damping: 25 }}
  // ... resto das props
>
```

### 6.3. Stagger mais pronunciado nas listas

Nas listas de itens (value props do Hero, steps da Etapa 2, timeline da Etapa 3), usar stagger com delay maior e efeito de blur:

```jsx
const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.15 },
  },
}

const item = {
  hidden: { opacity: 0, y: 12, filter: 'blur(4px)' },
  show: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] },
  },
}
```

### 6.4. Parallax sutil no Hero (Etapa 1)

**Arquivo**: `src/pages/Etapa1Hero.jsx`

Adicionar parallax no glow circle do background usando `useScroll` e `useTransform`.

> O glow já usa `COLORS.red` (`#E8356D`). Manter essa cor; não usar `#E63333`.

```jsx
import { motion, useScroll, useTransform } from 'framer-motion'

// Dentro do componente:
const { scrollY } = useScroll()
const glowY = useTransform(scrollY, [0, 300], [0, -80])
const glowScale = useTransform(scrollY, [0, 300], [1, 1.2])
const glowOpacity = useTransform(scrollY, [0, 300], [1, 0.3])

// No div do glow accent circle:
<motion.div
  style={{
    position: 'absolute',
    top: '-200px',
    left: '50%',
    transform: 'translateX(-50%)',
    width: '600px',
    height: '600px',
    borderRadius: '50%',
    background: `radial-gradient(circle, ${COLORS.red}22 0%, transparent 70%)`,
    pointerEvents: 'none',
    y: glowY,
    scale: glowScale,
    opacity: glowOpacity,
  }}
/>
```

---

## 7. Adicionar profundidade visual

### 7.1. Texturas sutis nos backgrounds

Substituir o grid overlay genérico do Hero por um noise texture SVG mais sutil:

**Arquivo**: `src/pages/Etapa1Hero.jsx`

```jsx
// Substituir o grid overlay por:
<div
  style={{
    position: 'absolute',
    inset: 0,
    opacity: 0.03,
    backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
    pointerEvents: 'none',
  }}
/>
```

### 7.2. Sombras mais sofisticadas nos cards

Adicionar uma camada de sombra sutil nos cards principais (não em todos, apenas nos que merecem destaque):

```jsx
// Para cards de destaque (contract card, package card, etc):
boxShadow: `0 1px 2px rgba(0,0,0,0.3), 0 4px 16px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.03)`,

// O `inset` no topo simula uma borda de luz que dá profundidade 3D sutil
```

### 7.3. Glassmorphism mais sutil na TopBar

**Arquivo**: `src/components/TopBar.jsx`

Melhorar o efeito de blur na TopBar com borda inferior mais sutil:

```jsx
background: 'rgba(10, 10, 10, 0.85)',
backdropFilter: 'blur(16px) saturate(180%)',
WebkitBackdropFilter: 'blur(16px) saturate(180%)',
borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
```

---

## 8. Reorganização de componentes

### 8.1. Extrair componentes repetidos

Existem padrões visuais que se repetem em várias etapas e devem virar componentes.

> **Nota**: o componente `TopBarLogo.jsx` já existe e é reutilizado pela `TopBar`, `EtapaFinal` e `TudoPronto`. Não criar outro componente de logo.

`**src/components/InfoCard.jsx`** — Card com ícone, título e descrição (usado em Etapa2 slides, Etapa3 "O que acontece agora", Etapa6 itens):

```jsx
import Icon from './Icon'
import { COLORS } from '../theme/colors'
import { TYPE } from '../theme/design-tokens'

export default function InfoCard({ icon, iconColor, title, children, borderColor, bgTint }) {
  return (
    <div
      style={{
        background: bgTint || COLORS.card,
        border: `1px solid ${borderColor || COLORS.border}`,
        borderRadius: 14,
        padding: 20,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
        <Icon icon={icon} size={20} color={iconColor} bg={`${iconColor}15`} containerSize={40} radius={12} />
        <p style={{ ...TYPE.h3, color: COLORS.text, margin: 0 }}>{title}</p>
      </div>
      {children}
    </div>
  )
}
```

`**src/components/AlertBox.jsx**` — Box de alerta/warning (usado em várias etapas):

```jsx
import Icon from './Icon'
import { AlertTriangle } from 'lucide-react'
import { COLORS } from '../theme/colors'

export default function AlertBox({ icon = AlertTriangle, color = COLORS.warning, children }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 10,
        background: `${color}10`,
        border: `1px solid ${color}25`,
        borderRadius: 12,
        padding: 16,
      }}
    >
      <Icon icon={icon} size={16} color={color} strokeWidth={2.5} />
      <p style={{ color, fontSize: 13, fontWeight: 600, margin: 0, lineHeight: 1.5 }}>
        {children}
      </p>
    </div>
  )
}
```

`**src/components/BulletList.jsx**` — Lista com bullets customizados (substitui os `●` e `✦` repetidos):

```jsx
import { ChevronRight } from 'lucide-react'

export default function BulletList({ items, color, iconSize = 14 }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {items.map((item, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          <ChevronRight size={iconSize} color={color} strokeWidth={2.5} style={{ flexShrink: 0, marginTop: 2 }} />
          <span style={{ color: '#AAAAAA', fontSize: 13, lineHeight: 1.5 }}>{item}</span>
        </div>
      ))}
    </div>
  )
}
```

---

## 9. Checklist de execução

Use esta checklist para validar que todas as mudanças foram aplicadas:

### Branding (já concluído — apenas validar que permanece intacto)

- Cor vermelha da marca é `#E8356D` em `design-tokens.js` e `global.css` (não `#E63333`)
- Gradientes CTA usam `COLORS.redGradientStart` / `COLORS.redGradientEndDark` (não `#CC2222` / `#B22222`)
- TopBar, EtapaFinal e TudoPronto renderizam `<TopBarLogo />` (logo PNG, não texto)
- Badge do Hero (Etapa1) renderiza logo sem container pill

### Refatoração visual (a executar)

- Tailwind CSS v4 configurado e funcionando (`@import "tailwindcss"` no global.css, plugin no vite.config.js)
- `TYPE` adicionado como export nomeado em `src/theme/design-tokens.js` (não criar arquivo `tokens.js` separado)
- Componente `src/components/Icon.jsx` criado
- Componente `src/components/InfoCard.jsx` criado
- Componente `src/components/AlertBox.jsx` criado
- Componente `src/components/BulletList.jsx` criado
- Diretório `src/assets/lottie/` criado com `success.json` e `celebration.json`
- **ZERO emojis** restantes no código (buscar por padrões de emoji unicode em todos os `.jsx`)
- `lucide-react` usado em todos os locais onde havia emojis
- `CompletionScreen` usando animação Lottie de sucesso
- `EtapaFinal` tela de parabéns usando animação Lottie de celebration
- TopBar com `layoutId` nos progress dots
- Hero (Etapa1) com parallax no glow usando `useScroll`/`useTransform`
- Noise texture no background do Hero substituindo o grid overlay
- Setas textuais (`→`, `←`) removidas de todos os `nextLabel`/`prevLabel` e substituídas por ícones Lucide dentro do NavButtons
- Tokens de tipografia (`TYPE`) sendo usados nos componentes migrados
- Nenhum texto ou lógica de negócio foi alterado
- Branding (itens marcados acima) permanece intacto após toda a refatoração

---

## 10. Notas importantes para o agente

1. **Não alterar copy/textos**: Esta spec é exclusivamente visual. Os textos do onboarding foram escritos manualmente e não devem ser modificados.
2. **Branding prevalece**: Cor `#E8356D`, gradientes `#C42A56`/`#9E2645`, logo PNG na TopBar e no Hero já foram implementados. Se qualquer etapa desta spec conflitar com o branding, o branding vence. Nunca reverter para `#E63333`, `#CC2222`, `#B22222`, texto "ACELERAÍ" ou "PRIMEIRO PASSO".
3. **Design tokens existentes**: O arquivo `src/theme/design-tokens.js` já contém `colorHex`, `designTokens` com radius, space, fontSize, fontWeight, lineHeight, letterSpacing, gradient, elevation. **Não criar** `src/theme/tokens.js`. Adicionar `TYPE` como export nomeado no arquivo existente.
4. **TopBarLogo.jsx existe**: Componente já criado em `src/components/TopBarLogo.jsx` para renderizar o logo da marca. Reutilizá-lo onde necessário; não criar outro.
5. **Migração incremental**: Não tentar migrar tudo para Tailwind de uma vez. Focar primeiro nas mudanças de ícones e componentes novos, depois migrar estilos inline para classes Tailwind componente por componente.
6. **Testar no mobile**: O projeto é mobile-first. Testar todas as mudanças em viewport de 375px.
7. **Framer Motion já está instalado**: Não instalar novamente. Apenas expandir o uso das features já disponíveis (layoutId, useScroll, useTransform).
8. **Prioridade de impacto visual** (fazer nesta ordem):
  - Trocar emojis por Lucide icons (maior impacto imediato)
  - Adicionar animações Lottie nas completion screens
  - Melhorar animações do framer-motion
  - Extrair componentes reutilizáveis
  - Migrar para Tailwind
9. **Lottie files**: Se não conseguir baixar os JSONs do LottieFiles, criar animações placeholder com CSS puro (ex: um círculo que escala com checkmark animado via keyframes). O importante é eliminar o emoji.

