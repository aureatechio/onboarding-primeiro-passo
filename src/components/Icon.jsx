import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Ban,
  Building2,
  CalendarDays,
  Camera,
  Check,
  ChevronRight,
  CircleCheck,
  Clapperboard,
  Clock,
  Eye,
  Gem,
  Hand,
  Handshake,
  Lock,
  Mail,
  MapPin,
  MessageCircle,
  Monitor,
  Palette,
  PartyPopper,
  PenLine,
  RefreshCw,
  Scale,
  Shuffle,
  Smartphone,
  Star,
  Tag,
  Target,
  TrendingUp,
  Tv,
  Type,
  Zap,
} from 'lucide-react'
import { COLORS } from '../theme/colors'

const ICON_MAP = {
  alertTriangle: AlertTriangle,
  arrowLeft: ArrowLeft,
  arrowRight: ArrowRight,
  ban: Ban,
  building2: Building2,
  calendarDays: CalendarDays,
  camera: Camera,
  check: Check,
  chevronRight: ChevronRight,
  circleCheck: CircleCheck,
  clapperboard: Clapperboard,
  clock: Clock,
  eye: Eye,
  gem: Gem,
  hand: Hand,
  handshake: Handshake,
  lock: Lock,
  mail: Mail,
  mapPin: MapPin,
  messageCircle: MessageCircle,
  monitor: Monitor,
  palette: Palette,
  partyPopper: PartyPopper,
  penLine: PenLine,
  refreshCw: RefreshCw,
  scale: Scale,
  shuffle: Shuffle,
  smartphone: Smartphone,
  star: Star,
  tag: Tag,
  target: Target,
  trendingUp: TrendingUp,
  tv: Tv,
  type: Type,
  zap: Zap,
}

/**
 * Wrapper para ícones Lucide com estilo padrão do design system.
 */
export default function Icon({
  icon,
  name,
  size = 20,
  color = COLORS.textMuted,
  bg,
  containerSize,
  radius = 10,
  strokeWidth = 2,
  className = '',
}) {
  const LucideIcon = icon || ICON_MAP[name]
  if (!LucideIcon) return null

  const isRenderableIcon =
    typeof LucideIcon === 'function' ||
    (typeof LucideIcon === 'object' && LucideIcon !== null && '$$typeof' in LucideIcon)

  if (!isRenderableIcon) return null

  if (!bg) {
    return (
      <LucideIcon size={size} color={color} strokeWidth={strokeWidth} className={className} />
    )
  }

  const cSize = containerSize || size * 2
  return (
    <div
      style={{
        width: cSize,
        height: cSize,
        borderRadius: radius,
        background: bg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
      className={className}
    >
      <LucideIcon size={size} color={color} strokeWidth={strokeWidth} />
    </div>
  )
}
