import { assertEquals } from 'jsr:@std/assert'
import {
  inviteRedirectTo,
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

Deno.test('inviteRedirectTo uses canonical dashboard fallback instead of request origin', () => {
  const previousDashboardUrl = Deno.env.get('DASHBOARD_URL')
  const previousSiteUrl = Deno.env.get('SITE_URL')
  Deno.env.delete('DASHBOARD_URL')
  Deno.env.delete('SITE_URL')

  try {
    const req = new Request('https://example.functions.supabase.co/resend-user-invite', {
      headers: { origin: 'http://localhost:3000' },
    })

    assertEquals(
      inviteRedirectTo(req),
      'https://acelerai-primeiro-passo.vercel.app/reset-password?type=invite',
    )
  } finally {
    if (previousDashboardUrl === undefined) Deno.env.delete('DASHBOARD_URL')
    else Deno.env.set('DASHBOARD_URL', previousDashboardUrl)
    if (previousSiteUrl === undefined) Deno.env.delete('SITE_URL')
    else Deno.env.set('SITE_URL', previousSiteUrl)
  }
})

Deno.test('inviteRedirectTo prefers configured dashboard URL', () => {
  const previousDashboardUrl = Deno.env.get('DASHBOARD_URL')
  const previousSiteUrl = Deno.env.get('SITE_URL')
  Deno.env.set('DASHBOARD_URL', 'https://dashboard.example.com/')
  Deno.env.delete('SITE_URL')

  try {
    const req = new Request('https://example.functions.supabase.co/resend-user-invite')

    assertEquals(
      inviteRedirectTo(req),
      'https://dashboard.example.com/reset-password?type=invite',
    )
  } finally {
    if (previousDashboardUrl === undefined) Deno.env.delete('DASHBOARD_URL')
    else Deno.env.set('DASHBOARD_URL', previousDashboardUrl)
    if (previousSiteUrl === undefined) Deno.env.delete('SITE_URL')
    else Deno.env.set('SITE_URL', previousSiteUrl)
  }
})
