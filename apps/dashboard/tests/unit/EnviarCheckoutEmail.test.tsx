import { describe, expect, it, vi, beforeEach } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { EnviarCheckoutEmailPage } from '@/pages/EnviarCheckoutEmail'

type HookState = {
  loading: boolean
  error: string | null
  result: { success: boolean; message: string; auditId: string } | null
  previewLoading: boolean
  previewError: string | null
  preview: {
    source: 'session' | 'fallback'
    sessionId: string | null
    propostaDescricao: string
    valorFormatado: string
    metodosDisponiveis: string[]
    nomeDestinatario: string
    checkoutLink: string
  } | null
  enviar: ReturnType<typeof vi.fn>
  carregarPreview: ReturnType<typeof vi.fn>
  clearPreview: ReturnType<typeof vi.fn>
  reset: ReturnType<typeof vi.fn>
}

let hookState: HookState

vi.mock('@/hooks/useEnviarCheckoutEmail', () => ({
  useEnviarCheckoutEmail: () => hookState,
}))

describe('EnviarCheckoutEmailPage', () => {
  beforeEach(() => {
    hookState = {
      loading: false,
      error: null,
      result: null,
      previewLoading: false,
      previewError: null,
      preview: null,
      enviar: vi.fn().mockResolvedValue(true),
      carregarPreview: vi.fn().mockResolvedValue(undefined),
      clearPreview: vi.fn(),
      reset: vi.fn(),
    }
  })

  it('renderiza campos obrigatórios', () => {
    render(<EnviarCheckoutEmailPage />)

    expect(screen.getByLabelText('Email')).toBeTruthy()
    expect(screen.getByLabelText('Nome')).toBeTruthy()
    expect(screen.getByLabelText('Link de checkout')).toBeTruthy()
    expect(screen.getByText('Enviar email')).toBeTruthy()
  })

  it('bloqueia envio quando campos obrigatórios não foram preenchidos', () => {
    render(<EnviarCheckoutEmailPage />)

    fireEvent.click(screen.getByText('Enviar email'))

    expect(screen.getByText('Email é obrigatório')).toBeTruthy()
    expect(screen.getByText('Nome é obrigatório')).toBeTruthy()
    expect(screen.getByText('Link de checkout é obrigatório')).toBeTruthy()
    expect(hookState.enviar).not.toHaveBeenCalled()
  })

  it('valida email e URL inválidos', () => {
    render(<EnviarCheckoutEmailPage />)

    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'email-invalido' },
    })
    fireEvent.change(screen.getByLabelText('Nome'), {
      target: { value: 'Maria Silva' },
    })
    fireEvent.change(screen.getByLabelText('Link de checkout'), {
      target: { value: 'checkout-sem-protocolo' },
    })

    fireEvent.click(screen.getByText('Enviar email'))

    expect(screen.getByText('E-mail em formato inválido')).toBeTruthy()
    expect(screen.getByText('Informe uma URL válida com http/https')).toBeTruthy()
    expect(hookState.enviar).not.toHaveBeenCalled()
  })

  it('mostra estado de loading e botão desabilitado durante envio', () => {
    hookState.loading = true

    render(<EnviarCheckoutEmailPage />)

    expect(screen.getByText('Enviando...')).toBeTruthy()
    expect(screen.getByText('Enviando...').closest('button')).toHaveProperty(
      'disabled',
      true
    )
  })

  it('exibe mensagem de sucesso', () => {
    hookState.result = {
      success: true,
      message: 'Email enviado com sucesso.',
      auditId: 'audit-123',
    }

    render(<EnviarCheckoutEmailPage />)

    expect(screen.getByText(/Email enviado com sucesso./)).toBeTruthy()
    expect(screen.getByText('audit-123')).toBeTruthy()
  })

  it('exibe mensagem de erro', () => {
    hookState.error = 'Falha ao enviar email.'

    render(<EnviarCheckoutEmailPage />)

    expect(screen.getByText('Falha ao enviar email.')).toBeTruthy()
  })

  it('renderiza dados do preview quando disponíveis', () => {
    hookState.preview = {
      source: 'session',
      sessionId: '11111111-1111-1111-1111-111111111111',
      propostaDescricao: 'Plano Ouro',
      valorFormatado: 'R$ 1.500,00',
      metodosDisponiveis: ['PIX', 'Cartão de crédito'],
      nomeDestinatario: 'Maria',
      checkoutLink:
        'https://checkout.seudominio.com/?session=11111111-1111-1111-1111-111111111111',
    }

    render(<EnviarCheckoutEmailPage />)

    expect(screen.getByText('Plano Ouro')).toBeTruthy()
    expect(screen.getByText('R$ 1.500,00')).toBeTruthy()
    expect(screen.getByText(/Origem dos dados: sessão/)).toBeTruthy()
  })
})
