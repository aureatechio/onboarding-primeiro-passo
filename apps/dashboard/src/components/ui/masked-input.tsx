import * as React from 'react'
import { cn } from '@/lib/utils'
import {
  applyCepMask,
  applyPhoneMask,
  applyCpfMask,
  applyCnpjMask,
  validateCep,
  validatePhone,
  validateCpf,
  validateCnpj,
  validateEmailFormat,
} from '@/lib/mask'

type MaskType = 'cep' | 'phone' | 'cpf' | 'cnpj' | 'email'

interface MaskedInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  mask: MaskType
  value: string
  onChange: (value: string, rawValue: string) => void
  onValidation?: (result: { valid: boolean; error?: string }) => void
  error?: string
  label?: string
}

const maskFunctions: Record<MaskType, (value: string) => string> = {
  cep: applyCepMask,
  phone: applyPhoneMask,
  cpf: applyCpfMask,
  cnpj: applyCnpjMask,
  email: (v) => v, // Email não tem máscara
}

const validateFunctions: Record<
  MaskType,
  (value: string) => { valid: boolean; error?: string }
> = {
  cep: validateCep,
  phone: validatePhone,
  cpf: validateCpf,
  cnpj: validateCnpj,
  email: validateEmailFormat,
}

const placeholders: Record<MaskType, string> = {
  cep: '00000-000',
  phone: '(00) 00000-0000',
  cpf: '000.000.000-00',
  cnpj: '00.000.000/0000-00',
  email: 'email@exemplo.com',
}

const MaskedInput = React.forwardRef<HTMLInputElement, MaskedInputProps>(
  (
    {
      className,
      mask,
      value,
      onChange,
      onValidation,
      error,
      label,
      onBlur,
      ...props
    },
    ref
  ) => {
    const [touched, setTouched] = React.useState(false)
    const [internalError, setInternalError] = React.useState<string | null>(
      null
    )

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const rawValue = e.target.value
      const maskedValue = maskFunctions[mask](rawValue)
      const rawDigits = rawValue.replace(/\D/g, '')
      onChange(maskedValue, rawDigits)

      // Validação em tempo real (durante digitação)
      if (touched) {
        const validation = validateFunctions[mask](rawValue)
        setInternalError(validation.error || null)
        onValidation?.(validation)
      }
    }

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      setTouched(true)
      const validation = validateFunctions[mask](value)
      setInternalError(validation.error || null)
      onValidation?.(validation)
      onBlur?.(e)
    }

    const displayError = error || (touched ? internalError : null)
    const hasError = !!displayError

    return (
      <div className="space-y-1">
        {label && (
          <label className="text-sm font-medium text-foreground">{label}</label>
        )}
        <input
          type={mask === 'email' ? 'email' : 'text'}
          inputMode={mask === 'email' ? 'email' : 'numeric'}
          className={cn(
            'flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-base shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
            hasError
              ? 'border-destructive focus-visible:ring-destructive'
              : 'border-input focus-visible:ring-ring',
            className
          )}
          ref={ref}
          value={value}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder={props.placeholder || placeholders[mask]}
          {...props}
        />
        {displayError && (
          <p className="text-sm text-destructive">{displayError}</p>
        )}
      </div>
    )
  }
)
MaskedInput.displayName = 'MaskedInput'

export { MaskedInput }
export type { MaskType, MaskedInputProps }
