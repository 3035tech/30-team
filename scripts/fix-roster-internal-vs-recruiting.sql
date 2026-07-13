-- Separate internal team vs vacancy recruiting (safe to re-run).
-- 1) Mark people who only did company-link assessments (no vacancy) as employees.
-- 2) Inspect mix for a company (replace :company_id).

-- Preview mix for 3035tech (adjust company id/name as needed):
-- SELECT c.id, c.full_name, c.employment_status, ass.vacancy_id, v.title
-- FROM assessments ass
-- JOIN candidates c ON c.id = ass.candidate_id
-- LEFT JOIN vacancies v ON v.id = ass.vacancy_id
-- JOIN companies co ON co.id = ass.company_id
-- WHERE LOWER(co.name) LIKE '%3035%'
-- ORDER BY ass.created_at DESC;

-- Backfill: company-link-only people → employee
UPDATE candidates c
SET employment_status = 'employee'
WHERE c.employment_status = 'candidate'
  AND EXISTS (
    SELECT 1 FROM assessments a
    WHERE a.candidate_id = c.id AND a.vacancy_id IS NULL
  )
  AND NOT EXISTS (
    SELECT 1 FROM assessments a
    WHERE a.candidate_id = c.id AND a.vacancy_id IS NOT NULL
  );

-- Also mark anyone already hired in pipeline as employee (if missed)
UPDATE candidates c
SET employment_status = 'employee'
WHERE c.employment_status = 'candidate'
  AND (
    EXISTS (
      SELECT 1 FROM assessments a
      WHERE a.candidate_id = c.id AND a.pipeline_stage = 'hired'
    )
    OR EXISTS (
      SELECT 1 FROM vacancy_candidates vc
      WHERE vc.candidate_id = c.id AND vc.pipeline_stage = 'hired'
    )
  );
