import { forwardRef, useState } from 'react'
import {
  clearFocusVisible,
  dashboardMotion,
  dashboardRadius,
  dashboardTheme,
  focusVisibleStyle,
} from '../../theme/dashboard-tokens'

const SIZE_STYLES = {
  sm: { padding: '6px 10px', fontSize: 12, minHeight: 30 },
  md: { padding: '8px 12px', fontSize: 13, minHeight: 36 },
  lg: { padding: '10px 14px', fontSize: 13, minHeight: 40 },
}

function variantStyle(variant, disabled, hovered) {
  if (variant === 'primary') {
    return {
      background: disabled
        ? 'rgba(232,53,109,0.42)'
        : hovered
        ? dashboardTheme.actionPrimaryHoverBg
        : dashboardTheme.actionPrimaryBg,
      border: '1px solid transparent',
      color: dashboardTheme.actionPrimaryText,
    }
  }
  if (variant === 'danger') {
    return {
      background: disabled ? dashboardTheme.dangerBg : hovered ? 'rgba(248,81,73,0.16)' : dashboardTheme.dangerBg,
      border: `1px solid ${dashboardTheme.dangerBorder}`,
      color: dashboardTheme.dangerTextStrong,
    }
  }
  if (variant === 'warning') {
    return {
      background: disabled ? dashboardTheme.warningBg : hovered ? '#F0C35B' : dashboardTheme.warningActionBg,
      border: '1px solid transparent',
      color: dashboardTheme.warningActionText,
    }
  }
  if (variant === 'ghost' || variant === 'icon') {
    return {
      background: hovered && !disabled ? dashboardTheme.sidebarItemBg : 'transparent',
      border: `1px solid ${variant === 'icon' ? dashboardTheme.border : 'transparent'}`,
      color: dashboardTheme.textSecondary,
    }
  }
  return {
    background: hovered && !disabled ? dashboardTheme.surfaceElevated : dashboardTheme.actionSecondaryBg,
    border: `1px solid ${dashboardTheme.actionSecondaryBorder}`,
    color: dashboardTheme.actionSecondaryText,
  }
}

const DashboardButton = forwardRef(function DashboardButton(
  {
    as: Component = 'button',
    children,
    icon: Icon,
    variant = 'secondary',
    size = 'md',
    disabled = false,
    type = 'button',
    style,
    onMouseEnter,
    onMouseLeave,
    onFocus,
    onBlur,
    ...props
  },
  ref,
) {
  const [hovered, setHovered] = useState(false)
  const [focused, setFocused] = useState(false)
  const isIconOnly = variant === 'icon' && !children
  const sizeStyle = SIZE_STYLES[size] || SIZE_STYLES.md
  const visualStyle = variantStyle(variant, disabled, hovered)

  return (
    <Component
      ref={ref}
      type={Component === 'button' ? type : undefined}
      disabled={Component === 'button' ? disabled : undefined}
      onMouseEnter={(event) => {
        setHovered(true)
        onMouseEnter?.(event)
      }}
      onMouseLeave={(event) => {
        setHovered(false)
        onMouseLeave?.(event)
      }}
      onFocus={(event) => {
        setFocused(true)
        onFocus?.(event)
      }}
      onBlur={(event) => {
        setFocused(false)
        clearFocusVisible(event)
        onBlur?.(event)
      }}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        borderRadius: dashboardRadius.md,
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontFamily: 'inherit',
        fontWeight: 700,
        lineHeight: 1.2,
        opacity: disabled ? 0.62 : 1,
        transition: dashboardMotion.fast,
        whiteSpace: 'nowrap',
        ...(isIconOnly ? { width: sizeStyle.minHeight, padding: 0 } : sizeStyle),
        ...visualStyle,
        ...(focused ? focusVisibleStyle : null),
        ...style,
      }}
      {...props}
    >
      {Icon ? <Icon size={size === 'sm' ? 13 : 15} aria-hidden="true" /> : null}
      {children}
    </Component>
  )
})

export default DashboardButton
