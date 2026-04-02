import { assertEquals } from 'jsr:@std/assert'
import { normalizeMunicipio, resolveMunicipioIbge } from './municipio-ibge.ts'

type StateRow = { id_sgc: number; abbr: string }
type CityRow = { state_id: number; name: string; ibge_code: string | null; source_file?: string }

class FakeSupabase {
  private states: StateRow[]
  private cities: CityRow[]

  constructor(states: StateRow[], cities: CityRow[]) {
    this.states = states
    this.cities = cities
  }

  getCities() {
    return this.cities
  }

  from(table: string) {
    if (table === 'sgc_estados') return new FakeEstadoQuery(this.states)
    if (table === 'sgc_cidades') return new FakeCidadeQuery(this.cities)
    throw new Error(`Unsupported table in test: ${table}`)
  }
}

class FakeEstadoQuery {
  private rows: StateRow[]
  private abbr: string | null = null
  private max = Number.POSITIVE_INFINITY

  constructor(rows: StateRow[]) {
    this.rows = rows
  }

  select(_columns: string) {
    return this
  }

  eq(column: string, value: unknown) {
    if (column === 'abbr') this.abbr = String(value)
    return this
  }

  limit(value: number) {
    this.max = value
    return this
  }

  async single() {
    const rows = this.rows
      .filter((row) => (this.abbr ? row.abbr === this.abbr : true))
      .slice(0, this.max)
    return { data: rows[0] ?? null, error: rows[0] ? null : { message: 'not found' } }
  }
}

class FakeCidadeQuery {
  private rows: CityRow[]
  private selected: CityRow[]
  private stateId: number | null = null
  private nameIlike: string | null = null
  private max = Number.POSITIVE_INFINITY
  private updatePayload: Partial<CityRow> | null = null

  constructor(rows: CityRow[]) {
    this.rows = rows
    this.selected = rows
  }

  select(_columns: string) {
    this.selected = this.rows
    return this
  }

  update(payload: Partial<CityRow>) {
    this.updatePayload = payload
    return this
  }

  insert(payload: Record<string, unknown>) {
    this.rows.push({
      state_id: Number(payload.state_id),
      name: String(payload.name),
      ibge_code: payload.ibge_code ? String(payload.ibge_code) : null,
      source_file: payload.source_file ? String(payload.source_file) : undefined,
    })
    return Promise.resolve({ error: null })
  }

  eq(column: string, value: unknown) {
    if (column === 'state_id') {
      this.stateId = Number(value)
    }
    this.applyFilters()
    if (this.updatePayload) {
      for (const row of this.selected) {
        Object.assign(row, this.updatePayload)
      }
      return {
        ilike: (filterColumn: string, filterValue: string) => {
          this.ilike(filterColumn, filterValue)
          for (const row of this.selected) {
            Object.assign(row, this.updatePayload)
          }
          return Promise.resolve({ error: null })
        },
      }
    }
    return this
  }

  ilike(column: string, value: string) {
    if (column === 'name') {
      this.nameIlike = value
    }
    this.applyFilters()
    return this
  }

  limit(value: number) {
    this.max = value
    return this
  }

  maybeSingle() {
    const rows = this.selected.slice(0, this.max)
    return Promise.resolve({ data: rows[0] ?? null, error: null })
  }

  single() {
    const rows = this.selected.slice(0, this.max)
    return Promise.resolve({ data: rows[0] ?? null, error: rows[0] ? null : { message: 'not found' } })
  }

  then(resolve: (value: { data: CityRow[]; error: null }) => unknown) {
    return Promise.resolve(resolve({ data: this.selected.slice(0, this.max), error: null }))
  }

  private applyFilters() {
    let filtered = this.rows
    if (this.stateId !== null) {
      filtered = filtered.filter((row) => row.state_id === this.stateId)
    }
    if (this.nameIlike) {
      const expected = this.nameIlike.toLowerCase()
      filtered = filtered.filter((row) => row.name.toLowerCase() === expected)
    }
    this.selected = filtered
  }
}

Deno.test('normalizeMunicipio removes accents and extra spaces', () => {
  assertEquals(normalizeMunicipio('  São   Joaquim da Barra  '), 'sao joaquim da barra')
})

Deno.test('resolveMunicipioIbge resolves local city by normalized fallback', async () => {
  const supabase = new FakeSupabase(
    [{ id_sgc: 20, abbr: 'SP' }],
    [{ state_id: 20, name: 'São Joaquim da Barra', ibge_code: '3549409' }]
  )

  const result = await resolveMunicipioIbge({
    supabase,
    cidade: 'SAO JOAQUIM DA BARRA',
    estado: 'SP',
    allowExternalFallback: false,
  })

  assertEquals(result.ok, true)
  if (result.ok) {
    assertEquals(result.ibgeCode, '3549409')
    assertEquals(result.source, 'local_normalized')
  }
})

Deno.test('resolveMunicipioIbge uses external API and caches when local misses', async () => {
  const supabase = new FakeSupabase([{ id_sgc: 20, abbr: 'SP' }], [])

  const result = await resolveMunicipioIbge(
    {
      supabase,
      cidade: 'SAO JOAQUIM DA BARRA',
      estado: 'SP',
    },
    {
      fetchFn: async () =>
        new Response(JSON.stringify([{ nome: 'São Joaquim da Barra', codigo_ibge: '3549409' }]), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      now: () => new Date('2026-03-05T00:00:00.000Z'),
    }
  )

  assertEquals(result.ok, true)
  if (result.ok) {
    assertEquals(result.source, 'external_api')
    assertEquals(result.ibgeCode, '3549409')
  }

  const cached = supabase.getCities().find((row) => row.name === 'São Joaquim da Barra')
  assertEquals(cached?.ibge_code, '3549409')
})

Deno.test('resolveMunicipioIbge returns not found when external API fails', async () => {
  const supabase = new FakeSupabase([{ id_sgc: 20, abbr: 'SP' }], [])

  const result = await resolveMunicipioIbge(
    {
      supabase,
      cidade: 'Cidade Inexistente',
      estado: 'SP',
    },
    {
      fetchFn: async () => new Response('unavailable', { status: 503 }),
    }
  )

  assertEquals(result.ok, false)
  if (!result.ok) {
    assertEquals(result.code, 'IBGE_NOT_FOUND')
  }
})
