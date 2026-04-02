import { useState, useCallback } from 'react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { CalendarIcon, Check } from 'lucide-react'
import type { DateRange } from 'react-day-picker'

import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import {
  type DateRangePreset,
  type CustomDateRange,
  isCustomDateRange,
} from '@/lib/date-range'

interface PresetItem {
  value: DateRangePreset
  label: string
}

const PRESETS: PresetItem[] = [
  { value: 'today', label: 'Hoje' },
  { value: 'yesterday', label: 'Ontem' },
  { value: 'month', label: 'Mês atual' },
  { value: 'lastMonth', label: 'Mês Anterior' },
  { value: 7, label: '7 dias' },
  { value: 30, label: '30 dias' },
  { value: 'all', label: 'Todo período' },
]

function getPresetLabel(preset: DateRangePreset): string {
  if (isCustomDateRange(preset)) {
    const from = new Date(preset.from + 'T12:00:00')
    const to = new Date(preset.to + 'T12:00:00')
    if (preset.from === preset.to) {
      return format(from, 'dd/MM/yyyy', { locale: ptBR })
    }
    const sameYear = from.getFullYear() === to.getFullYear()
    const fmtFrom = sameYear ? 'dd/MM' : 'dd/MM/yy'
    return `${format(from, fmtFrom, { locale: ptBR })} – ${format(to, 'dd/MM/yy', { locale: ptBR })}`
  }
  const found = PRESETS.find(
    (p) => p.value === preset || (typeof p.value === 'number' && p.value === preset),
  )
  return found?.label ?? 'Período'
}

function toYMD(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

interface DateRangeFilterProps {
  value: DateRangePreset
  onChange: (preset: DateRangePreset) => void
  isActive?: boolean
}

export function DateRangeFilter({ value, onChange, isActive = false }: DateRangeFilterProps) {
  const [open, setOpen] = useState(false)
  const [calendarRange, setCalendarRange] = useState<DateRange | undefined>(undefined)

  const handlePresetSelect = useCallback(
    (preset: DateRangePreset) => {
      setCalendarRange(undefined)
      onChange(preset)
      setOpen(false)
    },
    [onChange],
  )

  const handleCalendarSelect = useCallback((range: DateRange | undefined) => {
    setCalendarRange(range)
  }, [])

  const handleApply = useCallback(() => {
    if (!calendarRange?.from) return
    const from = toYMD(calendarRange.from)
    const to = calendarRange.to ? toYMD(calendarRange.to) : from
    const custom: CustomDateRange = { from, to }
    onChange(custom)
    setCalendarRange(undefined)
    setOpen(false)
  }, [calendarRange, onChange])

  const handleOpenChange = useCallback(
    (next: boolean) => {
      setOpen(next)
      if (!next) {
        setCalendarRange(undefined)
      }
    },
    [],
  )

  const isPresetActive = (preset: DateRangePreset) => {
    if (isCustomDateRange(value) || isCustomDateRange(preset)) return false
    return value === preset
  }

  const calendarDefault = isCustomDateRange(value)
    ? new Date(value.from + 'T12:00:00')
    : undefined

  const calendarSelected = calendarRange ?? (isCustomDateRange(value)
    ? { from: new Date(value.from + 'T12:00:00'), to: new Date(value.to + 'T12:00:00') }
    : undefined)

  return (
    <div className="flex w-full flex-col items-start gap-1 sm:w-auto sm:flex-row sm:items-center sm:gap-2">
      <span
        className={cn(
          'shrink-0 text-sm text-muted-foreground',
          isActive && 'text-primary font-medium',
        )}
      >
        Período:
      </span>
      <Popover open={open} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={cn(
              'h-8 w-full justify-start gap-1.5 text-left font-normal sm:w-auto sm:min-w-[140px]',
              isActive && 'ring-1 ring-primary/30 border-primary/30',
              !isActive && 'text-muted-foreground',
            )}
          >
            <CalendarIcon className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{getPresetLabel(value)}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <div className="flex">
            {/* Presets column */}
            <div className="flex flex-col gap-0.5 border-r p-2 min-w-[140px]">
              {PRESETS.map((preset) => (
                <button
                  key={String(preset.value)}
                  type="button"
                  onClick={() => handlePresetSelect(preset.value)}
                  className={cn(
                    'flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors text-left',
                    'hover:bg-accent hover:text-accent-foreground',
                    isPresetActive(preset.value) && 'bg-accent font-medium',
                  )}
                >
                  {isPresetActive(preset.value) ? (
                    <Check className="h-3.5 w-3.5 shrink-0" />
                  ) : (
                    <span className="w-3.5 shrink-0" />
                  )}
                  {preset.label}
                </button>
              ))}
            </div>
            {/* Calendar column */}
            <div className="flex flex-col">
              <Calendar
                mode="range"
                defaultMonth={calendarDefault}
                selected={calendarSelected}
                onSelect={handleCalendarSelect}
                numberOfMonths={1}
                disabled={{ after: new Date() }}
              />
              <Separator />
              <div className="flex items-center justify-between p-2">
                <span className="text-xs text-muted-foreground">
                  {calendarRange?.from
                    ? calendarRange.to && calendarRange.from !== calendarRange.to
                      ? `${format(calendarRange.from, 'dd/MM', { locale: ptBR })} – ${format(calendarRange.to, 'dd/MM', { locale: ptBR })}`
                      : format(calendarRange.from, 'dd/MM/yyyy', { locale: ptBR })
                    : 'Selecione no calendário'}
                </span>
                <Button
                  size="sm"
                  className="h-7 px-3 text-xs"
                  disabled={!calendarRange?.from}
                  onClick={handleApply}
                >
                  Aplicar
                </Button>
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}
