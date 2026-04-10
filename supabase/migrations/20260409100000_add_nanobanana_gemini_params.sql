-- Migration: add Gemini generation parameters to nanobanana_config
-- Adds temperature, top_p, top_k, safety_preset, use_system_instruction

ALTER TABLE nanobanana_config
  ADD COLUMN IF NOT EXISTS temperature            double precision DEFAULT 1.0,
  ADD COLUMN IF NOT EXISTS top_p                  double precision DEFAULT 0.95,
  ADD COLUMN IF NOT EXISTS top_k                  integer          DEFAULT 40,
  ADD COLUMN IF NOT EXISTS safety_preset          text             DEFAULT 'default',
  ADD COLUMN IF NOT EXISTS use_system_instruction boolean          DEFAULT false;

ALTER TABLE nanobanana_config
  ADD CONSTRAINT chk_temperature   CHECK (temperature >= 0.0 AND temperature <= 2.0),
  ADD CONSTRAINT chk_top_p         CHECK (top_p >= 0.0 AND top_p <= 1.0),
  ADD CONSTRAINT chk_top_k         CHECK (top_k >= 1 AND top_k <= 100),
  ADD CONSTRAINT chk_safety_preset CHECK (safety_preset IN ('default', 'relaxed', 'permissive', 'strict'));
