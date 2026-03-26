export const STATUS_META = {
  pending: { label: 'Pendente' },
  processing: { label: 'Processando' },
  completed: { label: 'Concluido' },
  partial: { label: 'Parcial' },
  failed: { label: 'Falhou' },
}

export const STATUS_OPTIONS = [
  { value: '', label: 'Todos status' },
  { value: 'pending', label: STATUS_META.pending.label },
  { value: 'processing', label: STATUS_META.processing.label },
  { value: 'completed', label: STATUS_META.completed.label },
  { value: 'partial', label: STATUS_META.partial.label },
  { value: 'failed', label: STATUS_META.failed.label },
]

export const DETAIL_TABS = [
  { id: 'gallery', label: 'Galeria' },
  { id: 'onboarding-data', label: 'Dados do Onboarding' },
  { id: 'errors', label: 'Erros e Diagnostico' },
]

export const BENTO_SPAN = {
  '1:1': { gridColumn: 'span 1', gridRow: 'span 1' },
  '4:5': { gridColumn: 'span 1', gridRow: 'span 2' },
  '16:9': { gridColumn: 'span 2', gridRow: 'span 1' },
  '9:16': { gridColumn: 'span 1', gridRow: 'span 2' },
}

export const ASSET_GROUPS = [
  { key: 'moderna', label: 'Moderna' },
  { key: 'clean', label: 'Clean' },
  { key: 'retail', label: 'Retail' },
]

export const ASPECT_RATIOS = {
  '1:1': '1 / 1',
  '4:5': '4 / 5',
  '16:9': '16 / 9',
  '9:16': '9 / 16',
}
