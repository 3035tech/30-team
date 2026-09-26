-- Additive P1 catalog metadata and immutable review wording.
-- Rollback application first; leave columns in place to preserve snapshots.
-- Category relationships are defined by migration 129, not free text.
ALTER TABLE company_competencies ADD COLUMN IF NOT EXISTS self_description TEXT NOT NULL DEFAULT '';
ALTER TABLE formal_review_items ADD COLUMN IF NOT EXISTS description TEXT NOT NULL DEFAULT '';
ALTER TABLE formal_review_items ADD COLUMN IF NOT EXISTS self_description TEXT NOT NULL DEFAULT '';
-- Deliberately do not infer historical wording from today's catalog.
