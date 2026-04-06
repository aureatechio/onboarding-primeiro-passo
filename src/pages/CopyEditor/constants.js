import { COLORS } from '../../theme/colors'

// ─── Metadados das etapas ───────────────────────────────────────────────────
export const ETAPAS_META = [
  { id: 'etapa1',      label: 'Etapa 1 — Boas-vindas',           exportKey: 'ETAPA1' },
  { id: 'etapa2',      label: 'Etapa 2 — Como funciona',          exportKey: 'ETAPA2' },
  { id: 'etapa3',      label: 'Etapa 3 — Prazos e combinados',    exportKey: 'ETAPA3' },
  { id: 'etapa4',      label: 'Etapa 4 — Regras da celebridade',  exportKey: 'ETAPA4' },
  { id: 'etapa5',      label: 'Etapa 5 — Presença digital',       exportKey: 'ETAPA5' },
  { id: 'etapa6',      label: 'Etapa 6 — Identidade visual',      exportKey: 'ETAPA6' },
  { id: 'etapa62',     label: 'Etapa 6.2 — Bonificação',          exportKey: 'ETAPA62' },
  { id: 'etapa7',      label: 'Etapa 7 — Modo avançado',          exportKey: 'ETAPA7' },
  { id: 'etapaFinal',  label: 'Etapa Final — Parabéns',           exportKey: 'ETAPA_FINAL' },
]

// ─── Tipos de campo ─────────────────────────────────────────────────────────
export const FIELD_TYPES = {
  STRING:        'STRING',
  TEXTAREA:      'TEXTAREA',
  TEMPLATE:      'TEMPLATE',
  STRING_ARRAY:  'STRING_ARRAY',
  OBJECT_ARRAY:  'OBJECT_ARRAY',
  NESTED_OBJECT: 'NESTED_OBJECT',
}

// ─── Variáveis de interpolação disponíveis ──────────────────────────────────
export const TEMPLATE_VARIABLES = {
  clientName:  { label: 'clientName',  example: 'João Silva' },
  celebName:   { label: 'celebName',   example: 'Neymar' },
  atendente:   { label: 'atendente',   example: 'Ana' },
  praca:       { label: 'praca',       example: 'São Paulo' },
  segmento:    { label: 'segmento',    example: 'Alimentação' },
  totalSteps:  { label: 'totalSteps',  example: '8' },
  count:       { label: 'count',       example: '3' },
  remaining:   { label: 'remaining',   example: '2' },
}

// ─── Valores de exemplo para preview ────────────────────────────────────────
export const PREVIEW_EXAMPLE_VALUES = {
  clientName:  'João Silva',
  celebName:   'Neymar',
  atendente:   'Ana',
  praca:       'São Paulo',
  segmento:    'Alimentação',
  totalSteps:  8,
  count:       3,
  remaining:   2,
}

// ─── Textos de UI do próprio editor (sem hardcode nos componentes) ───────────
export const UI = {
  appTitle:           'Copy Editor',
  exportButton:       'Exportar JSON',
  resetButton:        'Resetar etapa',
  dirtyBadge:         'editado',
  sidebarTitle:       'Etapas',
  previewTitle:       'Preview de variáveis',
  previewSubtitle:    'Como os templates renderizam com valores de exemplo',
  addItem:            '+ Adicionar item',
  removeItem:         '×',
  moveUp:             '▲',
  moveDown:           '▼',
  collapse:           '▼',
  expand:             '▶',
  fieldDirtyDot:      '●',
  exportFileName:     'copy-editor-export.json',
  noFieldsMessage:    'Nenhum campo editável nesta etapa.',
  templateVarsLabel:  'Variáveis disponíveis:',
  objectArrayItem:    'Item',
}

// ─── Tokens visuais do editor (sem duplicar design-tokens) ──────────────────
export const EDITOR_THEME = {
  sidebarWidth:       280,
  inputBorderRadius:  8,
  cardBorderRadius:   10,
  activeBorderWidth:  2,
  dirtyBorderColor:   COLORS.red,
  activeBorderColor:  COLORS.red,
  focusShadow:        `0 0 0 2px ${COLORS.red}33`,
  badgeBg:            COLORS.red,
  badgeColor:         '#fff',
}
