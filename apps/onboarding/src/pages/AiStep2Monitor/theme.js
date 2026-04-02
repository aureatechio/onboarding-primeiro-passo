import { colorHex, designTokens } from '../../theme/design-tokens'

export const monitorTheme = {
  layoutBg: '#0B0F19',
  sidebarBg: '#000000',
  sidebarBorder: 'rgba(255,255,255,0.08)',
  sidebarText: '#E2E8F0',
  sidebarTextMuted: '#94A3B8',
  sidebarItemBg: 'rgba(255,255,255,0.02)',
  sidebarItemBorder: 'rgba(255,255,255,0.14)',
  sidebarItemActiveBg: 'rgba(232,53,109,0.16)',
  sidebarItemActiveBorder: 'rgba(232,53,109,0.4)',

  pageBg: '#FFFFFF',
  textPrimary: '#0F172A',
  textSecondary: '#334155',
  textMuted: '#64748B',

  border: '#E2E8F0',
  borderSoft: '#F1F5F9',
  borderStrong: '#CBD5E1',
  cardMutedBg: '#F8FAFC',
  progressTrack: '#E2E8F0',

  dangerBg: '#FEF2F2',
  dangerBorder: '#FECACA',
  dangerText: '#7F1D1D',
  dangerTextStrong: '#991B1B',

  neutralBadgeBg: '#F3F4F6',
  neutralBadgeText: '#4B5563',
  pendingBg: '#FFF7E8',
  pendingText: '#B45309',
  processingBg: '#EFF6FF',
  processingText: '#1D4ED8',
  completedBg: '#ECFDF3',
  completedText: '#047857',
  failedBg: '#FEF2F2',
  failedText: '#B91C1C',

  buttonDarkBg: '#0F172A',
  buttonDarkText: '#FFFFFF',

  overlayBg: 'rgba(2,6,23,0.92)',
  overlayControlBorder: 'rgba(255,255,255,0.2)',
  overlayControlBg: 'rgba(15,23,42,0.8)',

  brand: colorHex.red,
  brandGradientStart: colorHex.red,
  brandGradientEnd: colorHex.redGradientEndDark,
}

export const monitorSpacing = designTokens.space
export const monitorRadius = designTokens.radius
