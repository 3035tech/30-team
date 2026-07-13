-- Align motivators dimension colors with lib/ae/motivators-dimensions.js
-- (avoid brand purple / status danger collisions). Safe to re-run.

UPDATE ae_dimensions d
SET color = v.color
FROM (
  VALUES
    ('reconhecimento', '#c026d3'),
    ('desafio', '#ea580c'),
    ('criatividade', '#7e22ce')
) AS v(key, color)
WHERE LOWER(d.key) = LOWER(v.key)
  AND d.definition_id = (
    SELECT id FROM ae_definitions WHERE LOWER(slug) = LOWER('motivators') LIMIT 1
  );
