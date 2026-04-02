export async function validateTurnstileToken(token: string, ip?: string): Promise<{ success: boolean; error?: string }> {
  const secretKey = Deno.env.get('TURNSTILE_SECRET_KEY');

  // Se não tiver chave configurada (dev), permite passar (fail open) ou bloqueia. 
  // Por segurança, logamos o aviso mas permitimos testes se o token for de teste.
  if (!secretKey) {
    console.warn('TURNSTILE_SECRET_KEY not set. Skipping validation.');
    return { success: true }; 
  }

  if (!token) {
    return { success: false, error: 'Token is missing' };
  }

  try {
    const formData = new FormData();
    formData.append('secret', secretKey);
    formData.append('response', token);
    if (ip) formData.append('remoteip', ip);

    const result = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      body: formData,
      method: 'POST',
    });

    const outcome = await result.json();

    if (outcome.success) {
      return { success: true };
    } else {
      console.error('Turnstile validation failed:', outcome['error-codes']);
      return { success: false, error: 'Invalid token' };
    }
  } catch (err) {
    console.error('Turnstile connection error:', err);
    // Em caso de erro de rede da Cloudflare, decidimos se bloqueamos ou deixamos passar.
    // Fail closed (bloquear) é mais seguro para pagamentos.
    return { success: false, error: 'Validation service unavailable' };
  }
}
