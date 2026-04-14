-- Tracks step-by-step onboarding progress and quiz acceptances per compra.
-- One row per compra (UNIQUE on compra_id). Each step completion is a timestamp.

CREATE TABLE onboarding_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  compra_id uuid NOT NULL UNIQUE REFERENCES compras(id) ON DELETE CASCADE,

  -- Per-step completion timestamps (null = not yet completed)
  step1_completed_at timestamptz,
  step2_completed_at timestamptz,
  step3_completed_at timestamptz,
  step4_completed_at timestamptz,
  step5_completed_at timestamptz,
  step6_completed_at timestamptz,
  step7_completed_at timestamptz,
  step_final_completed_at timestamptz,

  -- Etapa 5 specific data
  traffic_choice text CHECK (traffic_choice IS NULL OR traffic_choice IN ('yes', 'no')),

  -- Current step the user is on (for cross-device resume)
  current_step text NOT NULL DEFAULT '1',

  -- Overall completion timestamp
  completed_at timestamptz,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_onboarding_progress_compra ON onboarding_progress (compra_id);
CREATE INDEX idx_onboarding_progress_completed ON onboarding_progress (completed_at)
  WHERE completed_at IS NOT NULL;

COMMENT ON TABLE onboarding_progress IS 'Step-by-step onboarding progress and quiz acceptances per compra';
COMMENT ON COLUMN onboarding_progress.current_step IS 'Current step: 1-7, final, or done';
COMMENT ON COLUMN onboarding_progress.traffic_choice IS 'Etapa 5: yes = wants traffic PDF, no = skip';
COMMENT ON COLUMN onboarding_progress.completed_at IS 'Set when user finishes EtapaFinal';
