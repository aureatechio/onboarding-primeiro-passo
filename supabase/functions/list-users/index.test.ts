import { assertEquals } from 'jsr:@std/assert'
import { parseRole, parseStatus } from '../_shared/user-management.ts'

Deno.test('list-users filters accept known role and status values', () => {
  assertEquals(parseRole('admin'), 'admin')
  assertEquals(parseStatus('active'), 'active')
})
