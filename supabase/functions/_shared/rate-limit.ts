import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface RateLimitConfig {
  limit: number;      // Número máximo de requisições
  window: number;     // Janela de tempo em segundos
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
}

export class RateLimiter {
  private client: SupabaseClient;

  constructor(client?: SupabaseClient) {
    this.client = client || createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
  }

  /**
   * Verifica e incrementa o rate limit para uma chave específica (IP ou Documento).
   * Implementação "Token Bucket" simplificada via SQL.
   */
  async check(key: string, config: RateLimitConfig): Promise<RateLimitResult> {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + config.window * 1000);

    // Tentamos recuperar o registro atual
    const { data: current, error: fetchError } = await this.client
      .from('rate_limits')
      .select('*')
      .eq('key', key)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 é "not found"
      console.error('Rate limit fetch error:', fetchError);
      return { allowed: true, remaining: 1 }; // Fail open em erro de banco
    }

    if (!current) {
      // Primeiro acesso
      const { error: insertError } = await this.client
        .from('rate_limits')
        .insert({
          key,
          count: 1,
          last_request: now.toISOString(),
          expires_at: expiresAt.toISOString()
        });
      
      return { allowed: true, remaining: config.limit - 1 };
    }

    // Se registro existe, verificar se expirou
    const recordExpires = new Date(current.expires_at);
    
    if (now > recordExpires) {
      // Janela expirou, resetar contador
      const { error: updateError } = await this.client
        .from('rate_limits')
        .update({
          count: 1,
          last_request: now.toISOString(),
          expires_at: expiresAt.toISOString()
        })
        .eq('key', key);
        
      return { allowed: true, remaining: config.limit - 1 };
    }

    // Janela ativa, incrementar
    if (current.count >= config.limit) {
      return { allowed: false, remaining: 0 };
    }

    const { error: incError } = await this.client
      .from('rate_limits')
      .update({
        count: current.count + 1,
        last_request: now.toISOString()
      })
      .eq('key', key);

    return { allowed: true, remaining: config.limit - (current.count + 1) };
  }

  // Helpers rápidos
  async checkIP(ip: string, limit = 10, window = 60) {
    return this.check(`ip:${ip}`, { limit, window });
  }

  async checkDocument(doc: string, limit = 5, window = 300) { // 5 tentativas em 5 min
    // Hash simples do doc pode ser feito antes se privacidade for crítica, 
    // mas aqui estamos no backend seguro.
    return this.check(`doc:${doc}`, { limit, window });
  }
}
