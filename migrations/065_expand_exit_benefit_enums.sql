-- 065: Expand closed taxonomies for exit reasons + benefit types (multi-segment).
-- Still enums (not company-cadastral). Categories of benefits remain per-tenant.

ALTER TABLE exit_records DROP CONSTRAINT IF EXISTS exit_records_reason_chk;
ALTER TABLE exit_records ADD CONSTRAINT exit_records_reason_chk CHECK (
  exit_reason IN (
    'better_offer', 'career_growth', 'compensation', 'benefits',
    'work_life_balance', 'burnout', 'workload',
    'relocation', 'commute', 'schedule',
    'personal', 'family_care', 'health',
    'study', 'public_exam', 'entrepreneurship',
    'performance', 'conduct', 'harassment',
    'restructuring', 'layoff', 'position_eliminated',
    'contract_end', 'seasonal_end', 'retirement',
    'culture_fit', 'manager_relationship', 'recognition',
    'lack_of_challenge', 'targets_pressure', 'client_pressure',
    'tools_process', 'other'
  )
);

COMMENT ON COLUMN exit_records.exit_reason IS
  'Closed taxonomy (multi-segment). Keys in lib/domain-status.js EXIT_REASON. Not company-editable.';

ALTER TABLE company_benefits DROP CONSTRAINT IF EXISTS company_benefits_type_chk;
ALTER TABLE company_benefits ADD CONSTRAINT company_benefits_type_chk CHECK (
  benefit_type IN (
    'health', 'dental', 'vision', 'mental_health', 'life_insurance',
    'retirement', 'profit_sharing', 'equity',
    'vacation', 'parental_leave', 'sabbatical',
    'flexible_hours', 'remote_work', 'home_office_allowance',
    'gym', 'wellness',
    'meal_voucher', 'food_basket', 'transport_voucher', 'parking', 'mobility', 'phone',
    'education', 'language', 'daycare', 'legal_aid', 'uniform', 'pet',
    'other'
  )
);

COMMENT ON COLUMN company_benefits.benefit_type IS
  'Closed indicative type (multi-segment). Keys in lib/domain-status.js BENEFIT_TYPE. Categories stay cadastral per company.';
