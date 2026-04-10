-- Onboarding access control: desacopla "autorização de onboarding" de "pagamento".
-- Estado atual por compra (1:1) + histórico imutável de eventos.

CREATE TABLE onboarding_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  compra_id uuid NOT NULL UNIQUE REFERENCES compras(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'blocked'
    CHECK (status IN ('blocked', 'allowed', 'revoked')),
  reason_code text NOT NULL DEFAULT 'auto'
    CHECK (reason_code IN (
      'auto',
      'negotiated_payment_terms',
      'manual_exception',
      'revoked_by_admin',
      'other'
    )),
  notes text,
  allowed_until timestamptz,
  updated_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_onboarding_access_status ON onboarding_access (status);

CREATE TABLE onboarding_access_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  compra_id uuid NOT NULL REFERENCES compras(id) ON DELETE CASCADE,
  from_status text,
  to_status text NOT NULL,
  reason_code text NOT NULL,
  notes text,
  actor_id text,
  actor_role text NOT NULL DEFAULT 'system',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_onboarding_access_events_compra ON onboarding_access_events (compra_id, created_at DESC);

-- Trigger: grava evento automaticamente quando onboarding_access muda.
CREATE OR REPLACE FUNCTION fn_onboarding_access_audit()
RETURNS trigger AS $$
BEGIN
  INSERT INTO onboarding_access_events (
    compra_id, from_status, to_status, reason_code, notes, actor_id, actor_role
  ) VALUES (
    NEW.compra_id,
    CASE WHEN TG_OP = 'UPDATE' THEN OLD.status ELSE NULL END,
    NEW.status,
    NEW.reason_code,
    NEW.notes,
    NEW.updated_by,
    COALESCE(NEW.updated_by, 'system')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_onboarding_access_audit
  AFTER INSERT OR UPDATE ON onboarding_access
  FOR EACH ROW
  EXECUTE FUNCTION fn_onboarding_access_audit();
