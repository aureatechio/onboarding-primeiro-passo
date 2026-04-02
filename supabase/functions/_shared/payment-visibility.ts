/**
 * Payment methods visibility for checkout (selection dynamique).
 * Used by get-checkout-session and process-checkout validation.
 */

export interface PaymentMethodsVisibility {
  visible: string[];
  hidden: string[];
  preselected: string;
  allow_switch: boolean;
  permite_dois_meios: boolean;
  boleto_parcelado: {
    enabled: true;
    parcelas_max: number;
  } | null;
}

/**
 * Compute which payment methods are visible and preselected for a session.
 *
 * Payment methods always visible: pix, cartao, dois_meios.
 * Boleto visibility depends on session method or boleto_parcelado flag.
 *
 * DESIGN DECISION (2026-02): PIX and Cartão are always visible to maximize
 * conversion — the customer can switch payment method freely at checkout.
 * The CRM flags `compras.pagamento_pix` and `compras.pagamento_cartao_credito`
 * are informational only (track what the salesperson offered) and do NOT gate
 * checkout visibility. Only boleto has conditional visibility.
 *
 * NOTE: `permiteDoisMeios` parameter is kept for backward compatibility but
 * is no longer used — dois_meios is always visible since 2026-02.
 */
export function getPaymentMethodsVisibility(
  metodo: string,
  _permiteDoisMeios: boolean,
  boletoParceladoEnabled: boolean,
  boletoParcelasMax: number | null,
  recorrenciaEnabled?: boolean
): PaymentMethodsVisibility {
  const visible: string[] = ['pix', 'cartao', 'dois_meios'];
  const hidden: string[] = [];

  if (metodo === 'boleto' || boletoParceladoEnabled) {
    visible.push('boleto');
  } else {
    hidden.push('boleto');
  }

  // Boleto parcelado: sempre disponível quando boleto está visível (não requer autorização prévia)
  if (visible.includes('boleto')) {
    visible.push('boleto_parcelado');
  } else {
    hidden.push('boleto_parcelado');
  }

  if (recorrenciaEnabled) {
    visible.push('cartao_recorrente');
  } else {
    hidden.push('cartao_recorrente');
  }

  let preselected = metodo;
  if (!visible.includes(metodo)) {
    preselected = 'pix';
  }

  return {
    visible,
    hidden,
    preselected,
    allow_switch: true,
    permite_dois_meios: true,
    boleto_parcelado: visible.includes('boleto')
      ? { enabled: true, parcelas_max: boletoParcelasMax ?? 12 }
      : null,
  };
}

/**
 * Check if a method is allowed for this session (visible).
 */
export function isMethodVisible(
  metodoSelecionado: string,
  visibility: PaymentMethodsVisibility
): boolean {
  return visibility.visible.includes(metodoSelecionado);
}
