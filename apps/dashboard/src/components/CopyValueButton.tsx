import { useEffect, useRef, useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useCopyToClipboard } from '@/hooks/useCopyToClipboard'
import { useToast } from '@/components/ui/toast'

interface CopyValueButtonProps {
  value: string | null | undefined
  label: string
  className?: string
}

const COPIED_FEEDBACK_MS = 1500

export function CopyValueButton({
  value,
  label,
  className,
}: CopyValueButtonProps) {
  const [copied, setCopied] = useState(false)
  const timeoutRef = useRef<number | null>(null)
  const copyToClipboard = useCopyToClipboard()
  const toast = useToast()

  useEffect(() => {
    return () => {
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  const normalizedValue = value?.trim() ?? ''
  if (!normalizedValue) {
    return null
  }

  const handleCopy = async () => {
    const success = await copyToClipboard(normalizedValue)

    if (!success) {
      toast.error({
        title: 'Falha ao copiar',
        description: `Não foi possível copiar ${label.toLowerCase()}.`,
      })
      return
    }

    setCopied(true)
    toast.success({
      title: 'Copiado',
      description: `${label} copiado para a área de transferência.`,
    })

    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current)
    }

    timeoutRef.current = window.setTimeout(() => {
      setCopied(false)
      timeoutRef.current = null
    }, COPIED_FEEDBACK_MS)
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      aria-label={copied ? `${label} copiado` : `Copiar ${label}`}
      title={copied ? 'Copiado' : `Copiar ${label}`}
      className={cn(
        'inline-flex h-5 w-5 cursor-pointer items-center justify-center rounded text-muted-foreground transition-colors hover:bg-accent hover:text-foreground',
        copied && 'text-emerald-600 hover:text-emerald-700',
        className
      )}
    >
      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  )
}
