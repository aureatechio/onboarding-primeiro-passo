import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import {
  dashboardMotion,
  dashboardTheme,
  focusVisibleStyle,
} from '../../theme/dashboard-tokens'

export default function DashboardTabs({ tabs, activeTab, onTabChange, getHref, ariaLabel = 'Abas' }) {
  const [focusedTab, setFocusedTab] = useState(null)
  const navigate = useNavigate()

  function handleKeyDown(event, index) {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
    event.preventDefault()
    let nextIndex = index
    if (event.key === 'ArrowRight') nextIndex = (index + 1) % tabs.length
    if (event.key === 'ArrowLeft') nextIndex = (index - 1 + tabs.length) % tabs.length
    if (event.key === 'Home') nextIndex = 0
    if (event.key === 'End') nextIndex = tabs.length - 1
    const nextTab = tabs[nextIndex]
    if (getHref) {
      navigate(getHref(nextTab))
    } else {
      onTabChange(nextTab.id)
    }
  }

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      style={{
        display: 'flex',
        gap: 0,
        borderBottom: `1px solid ${dashboardTheme.border}`,
        marginBottom: 20,
        overflowX: 'auto',
        scrollbarWidth: 'none',
      }}
    >
      {tabs.map((tab, index) => {
        const isActive = activeTab === tab.id
        const Icon = tab.icon
        const commonProps = {
          key: tab.id,
          role: 'tab',
          'aria-selected': isActive,
          tabIndex: isActive ? 0 : -1,
          onKeyDown: (event) => handleKeyDown(event, index),
          onFocus: () => setFocusedTab(tab.id),
          onBlur: () => setFocusedTab(null),
          style: {
            border: 'none',
            borderBottom: `2px solid ${isActive ? dashboardTheme.brand : 'transparent'}`,
            background: 'transparent',
            color: isActive ? dashboardTheme.textPrimary : dashboardTheme.textMuted,
            padding: '9px 16px',
            marginBottom: -1,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            fontSize: 13,
            fontWeight: isActive ? 700 : 500,
            letterSpacing: '0.01em',
            transition: dashboardMotion.fast,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            textDecoration: 'none',
            ...(focusedTab === tab.id ? focusVisibleStyle : null),
          },
          children: (
            <>
              {Icon ? <Icon size={14} aria-hidden="true" /> : null}
              {tab.label}
            </>
          ),
        }

        if (getHref) {
          return (
            <Link
              {...commonProps}
              to={getHref(tab)}
            />
          )
        }

        return (
          <button
            {...commonProps}
            type="button"
            onClick={() => onTabChange(tab.id)}
          />
        )
      })}
    </div>
  )
}
