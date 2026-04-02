/**
 * Boleto parcelado (carnê): parcel calculation and Cielo/Braspag boleto generation.
 * Used by create-boleto-parcelado Edge Function.
 */

export interface ParcelaBoleto {
  parcela: number;
  valorCentavos: number;
  vencimento: Date;
}

/**
 * Add N business days to a date (skip weekend).
 */
export function adicionarDiasUteis(data: Date, dias: number): Date {
  const result = new Date(data);
  let added = 0;
  while (added < dias) {
    result.setDate(result.getDate() + 1);
    const day = result.getDay();
    if (day !== 0 && day !== 6) added++;
  }
  return result;
}

/**
 * Adjust date to next business day if it falls on weekend.
 */
export function ajustarDiaUtil(data: Date): Date {
  const dow = data.getDay();
  if (dow === 0) data.setDate(data.getDate() + 1);
  else if (dow === 6) data.setDate(data.getDate() + 2);
  return data;
}

/**
 * Add N calendar days to a date, then adjust to next business day if needed.
 */
export function adicionarDiasCorridos(data: Date, dias: number): Date {
  const result = new Date(data);
  result.setDate(result.getDate() + dias);
  return ajustarDiaUtil(result);
}

/**
 * Calculate due date for a given parcel index.
 * - Index 0 (first parcel): base date + diasVencimento calendar days (adjusted to business day)
 * - Index 1+: monthly intervals from the first parcel date (adjusted to business day)
 *
 * @param dataBase - Base date (usually today)
 * @param indiceParcela - 0-based parcel index
 * @param diasVencimento - Calendar days until first due date (default: 30, from checkout_config.boleto_first_due_days)
 */
function calcularVencimento(dataBase: Date, indiceParcela: number, diasVencimento = 30): Date {
  if (indiceParcela === 0) {
    return adicionarDiasCorridos(new Date(dataBase), diasVencimento);
  }
  // Subsequent parcels: monthly from base + diasVencimento
  const primeiraParcela = adicionarDiasCorridos(new Date(dataBase), diasVencimento);
  const data = new Date(primeiraParcela);
  const targetMonth = (data.getMonth() + indiceParcela) % 12;
  const targetYear = data.getFullYear() + Math.floor((data.getMonth() + indiceParcela) / 12);
  data.setMonth(data.getMonth() + indiceParcela);
  // Handle month overflow (e.g. Jan 31 + 1 month → Mar 3 instead of Feb 28)
  if (data.getMonth() !== targetMonth || data.getFullYear() !== targetYear) {
    // Clamp to last day of the target month
    data.setDate(0); // sets to last day of previous month (= target month)
  }
  return ajustarDiaUtil(data);
}

/**
 * Calculate installments: value per parcel and due dates.
 * First parcel: base + diasVencimento calendar days. Others: monthly from first.
 * Any cent remainder is applied to the last parcel to preserve total exactness.
 *
 * @param valorTotalCentavos - Total amount in cents
 * @param quantidadeParcelas - Number of installments
 * @param diasVencimento - Calendar days until first due date (default: 30, from checkout_config.boleto_first_due_days)
 */
export function calcularParcelasBoleto(
  valorTotalCentavos: number,
  quantidadeParcelas: number,
  diasVencimento = 30
): ParcelaBoleto[] {
  const valorParcela = Math.floor(valorTotalCentavos / quantidadeParcelas);
  const resto = valorTotalCentavos - valorParcela * quantidadeParcelas;

  const parcelas: ParcelaBoleto[] = [];
  const hoje = new Date();

  for (let i = 0; i < quantidadeParcelas; i++) {
    const vencimento = calcularVencimento(hoje, i, diasVencimento);
    const valor = i === quantidadeParcelas - 1 ? valorParcela + resto : valorParcela;
    parcelas.push({
      parcela: i + 1,
      valorCentavos: valor,
      vencimento,
    });
  }

  return parcelas;
}

/**
 * Calculate installments with an explicit first due date (no diasVencimento calculation).
 * Subsequent parcels: monthly intervals from dataPrimeiraParcela (same day of month).
 * Unlike calcularParcelasBoleto, does NOT apply ajustarDiaUtil — the caller controls the exact date.
 * Any cent remainder is applied to the last parcel to preserve total exactness.
 *
 * @param valorTotalCentavos - Total amount in cents
 * @param quantidadeParcelas - Number of installments
 * @param dataPrimeiraParcela - Exact date for the first installment
 */
export function calcularParcelasBoletoComDataBase(
  valorTotalCentavos: number,
  quantidadeParcelas: number,
  dataPrimeiraParcela: Date
): ParcelaBoleto[] {
  const valorParcela = Math.floor(valorTotalCentavos / quantidadeParcelas);
  const resto = valorTotalCentavos - valorParcela * quantidadeParcelas;

  const parcelas: ParcelaBoleto[] = [];

  for (let i = 0; i < quantidadeParcelas; i++) {
    let vencimento: Date;
    if (i === 0) {
      vencimento = new Date(dataPrimeiraParcela);
    } else {
      vencimento = new Date(dataPrimeiraParcela);
      const targetMonth = (vencimento.getMonth() + i) % 12;
      const targetYear = vencimento.getFullYear() + Math.floor((vencimento.getMonth() + i) / 12);
      vencimento.setMonth(vencimento.getMonth() + i);
      if (vencimento.getMonth() !== targetMonth || vencimento.getFullYear() !== targetYear) {
        vencimento.setDate(0);
      }
    }

    const valor = i === quantidadeParcelas - 1 ? valorParcela + resto : valorParcela;
    parcelas.push({
      parcela: i + 1,
      valorCentavos: valor,
      vencimento,
    });
  }

  return parcelas;
}

/**
 * Validates and parses a primeiro_vencimento string (YYYY-MM-DD).
 * Returns the Date if valid and >= today, or null with an error message.
 */
export function parsePrimeiroVencimento(value: string): { date: Date; error?: undefined } | { date?: undefined; error: string } {
  const match = /^\d{4}-\d{2}-\d{2}$/.test(value);
  if (!match) {
    return { error: 'primeiro_vencimento deve estar no formato YYYY-MM-DD' };
  }

  const parsed = new Date(`${value}T00:00:00`);
  if (isNaN(parsed.getTime())) {
    return { error: 'primeiro_vencimento é uma data inválida' };
  }

  const roundtrip = parsed.toISOString().split('T')[0];
  if (roundtrip !== value) {
    return { error: 'primeiro_vencimento é uma data inválida' };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (parsed < today) {
    return { error: 'primeiro_vencimento não pode ser uma data no passado' };
  }

  return { date: parsed };
}

export interface SessionForBoleto {
  cliente_nome: string;
  cliente_documento: string;
  cliente_cep: string | null;
  cliente_endereco: string | null;
  cliente_numero: string | null;
  cliente_bairro: string | null;
  cliente_cidade: string | null;
  cliente_uf: string | null;
}

export interface BoletoAddressValidationResult {
  valid: boolean
  normalized: SessionForBoleto
  errors: string[]
}

// Conservative limits for Braspag/Cielo boleto payload fields.
export const BOLETO_ADDRESS_LIMITS = {
  nameMax: 120,
  streetMax: 100,
  numberMax: 10,
  districtMax: 50,
  cityMax: 50,
  stateLen: 2,
  zipLen: 8,
} as const

export function normalizeBoletoDistrict(value: string | null | undefined): string | null {
  const normalized = normalizeFreeText(value)
  if (!normalized) return null
  return truncate(normalized, BOLETO_ADDRESS_LIMITS.districtMax)
}

function normalizeFreeText(value: string | null | undefined): string {
  return (value ?? '')
    .normalize('NFKC')
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function onlyDigits(value: string | null | undefined): string {
  return (value ?? '').replace(/\D/g, '')
}

function truncate(value: string, max: number): string {
  if (value.length <= max) return value
  return value.slice(0, max).trim()
}

/**
 * Validates and normalizes boleto payer/address fields before gateway call.
 * Policy:
 * - Reject invalid mandatory fields (instead of silently truncating)
 * - Normalize whitespace/control chars for payload stability
 */
export function validateAndNormalizeBoletoAddress(
  session: SessionForBoleto
): BoletoAddressValidationResult {
  const errors: string[] = []

  const clienteNome = normalizeFreeText(session.cliente_nome)
  const clienteDocumento = onlyDigits(session.cliente_documento)
  const clienteCep = onlyDigits(session.cliente_cep)
  const clienteEndereco = normalizeFreeText(session.cliente_endereco)
  const clienteNumero = normalizeFreeText(session.cliente_numero)
  const clienteBairro = normalizeFreeText(session.cliente_bairro)
  const clienteCidade = normalizeFreeText(session.cliente_cidade)
  const clienteUf = normalizeFreeText(session.cliente_uf).toUpperCase()

  if (!clienteNome || clienteNome.length < 3 || clienteNome.length > BOLETO_ADDRESS_LIMITS.nameMax) {
    errors.push(`cliente_nome deve ter entre 3 e ${BOLETO_ADDRESS_LIMITS.nameMax} caracteres`)
  }

  if (!(clienteDocumento.length === 11 || clienteDocumento.length === 14)) {
    errors.push('cliente_documento deve ser CPF/CNPJ válido')
  }

  if (clienteCep.length !== BOLETO_ADDRESS_LIMITS.zipLen) {
    errors.push('cliente_cep deve ter 8 dígitos')
  }

  if (!clienteEndereco || clienteEndereco.length > BOLETO_ADDRESS_LIMITS.streetMax) {
    errors.push(`cliente_endereco é obrigatório e deve ter até ${BOLETO_ADDRESS_LIMITS.streetMax} caracteres`)
  }

  if (!clienteNumero || clienteNumero.length > BOLETO_ADDRESS_LIMITS.numberMax) {
    errors.push(`cliente_numero é obrigatório e deve ter até ${BOLETO_ADDRESS_LIMITS.numberMax} caracteres`)
  }

  if (!clienteBairro || clienteBairro.length > BOLETO_ADDRESS_LIMITS.districtMax) {
    errors.push(`cliente_bairro é obrigatório e deve ter até ${BOLETO_ADDRESS_LIMITS.districtMax} caracteres`)
  }

  if (!clienteCidade || clienteCidade.length > BOLETO_ADDRESS_LIMITS.cityMax) {
    errors.push(`cliente_cidade é obrigatório e deve ter até ${BOLETO_ADDRESS_LIMITS.cityMax} caracteres`)
  }

  if (!/^[A-Z]{2}$/.test(clienteUf)) {
    errors.push('cliente_uf deve ter 2 letras')
  }

  return {
    valid: errors.length === 0,
    errors,
    normalized: {
      cliente_nome: truncate(clienteNome, BOLETO_ADDRESS_LIMITS.nameMax),
      cliente_documento: clienteDocumento,
      cliente_cep: clienteCep,
      cliente_endereco: truncate(clienteEndereco, BOLETO_ADDRESS_LIMITS.streetMax),
      cliente_numero: truncate(clienteNumero, BOLETO_ADDRESS_LIMITS.numberMax),
      cliente_bairro: truncate(clienteBairro, BOLETO_ADDRESS_LIMITS.districtMax),
      cliente_cidade: truncate(clienteCidade, BOLETO_ADDRESS_LIMITS.cityMax),
      cliente_uf: clienteUf.slice(0, BOLETO_ADDRESS_LIMITS.stateLen),
    },
  }
}

export interface GerarBoletoResult {
  success: boolean;
  paymentId?: string;
  boletoNumber?: string;
  barCode?: string;
  digitableLine?: string;
  url?: string;
  dueDate?: string;
  response?: unknown;
}

/**
 * Call Braspag Pagador v2 to create a single boleto. Used by create-boleto-parcelado.
 */
export async function gerarBoletoNaCielo(
  amountCentavos: number,
  dueDateStr: string,
  session: SessionForBoleto,
  merchantId: string,
  merchantKey: string,
  apiUrl: string
): Promise<GerarBoletoResult> {
  const doc = session.cliente_documento.replace(/\D/g, '');
  const identityType = doc.length === 11 ? 'CPF' : 'CNPJ';
  const merchantOrderId = crypto.randomUUID().replace(/-/g, '').substring(0, 25);

  const payload = {
    MerchantOrderId: merchantOrderId,
    Customer: {
      Name: session.cliente_nome,
      Identity: doc,
      IdentityType: identityType,
      Address: {
        Street: session.cliente_endereco || 'Não informado',
        Number: session.cliente_numero || 'S/N',
        Complement: '',
        ZipCode: (session.cliente_cep || '00000000').replace(/\D/g, ''),
        District: session.cliente_bairro || 'Centro',
        City: session.cliente_cidade || 'São Paulo',
        State: session.cliente_uf || 'SP',
        Country: 'BRA',
      },
    },
    Payment: {
      Type: 'Boleto',
      Amount: amountCentavos,
      Provider: 'Bradesco2',
      ExpirationDate: dueDateStr,
      Instructions: 'Não receber após o vencimento',
      Demonstrative: 'Pagamento referente a compra online',
    },
  };

  const response = await fetch(`${apiUrl}/v2/sales/`, {
    method: 'POST',
    headers: {
      MerchantId: merchantId,
      MerchantKey: merchantKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const result = await response.json().catch(() => ({}));

  const success = !!result.Payment?.Url || !!result.Payment?.BarCodeNumber;

  return {
    success,
    paymentId: result.Payment?.PaymentId,
    boletoNumber: result.Payment?.BoletoNumber,
    barCode: result.Payment?.BarCodeNumber,
    digitableLine: result.Payment?.DigitableLine,
    url: result.Payment?.Url,
    dueDate: result.Payment?.ExpirationDate,
    response: result,
  };
}
