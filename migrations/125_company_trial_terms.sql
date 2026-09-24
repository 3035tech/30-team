-- Commercial transition: preserve existing licenses and apply the new trial terms only to new companies.
ALTER TABLE company_licenses
  ADD COLUMN IF NOT EXISTS offer_tier TEXT NOT NULL DEFAULT 'legacy',
  ADD COLUMN IF NOT EXISTS trial_days INTEGER NOT NULL DEFAULT 365;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'company_licenses_offer_tier_chk'
  ) THEN
    ALTER TABLE company_licenses
      ADD CONSTRAINT company_licenses_offer_tier_chk
      CHECK (offer_tier IN ('legacy', 'trial', 'early_adopter', 'design_partner'));
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'company_licenses_trial_days_chk'
  ) THEN
    ALTER TABLE company_licenses
      ADD CONSTRAINT company_licenses_trial_days_chk CHECK (trial_days > 0);
  END IF;
END $$;

CREATE OR REPLACE FUNCTION issue_company_early_access_license() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  next_offer_tier TEXT := 'trial';
  next_trial_days INTEGER := 30;
BEGIN
  IF NEW.signup_source = 'early_access' AND NEW.company_id IS NOT NULL THEN
    -- Serialize cohort assignment so concurrent company signups cannot both claim the last slot.
    PERFORM pg_advisory_xact_lock(3035, 125);

    IF (SELECT COUNT(*) FROM company_licenses WHERE offer_tier = 'early_adopter') < 20 THEN
      next_offer_tier := 'early_adopter';
      next_trial_days := 90;
    END IF;

    INSERT INTO company_licenses(company_id, starts_at, expires_at, offer_tier, trial_days)
    VALUES (
      NEW.company_id,
      NEW.created_at,
      NEW.created_at + make_interval(days => next_trial_days),
      next_offer_tier,
      next_trial_days
    )
    ON CONFLICT (company_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS users_issue_early_access_license ON users;
CREATE TRIGGER users_issue_early_access_license
AFTER INSERT ON users FOR EACH ROW EXECUTE FUNCTION issue_company_early_access_license();

COMMENT ON COLUMN company_licenses.offer_tier IS 'Commercial cohort: legacy, trial, early_adopter, or design_partner.';
COMMENT ON COLUMN company_licenses.trial_days IS 'Promised free period for the company cohort; existing legacy rows retain 365 days.';

INSERT INTO schema_migrations(name) VALUES ('125_company_trial_terms.sql') ON CONFLICT (name) DO NOTHING;
