import { ChevronLeft, ChevronRight, Download, Minus, Plus, X } from 'lucide-react'
import { TYPE } from '../../../theme/design-tokens'
import { downloadImage } from '../utils'
import { monitorRadius, monitorTheme } from '../theme'

export default function ImageViewer({
  assets,
  viewerIndex,
  zoom,
  onZoomIn,
  onZoomOut,
  onClose,
  onPrevious,
  onNext,
}) {
  const currentAsset = viewerIndex >= 0 ? assets[viewerIndex] : null
  if (!currentAsset) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed',
        inset: 0,
        background: monitorTheme.overlayBg,
        zIndex: 50,
        display: 'grid',
        gridTemplateRows: 'auto 1fr',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: 16,
          color: monitorTheme.sidebarText,
        }}
      >
        <div>
          <p style={{ ...TYPE.caption, color: monitorTheme.sidebarTextMuted }}>
            {(currentAsset.group_name || '-').toUpperCase()} · {currentAsset.format || '-'}
          </p>
          <p style={{ ...TYPE.bodySmall, color: monitorTheme.sidebarText }}>
            {viewerIndex + 1} de {assets.length}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button type="button" onClick={onZoomOut} style={controlButtonStyles}>
            <Minus size={16} />
          </button>
          <button type="button" onClick={onZoomIn} style={controlButtonStyles}>
            <Plus size={16} />
          </button>
          <button
            type="button"
            onClick={() =>
              downloadImage(
                currentAsset.image_url,
                `${currentAsset.group_name || 'asset'}-${currentAsset.format || 'image'}.png`
              )
            }
            style={controlButtonStyles}
          >
            <Download size={16} />
          </button>
          <button type="button" onClick={onClose} style={controlButtonStyles}>
            <X size={16} />
          </button>
        </div>
      </div>

      <div
        style={{
          position: 'relative',
          display: 'grid',
          placeItems: 'center',
          overflow: 'auto',
          padding: 20,
        }}
      >
        <img
          src={currentAsset.image_url}
          alt={`${currentAsset.group_name} ${currentAsset.format}`}
          style={{
            maxWidth: '90%',
            maxHeight: '85vh',
            objectFit: 'contain',
            transform: `scale(${zoom})`,
            transition: 'transform 0.2s ease',
          }}
        />

        <button type="button" onClick={onPrevious} style={{ ...navButtonStyles, left: 14 }}>
          <ChevronLeft size={18} />
        </button>

        <button type="button" onClick={onNext} style={{ ...navButtonStyles, right: 14 }}>
          <ChevronRight size={18} />
        </button>
      </div>
    </div>
  )
}

const controlButtonStyles = {
  border: `1px solid ${monitorTheme.overlayControlBorder}`,
  background: 'transparent',
  color: monitorTheme.sidebarText,
  borderRadius: monitorRadius.sm,
  padding: 8,
  cursor: 'pointer',
}

const navButtonStyles = {
  position: 'absolute',
  top: '50%',
  transform: 'translateY(-50%)',
  border: `1px solid ${monitorTheme.overlayControlBorder}`,
  background: monitorTheme.overlayControlBg,
  color: monitorTheme.sidebarText,
  borderRadius: monitorRadius.pill,
  width: 38,
  height: 38,
  display: 'grid',
  placeItems: 'center',
  cursor: 'pointer',
}
