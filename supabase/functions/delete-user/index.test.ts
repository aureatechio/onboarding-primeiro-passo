import { assertEquals } from 'jsr:@std/assert'
import { parseUuid } from '../_shared/user-management.ts'

Deno.test('delete-user validates uuid body', () => {
  assertEquals(parseUuid('f1f35677-7619-4fe2-9287-4f15bbe66833'), 'f1f35677-7619-4fe2-9287-4f15bbe66833')
  assertEquals(parseUuid('not-a-uuid'), null)
})
