import { SlidersHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export interface ToggleColumn {
  key: string
  label: string
}

interface ColumnToggleProps {
  columns: ToggleColumn[]
  visibleColumns: Record<string, boolean>
  onToggle: (columnKey: string) => void
}

export function ColumnToggle({
  columns,
  visibleColumns,
  onToggle,
}: ColumnToggleProps) {
  const visibleCount = columns.filter((col) => visibleColumns[col.key]).length

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <SlidersHorizontal className="h-3.5 w-3.5 mr-1.5" />
          Colunas ({visibleCount}/{columns.length})
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Colunas opcionais</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {columns.map((column) => (
          <DropdownMenuItem
            key={column.key}
            onSelect={(event) => {
              event.preventDefault()
              onToggle(column.key)
            }}
          >
            <Checkbox checked={!!visibleColumns[column.key]} />
            <span>{column.label}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
