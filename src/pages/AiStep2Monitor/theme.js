import { colorHex, designTokens } from '../../theme/design-tokens'

export const monitorTheme = {
  // Layout
  layoutBg: '#080C14',
  sidebarBg: '#000000',
  sidebarBorder: 'rgba(255,255,255,0.07)',
  sidebarText: '#CDD9E5',
  sidebarTextMuted: '#57636D',
  sidebarItemBg: 'rgba(255,255,255,0.04)',
  sidebarItemBorder: 'rgba(255,255,255,0.12)',
  sidebarItemActiveBg: 'rgba(232,53,109,0.14)',
  sidebarItemActiveBorder: 'rgba(232,53,109,0.35)',

  // Content — dark console
  pageBg: '#0D1117',
  textPrimary: '#E6EDF3',
  textSecondary: '#8B949E',
  textMuted: '#57636D',

  border: 'rgba(240,246,252,0.1)',
  borderSoft: 'rgba(240,246,252,0.05)',
  borderStrong: 'rgba(240,246,252,0.18)',
  cardMutedBg: '#161B22',
  cardElevatedBg: '#1C2230',
  progressTrack: 'rgba(255,255,255,0.07)',

  // Danger
  dangerBg: 'rgba(248,81,73,0.08)',
  dangerBorder: 'rgba(248,81,73,0.22)',
  dangerText: '#F85149',
  dangerTextStrong: '#FF7B72',

  // Status badges — dark-friendly
  neutralBadgeBg: 'rgba(139,148,158,0.12)',
  neutralBadgeText: '#8B949E',
  pendingBg: 'rgba(227,179,65,0.12)',
  pendingText: '#E3B341',
  processingBg: 'rgba(88,166,255,0.12)',
  processingText: '#58A6FF',
  completedBg: 'rgba(63,185,80,0.12)',
  completedText: '#3FB950',
  failedBg: 'rgba(248,81,73,0.12)',
  failedText: '#F85149',

  buttonDarkBg: '#E6EDF3',
  buttonDarkText: '#0D1117',

  overlayBg: 'rgba(1,4,9,0.94)',
  overlayControlBorder: 'rgba(255,255,255,0.14)',
  overlayControlBg: 'rgba(13,17,23,0.88)',

  brand: colorHex.red,
  brandGradientStart: colorHex.red,
  brandGradientEnd: colorHex.redGradientEndDark,
}

export const monitorSpacing = designTokens.space
export const monitorRadius = designTokens.radius
