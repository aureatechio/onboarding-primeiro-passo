import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import {
  Activity,
  LayoutDashboard,
  Search,
  PieChart,
  Wifi,
  WifiOff,
  FileSignature,
  Percent,
  RefreshCcw,
  Settings,
  FileText,
  Mail,
  Link2,
  Users,
  ListTodo,
  Upload,
  Menu,
  X,
  Code2,
  ChevronDown,
  Brain,
  Palette,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import { Separator } from '@/components/ui/separator'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { useRealtimeStatus } from '@/hooks/useRealtime'
import logoAcelerai from '@/assets/logo_acelerai.png'

type LucideIcon = typeof LayoutDashboard

type NavLeaf = { to: string; label: string; icon: LucideIcon }

type NavNested = {
  kind: 'nested'
  label: string
  icon: LucideIcon
  children: Array<{ to: string; label: string }>
}

type NavGroup = {
  label: string
  items: Array<NavLeaf | NavNested>
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Operação',
    items: [
      { to: '/', label: 'Overview', icon: LayoutDashboard },
      { to: '/contratos', label: 'Contratos', icon: FileSignature },
      { to: '/split-metrics', label: 'Split e Parcelado', icon: PieChart },
      { to: '/checkout-monitor', label: 'Checkout Monitor', icon: Activity },
      { to: '/tasks', label: 'Tarefas', icon: ListTodo },
    ],
  },
  {
    label: 'Ações',
    items: [
      { to: '/desconto', label: 'Aplicar Desconto', icon: Percent },
      { to: '/reenviar-contrato', label: 'Reenviar Contrato', icon: RefreshCcw },
      { to: '/transaction', label: 'Buscar Transação', icon: Search },
    ],
  },
  {
    label: 'Emails',
    items: [
      { to: '/enviar-checkout-email', label: 'Link Checkout', icon: Mail },
      { to: '/enviar-boletos-email', label: 'Boletos', icon: Mail },
      { to: '/gerar-onboarding-link', label: 'Link Onboarding', icon: Link2 },
    ],
  },
  {
    label: 'OMIE',
    items: [
      { to: '/omie-upsert-os', label: 'Upsert OS', icon: Upload },
      { to: '/clientes', label: 'Clientes', icon: Users },
    ],
  },
  {
    label: 'Configurações',
    items: [
      { to: '/checkout-config', label: 'Checkout', icon: Settings },
      { to: '/omie-nfse-config', label: 'NFS-e OMIE', icon: FileText },
      { to: '/perplexity-config', label: 'Perplexity IA', icon: Brain },
      { to: '/nanobanana-config', label: 'NanoBanana IA', icon: Palette },
    ],
  },
  {
    label: '',
    items: [
      {
        kind: 'nested',
        label: 'Dev',
        icon: Code2,
        children: [{ to: '/dev/credenciais', label: 'Credenciais' }],
      },
    ],
  },
]

function NavNestedItem({
  item,
  onNavigate,
}: {
  item: NavNested
  onNavigate?: () => void
}) {
  const location = useLocation()
  const childActive = item.children.some((c) => location.pathname === c.to)
  const [open, setOpen] = useState(
    () => childActive || location.pathname.startsWith('/dev/')
  )

  useEffect(() => {
    if (location.pathname.startsWith('/dev/')) setOpen(true)
  }, [location.pathname])

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className={cn(
            'flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
            childActive
              ? 'bg-sidebar-accent/80 text-sidebar-accent-foreground'
              : 'text-sidebar-foreground/60 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
          )}
        >
          <item.icon className="h-4 w-4 shrink-0" />
          <span className="flex-1 text-left">{item.label}</span>
          <ChevronDown
            className={cn('h-4 w-4 shrink-0 transition-transform', open && 'rotate-180')}
          />
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="mt-1 space-y-0.5 border-l border-sidebar-border/60 ml-4 pl-2">
          {item.children.map((child) => (
            <NavLink
              key={child.to}
              to={child.to}
              onClick={onNavigate}
              className={({ isActive }) =>
                cn(
                  'flex items-center rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                    : 'text-sidebar-foreground/60 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
                )
              }
            >
              {child.label}
            </NavLink>
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}

export function DashboardLayout() {
  const connected = useRealtimeStatus()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const renderNav = (onNavigate?: () => void) => (
    <nav className="flex-1 overflow-y-auto px-2 py-3">
      {NAV_GROUPS.map((group, idx) => (
        <div key={group.label || `nav-${idx}`} className={idx > 0 ? 'mt-4' : ''}>
          {group.label ? (
            <span className="px-3 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/40">
              {group.label}
            </span>
          ) : null}
          <div className="mt-1 space-y-1">
            {group.items.map((item) =>
              'kind' in item && item.kind === 'nested' ? (
                <NavNestedItem key={item.label} item={item} onNavigate={onNavigate} />
              ) : (
                <NavLink
                  key={(item as NavLeaf).to}
                  to={(item as NavLeaf).to}
                  end={(item as NavLeaf).to === '/'}
                  onClick={onNavigate}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                        : 'text-sidebar-foreground/60 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
                    )
                  }
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </NavLink>
              )
            )}
          </div>
        </div>
      ))}
    </nav>
  )

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-background md:flex">
        <header className="sticky top-0 z-30 border-b bg-background/95 px-4 py-2 backdrop-blur md:hidden">
          <div className="flex items-center justify-between gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Abrir menu de navegacao"
            >
              <Menu className="h-4 w-4" />
            </Button>
            <Link to="/">
              <img src={logoAcelerai} alt="Acelerai" className="h-6 object-contain brightness-0" />
            </Link>
          </div>
        </header>

        <Dialog open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <DialogContent className="left-0 top-0 h-dvh w-[18rem] max-w-[18rem] translate-x-0 translate-y-0 rounded-none border-r border-sidebar-border bg-sidebar text-sidebar-foreground p-0">
            <DialogTitle className="sr-only">Navegacao</DialogTitle>
            <div className="flex items-center justify-between gap-2 border-b border-sidebar-border px-4 py-3">
              <Link to="/" onClick={() => setMobileMenuOpen(false)}>
                <img
                  src={logoAcelerai}
                  alt="Acelerai"
                  className="h-6 object-contain"
                />
              </Link>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setMobileMenuOpen(false)}
                aria-label="Fechar menu de navegacao"
                className="text-sidebar-foreground hover:bg-sidebar-accent/50"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            {renderNav(() => setMobileMenuOpen(false))}
          </DialogContent>
        </Dialog>

        <aside className="hidden h-screen w-60 shrink-0 flex-col bg-sidebar md:flex sticky top-0">
          <div className="px-4 py-4">
            <Link to="/">
              <img
                src={logoAcelerai}
                alt="Acelerai"
                className="h-7 object-contain"
              />
            </Link>
          </div>

          <Separator className="bg-sidebar-border" />

          {renderNav()}

          <div className="border-t border-sidebar-border px-4 py-3">
            <div className="flex items-center gap-2 text-xs">
              {connected ? (
                <>
                  <Wifi className="h-3 w-3 text-emerald-500" />
                  <span className="text-sidebar-foreground/60">Realtime ativo</span>
                </>
              ) : (
                <>
                  <WifiOff className="h-3 w-3 text-red-500" />
                  <span className="text-red-400">Desconectado</span>
                </>
              )}
            </div>
          </div>
        </aside>

        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-[1800px] px-4 py-4 md:px-6 md:py-6">
            <Outlet />
          </div>
        </main>
      </div>
    </TooltipProvider>
  )
}
