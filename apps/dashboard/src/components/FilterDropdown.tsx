import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

export interface FilterOption {
  value: string
  label: string
}

interface FilterDropdownProps {
  label: string
  value: string
  options: FilterOption[]
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  triggerClassName?: string
  isActive?: boolean
}

export function FilterDropdown({
  label,
  value,
  options,
  onChange,
  placeholder = 'Todos',
  className,
  triggerClassName,
  isActive = false,
}: FilterDropdownProps) {
  return (
    <div
      className={cn(
        'flex w-full flex-col items-start gap-1 sm:w-auto sm:flex-row sm:items-center sm:gap-2',
        className
      )}
    >
      <span
        className={cn(
          'shrink-0 text-sm text-muted-foreground',
          isActive && 'text-primary font-medium'
        )}
      >
        {label}:
      </span>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger
          size="sm"
          className={cn(
            'h-8 w-full sm:w-[140px] sm:min-w-[100px]',
            isActive && 'ring-1 ring-primary/30 border-primary/30',
            triggerClassName
          )}
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
