/** Local draft only. Never publish or persist without explicit human review. */
export function suggestSelfAssessment(description, name, locale = 'pt-BR') {
  const verbs = {
    Demonstra: 'Demonstro', Age: 'Ajo', Trata: 'Trato', Respeita: 'Respeito',
    Utiliza: 'Utilizo', Participa: 'Participo', Contribui: 'Contribuo', Comunica: 'Comunico',
    Mantém: 'Mantenho', Colabora: 'Colaboro', Constrói: 'Construo', Organiza: 'Organizo',
    'Adapta-se': 'Adapto-me', Identifica: 'Identifico', Busca: 'Busco', Compreende: 'Compreendo',
    Considera: 'Considero', Atua: 'Atuo', Gerencia: 'Gerencio', Analisa: 'Analiso',
    Propõe: 'Proponho', Aplica: 'Aplico', Compartilha: 'Compartilho', Adapta: 'Adapto',
    'Mantém-se': 'Mantenho-me',
  };
  const source = String(description || '').trim();
  const rewritten = source.replace(/(^|[.!?]\s+)([A-ZÁÉÍÓÚÂÊÔÃÕÇ][\p{L}-]*)/gu, (match, prefix, verb) => verbs[verb] ? `${prefix}${verbs[verb]}` : match);
  if (rewritten !== source) return rewritten;
  return locale.startsWith('en') ? `I demonstrate the competency “${name}” in my work.` : `Demonstro a competência “${name}” no meu trabalho.`;
}
