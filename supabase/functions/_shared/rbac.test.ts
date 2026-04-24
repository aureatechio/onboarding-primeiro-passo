import { assertEquals } from 'jsr:@std/assert'
import { assertValidRole } from './rbac.ts'

Deno.test('assertValidRole accepts dashboard roles', () => {
  assertEquals(assertValidRole('admin'), 'admin')
  assertEquals(assertValidRole('operator'), 'operator')
  assertEquals(assertValidRole('viewer'), 'viewer')
})

Deno.test('assertValidRole rejects unknown roles', () => {
  assertEquals(assertValidRole('supervisor'), null)
  assertEquals(assertValidRole(''), null)
  assertEquals(assertValidRole(null), null)
})
