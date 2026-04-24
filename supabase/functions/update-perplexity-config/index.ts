/**
 * Edge Function: update-perplexity-config
 * Atualiza configurações do Perplexity/Sonar (todos os campos editáveis).
 * Protegida por JWT + RBAC admin.
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { isRbacError, requireRole } from "../_shared/rbac.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "PATCH, OPTIONS",
};

const VALID_SEARCH_MODES = ["web"];
const VALID_RECENCY_FILTERS = ["hour", "day", "week", "month", "year"];
const REQUIRED_SUGGEST_TEMPLATE_TOKENS = [
  "${company_name}",
  "${company_site}",
  "${celebrity_name}",
];

interface UpdateBody {
  model?: string;
  api_base_url?: string;
  api_key?: string;
  timeout_ms?: number;
  temperature?: number;
  top_p?: number;
  search_mode?: string;
  search_recency_filter?: string;
  system_prompt?: string;
  user_prompt_template?: string;
  insights_count?: number;
  prompt_version?: string;
  strategy_version?: string;
  contract_version?: string;
  suggest_system_prompt?: string;
  suggest_user_prompt_template?: string;
  suggest_prompt_version?: string;
  suggest_strategy_version?: string;
}

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function validationError(message: string) {
  return jsonResponse({ error: message, code: "VALIDATION_ERROR" }, 400);
}

function validateInt(val: unknown, min: number, max: number): number | null {
  const n = Number(val);
  if (Number.isNaN(n) || !Number.isInteger(n) || n < min || n > max) return null;
  return n;
}

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
    if (req.method !== "PATCH") {
      return jsonResponse({ error: "Método não permitido", code: "METHOD_NOT_ALLOWED" }, 405);
    }

    const authResult = await requireRole(req, ["admin"]);
    if (isRbacError(authResult)) return authResult.error;

    let body: UpdateBody;
    try {
      body = await req.json();
    } catch {
      return jsonResponse({ error: "JSON inválido", code: "INVALID_JSON" }, 400);
    }

    const updateData: Record<string, unknown> = {};

    // --- String fields ---

    if (body.model !== undefined) {
      const val = String(body.model).trim();
      if (!val) {
        return validationError("model não pode ser vazio");
      }
      updateData.model = val;
    }

    if (body.api_base_url !== undefined) {
      const val = String(body.api_base_url).trim();
      if (!val.startsWith("https://")) {
        return validationError("api_base_url deve começar com https://");
      }
      updateData.api_base_url = val;
    }

    if (body.api_key !== undefined) {
      const val = String(body.api_key).trim();
      if (!val) {
        updateData.api_key = null;
      } else {
        if (val.length < 10) {
          return validationError("api_key deve ter ao menos 10 caracteres");
        }
        updateData.api_key = val;
      }
    }

    if (body.search_mode !== undefined) {
      if (!VALID_SEARCH_MODES.includes(body.search_mode)) {
        return validationError(`search_mode deve ser: ${VALID_SEARCH_MODES.join(", ")}`);
      }
      updateData.search_mode = body.search_mode;
    }

    if (body.search_recency_filter !== undefined) {
      if (!VALID_RECENCY_FILTERS.includes(body.search_recency_filter)) {
        return validationError(`search_recency_filter deve ser: ${VALID_RECENCY_FILTERS.join(", ")}`);
      }
      updateData.search_recency_filter = body.search_recency_filter;
    }

    if (body.system_prompt !== undefined) {
      const val = String(body.system_prompt).trim();
      if (!val) {
        return validationError("system_prompt não pode ser vazio");
      }
      updateData.system_prompt = val;
    }

    if (body.user_prompt_template !== undefined) {
      const val = String(body.user_prompt_template).trim();
      if (!val) {
        return validationError("user_prompt_template não pode ser vazio");
      }
      updateData.user_prompt_template = val;
    }

    if (body.prompt_version !== undefined) {
      const val = String(body.prompt_version).trim();
      if (!val) {
        return validationError("prompt_version não pode ser vazio");
      }
      updateData.prompt_version = val;
    }

    if (body.strategy_version !== undefined) {
      const val = String(body.strategy_version).trim();
      if (!val) {
        return validationError("strategy_version não pode ser vazio");
      }
      updateData.strategy_version = val;
    }

    if (body.contract_version !== undefined) {
      const val = String(body.contract_version).trim();
      if (!val) {
        return validationError("contract_version não pode ser vazio");
      }
      updateData.contract_version = val;
    }

    if (body.suggest_system_prompt !== undefined) {
      const val = String(body.suggest_system_prompt).trim();
      if (val.length < 20) {
        return validationError("suggest_system_prompt deve ter ao menos 20 caracteres");
      }
      updateData.suggest_system_prompt = val;
    }

    if (body.suggest_user_prompt_template !== undefined) {
      const val = String(body.suggest_user_prompt_template).trim();
      if (!val) {
        return validationError("suggest_user_prompt_template não pode ser vazio");
      }
      const missingTokens = REQUIRED_SUGGEST_TEMPLATE_TOKENS.filter((token) => !val.includes(token));
      if (missingTokens.length > 0) {
        return validationError(
          `suggest_user_prompt_template inválido. Inclua os placeholders obrigatórios: ${missingTokens.join(", ")}`
        );
      }
      updateData.suggest_user_prompt_template = val;
    }

    if (body.suggest_prompt_version !== undefined) {
      const val = String(body.suggest_prompt_version).trim();
      if (!val) {
        return validationError("suggest_prompt_version não pode ser vazio");
      }
      updateData.suggest_prompt_version = val;
    }

    if (body.suggest_strategy_version !== undefined) {
      const val = String(body.suggest_strategy_version).trim();
      if (!val) {
        return validationError("suggest_strategy_version não pode ser vazio");
      }
      updateData.suggest_strategy_version = val;
    }

    // --- Numeric fields ---

    if (body.timeout_ms !== undefined) {
      const val = validateInt(body.timeout_ms, 1000, 60000);
      if (val === null) return validationError("timeout_ms deve ser inteiro entre 1000 e 60000");
      updateData.timeout_ms = val;
    }

    if (body.temperature !== undefined) {
      const val = Number(body.temperature);
      if (Number.isNaN(val) || val < 0 || val > 2) {
        return validationError("temperature deve estar entre 0 e 2");
      }
      updateData.temperature = val;
    }

    if (body.top_p !== undefined) {
      const val = Number(body.top_p);
      if (Number.isNaN(val) || val < 0 || val > 1) {
        return validationError("top_p deve estar entre 0 e 1");
      }
      updateData.top_p = val;
    }

    if (body.insights_count !== undefined) {
      const val = validateInt(body.insights_count, 1, 10);
      if (val === null) return validationError("insights_count deve ser inteiro entre 1 e 10");
      updateData.insights_count = val;
    }

    // --- Submit ---

    if (Object.keys(updateData).length === 0) {
      return jsonResponse({ error: "Nenhum campo válido para atualizar", code: "NO_VALID_FIELDS" }, 400);
    }

    updateData.updated_at = new Date().toISOString();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: existingConfig } = await supabase
      .from("perplexity_config")
      .select("id")
      .limit(1)
      .single();

    if (!existingConfig?.id) {
      return jsonResponse({ error: "Configuração não encontrada", code: "NOT_FOUND" }, 404);
    }

    const { data: updated, error } = await supabase
      .from("perplexity_config")
      .update(updateData)
      .eq("id", existingConfig.id)
      .select()
      .single();

    if (error) {
      console.error("[update-perplexity-config] Erro ao atualizar:", error);
      return jsonResponse({ error: "Erro ao atualizar configurações", details: error.message }, 500);
    }

    const dbApiKey = String(updated?.api_key ?? "").trim();
    const envApiKey = String(Deno.env.get("PERPLEXITY_API_KEY") ?? "").trim();
    const apiKeySource =
      dbApiKey.length > 0 ? "database" : envApiKey.length > 0 ? "env_var" : "none";

    return jsonResponse({
      success: true,
      config: {
        model: updated?.model,
        api_base_url: updated?.api_base_url,
        timeout_ms: updated?.timeout_ms,
        temperature: updated?.temperature,
        top_p: updated?.top_p,
        search_mode: updated?.search_mode,
        search_recency_filter: updated?.search_recency_filter,
        system_prompt: updated?.system_prompt,
        user_prompt_template: updated?.user_prompt_template,
        insights_count: updated?.insights_count,
        prompt_version: updated?.prompt_version,
        strategy_version: updated?.strategy_version,
        contract_version: updated?.contract_version,
        suggest_system_prompt: updated?.suggest_system_prompt,
        suggest_user_prompt_template: updated?.suggest_user_prompt_template,
        suggest_prompt_version: updated?.suggest_prompt_version,
        suggest_strategy_version: updated?.suggest_strategy_version,
        api_key_hint: apiKeySource === "database" ? maskApiKey(dbApiKey) : null,
        api_key_source: apiKeySource,
        updated_at: updated?.updated_at,
      },
    });
  } catch (err) {
    console.error("[update-perplexity-config] Erro:", err);
    return jsonResponse({ error: "Erro interno do servidor", details: String(err) }, 500);
  }
});
