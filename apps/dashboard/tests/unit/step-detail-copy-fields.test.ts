import React from 'react'
import { describe, expect, it } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { StepDetail } from '@/components/StepDetail'
import { ToastProvider } from '@/components/ui/toast'
import { TooltipProvider } from '@/components/ui/tooltip'
import type { TransactionPipeline } from '@/hooks/useTransaction'

function makeTransaction(overrides: Partial<TransactionPipeline> = {}): TransactionPipeline {
  return {
    compra_id: '11111111-1111-1111-1111-111111111111',
    cliente_id: null,
    compra_descricao: null,
    valor_total: 1000,
    compra_numero_parcelas: null,
    compra_checkout_status: 'aguardando_pagamento',
    vendaaprovada: null,
    compra_created_at: '2026-03-03T10:00:00.000Z',
    clicksign_envelope_id: 'env-123',
    clicksign_document_key: 'doc-key-123',
    clicksign_status: 'Aguardando Assinatura',
    clicksign_signed_document_url: null,
    clicksign_error_message: null,
    clicksign_signers: [
      {
        signer_key: 'signer-1',
        email: 'signer@example.com',
        phone: null,
        name: 'Signer Test',
      },
    ],
    clicksign_metadata: null,
    data_envio_assinatura: null,
    data_assinatura_concluida: null,
    statusproducao: null,
    checkout_url: null,
    checkout_expires_at: null,
    vendedor_nome: null,
    vendedor_email: null,
    session_id: 'session-123',
    checkout_session_status: 'pending',
    metodo_pagamento: 'pix',
    valor_centavos: 100000,
    parcelas: 1,
    cliente_nome: 'Cliente Teste',
    cliente_documento: '12345678901',
    cliente_email: 'cliente@example.com',
    cliente_telefone: '11999998888',
    checkout_created_at: '2026-03-03T10:00:00.000Z',
    checkout_completed_at: null,
    payment_id: 'payment-123',
    payment_status: 2,
    payment_nsu: 'nsu-123',
    numero_proposta: 'PROP-123',
    nota_fiscal_id: null,
    nfe_status: null,
    nfe_numero: null,
    nfe_emitida_em: null,
    nfe_pdf_url: null,
    nfe_xml_url: null,
    nfe_created_at: null,
    nfe_updated_at: null,
    nfe_emissor: null,
    nf_omie_os_id: null,
    nfe_erro_mensagem: null,
    omie_sync_id: 'sync-123',
    omie_status: 'pending',
    omie_cliente_id: null,
    omie_servico_id: null,
    omie_os_id: null,
    omie_attempts: 0,
    omie_last_error: null,
    omie_synced_at: null,
    omie_created_at: null,
    omie_cliente_payload: null,
    omie_servico_payload: null,
    omie_os_payload: null,
    pipeline_status: 'in_progress',
    current_stage: 'checkout',
    last_activity_at: null,
    lead_id: null,
    split_group_id: null,
    split_sessoes_pagas: null,
    split_total_sessoes: null,
    split_type: null,
    vigencia_meses: null,
    checkout_recorrencia_enabled: null,
    valor_parcela_recorrente_centavos: null,
    recorrencia_total_parcelas: null,
    ...overrides,
  }
}

function renderWithProviders(step: string, data: TransactionPipeline) {
  return render(
    React.createElement(
      ToastProvider,
      null,
      React.createElement(
        TooltipProvider,
        null,
        React.createElement(StepDetail, { step, data })
      )
    )
  )
}

describe('StepDetail copy fields', () => {
  it('renders copy buttons for checkout and payment fields', () => {
    const data = makeTransaction()

    const { rerender } = renderWithProviders('checkout', data)

    expect(screen.getByLabelText('Copiar Session ID')).toBeTruthy()
    expect(screen.getByLabelText('Copiar Documento')).toBeTruthy()
    expect(screen.getByLabelText('Copiar Email')).toBeTruthy()
    expect(screen.getByLabelText('Copiar Telefone')).toBeTruthy()

    rerender(
      React.createElement(
        ToastProvider,
        null,
        React.createElement(
          TooltipProvider,
          null,
          React.createElement(StepDetail, { step: 'payment', data })
        )
      )
    )

    expect(screen.getByLabelText('Copiar Payment ID (Braspag/Cielo)')).toBeTruthy()
    expect(screen.getByLabelText('Copiar NSU')).toBeTruthy()
  })

  it('renders copy buttons for contract and omie fields', () => {
    const data = makeTransaction({
      clicksign_status: 'Assinado',
    })

    const { rerender } = renderWithProviders('contract', data)

    expect(screen.getByLabelText('Copiar Envelope ID')).toBeTruthy()
    expect(screen.getByLabelText('Copiar Document Key')).toBeTruthy()
    expect(screen.getByLabelText('Copiar E-mail do signatário')).toBeTruthy()

    rerender(
      React.createElement(
        ToastProvider,
        null,
        React.createElement(
          TooltipProvider,
          null,
          React.createElement(StepDetail, { step: 'omie', data })
        )
      )
    )

    expect(screen.getByLabelText('Copiar Sync ID')).toBeTruthy()
  })

  it('opens payload modal for each OMIE id', () => {
    const data = makeTransaction({
      omie_cliente_id: 'omie-cliente-1',
      omie_servico_id: 'omie-servico-2',
      omie_os_id: 'omie-os-3',
      omie_cliente_payload: { cliente: { codigo_cliente_integracao: 'abc' } },
      omie_servico_payload: { service: { celebridade: 'Teste' } },
      omie_os_payload: { param: [{ Cabecalho: { cCodIntOS: 'xpto' } }] },
    })

    renderWithProviders('omie', data)

    fireEvent.click(screen.getByRole('button', { name: 'omie-cliente-1' }))
    expect(screen.getByText('Payload enviado para OMIE (Cliente)')).toBeTruthy()
    expect(screen.getByText(/"codigo_cliente_integracao": "abc"/)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: /close/i }))

    fireEvent.click(screen.getByRole('button', { name: 'omie-servico-2' }))
    expect(screen.getByText('Payload enviado para OMIE (Serviço)')).toBeTruthy()
    expect(screen.getByText(/"celebridade": "Teste"/)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: /close/i }))

    fireEvent.click(screen.getByRole('button', { name: 'omie-os-3' }))
    expect(screen.getByText('Payload enviado para OMIE (OS)')).toBeTruthy()
    expect(screen.getByText(/"cCodIntOS": "xpto"/)).toBeTruthy()
  })

  it('shows split installments when split group exists', () => {
    const data = makeTransaction({
      metodo_pagamento: 'boleto',
      parcelas: 1,
      split_group_id: 'group-1',
      split_total_sessoes: 6,
      compra_numero_parcelas: 6,
    })

    renderWithProviders('checkout', data)

    const row = screen.getByText('Parcelas').closest('div')
    expect(row?.textContent).toContain('6')
    expect(screen.queryByText('6 (planejadas)')).toBeNull()
  })

  it('shows planned installments for boleto without split', () => {
    const data = makeTransaction({
      metodo_pagamento: 'boleto',
      parcelas: 1,
      split_group_id: null,
      split_total_sessoes: null,
      compra_numero_parcelas: 6,
    })

    renderWithProviders('checkout', data)

    const row = screen.getByText('Parcelas').closest('div')
    expect(row?.textContent).toContain('6 (planejadas)')
  })

  it('falls back to checkout session installments in non-boleto flows', () => {
    const data = makeTransaction({
      metodo_pagamento: 'cartao',
      parcelas: 4,
      split_group_id: null,
      split_total_sessoes: null,
      compra_numero_parcelas: 6,
    })

    renderWithProviders('checkout', data)

    const row = screen.getByText('Parcelas').closest('div')
    expect(row?.textContent).toContain('4')
  })
})
