-- Free prose belongs to the cycle; selected competencies use migration 131's relation.
ALTER TABLE formal_review_cycles ADD COLUMN IF NOT EXISTS instructions TEXT NOT NULL DEFAULT '';
