import { cnpjBase, normalizeCnpj } from '../company/cnpj.ts';
import { isValidCpf, normalizeCpf } from '../pcmso/identity.ts';

export type S2240AgentInput = {
  code: string;
  description?: string | null;
  assessmentType: 'QUALITATIVE' | 'QUANTITATIVE';
  intensity?: number | null;
  unit?: string | null;
  toleranceLimit?: number | null;
  measurementTechnique?: string | null;
  epcUsed: boolean;
  epcEffective: boolean;
  epiUsed: boolean;
  epiEffective: boolean;
  epis?: Array<{ ca?: string | null; description: string; protectionMeasures?: boolean; operatingCondition?: boolean; continuousUse?: boolean; validityObserved?: boolean; replacementObserved?: boolean; hygieneObserved?: boolean }>;
};

export type S2240Input = {
  employerRegistration: string;
  workerCpf: string;
  workerRegistration?: string | null;
  workerCategoryCode?: string | null;
  startsAt: Date;
  environment: { code: string; description: string; locationType?: '1' | '2'; registrationType?: '1' | '3' | '4'; registrationNumber?: string | null };
  activities: string[];
  agents: S2240AgentInput[];
  responsible: { name: string; cpf: string; councilType: string; councilNumber: string; councilState?: string | null };
  processVersion: string;
  useFullEmployerRegistration?: boolean;
};

const isoDate = (value: Date) => value.toISOString().slice(0, 10);

export function buildS2240Payload(input: S2240Input) {
  const employerCpf = normalizeCpf(input.employerRegistration);
  const employerCnpj = normalizeCnpj(input.employerRegistration);
  const employerType = isValidCpf(employerCpf) ? '2' : '1';
  const employerNumber = employerType === '2' ? employerCpf : input.useFullEmployerRegistration ? employerCnpj ?? '' : cnpjBase(employerCnpj) ?? '';
  return {
    version: 'S-1.3',
    event: 'S-2240',
    evtExpRisco: {
      ideEvento: { indRetif: '1', tpAmb: '2', procEmi: '1', verProc: input.processVersion.slice(0, 20) },
      ideEmpregador: { tpInsc: employerType, nrInsc: employerNumber },
      ideVinculo: { cpfTrab: normalizeCpf(input.workerCpf), ...(input.workerRegistration ? { matricula: input.workerRegistration.slice(0, 30) } : { codCateg: input.workerCategoryCode ?? '' }) },
      infoExpRisco: {
        dtIniCondicao: isoDate(input.startsAt),
        infoAmb: [{ codAmb: input.environment.code.slice(0, 30), localAmb: input.environment.locationType ?? '1', dscSetor: input.environment.description.slice(0, 100), ...(input.environment.registrationNumber ? { tpInsc: input.environment.registrationType ?? '1', nrInsc: input.environment.registrationNumber } : {}) }],
        infoAtiv: [{ dscAtivDes: input.activities.join('; ').slice(0, 999) }],
        agNoc: input.agents.map((agent) => ({
          codAgNoc: agent.code,
          ...(agent.description ? { dscAgNoc: agent.description.slice(0, 100) } : {}),
          tpAval: agent.assessmentType === 'QUANTITATIVE' ? '1' : '2',
          ...(agent.intensity != null ? { intConc: String(agent.intensity) } : {}),
          ...(agent.toleranceLimit != null ? { limTol: String(agent.toleranceLimit) } : {}),
          ...(agent.unit ? { unMed: agent.unit } : {}),
          ...(agent.measurementTechnique ? { tecMedicao: agent.measurementTechnique.slice(0, 100) } : {}),
          epcEpi: {
            utilizEPC: agent.epcUsed ? '1' : '0',
            eficEpc: agent.epcEffective ? 'S' : 'N',
            utilizEPI: agent.epiUsed ? '1' : '0',
            eficEpi: agent.epiEffective ? 'S' : 'N',
            epi: (agent.epis ?? []).map((epi) => ({
              docAval: epi.ca ?? '',
              dscEPI: epi.description.slice(0, 100),
              medProtecao: epi.protectionMeasures ? 'S' : 'N',
              condFuncto: epi.operatingCondition ? 'S' : 'N',
              usoInint: epi.continuousUse ? 'S' : 'N',
              przValid: epi.validityObserved ? 'S' : 'N',
              periodicTroca: epi.replacementObserved ? 'S' : 'N',
              higienizacao: epi.hygieneObserved ? 'S' : 'N',
            })),
          },
        })),
        respReg: [{ cpfResp: normalizeCpf(input.responsible.cpf), ideOC: input.responsible.councilType.slice(0, 10), dscOC: input.responsible.councilType.slice(0, 20), nrOC: input.responsible.councilNumber.slice(0, 14), ...(input.responsible.councilState ? { ufOC: input.responsible.councilState } : {}) }],
      },
    },
  };
}

export type S2240Finding = { code: string; severity: 'ERROR' | 'WARNING'; message: string };

export function validateS2240Input(input: S2240Input): S2240Finding[] {
  const findings: S2240Finding[] = [];
  const employerCpf = normalizeCpf(input.employerRegistration);
  if (!isValidCpf(employerCpf) && !normalizeCnpj(input.employerRegistration)) findings.push({ code: 'EMPLOYER_REGISTRATION', severity: 'ERROR', message: 'Inscrição do empregador inválida.' });
  if (!isValidCpf(input.workerCpf)) findings.push({ code: 'WORKER_CPF', severity: 'ERROR', message: 'CPF do trabalhador ausente ou inválido.' });
  if (!input.workerRegistration && !input.workerCategoryCode) findings.push({ code: 'WORKER_LINK', severity: 'ERROR', message: 'Informe matrícula ou categoria do trabalhador.' });
  if (!input.environment.code.trim() || !input.environment.description.trim()) findings.push({ code: 'ENVIRONMENT', severity: 'ERROR', message: 'Ambiente de trabalho incompleto.' });
  if (!input.activities.some((item) => item.trim())) findings.push({ code: 'ACTIVITIES', severity: 'ERROR', message: 'Descrição das atividades é obrigatória.' });
  if (!input.agents.length) findings.push({ code: 'AGENTS', severity: 'ERROR', message: 'Nenhum agente nocivo informado.' });
  input.agents.forEach((agent, index) => {
    if (!agent.code.trim()) findings.push({ code: `AGENT_${index + 1}_CODE`, severity: 'ERROR', message: `Agente ${index + 1} sem código eSocial.` });
    if (agent.assessmentType === 'QUANTITATIVE' && agent.intensity == null) findings.push({ code: `AGENT_${index + 1}_RESULT`, severity: 'ERROR', message: `Agente ${index + 1} exige resultado quantitativo.` });
    if (agent.epiEffective && !(agent.epis ?? []).some((epi) => Boolean(epi.ca))) findings.push({ code: `AGENT_${index + 1}_EPI_CA`, severity: 'WARNING', message: `Agente ${index + 1} indica EPI eficaz sem documento de avaliação/CA.` });
  });
  if (!isValidCpf(input.responsible.cpf)) findings.push({ code: 'RESPONSIBLE_CPF', severity: 'ERROR', message: 'CPF do responsável pelos registros ambientais inválido.' });
  if (!input.responsible.councilNumber.trim()) findings.push({ code: 'RESPONSIBLE_COUNCIL', severity: 'ERROR', message: 'Registro profissional do responsável é obrigatório.' });
  return findings;
}
