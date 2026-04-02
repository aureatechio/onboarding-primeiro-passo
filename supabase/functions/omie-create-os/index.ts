import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import {
  buildDadosAdicNfFiscal,
  normalizeObservacoesForOmie,
  resolveTipoVendaCaracteristica,
} from '../_shared/omie/canonical-os-payload.ts';
import {
  addBusinessDays,
  calcPrevisaoFaturamento,
  formatDateDDMMYYYY,
  startOfDay,
  toDate,
} from '../_shared/omie/date-utils.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const isValidEmail = (value: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

const formatDate = formatDateDDMMYYYY;

const extractPayload = (body: Record<string, unknown>) => {
  if (body.record && typeof body.record === 'object') {
    return body.record as Record<string, unknown>;
  }
  if (body.os && typeof body.os === 'object') {
    return body.os as Record<string, unknown>;
  }
  return body;
};

const getString = (value: unknown) => (typeof value === 'string' ? value : undefined);
const getNumber = (value: unknown) => (typeof value === 'number' ? value : undefined);
const toNumber = (value: unknown) => {
  if (typeof value === 'number') return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? undefined : parsed;
  }
  return undefined;
};

const normalizeOmieFlag = (value: unknown): 'S' | 'N' | undefined => {
  if (typeof value === 'string') {
    const normalized = value.trim().toUpperCase();
    if (normalized === 'S' || normalized === 'N') return normalized;
  }
  if (typeof value === 'boolean') return value ? 'S' : 'N';
  return undefined;
};

const normalizeBoolean = (value: unknown): boolean | undefined => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['true', '1', 's', 'sim', 'yes', 'y'].includes(normalized)) return true;
    if (['false', '0', 'n', 'nao', 'não', 'no'].includes(normalized)) return false;
  }
  return undefined;
};

const normalizeEscapedLineBreaks = (value: string): string =>
  value
    .replace(/\\r\\n/g, '\n')
    .replace(/\\n/g, '\n')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n');

const formatDescricaoForOmieUi = (value: string): string => {
  const normalized = normalizeEscapedLineBreaks(value).trim();
  if (!normalized) return normalized;
  const lines = normalized
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  if (lines.length <= 1) return lines[0] ?? '';
  // OMIE UI may flatten line breaks; keep readability with explicit separator.
  return lines.join(' - ');
};

const normalizeOsOperation = (value: unknown, fallback: 'incluir' | 'alterar'): 'incluir' | 'alterar' => {
  if (typeof value !== 'string') return fallback;
  const normalized = value.trim().toLowerCase();
  if (normalized === 'alterar' || normalized === 'update') return 'alterar';
  if (normalized === 'incluir' || normalized === 'create') return 'incluir';
  return fallback;
};

const mergeDadosAdicNfWithTipoVenda = (
  baseDadosAdicNf: string,
  tipoVendaCaracteristica: string | undefined
): string => {
  if (!tipoVendaCaracteristica) return baseDadosAdicNf;
  const marker = `Tipo de venda: ${tipoVendaCaracteristica}`;
  if (baseDadosAdicNf.includes(marker)) return baseDadosAdicNf;
  return `${baseDadosAdicNf}\n${marker}`;
};

const normalizeDepartamentos = (value: unknown): unknown[] => {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
};

const extractDepartamentoCode = (item: unknown): string | null => {
  if (typeof item === 'string') {
    const code = item.trim();
    return code ? code : null;
  }
  if (typeof item === 'number' && Number.isFinite(item)) {
    return String(item);
  }
  if (item && typeof item === 'object') {
    const record = item as Record<string, unknown>;
    const rawCode = record.cCodDepto ?? record.codigo;
    if (typeof rawCode === 'string') {
      const code = rawCode.trim();
      return code ? code : null;
    }
    if (typeof rawCode === 'number' && Number.isFinite(rawCode)) {
      return String(rawCode);
    }
  }
  return null;
};

const parseDepartamentosCodigos = (value: unknown): string[] => {
  const parts: unknown[] = [];
  if (typeof value === 'string') {
    parts.push(...value.split(','));
  } else if (Array.isArray(value)) {
    parts.push(...value);
  } else if (value !== undefined && value !== null) {
    parts.push(value);
  }

  const codes: string[] = [];
  const seen = new Set<string>();
  for (const part of parts) {
    const code = extractDepartamentoCode(part);
    if (!code || seen.has(code)) continue;
    seen.add(code);
    codes.push(code);
  }
  return codes;
};

const asLegacyDepartamentos = (value: unknown): Record<string, unknown>[] => {
  if (!Array.isArray(value)) return [];
  const items = value.filter(
    (item) => item && typeof item === 'object'
  ) as Record<string, unknown>[];
  return items.filter((item) => extractDepartamentoCode(item) !== null);
};

const buildDepartamentosFromCodes = (
  codes: string[],
  totalValue?: number
): Array<{ cCodDepto: string; nPerc: number; nValor: number; nValorFixo: 'N' }> => {
  if (!codes.length) return [];
  const size = codes.length;
  const percBase = Number((100 / size).toFixed(2));
  let percUsed = 0;

  const total = Number(totalValue ?? 0);
  const shouldUseIntegerSplit = Number.isInteger(total);
  const totalCents = shouldUseIntegerSplit ? 0 : Math.round(total * 100);
  const valueBase = shouldUseIntegerSplit
    ? Math.floor(total / size)
    : Math.floor(totalCents / size);
  const valueRest = shouldUseIntegerSplit
    ? Math.round(total - valueBase * size)
    : totalCents - valueBase * size;

  return codes.map((code, index) => {
    const isLast = index === size - 1;
    const nPerc = isLast ? Number((100 - percUsed).toFixed(2)) : percBase;
    if (!isLast) percUsed = Number((percUsed + nPerc).toFixed(2));

    const baseValue = isLast ? valueBase + valueRest : valueBase;
    const nValor = shouldUseIntegerSplit ? baseValue : Number((baseValue / 100).toFixed(2));

    return {
      cCodDepto: code,
      nPerc,
      nValor,
      nValorFixo: 'N',
    };
  });
};

const DIGIT_ONLY_REGEX = /^\d+$/;

const parseOsIdFromMessage = (message: string): number | null => {
  const patterns = [
    /nCodOS\s*\[(\d+)\]/i,
    /Id\s*\[(\d+)\]/i,
    /c[oó]digo.*os[^\d]*(\d+)/i,
  ];
  for (const pattern of patterns) {
    const match = message.match(pattern);
    if (match?.[1] && DIGIT_ONLY_REGEX.test(match[1])) {
      return Number(match[1]);
    }
  }
  return null;
};

const collectNumericValuesByKeys = (
  input: unknown,
  keys: Set<string>,
  output: number[] = []
): number[] => {
  if (!input) return output;
  if (Array.isArray(input)) {
    for (const item of input) {
      collectNumericValuesByKeys(item, keys, output);
    }
    return output;
  }
  if (typeof input !== 'object') return output;

  const record = input as Record<string, unknown>;
  for (const [key, value] of Object.entries(record)) {
    if (keys.has(key)) {
      const numeric = toNumber(value);
      if (numeric !== undefined && Number.isFinite(numeric) && numeric > 0) {
        output.push(numeric);
      }
    }
    collectNumericValuesByKeys(value, keys, output);
  }
  return output;
};

const findExistingOsIdByCodInt = async (
  omieApiUrl: string,
  appKey: string,
  appSecret: string,
  cCodIntOS: string
): Promise<number | null> => {
  const calls: Array<{ call: string; param: Record<string, unknown> }> = [
    { call: 'ConsultarOS', param: { cCodIntOS } },
    { call: 'PesquisarOS', param: { cCodIntOS } },
    {
      call: 'ListarOS',
      param: {
        cCodIntOS,
        nPagina: 1,
        nRegPorPagina: 20,
      },
    },
  ];

  for (const candidate of calls) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 7000);
    try {
      const searchPayload = {
        call: candidate.call,
        app_key: appKey,
        app_secret: appSecret,
        param: [candidate.param],
      };

      const searchResponse = await fetch(omieApiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(searchPayload),
        signal: controller.signal,
      });

      let searchData: unknown = null;
      try {
        searchData = await searchResponse.json();
      } catch {
        searchData = null;
      }

      const ids = collectNumericValuesByKeys(
        searchData,
        new Set(['nCodOS', 'nCodOs', 'codigo_os'])
      );
      if (ids.length > 0) return ids[0];
    } catch {
      // Best-effort fallback: ignore and try next OMIE query variant.
    } finally {
      clearTimeout(timeoutId);
    }
  }

  return null;
};

const DEFAULT_COD_CATEG = '1.01.02';
const DEFAULT_NCODCC = 5191114476;

const MEIO_PAGAMENTO_MAP: Record<string, { meio_pagamento: string; tipo_documento: string }> = {
  cartao: { meio_pagamento: '03', tipo_documento: 'CRC' },
  credit_card: { meio_pagamento: '03', tipo_documento: 'CRC' },
  credito: { meio_pagamento: '03', tipo_documento: 'CRC' },
  pix: { meio_pagamento: '17', tipo_documento: 'PIX' },
  boleto: { meio_pagamento: '15', tipo_documento: 'BOL' },
};

const resolveMeioPagamento = (metodo?: string) => {
  if (!metodo) return undefined;
  const normalized = metodo.trim().toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const exact = MEIO_PAGAMENTO_MAP[normalized];
  if (exact) return exact;
  for (const [key, value] of Object.entries(MEIO_PAGAMENTO_MAP)) {
    if (normalized.includes(key)) return value;
  }
  return undefined;
};

const isMissingAlterIdentifierFault = (message: string) =>
  /tag\s*\[(nCodOS|cCodIntOS)\]/i.test(message) || /nCodOS|cCodIntOS/i.test(message);

const hasValidAlterIdentifiers = (snapshot: {
  cabecalho?: { cCodIntOS?: string | null; nCodOS?: number | null };
}) => {
  const cCodIntOS = snapshot.cabecalho?.cCodIntOS;
  const nCodOS = snapshot.cabecalho?.nCodOS;
  return (
    typeof cCodIntOS === 'string' &&
    cCodIntOS.trim() !== '' &&
    typeof nCodOS === 'number' &&
    Number.isFinite(nCodOS) &&
    nCodOS > 0
  );
};

const shouldRunAlterToIncluirFallback = ({
  osOperation,
  fallbackPerformed,
  compraId,
  faultMessage,
  requestSnapshot,
}: {
  osOperation: string;
  fallbackPerformed: boolean;
  compraId: string | null | undefined;
  faultMessage: string;
  requestSnapshot: {
    cabecalho?: { cCodIntOS?: string | null; nCodOS?: number | null };
  };
}) => {
  if (osOperation !== 'alterar') return false;
  if (fallbackPerformed) return false;
  if (!compraId || compraId.trim() === '') return false;
  if (!/tag\s*\[(nCodOS|cCodIntOS)\]/i.test(faultMessage)) return false;
  return hasValidAlterIdentifiers(requestSnapshot);
};

const buildIncluirFallbackPayload = (omiePayload: Record<string, unknown>) => {
  const payloadParam = Array.isArray(omiePayload.param)
    ? (omiePayload.param[0] as Record<string, unknown> | undefined)
    : undefined;
  const cabecalho = (payloadParam?.Cabecalho as Record<string, unknown> | undefined) ?? null;

  if (!payloadParam || !cabecalho) return null;

  const { nCodOS: _ignore, ...cabecalhoWithoutOsId } = cabecalho;
  const servicosPrestadosRaw = Array.isArray(payloadParam.ServicosPrestados)
    ? payloadParam.ServicosPrestados
    : null;
  const servicosPrestadosSanitized = servicosPrestadosRaw
    ? servicosPrestadosRaw.map((item) => {
        if (!item || typeof item !== 'object') return item;
        const servico = item as Record<string, unknown>;
        const { cAcaoItem: _acaoItem, nSeqItem: _nSeqItem, ...rest } = servico;
        return rest;
      })
    : null;
  return {
    ...omiePayload,
    call: 'IncluirOS',
    param: [
      {
        ...payloadParam,
        Cabecalho: cabecalhoWithoutOsId,
        ...(servicosPrestadosSanitized ? { ServicosPrestados: servicosPrestadosSanitized } : {}),
      },
    ],
  };
};

const extractFaultMessage = (responseData: Record<string, unknown> | null) =>
  (responseData?.faultstring as string | undefined) ||
  (responseData?.error as string | undefined) ||
  null;

const buildRequestSnapshot = (
  omiePayload: Record<string, unknown>,
  correlationId: string,
  attempt: number
) => {
  const param = Array.isArray(omiePayload.param)
    ? (omiePayload.param[0] as Record<string, unknown> | undefined)
    : undefined;
  const cabecalho = (param?.Cabecalho as Record<string, unknown> | undefined) ?? {};
  const servicosPrestados = Array.isArray(param?.ServicosPrestados)
    ? (param?.ServicosPrestados as Array<Record<string, unknown>>)
    : [];
  const firstServico = servicosPrestados[0] ?? null;
  return {
    correlation_id: correlationId,
    attempt,
    call: omiePayload.call,
    cabecalho: {
      cCodIntOS:
        typeof cabecalho.cCodIntOS === 'string' && cabecalho.cCodIntOS.trim() !== ''
          ? cabecalho.cCodIntOS
          : null,
      nCodOS: toNumber(cabecalho.nCodOS) ?? null,
    },
    servicos_prestados_count: servicosPrestados.length,
    first_servico: firstServico
      ? {
          nSeqItem: toNumber(firstServico.nSeqItem) ?? null,
          cAcaoItem:
            typeof firstServico.cAcaoItem === 'string' && firstServico.cAcaoItem.trim() !== ''
              ? firstServico.cAcaoItem
              : null,
          cCodCategItem:
            typeof firstServico.cCodCategItem === 'string' &&
            firstServico.cCodCategItem.trim() !== ''
              ? firstServico.cCodCategItem
              : null,
          cDescServ_length:
            typeof firstServico.cDescServ === 'string' ? firstServico.cDescServ.length : 0,
          cDescServ_blank_direito_de_uso:
            typeof firstServico.cDescServ === 'string'
              ? /Direito de uso:\s*-\s/.test(firstServico.cDescServ)
              : null,
        }
      : null,
  };
};

const resolveDuplicateOs = async (
  normalizedMessage: string,
  responseData: Record<string, unknown> | null,
  cCodIntOS: string | null,
  hintOsId: number | null,
  omieApiUrl: string,
  appKey: string,
  appSecret: string
): Promise<{ nCodOS: number; cNumOS: string | null } | null> => {
  let existingOsId = parseOsIdFromMessage(normalizedMessage);

  if (!existingOsId) {
    const ids = collectNumericValuesByKeys(responseData, new Set(['nCodOS', 'nCodOs', 'codigo_os']));
    existingOsId = ids.length > 0 ? ids[0] : null;
  }

  if (!existingOsId && typeof hintOsId === 'number' && Number.isFinite(hintOsId) && hintOsId > 0) {
    existingOsId = hintOsId;
  }

  if (!existingOsId && cCodIntOS) {
    existingOsId = await findExistingOsIdByCodInt(omieApiUrl, appKey, appSecret, cCodIntOS);
  }

  if (!existingOsId) return null;

  const numMatch = normalizedMessage.match(/cNumOS\s*\[([^\]]+)\]/i);
  const existingNumOS = numMatch?.[1] ?? null;
  return {
    nCodOS: existingOsId,
    cNumOS: existingNumOS,
  };
};

const sendOmieRequest = async (
  omieApiUrl: string,
  omiePayload: Record<string, unknown>,
  timeoutMs = 10000
) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(omieApiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(omiePayload),
      signal: controller.signal,
    });
    let responseBody: unknown = null;
    try {
      responseBody = await response.json();
    } catch {
      responseBody = null;
    }
    return {
      ok: response.ok,
      status: response.status,
      data: responseBody as Record<string, unknown> | null,
    };
  } finally {
    clearTimeout(timeoutId);
  }
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: { code: 'METHOD_NOT_ALLOWED', message: 'Use POST' } }),
      {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }

  // Autorizacao interna por bearer (independente do modo verify_jwt do deploy).
  const authHeader = req.headers.get('authorization');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const crmServiceRoleKey = Deno.env.get('CRM_SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const crmSecretKey = Deno.env.get('CRM_SUPABASE_SECRET_KEY') ?? '';

  const expected = [serviceRoleKey, crmServiceRoleKey, crmSecretKey]
    .map((key) => key.trim())
    .filter((key) => key.length > 0)
    .map((key) => `Bearer ${key}`);

  if (!expected.length) {
    return new Response(
      JSON.stringify({ error: { code: 'CONFIG_ERROR', message: 'Service Role ausente' } }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  if (!authHeader || !expected.includes(authHeader)) {
    return new Response(
      JSON.stringify({ error: { code: 'UNAUTHORIZED', message: 'Authorization invalida' } }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return new Response(
      JSON.stringify({ error: { code: 'INVALID_JSON', message: 'JSON inválido' } }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }

  const appKey = Deno.env.get('OMIE_APP_KEY') ?? '';
  const appSecret = Deno.env.get('OMIE_APP_SECRET') ?? '';
  const omieBaseUrl = (Deno.env.get('OMIE_BASE_URL') ?? 'https://app.omie.com.br/api/v1').replace(
    /\/$/,
    ''
  );
  const omieApiUrl =
    Deno.env.get('OMIE_OS_API_URL') ?? `${omieBaseUrl}/servicos/os/`;

  if (!appKey || !appSecret) {
    return new Response(
      JSON.stringify({
        error: { code: 'OMIE_CREDENTIALS_MISSING', message: 'Credenciais OMIE ausentes' },
      }),
      {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }

  const payload = extractPayload(body);
  const compraId = getString(payload.compra_id) ?? getString(payload.id);
  const clienteOmieId = getNumber(payload.cliente_omie_id) ?? getNumber(payload.nCodCli);
  const email = getString(payload.email) ?? getString(payload.cliente_email);
  const cidadePrestacao = getString(payload.cidade_prestacao_servico);
  const formaPagamento = getString(payload.cCodParc) ?? getString(payload.forma_pagamento);
  const quantidadeParcelas =
    getNumber(payload.nQtdeParc) ?? getNumber(payload.quantidade_parcelas) ?? 1;
  const dataVenda = getString(payload.data_venda);
  const dataPrevisao = getString(payload.dDtPrevisao);
  const vendedorOmieCodigo = toNumber(payload.vendedor_omie_codigo);
  const nCodProj = toNumber(payload.nCodProj);
  const cNumContrato = getString(payload.cNumContrato) ?? getString(payload.numero_proposta);
  const omieOsId = toNumber(payload.omie_os_id) ?? toNumber(payload.nCodOS);
  const osOperation = normalizeOsOperation(
    payload.os_operation,
    omieOsId ? 'alterar' : 'incluir'
  );
  const paymentId = getString(payload.payment_id);
  const nsu = getString(payload.nsu);
  const metodoPagamento = getString(payload.metodo_pagamento);
  const observacoes = normalizeObservacoesForOmie(getString(payload.observacoes));
  const tipoVendaCaracteristica = resolveTipoVendaCaracteristica(
    getString(payload.caracteristica_tipo_venda) ??
    getString(payload.tipo_venda_label) ??
    getString(payload.tipo_venda)
  );
  const valorTotal = toNumber(payload.valor_total);
  const parcelasExplicitas = Array.isArray(payload.parcelas_explicitas) ? payload.parcelas_explicitas as Record<string, unknown>[] : undefined;
  const descricaoServicoFormatada =
    getString(payload.descricao_servico_formatada)?.trim() || undefined;
  const hasCodigoCategoriaInput = payload.codigo_categoria !== undefined || payload.cCodCateg !== undefined;
  const hasContaCorrenteInput = payload.conta_corrente_id !== undefined || payload.nCodCC !== undefined;
  const codigoCategoriaInput = getString(payload.codigo_categoria) ?? getString(payload.cCodCateg);
  const codigoCategoria = codigoCategoriaInput?.trim() ? codigoCategoriaInput.trim() : undefined;
  const contaCorrenteId = toNumber(payload.conta_corrente_id) ?? toNumber(payload.nCodCC);
  const osEtapaRaw = getString(payload.cEtapa) ?? getString(payload.os_etapa);
  const osEtapa =
    osEtapaRaw && /^\d{2}$/.test(osEtapaRaw.trim()) ? osEtapaRaw.trim() : '50';
  const rawDepartamentos =
    payload.departamentos ?? payload.Departamentos ?? payload.departamento_payload;
  const departamentosCodigos = parseDepartamentosCodigos(
    payload.departamentos_codigos ?? payload.departamentos_codigos_lista
  );
  const departamentosCodigosRaw = parseDepartamentosCodigos(rawDepartamentos);
  const departamentosLegacy = asLegacyDepartamentos(normalizeDepartamentos(rawDepartamentos));
  const departamentos =
    departamentosCodigos.length > 0
      ? buildDepartamentosFromCodes(departamentosCodigos, valorTotal)
      : (departamentosLegacy.length > 0
        ? departamentosLegacy
        : buildDepartamentosFromCodes(departamentosCodigosRaw, valorTotal));

  // Fiscal-only hard-stop: OMIE never generates/sends payment documents (PIX, boleto).
  // Payment is handled externally (Cielo). Ignore any upstream payment flags.
  const envBoleto: 'N' = 'N';
  const envPix: 'N' = 'N';
  // cEnvLink is NOT a payment flag — it controls whether OMIE emails the NFS-e link
  // generated by the prefeitura (purely fiscal). Read from payload; default to 'N'.
  const envLinkRaw = getString(payload.enviar_link_nfse) ?? getString(payload.cEnvLink);
  const envLink = envLinkRaw === 'S' || envLinkRaw === 'true' || payload.enviar_link_nfse === true
    ? 'S'
    : 'N';
  const envViaUnica = getString(payload.cEnvViaUnica) ?? getString(payload.env_via_unica);

  const servicosPrestados =
    (payload.servicos_prestados as unknown[]) ??
    (payload.ServicosPrestados as unknown[]) ??
    [];

  const missingFields: string[] = [];
  if (!compraId) missingFields.push('compra_id');
  if (!clienteOmieId) missingFields.push('cliente_omie_id');
  if (!email) missingFields.push('email');
  if (!cidadePrestacao) missingFields.push('cidade_prestacao_servico');
  if (!formaPagamento) missingFields.push('cCodParc');

  if (missingFields.length > 0) {
    return new Response(
      JSON.stringify({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Campos obrigatórios ausentes',
          fields: missingFields,
        },
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }

  if (osOperation === 'alterar' && (!omieOsId || omieOsId <= 0)) {
    return new Response(
      JSON.stringify({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'nCodOS (ou omie_os_id) e obrigatorio para AlterarOS',
          fields: ['nCodOS'],
        },
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }

  if (email && !isValidEmail(email)) {
    return new Response(
      JSON.stringify({
        error: { code: 'INVALID_EMAIL', message: 'Email inválido' },
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }

  if (hasCodigoCategoriaInput && !codigoCategoria) {
    return new Response(
      JSON.stringify({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'codigo_categoria/cCodCateg deve ser string não vazia',
        },
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }

  if (
    hasContaCorrenteInput &&
    (contaCorrenteId === undefined || !Number.isInteger(contaCorrenteId) || contaCorrenteId <= 0)
  ) {
    return new Response(
      JSON.stringify({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'conta_corrente_id/nCodCC deve ser inteiro positivo',
        },
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }

  if (envBoleto === 'S' && envPix === 'S') {
    return new Response(
      JSON.stringify({
        error: {
          code: 'INVALID_EMAIL_SETTINGS',
          message: 'Informe apenas cEnvBoleto ou cEnvPix',
        },
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }

  if (!Array.isArray(servicosPrestados) || servicosPrestados.length === 0) {
    return new Response(
      JSON.stringify({
        error: {
          code: 'SERVICOS_PRESTADOS_REQUIRED',
          message: 'ServicosPrestados é obrigatório',
        },
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }

  type NormalizedServico = Record<string, unknown> & {
    nCodServico: number;
    cCodServMun?: string;
    cCodServLC116?: string;
    cTribServ?: string;
    cRetemISS?: string;
    cCodCategItem?: string;
    impostos?: Record<string, unknown>;
  };

  const normalizedServicosPrestados: NormalizedServico[] = servicosPrestados
    .map((item): NormalizedServico | null => {
      if (!item || typeof item !== 'object') return null;
      const record = item as Record<string, unknown>;
      const nCodServico = toNumber(record.nCodServico ?? record.nCodServ ?? record.cCodServ);
      const nValUnit = toNumber(record.nValUnit ?? record.nValorUnit);
      const cDescServInput = getString(record.cDescServ ?? record.cDescricao);
      const rawDescricao = descricaoServicoFormatada ?? cDescServInput;
      const cDescServ = rawDescricao ? formatDescricaoForOmieUi(rawDescricao) : undefined;
      const cCodServMun = getString(record.cCodServMun) ?? (typeof record.cCodServMun === 'number' ? String(record.cCodServMun) : undefined);
      const cCodServLC116 = getString(record.cCodServLC116) ?? (typeof record.cCodServLC116 === 'number' ? String(record.cCodServLC116) : undefined);
      const cTribServ = getString(record.cTribServ) ?? (typeof record.cTribServ === 'number' ? String(record.cTribServ) : undefined);
      const cCodCategItemInput =
        getString(record.cCodCategItem) ??
        (typeof record.cCodCategItem === 'number' ? String(record.cCodCategItem) : undefined);
      const cCodCategItem = cCodCategItemInput?.trim() ? cCodCategItemInput.trim() : undefined;

      let impostosObj: Record<string, unknown> | undefined;
      let cRetemISSField: string | undefined;
      if (record.impostos && typeof record.impostos === 'object') {
        const imp = record.impostos as Record<string, unknown>;
        const nAliqISS = getNumber(imp.nAliqISS);
        // Keep backward compatibility for callers still sending cRetemISS inside impostos.
        cRetemISSField = getString(record.cRetemISS ?? imp.cRetemISS);
        if (nAliqISS !== undefined) {
          impostosObj = {
            ...(nAliqISS !== undefined ? { nAliqISS } : {}),
          };
        }
      } else {
        cRetemISSField = getString(record.cRetemISS);
      }

      const {
        cCodServ,
        cDescricao,
        nValorUnit,
        nCodServ,
        nCodServico: _nCodServico,
        cCodServMun: _cCodServMun,
        cCodServLC116: _cCodServLC116,
        cTribServ: _cTribServ,
        cCodCategItem: _cCodCategItem,
        impostos: _impostos,
        ...rest
      } = record;
      if (nCodServico === undefined) return null;
      return {
        ...rest,
        nCodServico,
        ...(nValUnit !== undefined ? { nValUnit } : {}),
        ...(cDescServ ? { cDescServ } : {}),
        ...(cCodServMun ? { cCodServMun } : {}),
        ...(cCodServLC116 ? { cCodServLC116 } : {}),
        ...(cTribServ ? { cTribServ } : {}),
        ...(cCodCategItem ? { cCodCategItem } : {}),
        ...(cRetemISSField ? { cRetemISS: cRetemISSField } : {}),
        ...(impostosObj ? { impostos: impostosObj } : {}),
      };
    })
    .filter((item): item is NormalizedServico => item !== null);
  if (osOperation === 'alterar') {
    normalizedServicosPrestados.forEach((item, index) => {
      if (!Number.isFinite(toNumber(item.nSeqItem))) {
        item.nSeqItem = index + 1;
      }
      if (typeof item.cAcaoItem !== 'string' || item.cAcaoItem.trim() === '') {
        item.cAcaoItem = 'A';
      }
      if (
        codigoCategoria &&
        (typeof item.cCodCategItem !== 'string' || item.cCodCategItem.trim() === '')
      ) {
        item.cCodCategItem = codigoCategoria;
      }
    });
  }

  if (normalizedServicosPrestados.length === 0) {
    return new Response(
      JSON.stringify({
        error: {
          code: 'INVALID_SERVICO',
          message: 'ServicosPrestados precisa de nCodServico (ou cCodServ) valido',
        },
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }

  const missingFiscalFields: string[] = [];
  for (let i = 0; i < normalizedServicosPrestados.length; i++) {
    const item = normalizedServicosPrestados[i];
    if (!item.cCodServMun)
      missingFiscalFields.push(`ServicosPrestados[${i}].cCodServMun`);
    if (!item.cCodServLC116)
      missingFiscalFields.push(`ServicosPrestados[${i}].cCodServLC116`);
    if (!item.cTribServ)
      missingFiscalFields.push(`ServicosPrestados[${i}].cTribServ`);
    if (!item.impostos) {
      missingFiscalFields.push(`ServicosPrestados[${i}].impostos.nAliqISS`);
      missingFiscalFields.push(`ServicosPrestados[${i}].cRetemISS`);
    } else {
      const imp = item.impostos as Record<string, unknown>;
      if (imp.nAliqISS === undefined)
        missingFiscalFields.push(`ServicosPrestados[${i}].impostos.nAliqISS`);
    }
    if (!item.cRetemISS)
      missingFiscalFields.push(`ServicosPrestados[${i}].cRetemISS`);
  }

  if (missingFiscalFields.length > 0) {
    return new Response(
      JSON.stringify({
        error: {
          code: 'NFSE_FIELDS_MISSING',
          message:
            'Campos fiscais obrigatórios ausentes em ServicosPrestados',
          fields: missingFiscalFields,
        },
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }

  const today = startOfDay(new Date());
  const { previsao, primeiraParcelaDate } = calcPrevisaoFaturamento(dataPrevisao, dataVenda);

  // Build Parcelas array — prefer explicit parcels from caller (mirroring checkout)
  const parcelasArray: Record<string, unknown>[] = [];

  if (parcelasExplicitas && parcelasExplicitas.length > 0) {
    for (const p of parcelasExplicitas) {
      parcelasArray.push({
        nParcela: toNumber(p.nParcela),
        nValor: toNumber(p.nValor),
        nPercentual: toNumber(p.nPercentual),
        dDtVenc: getString(p.dDtVenc),
        ...(p.meio_pagamento ? { meio_pagamento: getString(p.meio_pagamento) } : {}),
        ...(p.tipo_documento ? { tipo_documento: getString(p.tipo_documento) } : {}),
        ...(p.nsu ? { nsu: getString(p.nsu) } : {}),
      });
    }
  } else {
    const meioPag = resolveMeioPagamento(metodoPagamento);
    if (quantidadeParcelas > 0 && valorTotal && valorTotal > 0) {
      const percentualBase = Number(
        (Math.round((100 / quantidadeParcelas) * 100) / 100).toFixed(2)
      );
      let percentualAcumulado = 0;
      const valorParcela = Math.floor(valorTotal / quantidadeParcelas);
      const resto = valorTotal - (valorParcela * quantidadeParcelas);

      for (let i = 1; i <= quantidadeParcelas; i++) {
        const parcelaDate = new Date(primeiraParcelaDate);
        parcelaDate.setDate(parcelaDate.getDate() + (i - 1) * 30);
        const isLastParcela = i === quantidadeParcelas;
        const percentualParcela = isLastParcela
          ? Number((100 - percentualAcumulado).toFixed(2))
          : percentualBase;

        const parcela: Record<string, unknown> = {
          nParcela: i,
          nValor: i === quantidadeParcelas ? valorParcela + resto : valorParcela,
          nPercentual: percentualParcela,
          dDtVenc: formatDate(parcelaDate),
        };

        if (meioPag) {
          parcela.meio_pagamento = meioPag.meio_pagamento;
          parcela.tipo_documento = meioPag.tipo_documento;
        }
        if (nsu) parcela.nsu = nsu;
        if (paymentId && !nsu) parcela.nsu = paymentId;

        parcelasArray.push(parcela);
        if (!isLastParcela) {
          percentualAcumulado = Number((percentualAcumulado + percentualParcela).toFixed(2));
        }
      }
    }
  }

  const primeiraParcelaVencimento = getString(parcelasArray[0]?.dDtVenc);
  const primeiraParcelaDateParsed = toDate(primeiraParcelaVencimento);
  const previsaoDateParsed = toDate(previsao);
  if (!previsaoDateParsed || !primeiraParcelaDateParsed) {
    return new Response(
      JSON.stringify({
        error: {
          code: 'INVALID_FATURAMENTO_DATE',
          message:
            'Previsao de faturamento invalida: dDtPrevisao e a primeira parcela nao puderam ser calculadas.',
          details: {
            hoje: formatDate(today),
            dDtPrevisao: previsao,
            primeiraParcela: primeiraParcelaVencimento ?? null,
          },
        },
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }

  // Build InformacoesAdicionais (conditionally include nCodProj)
  const infoAdicionais: Record<string, unknown> = {
    cCidPrestServ: cidadePrestacao,
    cCodCateg: codigoCategoria ?? DEFAULT_COD_CATEG,
    cDadosAdicNF: mergeDadosAdicNfWithTipoVenda(
      buildDadosAdicNfFiscal(valorTotal),
      tipoVendaCaracteristica
    ),
    nCodCC: contaCorrenteId ?? DEFAULT_NCODCC,
  };
  if (nCodProj) infoAdicionais.nCodProj = nCodProj;
  if (cNumContrato) infoAdicionais.cNumContrato = cNumContrato;

  const hasExplicitParcelas = parcelasExplicitas && parcelasExplicitas.length > 0;
  const effectiveFormaPagamento = hasExplicitParcelas ? '999' : formaPagamento;
  const effectiveQtdeParcelas = hasExplicitParcelas ? parcelasArray.length : quantidadeParcelas;
  const sendParcelas = effectiveFormaPagamento === '999' && parcelasArray.length > 0;

  const omiePayload: Record<string, unknown> = {
    call: osOperation === 'alterar' ? 'AlterarOS' : 'IncluirOS',
    app_key: appKey,
    app_secret: appSecret,
    param: [
      {
        Cabecalho: {
          cCodIntOS: compraId,
          ...(osOperation === 'alterar' && omieOsId ? { nCodOS: String(omieOsId) } : {}),
          cCodParc: effectiveFormaPagamento,
          cEtapa: osEtapa,
          dDtPrevisao: previsao,
          nCodCli: clienteOmieId,
          ...(vendedorOmieCodigo ? { nCodVend: vendedorOmieCodigo } : {}),
          nQtdeParc: effectiveQtdeParcelas,
        },
        Departamentos: departamentos,
        Email: {
          cEnvBoleto: envBoleto ?? 'N',
          cEnvLink: envLink ?? 'N',
          cEnvPix: envPix ?? 'N',
          cEnviarPara: email,
          cEnvViaUnica: envViaUnica ?? 'N',
        },
        InformacoesAdicionais: infoAdicionais,
        ...(observacoes ? { Observacoes: { cObsOS: observacoes } } : {}),
        ...(sendParcelas ? { Parcelas: parcelasArray } : {}),
        ServicosPrestados: normalizedServicosPrestados,
      },
    ],
  };

  const correlationId = crypto.randomUUID();
  const payloadParam = Array.isArray(omiePayload.param)
    ? (omiePayload.param[0] as Record<string, unknown> | undefined)
    : undefined;
  const cabecalho = (payloadParam?.Cabecalho as Record<string, unknown> | undefined) ?? {};
  const cCodIntOS = typeof cabecalho.cCodIntOS === 'string' ? cabecalho.cCodIntOS.trim() : '';
  const nCodOS = toNumber(cabecalho.nCodOS);

  if (osOperation === 'alterar' && (!cCodIntOS || !nCodOS || nCodOS <= 0)) {
    return new Response(
      JSON.stringify({
        error: {
          code: 'ALTER_OS_IDENTIFIER_MISSING',
          message: 'AlterarOS exige Cabecalho.cCodIntOS e Cabecalho.nCodOS validos',
          details: buildRequestSnapshot(omiePayload, correlationId, 1),
        },
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }

  try {
    let attempt = 1;
    let requestSnapshot = buildRequestSnapshot(omiePayload, correlationId, attempt);
    let omieResult = await sendOmieRequest(omieApiUrl, omiePayload);
    let responseData = omieResult.data;
    let faultMessage = extractFaultMessage(responseData);
    let fallbackPerformed = false;

    // Detectar duplicata ANTES de checar response.ok
    // OMIE pode retornar 500 com fault "ja cadastrada" no body
    if (responseData?.faultcode || faultMessage) {
      const normalizedMessage = faultMessage ?? 'Erro retornado pela OMIE';
      const isDuplicate =
        /duplic|j[aá]\s*cadastrad/i.test(normalizedMessage) ||
        /c[oó]digo.*integr/i.test(normalizedMessage);
      const cCodIntOSSnapshot =
        typeof requestSnapshot.cabecalho?.cCodIntOS === 'string'
          ? requestSnapshot.cabecalho.cCodIntOS
          : null;

      if (isDuplicate && osOperation === 'incluir') {
        const duplicateResolution = await resolveDuplicateOs(
          normalizedMessage,
          responseData,
          cCodIntOSSnapshot,
          null,
          omieApiUrl,
          appKey,
          appSecret
        );

        if (duplicateResolution) {
          return new Response(
            JSON.stringify({
              status: 'ok',
              data: {
                nCodOS: duplicateResolution.nCodOS,
                cCodIntOS: cCodIntOSSnapshot,
                ...(duplicateResolution.cNumOS ? { cNumOS: duplicateResolution.cNumOS } : {}),
                duplicate: true,
              },
            }),
            {
              status: 200,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
          );
        }

        // Duplicata detectada mas nao conseguiu extrair ID
        return new Response(
          JSON.stringify({
            error: {
              code: 'OMIE_DUPLICATE',
              message: normalizedMessage,
              details: responseData,
            },
          }),
          {
            status: 409,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      let finalFaultMessage = normalizedMessage;
      if (osOperation === 'alterar' && isMissingAlterIdentifierFault(normalizedMessage) && compraId) {
        if (payloadParam?.Cabecalho) {
          const cabecalhoRetryWithoutCodInt = payloadParam.Cabecalho as Record<string, unknown>;
          const originalCCodIntOS = cabecalhoRetryWithoutCodInt.cCodIntOS;
          delete cabecalhoRetryWithoutCodInt.cCodIntOS;
          cabecalhoRetryWithoutCodInt.nCodOS = String(omieOsId ?? cabecalhoRetryWithoutCodInt.nCodOS ?? '');
          attempt = 2;
          requestSnapshot = buildRequestSnapshot(omiePayload, correlationId, attempt);
          const retryWithoutCodIntResult = await sendOmieRequest(omieApiUrl, omiePayload);
          const retryWithoutCodIntData = retryWithoutCodIntResult.data;
          const retryWithoutCodIntFault = extractFaultMessage(retryWithoutCodIntData);
          if (!retryWithoutCodIntFault && retryWithoutCodIntResult.ok) {
            return new Response(
              JSON.stringify({
                status: 'ok',
                operation: osOperation,
                data: retryWithoutCodIntData,
                retry: {
                  performed: true,
                  reason: 'missing_alter_identifier_without_ccodintos',
                  correlation_id: correlationId,
                },
              }),
              {
                status: 200,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              }
            );
          }
          cabecalhoRetryWithoutCodInt.cCodIntOS = originalCCodIntOS;
        }

        const recoveredOsId = await findExistingOsIdByCodInt(omieApiUrl, appKey, appSecret, compraId);
        if (recoveredOsId && recoveredOsId > 0 && payloadParam?.Cabecalho) {
          const cabecalhoRetry = payloadParam.Cabecalho as Record<string, unknown>;
          cabecalhoRetry.cCodIntOS = compraId;
          cabecalhoRetry.nCodOS = String(recoveredOsId);
          attempt = 2;
          requestSnapshot = buildRequestSnapshot(omiePayload, correlationId, attempt);
          omieResult = await sendOmieRequest(omieApiUrl, omiePayload);
          responseData = omieResult.data;
          faultMessage = extractFaultMessage(responseData);
          finalFaultMessage = faultMessage ?? finalFaultMessage;
          if (!faultMessage && omieResult.ok) {
            return new Response(
              JSON.stringify({
                status: 'ok',
                operation: osOperation,
                data: responseData,
                retry: {
                  performed: true,
                  reason: 'missing_alter_identifier',
                  recovered_nCodOS: recoveredOsId,
                  correlation_id: correlationId,
                },
              }),
              {
                status: 200,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              }
            );
          }
          finalFaultMessage = faultMessage ?? finalFaultMessage;
        }
      }

      const shouldRunFallback = shouldRunAlterToIncluirFallback({
        osOperation,
        fallbackPerformed,
        compraId,
        faultMessage: finalFaultMessage,
        requestSnapshot,
      });

      if (shouldRunFallback) {
        const fallbackPayload = buildIncluirFallbackPayload(omiePayload);
        if (fallbackPayload) {
          const primaryError = {
            message: finalFaultMessage,
            response: responseData,
            request_snapshot: requestSnapshot,
          };
          fallbackPerformed = true;
          attempt += 1;
          const fallbackSnapshot = buildRequestSnapshot(fallbackPayload, correlationId, attempt);
          const fallbackResult = await sendOmieRequest(omieApiUrl, fallbackPayload);
          const fallbackData = fallbackResult.data;
          const fallbackFaultMessage = extractFaultMessage(fallbackData);
          const fallbackMessage = fallbackFaultMessage ?? 'Erro retornado pela OMIE no fallback';

          if (!fallbackFaultMessage && fallbackResult.ok) {
            return new Response(
              JSON.stringify({
                status: 'ok',
                operation: osOperation,
                data: fallbackData,
                contingency: {
                  performed: true,
                  mode: 'alterar_to_incluir',
                  correlation_id: correlationId,
                  fallback_attempt: attempt,
                },
              }),
              {
                status: 200,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              }
            );
          }

          const fallbackIsDuplicate =
            /duplic|j[aá]\s*cadastrad/i.test(fallbackMessage) ||
            /c[oó]digo.*integr/i.test(fallbackMessage);

          if (fallbackIsDuplicate) {
            const duplicateResolution = await resolveDuplicateOs(
              fallbackMessage,
              fallbackData,
              requestSnapshot.cabecalho.cCodIntOS ?? null,
              requestSnapshot.cabecalho.nCodOS ?? null,
              omieApiUrl,
              appKey,
              appSecret
            );

            if (duplicateResolution) {
              if (osOperation === 'alterar') {
                return new Response(
                  JSON.stringify({
                    error: {
                      code: 'OMIE_ALTER_NOT_APPLIED',
                      message:
                        'AlterarOS nao confirmou aplicacao da atualizacao. O fallback reconciliou duplicidade, mas sem garantia de mudanca na OS.',
                      details: {
                        primary_error: primaryError,
                        fallback_error: {
                          message: fallbackMessage,
                          response: fallbackData,
                          request_snapshot: fallbackSnapshot,
                        },
                        duplicate_resolution: {
                          nCodOS: duplicateResolution.nCodOS,
                          cNumOS: duplicateResolution.cNumOS,
                        },
                        contingency: {
                          performed: true,
                          mode: 'alterar_to_incluir_duplicate_reconcile',
                          correlation_id: correlationId,
                          fallback_attempt: attempt,
                        },
                      },
                    },
                  }),
                  {
                    status: 409,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                  }
                );
              }
              return new Response(
                JSON.stringify({
                  status: 'ok',
                  operation: osOperation,
                  data: {
                    nCodOS: duplicateResolution.nCodOS,
                    cCodIntOS: requestSnapshot.cabecalho.cCodIntOS,
                    ...(duplicateResolution.cNumOS ? { cNumOS: duplicateResolution.cNumOS } : {}),
                    duplicate: true,
                  },
                  contingency: {
                    performed: true,
                    mode: 'alterar_to_incluir_duplicate_reconcile',
                    correlation_id: correlationId,
                    fallback_attempt: attempt,
                  },
                }),
                {
                  status: 200,
                  headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                }
              );
            }
          }

          return new Response(
            JSON.stringify({
              error: {
                code: 'OMIE_ERROR',
                message: fallbackMessage,
                details: {
                  primary_error: primaryError,
                  fallback_error: {
                    message: fallbackMessage,
                    response: fallbackData,
                    request_snapshot: fallbackSnapshot,
                  },
                  contingency: {
                    performed: true,
                    mode: 'alterar_to_incluir',
                    correlation_id: correlationId,
                  },
                },
              },
            }),
            {
              status: 502,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
          );
        }
      }

      // Fault generico da OMIE (nao é duplicata)
      return new Response(
        JSON.stringify({
          error: {
            code: 'OMIE_ERROR',
            message: finalFaultMessage,
            details: {
              response: responseData,
              request_snapshot: requestSnapshot,
            },
          },
        }),
        {
          status: 502,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (!omieResult.ok) {
      return new Response(
        JSON.stringify({
          error: {
            code: 'OMIE_HTTP_ERROR',
            message: 'Erro ao chamar OMIE',
            details: {
              response: responseData,
              request_snapshot: requestSnapshot,
            },
          },
        }),
        {
          status: omieResult.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    return new Response(JSON.stringify({ status: 'ok', operation: osOperation, data: responseData }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    const isTimeout = error instanceof Error && error.name === 'AbortError';

    return new Response(
      JSON.stringify({
        error: {
          code: isTimeout ? 'OMIE_TIMEOUT' : 'OMIE_REQUEST_FAILED',
          message: isTimeout ? 'Timeout ao chamar OMIE' : message,
        },
      }),
      {
        status: isTimeout ? 504 : 503,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
