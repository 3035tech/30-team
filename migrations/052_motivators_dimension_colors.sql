-- P2 palette: sync Motivadores dimension colors to lib/ae/motivators-dimensions.js
-- (avoid brand violet / pipeline purple clash on reconhecimento + criatividade).
-- Idempotent; does not touch questions or attempts.

UPDATE ae_dimensions d
SET color = v.color
FROM (
  VALUES
    ('reconhecimento', '#9D174D'),
    ('financeiro', '#059669'),
    ('crescimento', '#2563eb'),
    ('desenvolvimento', '#0891b2'),
    ('autonomia', '#d97706'),
    ('flexibilidade', '#65a30d'),
    ('proposito', '#db2777'),
    ('relacionamentos', '#e11d48'),
    ('seguranca', '#4b5563'),
    ('lideranca', '#7c2d12'),
    ('desafio', '#ea580c'),
    ('criatividade', '#0e7490'),
    ('equilibrio', '#0d9488')
) AS v(key, color)
WHERE d.definition_id = (SELECT id FROM ae_definitions WHERE LOWER(slug) = 'motivators' LIMIT 1)
  AND LOWER(d.key) = LOWER(v.key)
  AND (d.color IS DISTINCT FROM v.color);
