import { assertEquals } from 'jsr:@std/assert'
import { parseRole, parseUuid } from '../_shared/user-management.ts'

Deno.test('update-user-role validates target user and role', () => {
  assertEquals(parseUuid('f1f35677-7619-4fe2-9287-4f15bbe66833'), 'f1f35677-7619-4fe2-9287-4f15bbe66833')
  assertEquals(parseRole('operator'), 'operator')
  assertEquals(parseRole('owner'), null)
})
