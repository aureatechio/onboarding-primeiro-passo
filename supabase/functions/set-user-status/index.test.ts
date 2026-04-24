import { assertEquals } from 'jsr:@std/assert'
import { parseStatus, parseUuid } from '../_shared/user-management.ts'

Deno.test('set-user-status validates status body', () => {
  assertEquals(parseUuid('f1f35677-7619-4fe2-9287-4f15bbe66833'), 'f1f35677-7619-4fe2-9287-4f15bbe66833')
  assertEquals(parseStatus('disabled'), 'disabled')
  assertEquals(parseStatus('blocked'), null)
})
