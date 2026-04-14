import Etapa1Preview from './Etapa1Preview'
import Etapa2Preview from './Etapa2Preview'
import Etapa3Preview from './Etapa3Preview'
import Etapa4Preview from './Etapa4Preview'
import Etapa5Preview from './Etapa5Preview'
import Etapa6Preview from './Etapa6Preview'
import Etapa62Preview from './Etapa62Preview'
import EtapaFinalPreview from './EtapaFinalPreview'

/**
 * Registry: mapeia etapaId -> componente de preview.
 */
const PREVIEW_REGISTRY = {
  etapa1: Etapa1Preview,
  etapa2: Etapa2Preview,
  etapa3: Etapa3Preview,
  etapa4: Etapa4Preview,
  etapa5: Etapa5Preview,
  etapa6: Etapa6Preview,
  etapa62: Etapa62Preview,
  etapaFinal: EtapaFinalPreview,
}

export function getPreviewComponent(etapaId) {
  return PREVIEW_REGISTRY[etapaId] || null
}

export function registerPreview(etapaId, component) {
  PREVIEW_REGISTRY[etapaId] = component
}
