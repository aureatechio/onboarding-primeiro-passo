import { assertEquals } from 'jsr:@std/assert'
import {
  parseEmail,
  parseFullName,
  parseRole,
  parseStatus,
  parseUuid,
} from './user-management.ts'

Deno.test('user-management parsers normalize valid values', () => {
  assertEquals(parseEmail(' USER@Example.COM '), 'user@example.com')
  assertEquals(parseRole('operator'), 'operator')
  assertEquals(parseStatus('disabled'), 'disabled')
  assertEquals(parseFullName('  Ana   Maria  '), 'Ana Maria')
  assertEquals(parseUuid('f1f35677-7619-4fe2-9287-4f15bbe66833'), 'f1f35677-7619-4fe2-9287-4f15bbe66833')
})

Deno.test('user-management parsers reject invalid values', () => {
  assertEquals(parseEmail('invalid'), null)
  assertEquals(parseRole('owner'), null)
  assertEquals(parseStatus('blocked'), null)
  assertEquals(parseFullName('   '), null)
  assertEquals(parseUuid('nope'), null)
})
