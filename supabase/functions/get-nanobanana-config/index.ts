/**
 * Edge Function: get-nanobanana-config
 * Retorna configuração do NanoBanana (geração de criativos com Gemini).
 * Acesso público (sem autenticação).
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { REFERENCE_BUCKET, CONFIG_TABLE } from "../_shared/nanobanana/config.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

const URL_EXPIRY_SECONDS = 60 * 30;

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function maybeCreateSignedUrl(
  supabase: ReturnType<typeof createClient>,
  path: string | null | undefined,
) {
  if (!path) return null;
  const { data } = await supabase.storage
    .from(REFERENCE_BUCKET)
    .createSignedUrl(path, URL_EXPIRY_SECONDS);
  return data?.signedUrl ?? null;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method !== "GET") {
      return jsonResponse(
        { error: "Método não permitido", code: "METHOD_NOT_ALLOWED" },
        405,
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data, error } = await supabase
      .from(CONFIG_TABLE)
      .select("*")
      .limit(1)
      .single();

    if (error) {
      console.error("[get-nanobanana-config] Erro ao buscar config:", error);
      return jsonResponse(
        { error: "Erro ao buscar configurações", details: error.message },
        500,
      );
    }

    const [
      direction_moderna_image_url,
      direction_clean_image_url,
      direction_retail_image_url,
    ] = await Promise.all([
      maybeCreateSignedUrl(supabase, data?.direction_moderna_image_path),
      maybeCreateSignedUrl(supabase, data?.direction_clean_image_path),
      maybeCreateSignedUrl(supabase, data?.direction_retail_image_path),
    ]);

    return jsonResponse({
      success: true,
      config: {
        gemini_model_name: data?.gemini_model_name ?? "gemini-2.0-flash-exp",
        gemini_api_base_url:
          data?.gemini_api_base_url ?? "https://generativelanguage.googleapis.com",
        max_retries: data?.max_retries ?? 3,
        worker_batch_size: data?.worker_batch_size ?? 4,
        url_expiry_seconds: data?.url_expiry_seconds ?? 86400,
        max_image_download_bytes: data?.max_image_download_bytes ?? 10485760,
        global_rules: data?.global_rules ?? "",
        global_rules_version: data?.global_rules_version ?? "1.0.0",
        prompt_version: data?.prompt_version ?? "1.0.0",
        direction_moderna: data?.direction_moderna ?? "",
        direction_clean: data?.direction_clean ?? "",
        direction_retail: data?.direction_retail ?? "",
        direction_moderna_mode: data?.direction_moderna_mode ?? "text",
        direction_clean_mode: data?.direction_clean_mode ?? "text",
        direction_retail_mode: data?.direction_retail_mode ?? "text",
        direction_moderna_image_path: data?.direction_moderna_image_path ?? null,
        direction_clean_image_path: data?.direction_clean_image_path ?? null,
        direction_retail_image_path: data?.direction_retail_image_path ?? null,
        direction_moderna_image_url,
        direction_clean_image_url,
        direction_retail_image_url,
        format_1_1: data?.format_1_1 ?? "",
        format_4_5: data?.format_4_5 ?? "",
        format_16_9: data?.format_16_9 ?? "",
        format_9_16: data?.format_9_16 ?? "",
        updated_at: data?.updated_at ?? null,
      },
    });
  } catch (err) {
    console.error("[get-nanobanana-config] Erro:", err);
    return jsonResponse({ error: "Erro interno do servidor", details: String(err) }, 500);
  }
});
