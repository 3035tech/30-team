-- Bump compensation event notes for rich text (same cap as onboarding check-ins).
ALTER TABLE employee_compensation_events
  DROP CONSTRAINT IF EXISTS employee_compensation_events_notes_len;

ALTER TABLE employee_compensation_events
  ADD CONSTRAINT employee_compensation_events_notes_len
    CHECK (char_length(notes) <= 4000);
