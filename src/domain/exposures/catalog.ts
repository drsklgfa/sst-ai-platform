export const nr15AnnexCatalog = [
  { code: '1', title: 'Ruído contínuo ou intermitente', assessment: 'QUANTITATIVE' },
  { code: '2', title: 'Ruído de impacto', assessment: 'QUANTITATIVE' },
  { code: '3', title: 'Calor', assessment: 'QUANTITATIVE' },
  { code: '5', title: 'Radiações ionizantes', assessment: 'SPECIALIZED' },
  { code: '6', title: 'Condições hiperbáricas', assessment: 'QUALITATIVE' },
  { code: '7', title: 'Radiações não ionizantes', assessment: 'QUALITATIVE' },
  { code: '8', title: 'Vibração', assessment: 'QUANTITATIVE' },
  { code: '9', title: 'Frio', assessment: 'QUALITATIVE' },
  { code: '10', title: 'Umidade', assessment: 'QUALITATIVE' },
  { code: '11', title: 'Agentes químicos com limite de tolerância', assessment: 'QUANTITATIVE' },
  { code: '12', title: 'Poeiras minerais', assessment: 'QUANTITATIVE' },
  { code: '13', title: 'Agentes químicos por inspeção', assessment: 'QUALITATIVE' },
  { code: '13A', title: 'Benzeno', assessment: 'SPECIALIZED' },
  { code: '14', title: 'Agentes biológicos', assessment: 'QUALITATIVE' },
] as const;

export const nr16ActivityCatalog = [
  { code: 'EXPLOSIVES', title: 'Explosivos' },
  { code: 'FLAMMABLES', title: 'Inflamáveis' },
  { code: 'ROBBERY_VIOLENCE', title: 'Exposição a roubos ou violência física' },
  { code: 'ELECTRICITY', title: 'Energia elétrica' },
  { code: 'MOTORCYCLE', title: 'Atividades em motocicleta' },
  { code: 'IONIZING_RADIATION', title: 'Radiações ionizantes ou substâncias radioativas' },
  { code: 'TRAFFIC_AGENT', title: 'Atividades de agentes de trânsito, quando aplicável' },
  { code: 'OTHER', title: 'Outra hipótese normativa cadastrada' },
] as const;

export function nr15Annex(code: string) {
  return nr15AnnexCatalog.find((item) => item.code === code.trim().toUpperCase()) ?? null;
}

export function nr16Activity(code: string) {
  return nr16ActivityCatalog.find((item) => item.code === code.trim().toUpperCase()) ?? null;
}
