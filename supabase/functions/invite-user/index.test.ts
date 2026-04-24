import { assertEquals } from 'jsr:@std/assert'
import { parseEmail, parseFullName, parseRole } from '../_shared/user-management.ts'

Deno.test('invite-user validates normalized invitation fields', () => {
  assertEquals(parseEmail(' Pessoa@Example.COM '), 'pessoa@example.com')
  assertEquals(parseFullName('  Pessoa   Teste '), 'Pessoa Teste')
  assertEquals(parseRole('viewer'), 'viewer')
})
