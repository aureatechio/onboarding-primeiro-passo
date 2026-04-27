import { assertEquals } from 'jsr:@std/assert'
import {
  parseDashboardActivityEvent,
  parseDashboardPath,
  sanitizeUserAgent,
} from './validation.ts'

Deno.test('parseDashboardActivityEvent accepts supported events', () => {
  assertEquals(parseDashboardActivityEvent('login'), 'login')
  assertEquals(parseDashboardActivityEvent('activity'), 'activity')
})

Deno.test('parseDashboardActivityEvent rejects unknown events', () => {
  assertEquals(parseDashboardActivityEvent('logout'), null)
  assertEquals(parseDashboardActivityEvent(''), null)
})

Deno.test('parseDashboardPath accepts dashboard paths only', () => {
  assertEquals(parseDashboardPath('/users'), '/users')
  assertEquals(parseDashboardPath('https://example.com'), null)
  assertEquals(parseDashboardPath('users'), null)
})

Deno.test('sanitizeUserAgent trims, normalizes and limits user agent', () => {
  assertEquals(sanitizeUserAgent('  Mozilla   Test  '), 'Mozilla Test')
  assertEquals(sanitizeUserAgent(''), null)
  assertEquals(sanitizeUserAgent('x'.repeat(600))?.length, 500)
})
