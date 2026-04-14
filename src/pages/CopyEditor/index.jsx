import { useState } from 'react'
import { ETAPAS_META } from './constants'
import { useCopyEditor } from './useCopyEditor'
import PreviewEditorLayout from './PreviewEditorLayout'
import MonitorLayout from '../AiStep2Monitor/MonitorLayout'
import PublishDialog from './PublishDialog'
import { getPreviewComponent } from './previews/previewRegistry'

export default function CopyEditor() {
  const [activeEtapaId, setActiveEtapaId] = useState(ETAPAS_META[0].id)
  const [publishDialogOpen, setPublishDialogOpen] = useState(false)

  const {
    sections,
    originalSections,
    dirtyEtapas,
    isDirty,
    updateField,
    resetSection,
    exportAsJSON,
    publishToSupabase,
    publishStatus,
    publishError,
  } = useCopyEditor()

  const PreviewComponent = getPreviewComponent(activeEtapaId)

  const handlePublish = async (password, notes) => {
    const result = await publishToSupabase(password, notes)
    if (result.success) {
      setTimeout(() => setPublishDialogOpen(false), 1500)
    }
  }

  return (
    <MonitorLayout>
      <PreviewEditorLayout
        activeEtapaId={activeEtapaId}
        onSelectEtapa={setActiveEtapaId}
        sections={sections}
        originalSections={originalSections}
        dirtyEtapas={dirtyEtapas}
        isDirty={isDirty}
        onUpdateField={updateField}
        onResetSection={resetSection}
        onExportJSON={exportAsJSON}
        PreviewComponent={PreviewComponent}
        onPublish={() => setPublishDialogOpen(true)}
        publishStatus={publishStatus}
      />

      <PublishDialog
        isOpen={publishDialogOpen}
        onClose={() => setPublishDialogOpen(false)}
        onPublish={handlePublish}
        dirtyEtapas={dirtyEtapas}
        publishStatus={publishStatus}
        publishError={publishError}
      />
    </MonitorLayout>
  )
}
