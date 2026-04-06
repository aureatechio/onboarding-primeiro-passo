import { useState } from 'react'
import { ETAPAS_META } from './constants'
import { useCopyEditor } from './useCopyEditor'
import CopyEditorLayout from './CopyEditorLayout'
import MonitorLayout from '../AiStep2Monitor/MonitorLayout'

export default function CopyEditor() {
  const [activeEtapaId, setActiveEtapaId] = useState(ETAPAS_META[0].id)

  const {
    sections,
    originalSections,
    dirtyEtapas,
    isDirty,
    updateField,
    resetSection,
    exportAsJSON,
  } = useCopyEditor()

  return (
    <MonitorLayout>
      <CopyEditorLayout
        activeEtapaId={activeEtapaId}
        onSelectEtapa={setActiveEtapaId}
        sections={sections}
        originalSections={originalSections}
        dirtyEtapas={dirtyEtapas}
        isDirty={isDirty}
        onUpdateField={updateField}
        onResetSection={resetSection}
        onExportJSON={exportAsJSON}
      />
    </MonitorLayout>
  )
}
