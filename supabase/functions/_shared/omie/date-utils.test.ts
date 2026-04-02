import { assertEquals } from 'jsr:@std/assert'
import {
  addBusinessDays,
  calcPrevisaoFaturamento,
  formatDateDDMMYYYY,
  startOfDay,
  toDate,
} from './date-utils.ts'

// --- toDate ---

Deno.test('toDate parses ISO string', () => {
  const result = toDate('2026-03-17T17:10:09.000Z')
  assertEquals(result instanceof Date, true)
  assertEquals(result!.getFullYear(), 2026)
})

Deno.test('toDate parses DD/MM/YYYY string', () => {
  const result = toDate('17/03/2026')
  assertEquals(result instanceof Date, true)
  assertEquals(result!.getDate(), 17)
  assertEquals(result!.getMonth(), 2)
  assertEquals(result!.getFullYear(), 2026)
})

Deno.test('toDate returns null for empty/null', () => {
  assertEquals(toDate(null), null)
  assertEquals(toDate(undefined), null)
  assertEquals(toDate(''), null)
})

Deno.test('toDate returns null for invalid string', () => {
  assertEquals(toDate('not-a-date'), null)
})

// --- addBusinessDays ---

Deno.test('addBusinessDays: Monday + 3 business days = Thursday', () => {
  const monday = new Date(2026, 2, 16) // 2026-03-16 is Monday
  const result = addBusinessDays(monday, 3)
  assertEquals(result.getDay(), 4) // Thursday
  assertEquals(result.getDate(), 19)
})

Deno.test('addBusinessDays: Tuesday + 3 business days = Friday', () => {
  const tuesday = new Date(2026, 2, 17) // 2026-03-17 is Tuesday
  const result = addBusinessDays(tuesday, 3)
  assertEquals(result.getDay(), 5) // Friday
  assertEquals(result.getDate(), 20)
})

Deno.test('addBusinessDays: Wednesday + 3 business days = Monday (skips weekend)', () => {
  const wednesday = new Date(2026, 2, 18) // 2026-03-18 is Wednesday
  const result = addBusinessDays(wednesday, 3)
  assertEquals(result.getDay(), 1) // Monday
  assertEquals(result.getDate(), 23)
})

Deno.test('addBusinessDays: Thursday + 3 business days = Tuesday (skips weekend)', () => {
  const thursday = new Date(2026, 2, 19) // 2026-03-19 is Thursday
  const result = addBusinessDays(thursday, 3)
  assertEquals(result.getDay(), 2) // Tuesday
  assertEquals(result.getDate(), 24)
})

Deno.test('addBusinessDays: Friday + 3 business days = Wednesday (skips weekend)', () => {
  const friday = new Date(2026, 2, 20) // 2026-03-20 is Friday
  const result = addBusinessDays(friday, 3)
  assertEquals(result.getDay(), 3) // Wednesday
  assertEquals(result.getDate(), 25)
})

Deno.test('addBusinessDays: Saturday + 3 business days = Wednesday', () => {
  const saturday = new Date(2026, 2, 21) // 2026-03-21 is Saturday
  const result = addBusinessDays(saturday, 3)
  assertEquals(result.getDay(), 3) // Wednesday
  assertEquals(result.getDate(), 25)
})

Deno.test('addBusinessDays: Sunday + 3 business days = Wednesday', () => {
  const sunday = new Date(2026, 2, 22) // 2026-03-22 is Sunday
  const result = addBusinessDays(sunday, 3)
  assertEquals(result.getDay(), 3) // Wednesday
  assertEquals(result.getDate(), 25)
})

// --- calcPrevisaoFaturamento ---

Deno.test('calcPrevisaoFaturamento: payment on Tuesday 17/03/2026 -> Friday 20/03/2026', () => {
  const { previsao } = calcPrevisaoFaturamento(undefined, '2026-03-17T17:10:09.000Z')
  assertEquals(previsao, '20/03/2026')
})

Deno.test('calcPrevisaoFaturamento: payment on Friday -> Wednesday (skips weekend)', () => {
  const { previsao } = calcPrevisaoFaturamento(undefined, '2026-03-20T10:00:00.000Z')
  assertEquals(previsao, '25/03/2026')
})

Deno.test('calcPrevisaoFaturamento: payment on Monday -> Thursday', () => {
  const { previsao } = calcPrevisaoFaturamento(undefined, '2026-03-16T10:00:00.000Z')
  assertEquals(previsao, '19/03/2026')
})

Deno.test('calcPrevisaoFaturamento: dataPrevisao overrides dataVenda', () => {
  const { previsao } = calcPrevisaoFaturamento('20/03/2026', '2026-03-17T17:10:09.000Z')
  assertEquals(previsao, '25/03/2026')
})

Deno.test('calcPrevisaoFaturamento: DD/MM/YYYY format for dataVenda', () => {
  const { previsao } = calcPrevisaoFaturamento(undefined, '17/03/2026')
  assertEquals(previsao, '20/03/2026')
})

Deno.test('calcPrevisaoFaturamento: reprocess does NOT drift to today', () => {
  const pastPayment = '2026-02-10T10:00:00.000Z' // Tuesday Feb 10 2026
  const { previsao } = calcPrevisaoFaturamento(undefined, pastPayment)
  assertEquals(previsao, '13/02/2026')
})

Deno.test('calcPrevisaoFaturamento: no dates provided uses current date as fallback', () => {
  const { previsao, primeiraParcelaDate } = calcPrevisaoFaturamento(undefined, undefined)
  assertEquals(typeof previsao, 'string')
  assertEquals(/^\d{2}\/\d{2}\/\d{4}$/.test(previsao), true)
  assertEquals(primeiraParcelaDate instanceof Date, true)
})

// --- formatDateDDMMYYYY ---

Deno.test('formatDateDDMMYYYY formats correctly', () => {
  const date = new Date(2026, 2, 20)
  assertEquals(formatDateDDMMYYYY(date), '20/03/2026')
})

Deno.test('formatDateDDMMYYYY pads single digits', () => {
  const date = new Date(2026, 0, 5)
  assertEquals(formatDateDDMMYYYY(date), '05/01/2026')
})

// --- startOfDay ---

Deno.test('startOfDay zeros out time portion', () => {
  const date = new Date(2026, 2, 17, 15, 30, 45)
  const result = startOfDay(date)
  assertEquals(result.getHours(), 0)
  assertEquals(result.getMinutes(), 0)
  assertEquals(result.getSeconds(), 0)
  assertEquals(result.getMilliseconds(), 0)
  assertEquals(result.getDate(), 17)
})
