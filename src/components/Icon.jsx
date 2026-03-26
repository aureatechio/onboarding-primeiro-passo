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
  FileText,
  Gem,
  Hand,
  Handshake,
  Lock,
  Mail,
  MapPin,
  MessageCircle,
  Mic,
  MicOff,
  Monitor,
  Palette,
  PartyPopper,
  Pause,
  PenLine,
  Play,
  RefreshCw,
  RotateCcw,
  Scale,
  Send,
  Shuffle,
  Smartphone,
  Square,
  Star,
  Tag,
  Target,
  Trash2,
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
  fileText: FileText,
  gem: Gem,
  hand: Hand,
  handshake: Handshake,
  lock: Lock,
  mail: Mail,
  mapPin: MapPin,
  messageCircle: MessageCircle,
  mic: Mic,
  micOff: MicOff,
  monitor: Monitor,
  palette: Palette,
  partyPopper: PartyPopper,
  pause: Pause,
  penLine: PenLine,
  play: Play,
  refreshCw: RefreshCw,
  rotateCcw: RotateCcw,
  scale: Scale,
  send: Send,
  shuffle: Shuffle,
  smartphone: Smartphone,
  square: Square,
  star: Star,
  tag: Tag,
  target: Target,
  trash2: Trash2,
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
