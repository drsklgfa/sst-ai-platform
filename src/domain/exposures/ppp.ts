import { exposurePeriodsOverlap } from './periods.ts';

export type PppPeriodInput = {
  id: string;
  startsAt: Date;
  endsAt?: Date | null;
  establishment: string;
  sector: string;
  jobFunction: string;
  activities: string[];
  agents: Array<{ code?: string | null; name: string; intensity?: number | null; unit?: string | null; technique?: string | null; epcEffective: boolean; epiEffective: boolean }>;
  responsible?: { name: string; council: string } | null;
};

export type PppInput = {
  employer: { legalName: string; cnpj?: string | null };
  worker: { fullName: string; cpfMasked?: string | null; registration?: string | null; admissionDate?: Date | null };
  periods: PppPeriodInput[];
  generatedAt?: Date;
};

export function validatePppInput(input: PppInput) {
  const findings: Array<{ code: string; severity: 'ERROR' | 'WARNING'; message: string }> = [];
  if (!input.employer.legalName.trim()) findings.push({ code: 'PPP_EMPLOYER', severity: 'ERROR', message: 'Empregador não identificado.' });
  if (!input.worker.fullName.trim()) findings.push({ code: 'PPP_WORKER', severity: 'ERROR', message: 'Trabalhador não identificado.' });
  if (!input.periods.length) findings.push({ code: 'PPP_PERIODS', severity: 'ERROR', message: 'Nenhum período ocupacional informado.' });
  input.periods.forEach((period, index) => {
    if (!period.establishment || !period.sector || !period.jobFunction) findings.push({ code: `PPP_PERIOD_${index + 1}_STRUCTURE`, severity: 'ERROR', message: `Período ${index + 1} sem estabelecimento, setor ou função.` });
    if (!period.activities.length) findings.push({ code: `PPP_PERIOD_${index + 1}_ACTIVITY`, severity: 'WARNING', message: `Período ${index + 1} sem atividades detalhadas.` });
    if (period.agents.length && !period.responsible) findings.push({ code: `PPP_PERIOD_${index + 1}_RESPONSIBLE`, severity: 'ERROR', message: `Período ${index + 1} com agentes sem responsável pelos registros ambientais.` });
  });
  for (let left = 0; left < input.periods.length; left += 1) for (let right = left + 1; right < input.periods.length; right += 1) {
    if (exposurePeriodsOverlap(input.periods[left], input.periods[right])) findings.push({ code: 'PPP_PERIOD_OVERLAP', severity: 'WARNING', message: 'Existem períodos ocupacionais sobrepostos; revise antes da emissão.' });
  }
  return findings;
}

export function buildPppSnapshot(input: PppInput) {
  const generatedAt = input.generatedAt ?? new Date();
  const periods = [...input.periods].sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
  return {
    version: 'PPP_ELETRONICO_V1',
    generatedAt: generatedAt.toISOString(),
    employer: input.employer,
    worker: { ...input.worker, admissionDate: input.worker.admissionDate?.toISOString().slice(0, 10) ?? null },
    occupationalHistory: periods.map((period) => ({
      id: period.id,
      startsAt: period.startsAt.toISOString().slice(0, 10),
      endsAt: period.endsAt?.toISOString().slice(0, 10) ?? null,
      establishment: period.establishment,
      sector: period.sector,
      jobFunction: period.jobFunction,
      activities: period.activities,
      exposures: period.agents,
      environmentalResponsible: period.responsible ?? null,
    })),
    disclaimer: 'Rascunho técnico sujeito à conferência, assinatura e integração oficial antes da emissão ou transmissão.',
  };
}
