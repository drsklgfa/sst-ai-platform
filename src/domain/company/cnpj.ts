export function normalizeCnpj(value: unknown): string | null {
  const normalized = String(value ?? '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 14);
  return /^[A-Z0-9]{12}\d{2}$/.test(normalized) ? normalized : null;
}

export function isValidCnpjShape(value: unknown): boolean {
  return normalizeCnpj(value) !== null;
}

export function cnpjBase(value: unknown): string | null {
  const normalized = normalizeCnpj(value);
  return normalized ? normalized.slice(0, 8) : null;
}
