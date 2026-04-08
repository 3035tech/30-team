-- 003_seed_area_rubrics.sql
-- Default rubrics (desired type weights) per area for hiring comparisons.

BEGIN;

-- Ensure rubrics rows exist for all areas
INSERT INTO area_rubrics (area_id, desired_type_weights)
SELECT id, '{}'::jsonb
FROM areas
ON CONFLICT (area_id) DO NOTHING;

-- Helpers: weights are 0..1; only positive weights are considered in scoring.
-- You can refine these later; they are just sensible defaults.

UPDATE area_rubrics r
SET desired_type_weights = jsonb_build_object(
  '1', 0.7,  -- pragmatic / structured
  '5', 1.0,  -- analytical
  '6', 0.8,  -- reliability
  '3', 0.5   -- delivery orientation
)
FROM areas a
WHERE a.id = r.area_id AND a.key = 'tecnologia';

UPDATE area_rubrics r
SET desired_type_weights = jsonb_build_object(
  '3', 0.9,  -- execution / goals
  '7', 0.8,  -- energy / initiative
  '8', 0.7,  -- assertiveness
  '2', 0.5   -- relationship
)
FROM areas a
WHERE a.id = r.area_id AND a.key = 'comercial';

UPDATE area_rubrics r
SET desired_type_weights = jsonb_build_object(
  '3', 0.7,
  '5', 0.8,
  '7', 0.7,
  '1', 0.6
)
FROM areas a
WHERE a.id = r.area_id AND a.key = 'produto';

UPDATE area_rubrics r
SET desired_type_weights = jsonb_build_object(
  '3', 0.8,
  '7', 0.9,
  '4', 0.7,
  '2', 0.5
)
FROM areas a
WHERE a.id = r.area_id AND a.key = 'marketing';

UPDATE area_rubrics r
SET desired_type_weights = jsonb_build_object(
  '2', 0.9,
  '6', 0.8,
  '9', 0.7,
  '7', 0.4
)
FROM areas a
WHERE a.id = r.area_id AND a.key = 'cs';

UPDATE area_rubrics r
SET desired_type_weights = jsonb_build_object(
  '2', 0.9,
  '6', 0.8,
  '9', 0.6
)
FROM areas a
WHERE a.id = r.area_id AND a.key = 'atendimento';

UPDATE area_rubrics r
SET desired_type_weights = jsonb_build_object(
  '1', 0.9,
  '6', 0.8,
  '3', 0.6,
  '9', 0.4
)
FROM areas a
WHERE a.id = r.area_id AND a.key = 'operacoes';

UPDATE area_rubrics r
SET desired_type_weights = jsonb_build_object(
  '1', 1.0,
  '5', 0.8,
  '6', 0.7
)
FROM areas a
WHERE a.id = r.area_id AND a.key = 'financeiro';

UPDATE area_rubrics r
SET desired_type_weights = jsonb_build_object(
  '2', 0.9,
  '9', 0.8,
  '6', 0.7,
  '1', 0.5
)
FROM areas a
WHERE a.id = r.area_id AND a.key = 'rh';

UPDATE area_rubrics r
SET desired_type_weights = jsonb_build_object(
  '1', 1.0,
  '6', 0.8,
  '9', 0.6,
  '5', 0.5
)
FROM areas a
WHERE a.id = r.area_id AND a.key = 'juridico';

UPDATE area_rubrics r
SET desired_type_weights = jsonb_build_object(
  '1', 0.5, '2', 0.5, '3', 0.5, '4', 0.5, '5', 0.5, '6', 0.5, '7', 0.5, '8', 0.5, '9', 0.5
)
FROM areas a
WHERE a.id = r.area_id AND a.key = 'outros';

COMMIT;

