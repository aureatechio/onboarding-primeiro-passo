import { assertEquals, assertMatch, assertRejects } from 'jsr:@std/assert'
import {
  buildOmieProjetoCodInt,
  ensureOmieProjetoForCelebridade,
  OmieProjetoEnsureError,
} from './projeto-celebridade.ts'

type MapRow = {
  celebridade_id: string
  omie_projeto_id: number
  omie_projeto_cod_int: string
  omie_projeto_nome: string
}

type SupabaseMock = {
  state: {
    rows: MapRow[]
    upserts: Array<Record<string, unknown>>
  }
  client: {
    from: (table: string) => {
      select: (_fields: string) => {
        eq: (column: string, value: unknown) => {
          maybeSingle: () => Promise<{ data: Record<string, unknown> | null; error: null }>
        }
      }
      upsert: (
        payload: Record<string, unknown>,
        _options: Record<string, unknown>
      ) => Promise<{ error: null }>
    }
  }
}

const createSupabaseMock = (initialRows: MapRow[] = []): SupabaseMock => {
  const state = {
    rows: [...initialRows],
    upserts: [] as Array<Record<string, unknown>>,
  }

  const client = {
    from: (_table: string) => ({
      select: (_fields: string) => ({
        eq: (column: string, value: unknown) => ({
          maybeSingle: async () => {
            const row =
              column === 'celebridade_id'
                ? state.rows.find((item) => item.celebridade_id === value)
                : column === 'omie_projeto_cod_int'
                  ? state.rows.find((item) => item.omie_projeto_cod_int === value)
                  : undefined
            return { data: row ?? null, error: null }
          },
        }),
      }),
      upsert: async (payload: Record<string, unknown>, _options: Record<string, unknown>) => {
        state.upserts.push(payload)
        const index = state.rows.findIndex((item) => item.celebridade_id === payload.celebridade_id)
        const normalized: MapRow = {
          celebridade_id: String(payload.celebridade_id),
          omie_projeto_id: Number(payload.omie_projeto_id),
          omie_projeto_cod_int: String(payload.omie_projeto_cod_int),
          omie_projeto_nome: String(payload.omie_projeto_nome),
        }
        if (index >= 0) {
          state.rows[index] = normalized
        } else {
          state.rows.push(normalized)
        }
        return { error: null }
      },
    }),
  }

  return { state, client }
}

Deno.test('buildOmieProjetoCodInt uses uuid deterministic prefix and size', async () => {
  const codInt = await buildOmieProjetoCodInt('3f2055d1-606e-45d1-a288-b2a8c14b694d')
  assertEquals(codInt.length, 20)
  assertMatch(codInt, /^CEL_[A-F0-9]{16}$/)
  assertEquals(codInt, 'CEL_3F2055D1606E45D1')
})

Deno.test('buildOmieProjetoCodInt hashes non-uuid deterministic values', async () => {
  const codIntA = await buildOmieProjetoCodInt('legacy-id-without-uuid')
  const codIntB = await buildOmieProjetoCodInt('legacy-id-without-uuid')
  assertEquals(codIntA, codIntB)
  assertEquals(codIntA.length, 20)
  assertMatch(codIntA, /^CEL_[A-F0-9]{16}$/)
})

Deno.test('ensureOmieProjetoForCelebridade returns DB mapping without OMIE call', async () => {
  const supabase = createSupabaseMock([
    {
      celebridade_id: '3f2055d1-606e-45d1-a288-b2a8c14b694d',
      omie_projeto_id: 999,
      omie_projeto_cod_int: 'CEL_3F2055D1606E45D1',
      omie_projeto_nome: 'Projeto existente',
    },
  ])

  const previousFetch = globalThis.fetch
  let fetchCalled = false
  globalThis.fetch = (() => {
    fetchCalled = true
    throw new Error('fetch should not be called')
  }) as typeof fetch

  try {
    const result = await ensureOmieProjetoForCelebridade({
      supabase: supabase.client as never,
      celebridadeId: '3f2055d1-606e-45d1-a288-b2a8c14b694d',
      celebridadeNome: 'Projeto existente',
      mode: 'apply',
    })
    assertEquals(result.nCodProj, 999)
    assertEquals(result.source, 'db')
    assertEquals(fetchCalled, false)
  } finally {
    globalThis.fetch = previousFetch
  }
})

Deno.test('ensureOmieProjetoForCelebridade preview mode warns and does not write', async () => {
  const supabase = createSupabaseMock()
  const previousFetch = globalThis.fetch
  let fetchCalled = false
  globalThis.fetch = (() => {
    fetchCalled = true
    throw new Error('fetch should not be called')
  }) as typeof fetch

  try {
    const result = await ensureOmieProjetoForCelebridade({
      supabase: supabase.client as never,
      celebridadeId: '3f2055d1-606e-45d1-a288-b2a8c14b694d',
      celebridadeNome: 'Nome sem mapeamento',
      mode: 'preview',
    })
    assertEquals(result.nCodProj, null)
    assertEquals(result.source, 'preview_unresolved')
    assertMatch(result.warning ?? '', /PREVIEW_UNRESOLVED/)
    assertEquals(supabase.state.upserts.length, 0)
    assertEquals(fetchCalled, false)
  } finally {
    globalThis.fetch = previousFetch
  }
})

Deno.test('ensureOmieProjetoForCelebridade apply mode resolves by ConsultarProjeto and persists map', async () => {
  Deno.env.set('OMIE_APP_KEY', 'key-test')
  Deno.env.set('OMIE_APP_SECRET', 'secret-test')
  Deno.env.set('OMIE_BASE_URL', 'https://omie.example.com/api/v1')

  const supabase = createSupabaseMock()
  const previousFetch = globalThis.fetch
  const calls: string[] = []
  globalThis.fetch = (async (_url: string | URL | Request, init?: RequestInit) => {
    const body = JSON.parse(String(init?.body ?? '{}')) as Record<string, unknown>
    const call = String(body.call ?? '')
    calls.push(call)
    return new Response(
      JSON.stringify({
        codigo: 12345,
        codInt: 'CEL_3F2055D1606E45D1',
        nome: 'Projeto Celebridade',
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  }) as typeof fetch

  try {
    const result = await ensureOmieProjetoForCelebridade({
      supabase: supabase.client as never,
      celebridadeId: '3f2055d1-606e-45d1-a288-b2a8c14b694d',
      celebridadeNome: 'Projeto Celebridade',
      mode: 'apply',
    })
    assertEquals(result.nCodProj, 12345)
    assertEquals(result.source, 'omie_cod_int')
    assertEquals(calls, ['ConsultarProjeto'])
    assertEquals(supabase.state.upserts.length, 1)
    assertEquals(supabase.state.rows[0].omie_projeto_id, 12345)
  } finally {
    globalThis.fetch = previousFetch
    Deno.env.delete('OMIE_APP_KEY')
    Deno.env.delete('OMIE_APP_SECRET')
    Deno.env.delete('OMIE_BASE_URL')
  }
})

Deno.test('ConsultarProjeto 500 degrades to ListarProjetos and resolves by name', async () => {
  Deno.env.set('OMIE_APP_KEY', 'key-test')
  Deno.env.set('OMIE_APP_SECRET', 'secret-test')
  Deno.env.set('OMIE_BASE_URL', 'https://omie.example.com/api/v1')

  const supabase = createSupabaseMock()
  const previousFetch = globalThis.fetch
  const calls: string[] = []

  globalThis.fetch = (async (_url: string | URL | Request, init?: RequestInit) => {
    const body = JSON.parse(String(init?.body ?? '{}')) as Record<string, unknown>
    const call = String(body.call ?? '')
    calls.push(call)

    if (call === 'ConsultarProjeto') {
      return new Response(JSON.stringify({ error: 'internal' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    if (call === 'ListarProjetos') {
      return new Response(
        JSON.stringify({
          cadastro: [{ codigo: 777, codInt: 'CEL_3F2055D1606E45D1', nome: 'Rodrigo Faro' }],
          total_de_paginas: 1,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    }

    return new Response(JSON.stringify({}), { status: 200, headers: { 'Content-Type': 'application/json' } })
  }) as typeof fetch

  try {
    const result = await ensureOmieProjetoForCelebridade({
      supabase: supabase.client as never,
      celebridadeId: '3f2055d1-606e-45d1-a288-b2a8c14b694d',
      celebridadeNome: 'Rodrigo Faro',
      mode: 'apply',
    })
    assertEquals(result.nCodProj, 777)
    assertEquals(result.source, 'omie_nome')
    assertMatch(result.warning ?? '', /CONSULT_DEGRADED/)
    assertEquals(supabase.state.upserts.length, 1)
    assertEquals(supabase.state.rows[0].omie_projeto_id, 777)
  } finally {
    globalThis.fetch = previousFetch
    Deno.env.delete('OMIE_APP_KEY')
    Deno.env.delete('OMIE_APP_SECRET')
    Deno.env.delete('OMIE_BASE_URL')
  }
})

Deno.test('ConsultarProjeto 500 degrades and creates project via IncluirProjeto', async () => {
  Deno.env.set('OMIE_APP_KEY', 'key-test')
  Deno.env.set('OMIE_APP_SECRET', 'secret-test')
  Deno.env.set('OMIE_BASE_URL', 'https://omie.example.com/api/v1')

  const supabase = createSupabaseMock()
  const previousFetch = globalThis.fetch
  const calls: string[] = []

  globalThis.fetch = (async (_url: string | URL | Request, init?: RequestInit) => {
    const body = JSON.parse(String(init?.body ?? '{}')) as Record<string, unknown>
    const call = String(body.call ?? '')
    calls.push(call)

    if (call === 'ConsultarProjeto') {
      return new Response(JSON.stringify({ error: 'internal' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    if (call === 'ListarProjetos') {
      return new Response(
        JSON.stringify({ cadastro: [], total_de_paginas: 1 }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    }

    if (call === 'IncluirProjeto') {
      return new Response(
        JSON.stringify({ codigo: 888, codInt: 'CEL_3F2055D1606E45D1', nome: 'Novo Projeto' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    }

    return new Response(JSON.stringify({}), { status: 200, headers: { 'Content-Type': 'application/json' } })
  }) as typeof fetch

  try {
    const result = await ensureOmieProjetoForCelebridade({
      supabase: supabase.client as never,
      celebridadeId: '3f2055d1-606e-45d1-a288-b2a8c14b694d',
      celebridadeNome: 'Novo Projeto',
      mode: 'apply',
    })
    assertEquals(result.nCodProj, 888)
    assertEquals(result.source, 'omie_incluir')
    assertMatch(result.warning ?? '', /CONSULT_DEGRADED/)
    assertEquals(supabase.state.upserts.length, 1)
  } finally {
    globalThis.fetch = previousFetch
    Deno.env.delete('OMIE_APP_KEY')
    Deno.env.delete('OMIE_APP_SECRET')
    Deno.env.delete('OMIE_BASE_URL')
  }
})

Deno.test('Non-transient error in ConsultarProjeto still throws fatal', async () => {
  Deno.env.set('OMIE_APP_KEY', 'key-test')
  Deno.env.set('OMIE_APP_SECRET', 'secret-test')
  Deno.env.set('OMIE_BASE_URL', 'https://omie.example.com/api/v1')

  const supabase = createSupabaseMock()
  const previousFetch = globalThis.fetch

  globalThis.fetch = (async (_url: string | URL | Request, _init?: RequestInit) => {
    return new Response(
      JSON.stringify({ faultstring: 'Chave de aplicativo invalida' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  }) as typeof fetch

  try {
    await assertRejects(
      () =>
        ensureOmieProjetoForCelebridade({
          supabase: supabase.client as never,
          celebridadeId: '3f2055d1-606e-45d1-a288-b2a8c14b694d',
          celebridadeNome: 'Projeto Teste',
          mode: 'apply',
        }),
      OmieProjetoEnsureError,
      'ConsultarProjeto'
    )
    assertEquals(supabase.state.upserts.length, 0)
  } finally {
    globalThis.fetch = previousFetch
    Deno.env.delete('OMIE_APP_KEY')
    Deno.env.delete('OMIE_APP_SECRET')
    Deno.env.delete('OMIE_BASE_URL')
  }
})
