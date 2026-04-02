import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { CopyValueButton } from '@/components/CopyValueButton'
import { ToastProvider } from '@/components/ui/toast'

describe('CopyValueButton', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('copies value, shows success toast and temporary check icon', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.assign(navigator, {
      clipboard: {
        writeText,
      },
    })

    render(
      React.createElement(
        ToastProvider,
        null,
        React.createElement(CopyValueButton, {
          value: 'abc-123',
          label: 'Session ID',
        })
      )
    )

    fireEvent.click(screen.getByLabelText('Copiar Session ID'))

    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith('abc-123')
    })
    expect(screen.getByText('Copiado')).toBeTruthy()
    expect(screen.getByLabelText('Session ID copiado')).toBeTruthy()

    await waitFor(() => {
      expect(screen.getByLabelText('Copiar Session ID')).toBeTruthy()
    }, { timeout: 2500 })
  })

  it('hides copy button when value is empty', () => {
    render(
      React.createElement(
        ToastProvider,
        null,
        React.createElement(CopyValueButton, {
          value: '',
          label: 'Session ID',
        })
      )
    )

    expect(screen.queryByLabelText('Copiar Session ID')).toBeNull()
  })

  it('shows error toast when fallback copy fails', async () => {
    Object.assign(navigator, {
      clipboard: undefined,
    })

    const execCommandMock = vi.fn().mockReturnValue(false)
    Object.assign(document, {
      execCommand: execCommandMock,
    })

    render(
      React.createElement(
        ToastProvider,
        null,
        React.createElement(CopyValueButton, {
          value: 'abc-123',
          label: 'Session ID',
        })
      )
    )

    fireEvent.click(screen.getByLabelText('Copiar Session ID'))

    await waitFor(() => {
      expect(execCommandMock).toHaveBeenCalledWith('copy')
    })
    expect(screen.getByText('Falha ao copiar')).toBeTruthy()
  })
})
