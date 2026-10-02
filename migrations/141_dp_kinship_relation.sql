-- 141: Closed kinship domain for the DP emergency contact and dependents.
-- Before: free text (emergency_relation TEXT, dependents[].relation in JSONB).
-- After: keys from KINSHIP_RELATION (lib/domain-status.js); '' = not informed.
-- Modeling: a fixed list with no per-company administration, so a CHECK domain
-- (not a lookup table). Dependents stay in the existing JSONB array (124); the
-- CHECK constrains every element's relation.
-- Legacy text is mapped by dp_kinship_key() (mirror of lib/kinship-relation.js);
-- unknown text becomes 'other'. Original relation texts of every changed row are kept
-- in dp_kinship_migration_backup for audit/rollback. Re-runnable: already-normalized
-- rows are left untouched and not backed up again.

CREATE OR REPLACE FUNCTION dp_kinship_key(raw TEXT, for_dependent BOOLEAN) RETURNS TEXT
LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE
  s TEXT;
  first_token TEXT;
  cand TEXT;
  k TEXT;
  keys CONSTANT TEXT[] := ARRAY['spouse','partner','father','mother','child','stepchild','sibling',
    'grandparent','grandchild','uncle_aunt','cousin','in_law','ward','friend','other'];
BEGIN
  s := lower(coalesce(raw, ''));
  s := translate(s, 'áàâãäéèêëíìîïóòôõöúùûüç', 'aaaaaeeeeiiiiooooouuuuc');
  s := regexp_replace(s, '\((a|o|e)\)', '', 'g');
  s := btrim(regexp_replace(s, '\s+', ' ', 'g'));
  IF s = '' THEN RETURN ''; END IF;
  IF s = ANY(keys) THEN
    k := s;
  ELSE
    first_token := split_part(regexp_replace(s, '[\s/,;-]', ' ', 'g'), ' ', 1);
    k := NULL;
    FOREACH cand IN ARRAY ARRAY[s, first_token] LOOP
      k := CASE
        WHEN cand IN ('conjuge','esposa','esposo','marido','mulher','spouse','wife','husband','epoux','epouse','ehefrau','ehemann','ehepartner') THEN 'spouse'
        WHEN cand IN ('companheiro','companheira','namorado','namorada','noivo','noiva','partner','partnerin','boyfriend','girlfriend','fiance','fiancee','conjoint','conjointe') THEN 'partner'
        WHEN cand IN ('pai','father','dad','pere','vater','padrasto','stepfather') THEN 'father'
        WHEN cand IN ('mae','mother','mom','mum','mere','mutter','madrasta','stepmother') THEN 'mother'
        WHEN cand IN ('enteado','enteada','stepson','stepdaughter','stepchild') THEN 'stepchild'
        WHEN cand IN ('filho','filha','son','daughter','child','fils','fille','sohn','tochter','kind') THEN 'child'
        WHEN cand IN ('irmao','irma','brother','sister','sibling','frere','soeur','bruder','schwester') THEN 'sibling'
        WHEN cand IN ('avo','grandmother','grandfather','grandparent','grandma','grandpa','grand-mere','grand-pere','oma','opa') THEN 'grandparent'
        WHEN cand IN ('neto','neta','grandson','granddaughter','grandchild','enkel','enkelin') THEN 'grandchild'
        WHEN cand IN ('tio','tia','uncle','aunt','oncle','tante','onkel') THEN 'uncle_aunt'
        WHEN cand IN ('primo','prima','cousin','cousine') THEN 'cousin'
        WHEN cand IN ('sogro','sogra','cunhado','cunhada','genro','nora','father-in-law','mother-in-law','brother-in-law','sister-in-law','son-in-law','daughter-in-law') THEN 'in_law'
        WHEN cand IN ('tutelado','tutelada','menor sob guarda','ward') THEN 'ward'
        WHEN cand IN ('amigo','amiga','friend','ami','amie','freund','freundin','vizinho','vizinha','neighbor','neighbour') THEN 'friend'
        ELSE NULL
      END;
      EXIT WHEN k IS NOT NULL;
    END LOOP;
    k := coalesce(k, 'other');
  END IF;
  IF for_dependent THEN
    IF k NOT IN ('spouse','partner','child','stepchild','ward','father','mother','grandparent','grandchild','sibling') THEN
      k := 'other';
    END IF;
  ELSIF k = 'ward' THEN
    k := 'other';
  END IF;
  RETURN k;
END;
$$;

-- Only the original relation texts are kept (no names/CPFs), and rows follow the
-- collaborator's lifecycle so erasure requests also clear the backup.
CREATE TABLE IF NOT EXISTS dp_kinship_migration_backup (
  candidate_id         BIGINT PRIMARY KEY REFERENCES candidates(id) ON DELETE CASCADE,
  company_id           BIGINT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  emergency_relation   TEXT NOT NULL,
  dependent_relations  JSONB NOT NULL DEFAULT '[]'::jsonb,
  backed_up_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE dp_kinship_migration_backup IS
  'Migration 141: original free-text kinship values (emergency + dependents, by array position) before normalization.';

WITH normalized AS (
  SELECT p.candidate_id,
         p.company_id,
         p.emergency_relation,
         p.dependents,
         dp_kinship_key(p.emergency_relation, FALSE) AS new_relation,
         CASE WHEN jsonb_typeof(p.dependents) = 'array' THEN (
           SELECT coalesce(jsonb_agg(
             CASE WHEN jsonb_typeof(d) = 'object'
               THEN d || jsonb_build_object('relation', dp_kinship_key(d->>'relation', TRUE))
               ELSE d END ORDER BY ord), '[]'::jsonb)
           FROM jsonb_array_elements(p.dependents) WITH ORDINALITY AS e(d, ord)
         ) ELSE '[]'::jsonb END AS new_dependents
  FROM candidate_dp_profiles p
),
changed AS (
  SELECT * FROM normalized
  WHERE new_relation IS DISTINCT FROM emergency_relation
     OR new_dependents IS DISTINCT FROM dependents
),
backup AS (
  INSERT INTO dp_kinship_migration_backup (candidate_id, company_id, emergency_relation, dependent_relations)
  SELECT c.candidate_id, c.company_id, c.emergency_relation,
         CASE WHEN jsonb_typeof(c.dependents) = 'array' THEN (
           SELECT coalesce(jsonb_agg(d->'relation' ORDER BY ord), '[]'::jsonb)
           FROM jsonb_array_elements(c.dependents) WITH ORDINALITY AS e(d, ord)
         ) ELSE '[]'::jsonb END
  FROM changed c
  ON CONFLICT (candidate_id) DO NOTHING
)
UPDATE candidate_dp_profiles p
   SET emergency_relation = c.new_relation,
       dependents = c.new_dependents
  FROM changed c
 WHERE p.candidate_id = c.candidate_id;

ALTER TABLE candidate_dp_profiles
  DROP CONSTRAINT IF EXISTS candidate_dp_profiles_emergency_relation_domain;
ALTER TABLE candidate_dp_profiles
  ADD CONSTRAINT candidate_dp_profiles_emergency_relation_domain CHECK (emergency_relation IN (
    '', 'spouse', 'partner', 'father', 'mother', 'child', 'stepchild', 'sibling',
    'grandparent', 'grandchild', 'uncle_aunt', 'cousin', 'in_law', 'friend', 'other'
  ));

ALTER TABLE candidate_dp_profiles
  DROP CONSTRAINT IF EXISTS candidate_dp_profiles_dependents_relation_domain;
ALTER TABLE candidate_dp_profiles
  ADD CONSTRAINT candidate_dp_profiles_dependents_relation_domain CHECK (
    NOT jsonb_path_exists(
      dependents,
      '$[*] ? (exists(@.relation) && !(@.relation == "" || @.relation == "spouse" || @.relation == "partner" || @.relation == "child" || @.relation == "stepchild" || @.relation == "ward" || @.relation == "father" || @.relation == "mother" || @.relation == "grandparent" || @.relation == "grandchild" || @.relation == "sibling" || @.relation == "other"))'
    )
  );

COMMENT ON COLUMN candidate_dp_profiles.emergency_relation IS
  'KINSHIP_RELATION key (lib/domain-status.js) without ward; empty = not informed.';
COMMENT ON COLUMN candidate_dp_profiles.dependents IS
  'JSON array of dependents: name, cpf, relation (KINSHIP_RELATION dependent key), birthDate.';

DROP FUNCTION IF EXISTS dp_kinship_key(TEXT, BOOLEAN);
