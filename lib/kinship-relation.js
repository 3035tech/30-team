import {
  DEPENDENT_KINSHIP_RELATIONS,
  EMERGENCY_KINSHIP_RELATIONS,
  KINSHIP_RELATION as K,
  KINSHIP_RELATIONS,
} from './domain-status.js';
import { t } from './i18n.js';

// Keep in sync with dp_kinship_key() in migrations/141_dp_kinship_relation.sql.
const SYNONYMS = [
  [K.SPOUSE, ['conjuge', 'esposa', 'esposo', 'marido', 'mulher', 'spouse', 'wife', 'husband', 'epoux', 'epouse', 'ehefrau', 'ehemann', 'ehepartner']],
  [K.PARTNER, ['companheiro', 'companheira', 'namorado', 'namorada', 'noivo', 'noiva', 'partner', 'partnerin', 'boyfriend', 'girlfriend', 'fiance', 'fiancee', 'conjoint', 'conjointe']],
  [K.FATHER, ['pai', 'father', 'dad', 'pere', 'vater', 'padrasto', 'stepfather']],
  [K.MOTHER, ['mae', 'mother', 'mom', 'mum', 'mere', 'mutter', 'madrasta', 'stepmother']],
  [K.STEPCHILD, ['enteado', 'enteada', 'stepson', 'stepdaughter', 'stepchild']],
  [K.CHILD, ['filho', 'filha', 'son', 'daughter', 'child', 'fils', 'fille', 'sohn', 'tochter', 'kind']],
  [K.SIBLING, ['irmao', 'irma', 'brother', 'sister', 'sibling', 'frere', 'soeur', 'bruder', 'schwester']],
  [K.GRANDPARENT, ['avo', 'grandmother', 'grandfather', 'grandparent', 'grandma', 'grandpa', 'grand-mere', 'grand-pere', 'oma', 'opa']],
  [K.GRANDCHILD, ['neto', 'neta', 'grandson', 'granddaughter', 'grandchild', 'enkel', 'enkelin']],
  [K.UNCLE_AUNT, ['tio', 'tia', 'uncle', 'aunt', 'oncle', 'tante', 'onkel']],
  [K.COUSIN, ['primo', 'prima', 'cousin', 'cousine']],
  [K.IN_LAW, ['sogro', 'sogra', 'cunhado', 'cunhada', 'genro', 'nora', 'father-in-law', 'mother-in-law', 'brother-in-law', 'sister-in-law', 'son-in-law', 'daughter-in-law']],
  [K.WARD, ['tutelado', 'tutelada', 'menor sob guarda', 'ward']],
  [K.FRIEND, ['amigo', 'amiga', 'friend', 'ami', 'amie', 'freund', 'freundin', 'vizinho', 'vizinha', 'neighbor', 'neighbour']],
];

const LOOKUP = new Map(SYNONYMS.flatMap(([key, words]) => words.map((w) => [w, key])));

function fold(raw) {
  return String(raw || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\((?:a|o|e)\)/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Maps a stored key or legacy free text ("Esposa", "Mãe", "irmão(ã)") to a KINSHIP_RELATION key.
 * Empty input stays '' (not informed); unknown text becomes 'other'.
 */
export function normalizeKinshipRelation(raw, allowed = KINSHIP_RELATIONS) {
  const s = fold(raw);
  if (!s) return '';
  const key = KINSHIP_RELATIONS.includes(s) ? s : LOOKUP.get(s) || LOOKUP.get(s.split(/[\s/,;-]/)[0]) || K.OTHER;
  return allowed.includes(key) ? key : K.OTHER;
}

export const normalizeEmergencyRelation = (raw) => normalizeKinshipRelation(raw, EMERGENCY_KINSHIP_RELATIONS);
export const normalizeDependentRelation = (raw) => normalizeKinshipRelation(raw, DEPENDENT_KINSHIP_RELATIONS);

export function kinshipLabel(locale, raw) {
  const key = normalizeKinshipRelation(raw);
  return key ? t(locale, `panel.dp.kinship.${key}`) : '';
}

/** Select options with a leading "not informed" entry (value ''). */
export function kinshipOptions(locale, keys = KINSHIP_RELATIONS) {
  return [
    { value: '', label: t(locale, 'panel.dp.notInformed') },
    ...keys.map((k) => ({ value: k, label: t(locale, `panel.dp.kinship.${k}`) })),
  ];
}
