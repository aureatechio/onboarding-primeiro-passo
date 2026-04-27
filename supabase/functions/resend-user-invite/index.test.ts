import { assertEquals } from 'jsr:@std/assert'
import { isPendingInvite, resolveInvitationStatus } from '../_shared/user-management.ts'

Deno.test('resend-user-invite identifies pending invited users', () => {
  assertEquals(resolveInvitationStatus({ invited_at: '2026-04-27T12:00:00Z' }), 'pending')
  assertEquals(isPendingInvite({ invited_at: '2026-04-27T12:00:00Z' }), true)
})

Deno.test('resend-user-invite does not resend accepted or non-invited users', () => {
  assertEquals(resolveInvitationStatus({}), 'not_invited')
  assertEquals(resolveInvitationStatus({
    invited_at: '2026-04-27T12:00:00Z',
    email_confirmed_at: '2026-04-27T12:05:00Z',
  }), 'accepted')
  assertEquals(resolveInvitationStatus({
    invited_at: '2026-04-27T12:00:00Z',
    last_sign_in_at: '2026-04-27T12:10:00Z',
  }), 'accepted')
})
