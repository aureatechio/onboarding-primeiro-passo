import type { ReactNode } from 'react'
import { Info } from 'lucide-react'
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'

interface InfoDialogProps {
  title: string
  children: ReactNode
}

export function InfoDialog({ title, children }: InfoDialogProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          className="inline-flex shrink-0 items-center justify-center rounded-full p-0.5 text-muted-foreground/60 transition-colors hover:text-muted-foreground"
          aria-label={`Ajuda: ${title}`}
        >
          <Info className="h-3.5 w-3.5" />
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription className="sr-only">
            Informações sobre {title}
          </DialogDescription>
        </DialogHeader>
        <div className="text-sm leading-relaxed text-muted-foreground">
          {children}
        </div>
      </DialogContent>
    </Dialog>
  )
}
