import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

export interface SecurityLogEntry {
  ip_address: string;
  event_type: 'RATE_LIMIT' | 'BLOCKED_IP' | 'BLOCKED_DOC' | 'INVALID_CAPTCHA' | 'FAILED_PAYMENT_LIMIT' | 'SUSPICIOUS_ACTIVITY';
  function_name: string;
  metadata?: Record<string, any>;
  user_agent?: string;
}

export async function logSecurityEvent(entry: SecurityLogEntry, supabaseClient?: any) {
  try {
    const client = supabaseClient || createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { error } = await client
      .from('security_logs')
      .insert({
        ip_address: entry.ip_address,
        event_type: entry.event_type,
        function_name: entry.function_name,
        metadata: entry.metadata || {},
        user_agent: entry.user_agent,
      });

    if (error) {
      console.error('Failed to log security event:', error);
    }
  } catch (err) {
    console.error('Error in security logger:', err);
  }
}
