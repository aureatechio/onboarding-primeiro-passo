# Design Spec Oficial — Primeiro Passo

Este é o documento canônico de design do projeto. Qualquer nova tela, refatoração visual ou ajuste de UI deve seguir este spec antes de consultar specs antigas.

## Status

- **Fonte visual oficial:** dashboard operacional, especialmente a sidebar do `AiStep2Monitor`.
- **Fonte de tokens atual:** `src/pages/AiStep2Monitor/theme.js` para tema do dashboard e `src/theme/design-tokens.js` para escala compartilhada.
- **Specs antigas:** `refactor-spec.md` e `ux-mobile-spec.md` ficam como histórico técnico. Em caso de conflito, este documento prevalece.
- **Cor primária antiga:** `#384ffe` não é mais a cor oficial da interface. Pode aparecer em diagramas, exemplos antigos ou dados de cliente, mas não deve orientar UI nova.

## Direção Visual

A interface deve parecer um cockpit operacional da Acelerai: escura, precisa, densa o suficiente para trabalho recorrente e com contraste alto. A referência principal é a sidebar atual do dashboard: fundo preto, logo branco/magenta, texto claro, ícones lineares cinza-azulados e estado ativo com borda/acento magenta.

Princípios:

- Dark-first: telas internas e futuras superfícies devem partir do tema escuro do dashboard.
- Operacional, não marketing: evitar hero sections, cards decorativos grandes e composição publicitária em áreas de trabalho.
- Densidade controlada: usar espaçamento consistente, leitura rápida e hierarquia clara.
- Acento com parcimônia: magenta/vermelho Acelerai marca ação, foco, seleção e estados importantes.
- Sem paleta antiga azul como base: o dashboard é a referência de marca do produto.

## Tokens Canônicos

### Marca

| Token | Valor | Uso |
| --- | --- | --- |
| `brand` | `#E8356D` | Acento principal, links selecionados, foco, estados ativos |
| `brandGradientStart` | `#E8356D` | Início de gradientes de CTA |
| `brandGradientEnd` | `#9E2645` | Fim escuro de gradientes de CTA |
| `logoWhite` | asset `public/logo_acelerai_white_transp.png` | Marca em sidebar/topbar sobre fundo escuro |

Regra para e-mails transacionais:

- Templates em `supabase/templates/*.html` devem ser light-first: fundo externo claro, card branco, texto escuro, painéis informativos claros e CTA/link em magenta `#E8356D`.
- Não criar templates de e-mail em tema dark. A única exceção permitida é a faixa preta compacta do topo para dar contraste ao logo oficial branco/transparente.
- Em `supabase/templates/*.html`, o logo oficial deve usar a URL pública do Supabase Storage no `<img src>` apontando para `public/logo_acelerai_white_transp.png`: `https://awqtzoefutnfmnbomujt.supabase.co/storage/v1/object/public/cdn-assets/acelerai/logo_acelerai_white_transp.png`.
- Não usar caminho relativo nem `data:image/png;base64,...` para esse logo em templates de e-mail; caminhos relativos quebram no envio do Supabase, e Gmail não renderiza `data:` de forma confiável em HTML de email.
- Manter `alt="Acelerai"` e largura visual próxima de `156px`.

Origem atual:

```js
// src/pages/AiStep2Monitor/theme.js
brand: colorHex.red,
brandGradientStart: colorHex.red,
brandGradientEnd: colorHex.redGradientEndDark,
```

### Layout Escuro

| Token | Valor | Uso |
| --- | --- | --- |
| `layoutBg` | `#080C14` | Fundo externo do app/painel |
| `sidebarBg` | `#000000` | Sidebar principal |
| `pageBg` | `#0D1117` | Fundo da área de conteúdo |
| `surfaceSubtle` | `#0F1724` | Superfícies internas discretas |
| `cardMutedBg` | `#161B22` | Cards e blocos secundários |
| `cardElevatedBg` | `#1C2230` | Cards com destaque moderado |

### Texto

| Token | Valor | Uso |
| --- | --- | --- |
| `textPrimary` | `#E6EDF3` | Títulos, valores principais, texto de alta prioridade |
| `textSecondary` | `#8B949E` | Texto secundário e descrições |
| `textMuted` | `#57636D` | Metadados, labels, divisores textuais |
| `sidebarText` | `#CDD9E5` | Navegação da sidebar |
| `sidebarTextMuted` | `#57636D` | Cabeçalhos de grupos da sidebar |

### Bordas e Separadores

| Token | Valor | Uso |
| --- | --- | --- |
| `border` | `rgba(240,246,252,0.1)` | Bordas padrão |
| `borderSoft` | `rgba(240,246,252,0.05)` | Separação muito sutil |
| `borderStrong` | `rgba(240,246,252,0.18)` | Separação enfatizada |
| `sidebarBorder` | `rgba(255,255,255,0.07)` | Divisor vertical da sidebar |
| `sidebarItemBorder` | `rgba(255,255,255,0.12)` | Borda hover/controle lateral |

### Sidebar

| Token | Valor | Uso |
| --- | --- | --- |
| `sidebarBg` | `#000000` | Fundo fixo da navegação |
| `sidebarItemBg` | `rgba(255,255,255,0.04)` | Hover de item inativo |
| `sidebarItemActiveBg` | `rgba(232,53,109,0.14)` | Fundo de item ativo |
| `sidebarItemActiveBorder` | `rgba(232,53,109,0.35)` | Borda de item ativo |

Regras:

- Item ativo usa fundo magenta translúcido e borda magenta, nunca azul.
- Itens inativos mantêm fundo transparente; hover usa `sidebarItemBg`.
- Ícones usam Lucide, tamanho entre `15px` e `18px`, com opacidade menor em estado inativo.
- Grupos usam label uppercase, mono, tracking moderado e cor `sidebarTextMuted`.

### Controles

| Token | Valor | Uso |
| --- | --- | --- |
| `controlBg` | `#111827` | Inputs, selects e textareas |
| `controlBorder` | `rgba(240,246,252,0.24)` | Borda de controles |
| `controlText` | `#E6EDF3` | Texto dentro de controles |
| `buttonDarkBg` | `#E6EDF3` | Botão primário claro sobre fundo escuro |
| `buttonDarkText` | `#0D1117` | Texto do botão primário claro |
| `buttonSecondaryBg` | `#161B22` | Botão secundário |
| `buttonSecondaryText` | `#E6EDF3` | Texto de botão secundário |
| `buttonSecondaryBorder` | `rgba(240,246,252,0.24)` | Borda de botão secundário |

### Status

| Status | Fundo | Texto |
| --- | --- | --- |
| Neutro | `rgba(139,148,158,0.12)` | `#8B949E` |
| Pendente | `rgba(227,179,65,0.12)` | `#E3B341` |
| Processando | `rgba(88,166,255,0.12)` | `#58A6FF` |
| Concluído | `rgba(63,185,80,0.12)` | `#3FB950` |
| Falha | `rgba(248,81,73,0.12)` | `#F85149` |

Azul de status (`#58A6FF`) é permitido para processamento/informação. Ele não substitui o magenta como cor de marca.

### Risco e Destrutivo

| Token | Valor | Uso |
| --- | --- | --- |
| `dangerBg` | `rgba(248,81,73,0.08)` | Alertas e banners de erro |
| `dangerBorder` | `rgba(248,81,73,0.22)` | Borda de erro |
| `dangerText` | `#F85149` | Texto de erro |
| `dangerTextStrong` | `#FF7B72` | Texto de erro enfatizado |

## Escala Compartilhada

Usar `src/theme/design-tokens.js` para dimensões transversais enquanto os tokens não forem centralizados.

### Radius

| Token | Valor |
| --- | --- |
| `xs` | `2px` |
| `sm` | `7px` |
| `md` | `10px` |
| `lg` | `12px` |
| `xl` | `14px` |
| `xxl` | `16px` |
| `pill` | `100px` |

Regra: controles operacionais usam principalmente `sm` e `md`. Cards ficam entre `md` e `lg`; evitar arredondamento excessivo.

### Spacing

| Token | Valor |
| --- | --- |
| `space[3]` | `8px` |
| `space[5]` | `12px` |
| `space[7]` | `16px` |
| `space[9]` | `20px` |
| `space[10]` | `22px` |
| `space[11]` | `24px` |
| `space[12]` | `28px` |
| `space[14]` | `40px` |

Padrões:

- Sidebar: `20px` de padding externo, `6px` entre botões.
- Conteúdo principal: `24px` de padding.
- Botões de navegação: `10px 12px`.
- Gaps internos de controles: `8px` a `12px`.

## Tipografia

Fonte oficial: Inter. Fonte mono: JetBrains Mono.

Usar aliases semânticos de `TYPE` em `src/theme/design-tokens.js` quando fizer sentido:

- `TYPE.h1`: título principal de página.
- `TYPE.h2`: título de seção.
- `TYPE.h3`: título de card/bloco.
- `TYPE.body`: texto corrido.
- `TYPE.bodySmall`: descrição curta.
- `TYPE.caption`: labels, metadados e grupos de navegação.
- `TYPE.label`: labels compactas de formulário.

Regras:

- Títulos internos não devem ter escala de landing page.
- Labels de grupo da sidebar usam uppercase, JetBrains Mono, peso alto e letter spacing entre `0.06em` e `0.08em`.
- Evitar `letterSpacing` negativo em UI operacional.
- Texto deve caber em todos os breakpoints sem sobrepor controles.

## Componentes

### Sidebar

Referência direta: `src/pages/AiStep2Monitor/MonitorLayout.jsx`.

Layout:

- Grid desktop: `280px minmax(0, 1fr)`.
- Sidebar fixa visualmente à esquerda, fundo preto.
- Logo no topo via `TopBarLogo`, sem container decorativo.
- Grupos de navegação separados por labels textuais.
- Footer de sessão no final com divisor superior.

Botão de navegação:

- `borderRadius: monitorRadius.md`
- `padding: 10px 12px`
- `fontSize: 13px`
- `fontWeight: 700` ativo, `500` inativo
- `gap: 8px`
- `transition: background 0.15s, border-color 0.15s`

### Cards

Cards devem ser funcionais: conter dados, controles, lista, preview ou estado. Evitar card dentro de card.

Padrão:

- Fundo `cardMutedBg` ou `cardElevatedBg`.
- Borda `border`.
- Radius `md` ou `lg`.
- Padding entre `16px` e `24px`.
- Título curto, descrição secundária opcional.

### Botões

Usar ícone Lucide quando a ação for reconhecível. Texto entra quando a ação precisa de clareza.

Estados:

- Primário operacional: fundo claro `buttonDarkBg` com texto `buttonDarkText`, ou gradiente magenta em CTAs raros.
- Secundário: `buttonSecondaryBg`, `buttonSecondaryText`, `buttonSecondaryBorder`.
- Destrutivo: tokens `danger*`.
- Ativo/selecionado: magenta translúcido, seguindo sidebar.

### Formulários

Inputs:

- Fundo `controlBg`.
- Borda `controlBorder`.
- Texto `controlText`.
- Radius `md`.
- Foco com borda `brand` e sombra sutil `brand` com alpha.

Labels:

- `TYPE.label` ou `TYPE.caption`.
- Cor `textMuted`.
- Não usar labels grandes ou decorativas.

### Tabelas e Listas

- Preferir densidade moderada, linhas bem separadas e texto secundário para metadados.
- Hover deve ser sutil com `rgba(255,255,255,0.04)` ou token equivalente.
- Status sempre como badge semântico, não apenas cor em texto solto.

## Ícones

Biblioteca oficial: `lucide-react`.

Regras:

- Usar ícones lineares Lucide antes de qualquer SVG manual.
- Tamanho comum: `14px` a `18px` em navegação e botões compactos; `20px` a `24px` em estados vazios.
- Ícones inativos podem usar opacidade `0.6`.
- Não usar emojis como elementos de interface.

## Motion

Movimento deve reforçar feedback operacional, não decorar.

- Hover/focus: `0.15s` a `0.2s`.
- Transições de página ou painéis: `0.2s` a `0.35s`.
- Evitar animações longas em dashboard.
- Respeitar `prefers-reduced-motion` quando criar novas animações CSS.

## Responsividade

Desktop é o alvo primário do dashboard, mas toda UI deve degradar bem em telas menores.

- Sidebar desktop mantém largura visual próxima de `280px`.
- Em mobile, navegação pode virar drawer, tabbar ou layout empilhado, preservando os mesmos tokens.
- Touch targets devem ficar próximos de `44px` quando acionáveis em mobile.
- Evitar truncar informação crítica sem tooltip ou alternativa.

## Acessibilidade

- Contraste alto por padrão: usar `textPrimary` sobre `pageBg`/`sidebarBg`.
- Estados ativos não devem depender apenas de cor; usar borda, fundo ou peso tipográfico.
- Todo botão icon-only precisa de `aria-label`.
- Inputs devem ter label ou associação acessível.
- Foco teclado precisa ser visível.

## O Que Não Usar

- `#384ffe` como primário de produto.
- Temas claros novos sem necessidade operacional explícita.
- Paleta lima/magenta do onboarding legado como base de telas internas.
- Cards decorativos em excesso.
- Gradientes grandes como fundo de seção.
- Emojis em navegação, botões, labels ou status.
- Hero sections em ferramentas internas.

## Implementação

Hoje existem dois níveis de tokens:

1. `src/pages/AiStep2Monitor/theme.js`: fonte oficial para dashboard e novas superfícies operacionais.
2. `src/theme/design-tokens.js`: escala compartilhada de radius, spacing, tipografia e cores legadas ainda usadas pelo onboarding.

Ao criar ou refatorar UI:

```js
import { monitorRadius, monitorTheme } from './theme'
import { TYPE, designTokens } from '../../theme/design-tokens'
```

Para componentes fora de `AiStep2Monitor`, prefira extrair ou importar um tema compartilhado antes de duplicar cores. O objetivo de evolução é centralizar os tokens oficiais em `src/theme/` sem mudar o visual do dashboard.

## Checklist de Review Visual

- A tela usa `monitorTheme` ou tokens derivados dele?
- A seleção/foco principal usa magenta Acelerai, não azul?
- O logo aparece branco/magenta sobre fundo escuro, sem container desnecessário?
- O layout parece operacional e escaneável?
- Cards, inputs e botões usam radius e espaçamento consistentes?
- Estados ativos têm fundo/borda além da cor?
- Ícones vêm de Lucide?
- O texto cabe em desktop e mobile?
- Specs antigas não estão sendo usadas para contrariar este documento?
