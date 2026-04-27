import { forwardRef, useId, useState } from 'react'
import {
  dashboardMotion,
  dashboardRadius,
  dashboardTheme,
  focusVisibleStyle,
} from '../../theme/dashboard-tokens'

const DashboardField = forwardRef(function DashboardField(
  {
    as = 'input',
    label,
    hint,
    error,
    options,
    children,
    containerStyle,
    style,
    id,
    ...props
  },
  ref,
) {
  const generatedId = useId()
  const fieldId = id || generatedId
  const hintId = hint ? `${fieldId}-hint` : undefined
  const errorId = error ? `${fieldId}-error` : undefined
  const [focused, setFocused] = useState(false)
  const Component = as

  return (
    <label style={{ display: 'grid', gap: 6, ...containerStyle }}>
      {label ? (
        <span
          style={{
            color: dashboardTheme.textSecondary,
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
          }}
        >
          {label}
        </span>
      ) : null}
      {hint ? (
        <span id={hintId} style={{ color: dashboardTheme.textMuted, fontSize: 11, lineHeight: 1.45 }}>
          {hint}
        </span>
      ) : null}
      <Component
        ref={ref}
        id={fieldId}
        aria-invalid={Boolean(error)}
        aria-describedby={[hintId, errorId].filter(Boolean).join(' ') || undefined}
        onFocus={(event) => {
          setFocused(true)
          props.onFocus?.(event)
        }}
        onBlur={(event) => {
          setFocused(false)
          props.onBlur?.(event)
        }}
        style={{
          width: '100%',
          background: dashboardTheme.controlBg,
          border: `1px solid ${error ? dashboardTheme.dangerBorder : dashboardTheme.controlBorder}`,
          borderRadius: dashboardRadius.md,
          color: dashboardTheme.controlText,
          font: 'inherit',
          fontSize: 13,
          lineHeight: 1.45,
          padding: '10px 12px',
          resize: as === 'textarea' ? 'vertical' : undefined,
          transition: dashboardMotion.fast,
          boxSizing: 'border-box',
          ...(focused ? focusVisibleStyle : null),
          ...style,
        }}
        {...props}
      >
        {options
          ? options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))
          : children}
      </Component>
      {error ? (
        <span id={errorId} role="alert" style={{ color: dashboardTheme.dangerTextStrong, fontSize: 11 }}>
          {error}
        </span>
      ) : null}
    </label>
  )
})

export default DashboardField
