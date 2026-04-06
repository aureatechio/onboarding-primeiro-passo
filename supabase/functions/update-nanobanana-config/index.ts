/**
 * Edge Function: update-nanobanana-config
 * Atualiza configurações do NanoBanana (todos os campos editáveis).
 * Protegida via x-admin-password.
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import {
  type CategoryKey,
  type DirectionMode,
  REFERENCE_BUCKET,
  VALID_CATEGORIES,
  VALID_DIRECTION_MODES,
  CONFIG_TABLE,
} from "../_shared/nanobanana/config.ts";
import { requireAdminPassword } from "../_shared/admin-auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-admin-password",
  "Access-Control-Allow-Methods": "PATCH, OPTIONS",
};

const MAX_REFERENCE_UPLOAD_BYTES = parseInt(
  Deno.env.get("NANOBANANA_MAX_REFERENCE_UPLOAD_BYTES") ?? String(10 * 1024 * 1024),
  10,
);

type DirectionTextField =
  | "direction_moderna"
  | "direction_clean"
  | "direction_retail";
type DirectionModeField =
  | "direction_moderna_mode"
  | "direction_clean_mode"
  | "direction_retail_mode";
type DirectionImageField =
  | "direction_moderna_image_path"
  | "direction_clean_image_path"
  | "direction_retail_image_path";

function isValidDirectionMode(value: unknown): value is DirectionMode {
  return (VALID_DIRECTION_MODES as readonly string[]).includes(value as string);
}

const CATEGORY_KEYS: readonly CategoryKey[] = VALID_CATEGORIES;

interface ParsedPayload {
  updateData: Record<string, unknown>;
  imageFiles: Partial<Record<CategoryKey, File>>;
  removeImage: Partial<Record<CategoryKey, boolean>>;
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

function directionTextField(category: CategoryKey): DirectionTextField {
  return `direction_${category}` as DirectionTextField;
}

function directionModeField(category: CategoryKey): DirectionModeField {
  return `direction_${category}_mode` as DirectionModeField;
}

function directionImageField(category: CategoryKey): DirectionImageField {
  return `direction_${category}_image_path` as DirectionImageField;
}

function parseBooleanFlag(value: unknown): boolean {
  return String(value ?? "").trim().toLowerCase() === "true";
}

function hasNonEmptyString(value: unknown): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

function isValidImageMime(mimeType: string): boolean {
  return ["image/png", "image/jpeg", "image/webp"].includes(mimeType);
}

async function parsePayload(req: Request): Promise<ParsedPayload | Response> {
  const contentType = req.headers.get("content-type")?.toLowerCase() ?? "";

  if (contentType.includes("multipart/form-data")) {
    let formData: FormData;
    try {
      formData = await req.formData();
    } catch {
      return jsonResponse({ error: "multipart inválido", code: "INVALID_MULTIPART" }, 400);
    }

    const updateData: Record<string, unknown> = {};
    const imageFiles: Partial<Record<CategoryKey, File>> = {};
    const removeImage: Partial<Record<CategoryKey, boolean>> = {};

    for (const [key, rawValue] of formData.entries()) {
      if (rawValue instanceof File) {
        const imageKeyMatch = key.match(/^direction_(moderna|clean|retail)_image$/);
        if (imageKeyMatch) {
          const category = imageKeyMatch[1] as CategoryKey;
          imageFiles[category] = rawValue;
        }
        continue;
      }

      if (key.match(/^direction_(moderna|clean|retail)_remove_image$/)) {
        const category = key.split("_")[1] as CategoryKey;
        removeImage[category] = parseBooleanFlag(rawValue);
        continue;
      }

      if (key.match(/^(max_retries|worker_batch_size|url_expiry_seconds|max_image_download_bytes)$/)) {
        updateData[key] = Number(rawValue);
        continue;
      }

      updateData[key] = rawValue;
    }

    return { updateData, imageFiles, removeImage };
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "JSON inválido", code: "INVALID_JSON" }, 400);
  }

  return { updateData: body, imageFiles: {}, removeImage: {} };
}

async function createSignedUrlForConfig(
  supabase: ReturnType<typeof createClient>,
  path: string | null | undefined,
) {
  if (!path) return null;
  const { data } = await supabase.storage
    .from(REFERENCE_BUCKET)
    .createSignedUrl(path, 60 * 30);
  return data?.signedUrl ?? null;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method !== "PATCH") {
      return jsonResponse({ error: "Método não permitido", code: "METHOD_NOT_ALLOWED" }, 405);
    }

    const authCheck = requireAdminPassword(req);
    if (!authCheck.authorized) return authCheck.response;

    const parsedPayload = await parsePayload(req);
    if (parsedPayload instanceof Response) {
      return parsedPayload;
    }
    const { updateData: body, imageFiles, removeImage } = parsedPayload;

    const updateData: Record<string, unknown> = {};

    // --- String fields ---

    if (body["gemini_model_name"] !== undefined) {
      const val = String(body["gemini_model_name"]).trim();
      if (!val) {
        return validationError("gemini_model_name não pode ser vazio");
      }
      updateData.gemini_model_name = val;
    }

    if (body["gemini_api_base_url"] !== undefined) {
      const val = String(body["gemini_api_base_url"]).trim();
      if (!val.startsWith("https://")) {
        return validationError("gemini_api_base_url deve começar com https://");
      }
      updateData.gemini_api_base_url = val;
    }

    if (body["global_rules"] !== undefined) {
      const val = String(body["global_rules"]).trim();
      if (!val) {
        return validationError("global_rules não pode ser vazio");
      }
      updateData.global_rules = val;
    }

    if (body["global_rules_version"] !== undefined) {
      const val = String(body["global_rules_version"]).trim();
      if (!val) {
        return validationError("global_rules_version não pode ser vazio");
      }
      updateData.global_rules_version = val;
    }

    if (body["prompt_version"] !== undefined) {
      const val = String(body["prompt_version"]).trim();
      if (!val) {
        return validationError("prompt_version não pode ser vazio");
      }
      updateData.prompt_version = val;
    }

    for (const category of CATEGORY_KEYS) {
      const textField = directionTextField(category);
      const modeField = directionModeField(category);

      if (body[textField] !== undefined) {
        const val = String(body[textField]).trim();
        if (!val) {
          return validationError(`${textField} não pode ser vazio`);
        }
        updateData[textField] = val;
      }

      if (body[modeField] !== undefined) {
        const val = String(body[modeField]).trim();
        if (!isValidDirectionMode(val)) {
          return validationError(`${modeField} deve ser 'text', 'image' ou 'both'`);
        }
        updateData[modeField] = val;
      }
    }

    if (body["format_1_1"] !== undefined) {
      const val = String(body["format_1_1"]).trim();
      if (!val) {
        return validationError("format_1_1 não pode ser vazio");
      }
      updateData.format_1_1 = val;
    }

    if (body["format_4_5"] !== undefined) {
      const val = String(body["format_4_5"]).trim();
      if (!val) {
        return validationError("format_4_5 não pode ser vazio");
      }
      updateData.format_4_5 = val;
    }

    if (body["format_16_9"] !== undefined) {
      const val = String(body["format_16_9"]).trim();
      if (!val) {
        return validationError("format_16_9 não pode ser vazio");
      }
      updateData.format_16_9 = val;
    }

    if (body["format_9_16"] !== undefined) {
      const val = String(body["format_9_16"]).trim();
      if (!val) {
        return validationError("format_9_16 não pode ser vazio");
      }
      updateData.format_9_16 = val;
    }

    // --- Numeric fields ---

    if (body["max_retries"] !== undefined) {
      const val = validateInt(body["max_retries"], 0, 10);
      if (val === null) return validationError("max_retries deve ser inteiro entre 0 e 10");
      updateData.max_retries = val;
    }

    if (body["worker_batch_size"] !== undefined) {
      const val = validateInt(body["worker_batch_size"], 1, 12);
      if (val === null) return validationError("worker_batch_size deve ser inteiro entre 1 e 12");
      updateData.worker_batch_size = val;
    }

    if (body["url_expiry_seconds"] !== undefined) {
      const val = validateInt(body["url_expiry_seconds"], 3600, 2592000);
      if (val === null) return validationError("url_expiry_seconds deve ser inteiro entre 3600 e 2592000");
      updateData.url_expiry_seconds = val;
    }

    if (body["max_image_download_bytes"] !== undefined) {
      const val = validateInt(body["max_image_download_bytes"], 1048576, 52428800);
      if (val === null) return validationError("max_image_download_bytes deve ser inteiro entre 1048576 e 52428800");
      updateData.max_image_download_bytes = val;
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: existingConfig, error: existingConfigError } = await supabase
      .from(CONFIG_TABLE)
      .select("*")
      .limit(1)
      .single();

    if (existingConfigError) {
      return jsonResponse(
        { error: "Erro ao buscar configuração existente", details: existingConfigError.message },
        500,
      );
    }

    if (!existingConfig?.id) {
      return jsonResponse({ error: "Configuração não encontrada", code: "NOT_FOUND" }, 404);
    }

    for (const category of CATEGORY_KEYS) {
      const imageFile = imageFiles[category];
      const imageField = directionImageField(category);

      if (removeImage[category]) {
        updateData[imageField] = null;
      }

      if (!imageFile || imageFile.size === 0) continue;
      if (!isValidImageMime(imageFile.type)) {
        return validationError(`Imagem de ${category} deve ser PNG, JPEG ou WEBP`);
      }
      if (imageFile.size > MAX_REFERENCE_UPLOAD_BYTES) {
        return validationError(
          `Imagem de ${category} excede ${MAX_REFERENCE_UPLOAD_BYTES} bytes`,
        );
      }

      const safeName = imageFile.name.toLowerCase().replace(/[^a-z0-9._-]/g, "_");
      const storagePath = `${category}/${Date.now()}_${crypto.randomUUID()}_${safeName}`;
      const bytes = new Uint8Array(await imageFile.arrayBuffer());

      const { error: uploadError } = await supabase.storage
        .from(REFERENCE_BUCKET)
        .upload(storagePath, bytes, {
          contentType: imageFile.type,
          upsert: true,
        });

      if (uploadError) {
        return jsonResponse(
          { error: `Erro ao fazer upload da imagem ${category}`, details: uploadError.message },
          500,
        );
      }

      updateData[imageField] = storagePath;
    }

    const effectiveTexts: Record<CategoryKey, string> = {
      moderna: String(updateData.direction_moderna ?? existingConfig.direction_moderna ?? "").trim(),
      clean: String(updateData.direction_clean ?? existingConfig.direction_clean ?? "").trim(),
      retail: String(updateData.direction_retail ?? existingConfig.direction_retail ?? "").trim(),
    };

    for (const category of CATEGORY_KEYS) {
      if (!hasNonEmptyString(effectiveTexts[category])) {
        return validationError(`direction_${category} é obrigatório`);
      }
    }

    if (Object.keys(updateData).length === 0) {
      return jsonResponse({ error: "Nenhum campo válido para atualizar", code: "NO_VALID_FIELDS" }, 400);
    }

    updateData.updated_at = new Date().toISOString();

    const { data: updated, error } = await supabase
      .from(CONFIG_TABLE)
      .update(updateData)
      .eq("id", existingConfig.id)
      .select()
      .single();

    if (error) {
      console.error("[update-nanobanana-config] Erro ao atualizar:", error);
      return jsonResponse({ error: "Erro ao atualizar configurações", details: error.message }, 500);
    }

    return jsonResponse({
      success: true,
      config: {
        gemini_model_name: updated?.gemini_model_name,
        gemini_api_base_url: updated?.gemini_api_base_url,
        max_retries: updated?.max_retries,
        worker_batch_size: updated?.worker_batch_size,
        url_expiry_seconds: updated?.url_expiry_seconds,
        max_image_download_bytes: updated?.max_image_download_bytes,
        global_rules: updated?.global_rules,
        global_rules_version: updated?.global_rules_version,
        prompt_version: updated?.prompt_version,
        direction_moderna: updated?.direction_moderna,
        direction_clean: updated?.direction_clean,
        direction_retail: updated?.direction_retail,
        direction_moderna_mode: updated?.direction_moderna_mode ?? "text",
        direction_clean_mode: updated?.direction_clean_mode ?? "text",
        direction_retail_mode: updated?.direction_retail_mode ?? "text",
        direction_moderna_image_path: updated?.direction_moderna_image_path ?? null,
        direction_clean_image_path: updated?.direction_clean_image_path ?? null,
        direction_retail_image_path: updated?.direction_retail_image_path ?? null,
        direction_moderna_image_url: await createSignedUrlForConfig(
          supabase,
          updated?.direction_moderna_image_path,
        ),
        direction_clean_image_url: await createSignedUrlForConfig(
          supabase,
          updated?.direction_clean_image_path,
        ),
        direction_retail_image_url: await createSignedUrlForConfig(
          supabase,
          updated?.direction_retail_image_path,
        ),
        format_1_1: updated?.format_1_1,
        format_4_5: updated?.format_4_5,
        format_16_9: updated?.format_16_9,
        format_9_16: updated?.format_9_16,
        updated_at: updated?.updated_at,
      },
    });
  } catch (err) {
    console.error("[update-nanobanana-config] Erro:", err);
    return jsonResponse({ error: "Erro interno do servidor", details: String(err) }, 500);
  }
});
