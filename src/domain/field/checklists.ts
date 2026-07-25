export type FieldChecklistItem = {
  code: string;
  title: string;
  required: boolean;
  completed: boolean;
  guidance?: string;
};

const common: FieldChecklistItem[] = [
  { code: 'identify_area', title: 'Confirmar área, setor e atividade', required: true, completed: false },
  { code: 'front_photo', title: 'Fotografar o posto de frente', required: true, completed: false },
  { code: 'side_photo', title: 'Fotografar lateralmente durante a atividade', required: true, completed: false },
  { code: 'describe_task', title: 'Registrar descrição da tarefa', required: true, completed: false },
  { code: 'record_duration', title: 'Registrar duração e frequência', required: true, completed: false },
  { code: 'record_controls', title: 'Registrar controles existentes', required: false, completed: false },
];

const additions: Record<string, FieldChecklistItem[]> = {
  AET: [
    { code: 'worker_height', title: 'Registrar altura do trabalhador e da bancada', required: false, completed: false },
    { code: 'load_weight', title: 'Registrar peso e distância de alcance', required: false, completed: false },
    { code: 'pauses', title: 'Registrar pausas e organização do trabalho', required: true, completed: false },
  ],
  PGR: [
    { code: 'hazards', title: 'Identificar perigos, fontes e trabalhadores expostos', required: true, completed: false },
    { code: 'emergency', title: 'Registrar condições de emergência e circulação', required: false, completed: false },
  ],
  PCMSO: [
    { code: 'risk_matrix', title: 'Confirmar riscos ocupacionais por função/GHE', required: true, completed: false },
    { code: 'no_clinical_data', title: 'Não registrar prontuário ou diagnóstico na área geral', required: true, completed: false },
  ],
  LTCAT: [
    { code: 'exposure_time', title: 'Registrar habitualidade, permanência e período de exposição', required: true, completed: false },
    { code: 'equipment_calibration', title: 'Anexar dados e calibração dos instrumentos', required: true, completed: false },
  ],
  HIGIENE_OCUPACIONAL: [
    { code: 'sampling_strategy', title: 'Registrar estratégia de amostragem', required: true, completed: false },
    { code: 'field_calibration', title: 'Registrar calibração de campo', required: true, completed: false },
  ],
};

export function fieldChecklistFor(serviceType?: string | null): FieldChecklistItem[] {
  return [...common, ...(additions[String(serviceType ?? '').toUpperCase()] ?? [])].map((item) => ({ ...item }));
}

export function checklistProgress(value: unknown): number {
  if (!Array.isArray(value) || !value.length) return 0;
  const items = value.filter((item): item is FieldChecklistItem => Boolean(item && typeof item === 'object' && 'completed' in item));
  const required = items.filter((item) => item.required);
  const basis = required.length ? required : items;
  if (!basis.length) return 0;
  return Math.round((basis.filter((item) => item.completed).length / basis.length) * 100);
}

export function updateChecklist(value: unknown, code: string, completed: boolean): FieldChecklistItem[] {
  if (!Array.isArray(value)) throw new Error('Checklist inválido');
  let found = false;
  const result = value.map((item) => {
    if (!item || typeof item !== 'object') return item as FieldChecklistItem;
    const current = item as FieldChecklistItem;
    if (current.code !== code) return current;
    found = true;
    return { ...current, completed };
  });
  if (!found) throw new Error('Item do checklist não encontrado');
  return result;
}
