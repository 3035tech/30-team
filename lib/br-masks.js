/** Máscaras BR para UI; persistência sempre sem máscara. */

export function digitsOnly(value) {
  return String(value ?? '').replace(/\D/g, '');
}

/** Telefone: estado = só dígitos (DDD + número, sem 55). */
export function stripPhone(value) {
  let d = digitsOnly(value);
  if (d.length >= 12 && d.startsWith('55')) d = d.slice(2);
  d = d.slice(0, 11);
  return d || null;
}

/** (11) 99999-9999 / (11) 9999-9999 */
export function formatPhoneBr(value) {
  const d = stripPhone(value) || '';
  if (!d) return '';
  if (d.length <= 2) return `(${d}`;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7, 11)}`;
}

/**
 * Converte valor (digitação em centavos, persistido ou máscara) → dígitos de centavos.
 */
export function salaryToCentsDigits(value) {
  if (value == null || value === '') return '';
  const s = String(value).trim();
  // Controle de input: só dígitos = centavos
  if (/^\d+$/.test(s)) return s.slice(0, 15);

  const cleaned = s.replace(/R\$\s?/gi, '').trim();

  // Persistido sem máscara: 3500.00 ou 3500,00
  if (/^\d+[.,]\d{1,2}$/.test(cleaned)) {
    const n = Number(cleaned.replace(',', '.'));
    if (Number.isFinite(n)) return String(Math.round(n * 100)).slice(0, 15);
  }

  // Máscara pt-BR: 3.500,00
  if (/^\d{1,3}(\.\d{3})*(,\d{1,2})?$/.test(cleaned)) {
    const n = Number(cleaned.replace(/\./g, '').replace(',', '.'));
    if (Number.isFinite(n)) return String(Math.round(n * 100)).slice(0, 15);
  }

  // Formato US: 3,500.00
  if (/^\d{1,3}(,\d{3})*(\.\d{1,2})?$/.test(cleaned)) {
    const n = Number(cleaned.replace(/,/g, ''));
    if (Number.isFinite(n)) return String(Math.round(n * 100)).slice(0, 15);
  }

  // Inteiro sem decimal no texto
  if (/^\d+$/.test(cleaned)) {
    const n = Number(cleaned);
    if (Number.isFinite(n)) return String(Math.round(n * 100)).slice(0, 15);
  }

  return '';
}

/** Persistência: "1234.56" sem R$/milhar. */
export function stripSalary(value) {
  const d = salaryToCentsDigits(value);
  if (!d) return null;
  return (Number(d) / 100).toFixed(2);
}

/** R$ 1.234,56 */
export function formatSalaryBr(value) {
  if (value == null || value === '') return '';
  const cents = salaryToCentsDigits(value);
  if (!cents) return '';
  const n = Number(cents) / 100;
  if (!Number.isFinite(n)) return '';
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
