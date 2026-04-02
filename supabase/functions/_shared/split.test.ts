import { assertEquals } from 'jsr:@std/assert'
import { resolveBoletoDueDaysForSplit } from './split.ts'

type SplitGroupRow = {
  id: string
  split_type: string | null
}

type SessionRow = {
  id: string
  split_group_id: string | null
  split_index: number | null
  metodo_pagamento: string
}

class QueryBuilder {
  private eqFilters: Record<string, unknown> = {}
  private neqFilters: Record<string, unknown> = {}
  private requireSplitIndexNotNull = false
  private inFilter: { column: string; values: unknown[] } | null = null
  private orderBy: { column: string; ascending: boolean } | null = null
  private limitCount = Number.POSITIVE_INFINITY

  constructor(
    private readonly table: string,
    private readonly splitGroups: SplitGroupRow[],
    private readonly sessions: SessionRow[]
  ) {}

  select(_fields: string) {
    return this
  }

  eq(column: string, value: unknown) {
    this.eqFilters[column] = value
    return this
  }

  neq(column: string, value: unknown) {
    this.neqFilters[column] = value
    return this
  }

  not(column: string, op: string, value: unknown) {
    if (column === 'split_index' && op === 'is' && value === null) {
      this.requireSplitIndexNotNull = true
    }
    return this
  }

  in(column: string, values: unknown[]) {
    this.inFilter = { column, values }
    return this
  }

  order(column: string, opts: { ascending: boolean }) {
    this.orderBy = { column, ascending: opts.ascending }
    return this
  }

  limit(count: number) {
    this.limitCount = count
    return this
  }

  async maybeSingle() {
    if (this.table === 'checkout_split_groups') {
      const row = this.splitGroups.find((group) => {
        for (const [k, v] of Object.entries(this.eqFilters)) {
          if ((group as Record<string, unknown>)[k] !== v) return false
        }
        return true
      })
      return { data: row ?? null, error: null }
    }

    if (this.table === 'checkout_sessions') {
      let rows = [...this.sessions]
      rows = rows.filter((row) => {
        for (const [k, v] of Object.entries(this.eqFilters)) {
          if ((row as Record<string, unknown>)[k] !== v) return false
        }
        for (const [k, v] of Object.entries(this.neqFilters)) {
          if ((row as Record<string, unknown>)[k] === v) return false
        }
        if (this.requireSplitIndexNotNull && row.split_index === null) return false
        if (this.inFilter) {
          const field = (row as Record<string, unknown>)[this.inFilter.column]
          if (!this.inFilter.values.includes(field)) return false
        }
        return true
      })
      if (this.orderBy) {
        const factor = this.orderBy.ascending ? 1 : -1
        rows.sort((a, b) => {
          const av = (a as Record<string, unknown>)[this.orderBy!.column] as number
          const bv = (b as Record<string, unknown>)[this.orderBy!.column] as number
          return (av - bv) * factor
        })
      }
      rows = rows.slice(0, this.limitCount)
      return { data: rows[0] ?? null, error: null }
    }

    return { data: null, error: null }
  }
}

function buildSupabaseMock(splitGroups: SplitGroupRow[], sessions: SessionRow[]) {
  return {
    from(table: string) {
      return new QueryBuilder(table, splitGroups, sessions)
    },
  }
}

Deno.test('resolveBoletoDueDaysForSplit keeps base days without split group', async () => {
  const result = await resolveBoletoDueDaysForSplit({
    supabase: buildSupabaseMock([], []) as any,
    splitGroupId: null,
    sessionId: 's-boleto',
    baseDueDays: 5,
  })

  assertEquals(result.dueDays, 5)
  assertEquals(result.appliedDualPaymentMin, false)
  assertEquals(result.siblingMethod, null)
})

Deno.test('resolveBoletoDueDaysForSplit keeps base days when group is not dual', async () => {
  const result = await resolveBoletoDueDaysForSplit({
    supabase: buildSupabaseMock([{ id: 'g1', split_type: 'boleto_parcelado' }], []) as any,
    splitGroupId: 'g1',
    sessionId: 's-boleto',
    baseDueDays: 5,
  })

  assertEquals(result.dueDays, 5)
  assertEquals(result.appliedDualPaymentMin, false)
  assertEquals(result.siblingMethod, null)
})

Deno.test('resolveBoletoDueDaysForSplit enforces minimum 30 for dual payment with PIX sibling', async () => {
  const result = await resolveBoletoDueDaysForSplit({
    supabase: buildSupabaseMock(
      [{ id: 'g1', split_type: 'dual_payment' }],
      [
        { id: 's-parent', split_group_id: 'g1', split_index: null, metodo_pagamento: 'boleto' },
        { id: 's-boleto', split_group_id: 'g1', split_index: 2, metodo_pagamento: 'boleto' },
        { id: 's-pix', split_group_id: 'g1', split_index: 1, metodo_pagamento: 'pix' },
      ]
    ) as any,
    splitGroupId: 'g1',
    sessionId: 's-boleto',
    baseDueDays: 5,
  })

  assertEquals(result.dueDays, 30)
  assertEquals(result.appliedDualPaymentMin, true)
  assertEquals(result.siblingMethod, 'pix')
})

Deno.test('resolveBoletoDueDaysForSplit preserves value above 30', async () => {
  const result = await resolveBoletoDueDaysForSplit({
    supabase: buildSupabaseMock(
      [{ id: 'g1', split_type: 'dual_payment' }],
      [
        { id: 's-boleto', split_group_id: 'g1', split_index: 2, metodo_pagamento: 'boleto' },
        { id: 's-cartao', split_group_id: 'g1', split_index: 1, metodo_pagamento: 'cartao' },
      ]
    ) as any,
    splitGroupId: 'g1',
    sessionId: 's-boleto',
    baseDueDays: 45,
  })

  assertEquals(result.dueDays, 45)
  assertEquals(result.appliedDualPaymentMin, false)
  assertEquals(result.siblingMethod, 'cartao')
})
