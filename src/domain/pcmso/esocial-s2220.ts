import { isValidCpf, normalizeCpf } from './identity.ts';
import type { OccupationalExamTypeValue } from './matrix.ts';
import { cnpjBase, normalizeCnpj } from '../company/cnpj.ts';

export type S2220ExamInput = {
  performedAt: Date;
  procedureCode?: string | null;
  resultStatus?: string | null;
};

export type S2220Input = {
  employerRegistration: string;
  workerCpf: string;
  workerRegistration?: string | null;
  workerCategoryCode?: string | null;
  examType: OccupationalExamTypeValue;
  asoDate: Date;
  fitnessResult: string;
  exams: S2220ExamInput[];
  physician: { name: string; cpf: string; councilNumber: string; councilState: string };
  responsiblePhysician?: { name: string; cpf: string; councilNumber: string; councilState: string } | null;
  processVersion: string;
  useFullEmployerRegistration?: boolean;
};

const examTypeCode: Record<OccupationalExamTypeValue, string> = {
  ADMISSION: '0',
  PERIODIC: '1',
  RETURN_TO_WORK: '2',
  RISK_CHANGE: '3',
  POINT_MONITORING: '4',
  TERMINATION: '9',
};

const isoDate = (value: Date) => value.toISOString().slice(0, 10);

export function buildS2220Payload(input: S2220Input) {
  const employerCpf = normalizeCpf(input.employerRegistration);
  const employerCnpj = normalizeCnpj(input.employerRegistration);
  const employerType = isValidCpf(employerCpf) ? '2' : '1';
  const employerNumber = employerType === '2' ? employerCpf : input.useFullEmployerRegistration ? employerCnpj ?? '' : cnpjBase(employerCnpj) ?? '';
  const cpf = normalizeCpf(input.workerCpf);
  return {
    version: 'S-1.3',
    event: 'S-2220',
    evtMonit: {
      ideEvento: { indRetif: '1', tpAmb: '2', procEmi: '1', verProc: input.processVersion.slice(0, 20) },
      ideEmpregador: { tpInsc: employerType, nrInsc: employerNumber },
      ideVinculo: { cpfTrab: cpf, ...(input.workerRegistration ? { matricula: input.workerRegistration.slice(0, 30) } : { codCateg: input.workerCategoryCode ?? '' }) },
      exMedOcup: {
        tpExameOcup: examTypeCode[input.examType],
        aso: {
          dtAso: isoDate(input.asoDate),
          resAso: input.fitnessResult === 'UNFIT' ? '2' : '1',
          exame: input.exams.map((exam) => ({
            dtExm: isoDate(exam.performedAt),
            procRealizado: String(exam.procedureCode ?? ''),
            indResult: exam.resultStatus === 'ALTERED' ? '2' : '1',
          })),
          medico: {
            nmMed: input.physician.name,
            nrCRM: input.physician.councilNumber,
            ufCRM: input.physician.councilState,
            cpfMed: normalizeCpf(input.physician.cpf),
          },
        },
        ...(input.responsiblePhysician ? {
          respMonit: {
            cpfResp: normalizeCpf(input.responsiblePhysician.cpf),
            nmResp: input.responsiblePhysician.name,
            nrCRM: input.responsiblePhysician.councilNumber,
            ufCRM: input.responsiblePhysician.councilState,
          },
        } : {}),
      },
    },
  };
}

export type S2220Finding = { code: string; severity: 'ERROR' | 'WARNING'; message: string };

export function validateS2220Input(input: S2220Input): S2220Finding[] {
  const findings: S2220Finding[] = [];
  const employerCpf = normalizeCpf(input.employerRegistration);
  const employerCnpj = normalizeCnpj(input.employerRegistration);
  if (!isValidCpf(employerCpf) && !employerCnpj) findings.push({ code: 'EMPLOYER_REGISTRATION', severity: 'ERROR', message: 'Inscrição do empregador deve ser CPF válido ou CNPJ com 14 posições, inclusive no formato alfanumérico.' });
  if (!isValidCpf(input.workerCpf)) findings.push({ code: 'WORKER_CPF', severity: 'ERROR', message: 'CPF do trabalhador ausente ou inválido.' });
  if (!input.workerRegistration && !input.workerCategoryCode) findings.push({ code: 'WORKER_LINK', severity: 'ERROR', message: 'Informe matrícula ou categoria do trabalhador.' });
  if (!input.exams.length) findings.push({ code: 'ASO_EXAMS', severity: 'ERROR', message: 'O ASO precisa possuir ao menos uma avaliação clínica ou exame complementar.' });
  input.exams.forEach((exam, index) => {
    if (!exam.procedureCode) findings.push({ code: `EXAM_${index + 1}_PROCEDURE`, severity: 'ERROR', message: `Exame ${index + 1} sem código de procedimento para o eSocial.` });
    if (exam.performedAt > input.asoDate) findings.push({ code: `EXAM_${index + 1}_DATE`, severity: 'ERROR', message: `Exame ${index + 1} possui data posterior ao ASO.` });
  });
  if (!input.physician.name.trim()) findings.push({ code: 'PHYSICIAN_NAME', severity: 'ERROR', message: 'Nome do médico emitente é obrigatório.' });
  if (!isValidCpf(input.physician.cpf)) findings.push({ code: 'PHYSICIAN_CPF', severity: 'ERROR', message: 'CPF do médico emitente ausente ou inválido.' });
  if (!input.physician.councilNumber.trim() || !/^[A-Z]{2}$/.test(input.physician.councilState)) findings.push({ code: 'PHYSICIAN_COUNCIL', severity: 'ERROR', message: 'CRM e UF do médico emitente são obrigatórios.' });
  if (input.responsiblePhysician && !isValidCpf(input.responsiblePhysician.cpf)) findings.push({ code: 'RESPONSIBLE_PHYSICIAN_CPF', severity: 'ERROR', message: 'CPF do médico responsável pelo PCMSO inválido.' });
  return findings;
}
