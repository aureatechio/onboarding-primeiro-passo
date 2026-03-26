import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { COLORS } from '../theme/colors'
import Icon from './Icon'

export default function ThumbnailPreview({ file, onRemove, size = 72 }) {
  const [previewUrl, setPreviewUrl] = useState(null)

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null)
      return
    }
    const url = URL.createObjectURL(file)
    setPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  if (!previewUrl) return null

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.85 }}
      transition={{ duration: 0.2 }}
      style={{
        position: 'relative',
        width: size,
        height: size,
        borderRadius: 10,
        overflow: 'visible',
        flexShrink: 0,
      }}
    >
      <img
        src={previewUrl}
        alt={file.name || 'Preview'}
        style={{
          width: size,
          height: size,
          borderRadius: 10,
          objectFit: 'cover',
          border: `1px solid ${COLORS.border}`,
          display: 'block',
        }}
      />
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label="Remover imagem"
          style={{
            position: 'absolute',
            top: -8,
            right: -8,
            width: 22,
            height: 22,
            borderRadius: '50%',
            border: 'none',
            background: COLORS.danger,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            padding: 0,
            zIndex: 2,
          }}
        >
          <Icon name="x" size={12} color="#fff" strokeWidth={3} />
        </button>
      )}
    </motion.div>
  )
}
