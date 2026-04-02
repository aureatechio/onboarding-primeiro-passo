import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react'
import { cn } from '@/lib/utils'

type ToastVariant = 'success' | 'error' | 'info'

interface ToastItem {
  id: string
  title: string
  description?: string
  variant: ToastVariant
  durationMs: number
}

interface ToastOptions {
  title: string
  description?: string
  durationMs?: number
}

interface ToastContextValue {
  success: (options: ToastOptions) => void
  error: (options: ToastOptions) => void
  info: (options: ToastOptions) => void
  dismiss: (id: string) => void
}

const DEFAULT_DURATION_MS = 2500

const ToastContext = createContext<ToastContextValue | null>(null)

function getVariantStyles(variant: ToastVariant): string {
  switch (variant) {
    case 'success':
      return 'border-emerald-200 bg-emerald-50 text-emerald-900'
    case 'error':
      return 'border-red-200 bg-red-50 text-red-900'
    case 'info':
    default:
      return 'border-zinc-200 bg-background text-foreground'
  }
}

function getVariantIcon(variant: ToastVariant) {
  switch (variant) {
    case 'success':
      return <CheckCircle2 className="h-4 w-4 text-emerald-600" />
    case 'error':
      return <AlertCircle className="h-4 w-4 text-red-600" />
    case 'info':
    default:
      return <Info className="h-4 w-4 text-zinc-500" />
  }
}

function createToastId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

function ToastViewport({
  toasts,
  onDismiss,
}: {
  toasts: ToastItem[]
  onDismiss: (id: string) => void
}) {
  return (
    <div className="pointer-events-none fixed right-4 top-4 z-100 flex w-full max-w-sm flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={cn(
            'pointer-events-auto rounded-md border px-3 py-2 shadow-sm',
            getVariantStyles(toast.variant)
          )}
          role="status"
          aria-live="polite"
        >
          <div className="flex items-start gap-2">
            <span className="mt-0.5 shrink-0">{getVariantIcon(toast.variant)}</span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{toast.title}</p>
              {toast.description && (
                <p className="mt-0.5 text-xs opacity-90">{toast.description}</p>
              )}
            </div>
            <button
              type="button"
              onClick={() => onDismiss(toast.id)}
              className="rounded p-0.5 text-muted-foreground transition-colors hover:text-foreground"
              aria-label="Fechar notificação"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id))
  }, [])

  const push = useCallback(
    (variant: ToastVariant, options: ToastOptions) => {
      const nextToast: ToastItem = {
        id: createToastId(),
        title: options.title,
        description: options.description,
        variant,
        durationMs: options.durationMs ?? DEFAULT_DURATION_MS,
      }

      setToasts((prev) => [...prev, nextToast])

      window.setTimeout(() => {
        dismiss(nextToast.id)
      }, nextToast.durationMs)
    },
    [dismiss]
  )

  const contextValue = useMemo<ToastContextValue>(
    () => ({
      success: (options) => push('success', options),
      error: (options) => push('error', options),
      info: (options) => push('info', options),
      dismiss,
    }),
    [dismiss, push]
  )

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)

  if (!context) {
    throw new Error('useToast must be used within ToastProvider')
  }

  return context
}
