/**
 * Edge Function: get-perplexity-config
 * Retorna configuração do Perplexity/Sonar para geração de briefing.
 * Acesso público (sem autenticação).
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const DEFAULT_SUGGEST_SYSTEM_PROMPT = [
  "Voce e um redator especializado em campanhas de marketing com celebridades para marcas brasileiras.",
  "Escreva um texto de briefing de campanha direto, claro e especifico.",
  "Responda APENAS com o texto do briefing, sem introducao, sem JSON, sem markdown, sem placeholders.",
  "O texto deve ser em portugues brasileiro.",
].join(" ");

const DEFAULT_SUGGEST_USER_PROMPT_TEMPLATE = [
  "Escreva um briefing de campanha para a seguinte marca:",
  "- Empresa: ${company_name} (${company_site})",
  "- Celebridade: ${celebrity_name}",
  "${segment_line}",
  "${region_line}",
  "${goal_line}",
  "${sources_line}",
  "",
  "O briefing deve cobrir: contexto da marca, publico-alvo e angulo da campanha com a celebridade.",
  "Minimo de 2 paragrafos. Seja especifico, evite frases genericas.",
  "Responda SOMENTE com o texto do briefing.",
].join("\\n");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

function maskApiKey(apiKey: string | null | undefined): string | null {
  const normalized = String(apiKey ?? "").trim();
  if (!normalized) return null;
  if (normalized.length <= 4) return "****";
  return `****${normalized.slice(-4)}`;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method !== "GET") {
      return new Response(
        JSON.stringify({ error: "Método não permitido", code: "METHOD_NOT_ALLOWED" }),
        { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data, error } = await supabase
      .from("perplexity_config")
      .select("*")
      .limit(1)
      .single();

    if (error) {
      console.error("[get-perplexity-config] Erro ao buscar config:", error);
      return new Response(
        JSON.stringify({ error: "Erro ao buscar configurações", details: error.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const dbApiKey = String(data?.api_key ?? "").trim();
    const envApiKey = String(Deno.env.get("PERPLEXITY_API_KEY") ?? "").trim();
    const apiKeySource =
      dbApiKey.length > 0 ? "database" : envApiKey.length > 0 ? "env_var" : "none";

    return new Response(
      JSON.stringify({
        success: true,
        config: {
          model: data?.model ?? "sonar-pro",
          api_base_url: data?.api_base_url ?? "https://api.perplexity.ai",
          timeout_ms: data?.timeout_ms ?? 30000,
          temperature: data?.temperature ?? 0.2,
          top_p: data?.top_p ?? 0.9,
          search_mode: data?.search_mode ?? "web",
          search_recency_filter: data?.search_recency_filter ?? "month",
          system_prompt: data?.system_prompt ?? "",
          user_prompt_template: data?.user_prompt_template ?? "",
          insights_count: data?.insights_count ?? 5,
          prompt_version: data?.prompt_version ?? "1.0.0",
          strategy_version: data?.strategy_version ?? "1.0.0",
          contract_version: data?.contract_version ?? "1.0.0",
          suggest_system_prompt: data?.suggest_system_prompt ?? DEFAULT_SUGGEST_SYSTEM_PROMPT,
          suggest_user_prompt_template:
            data?.suggest_user_prompt_template ?? DEFAULT_SUGGEST_USER_PROMPT_TEMPLATE,
          suggest_prompt_version: data?.suggest_prompt_version ?? "v1.0.0",
          suggest_strategy_version: data?.suggest_strategy_version ?? "v1.0.0",
          api_key_hint: apiKeySource === "database" ? maskApiKey(dbApiKey) : null,
          api_key_source: apiKeySource,
          updated_at: data?.updated_at ?? null,
        },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[get-perplexity-config] Erro:", err);
    return new Response(
      JSON.stringify({ error: "Erro interno do servidor", details: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
