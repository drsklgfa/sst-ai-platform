export function normalizeCpf(value: string): string {
  return value.replace(/\D/g, '').slice(0, 11);
}

export function isValidCpf(value: string): boolean {
  const cpf = normalizeCpf(value);
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
  const digit = (size: number) => {
    let sum = 0;
    for (let index = 0; index < size; index += 1) sum += Number(cpf[index]) * (size + 1 - index);
    const remainder = (sum * 10) % 11;
    return remainder === 10 ? 0 : remainder;
  };
  return digit(9) === Number(cpf[9]) && digit(10) === Number(cpf[10]);
}

export function maskCpf(value: string): string {
  const cpf = normalizeCpf(value);
  return cpf.length === 11 ? `***.${cpf.slice(3, 6)}.${cpf.slice(6, 9)}-**` : 'CPF protegido';
}

export function normalizeCouncilState(value: string): string {
  const state = value.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(state)) throw new Error('UF do conselho profissional inválida');
  return state;
}
