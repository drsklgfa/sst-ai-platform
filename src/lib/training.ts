import type { TrainingContentKind, TrainingModality, TrainingQuestionType, TrainingRequirementSource } from '@prisma/client';
import { auditTrainingCompleteness } from '@/domain/training/audit';
import { calculateTrainingProgress, nextAttemptNumber, scoreAssessment } from '@/domain/training/assessment';
import { certificateCode, certificateEligibility, certificateVerificationHash, expiryDate } from '@/domain/training/certificates';
import { ruleAppliesToWorker, trainingDueDate } from '@/domain/training/requirements';
import { trainingTemplate } from '@/domain/training/catalog';
import { db } from './db';
import { randomToken, sha256 } from './crypto';
import { toPrismaJson } from './prisma-json';
import { refreshWorkflowStepFromRequirements } from './work-projects';

async function trainingProject(tenantId: string, workProjectId: string) {
  const project = await db.workProject.findFirst({ where: { id: workProjectId, tenantId, serviceType: 'TREINAMENTO' }, include: { company: { select: { id: true, legalName: true, tradeName: true } } } });
  if (!project) throw new Error('Trabalho de treinamento não encontrado');
  return project;
}

async function satisfyRequirement(workProjectId: string, code: string, sourceType: string, sourceId: string) {
  const requirement = await db.workflowRequirement.findFirst({ where: { workProjectId, code }, select: { id: true, workflowStepId: true, status: true } });
  if (!requirement?.workflowStepId || requirement.status === 'SATISFIED') return;
  await db.workflowRequirement.update({ where: { id: requirement.id }, data: { status: 'SATISFIED', sourceType, sourceId, satisfiedAt: new Date() } });
  await refreshWorkflowStepFromRequirements(requirement.workflowStepId);
}

const cleanLines = (values: string[] | undefined) => (values ?? []).map((value) => value.trim()).filter(Boolean);

export async function getOrCreateTrainingProgram(input: { tenantId: string; workProjectId: string; userId?: string }) {
  const project = await trainingProject(input.tenantId, input.workProjectId);
  const existing = await db.trainingProgram.findUnique({ where: { workProjectId: project.id } });
  if (existing) return existing;
  const program = await db.trainingProgram.create({ data: {
    tenantId: input.tenantId,
    companyId: project.companyId,
    workProjectId: project.id,
    title: `Universidade Corporativa — ${project.company.tradeName ?? project.company.legalName}`,
    status: 'ACTIVE',
    scope: 'Planejar, realizar, avaliar e comprovar treinamentos presenciais, virtuais e semipresenciais, com rastreabilidade de conteúdo, acesso, presença, avaliação prática, competência e certificado.',
    targetAudience: toPrismaJson([]),
    pedagogicalProject: toPrismaJson({ objectives: [], prerequisites: [], methodology: [], accessibility: {}, evaluation: {}, records: ['conteúdo', 'logs de acesso', 'presença', 'avaliações', 'certificados'] }),
    modality: 'BLENDED',
    minimumScore: 70,
    maxAttempts: 3,
    logsRetentionDays: 1825,
  } });
  await satisfyRequirement(project.id, 'technical_scope', 'TrainingProgram', program.id);
  await satisfyRequirement(project.id, 'records_retention', 'TrainingProgram', program.id);
  return program;
}

export async function updateTrainingProgram(input: { tenantId: string; workProjectId: string; scope: string; audience: string[]; objectives: string[]; prerequisites: string[]; methodology: string[]; instructorName?: string | null; technicalResponsibleName?: string | null; modality: TrainingModality; workloadMinutes: number; practicalWorkloadMinutes: number; validityDays?: number | null; minimumScore: number; maxAttempts: number }) {
  const program = await getOrCreateTrainingProgram(input);
  if (input.scope.trim().length < 10) throw new Error('Escopo detalhado é obrigatório');
  if (!input.audience.length) throw new Error('Público-alvo é obrigatório');
  if (!input.objectives.length) throw new Error('Objetivos de aprendizagem são obrigatórios');
  if (input.workloadMinutes < 1 || input.practicalWorkloadMinutes < 0) throw new Error('Carga horária inválida');
  if (input.minimumScore < 0 || input.minimumScore > 100) throw new Error('Nota mínima inválida');
  if (input.maxAttempts < 1) throw new Error('Limite de tentativas inválido');
  const row = await db.trainingProgram.update({ where: { id: program.id }, data: {
    scope: input.scope.trim(), targetAudience: toPrismaJson(cleanLines(input.audience)),
    pedagogicalProject: toPrismaJson({ objectives: cleanLines(input.objectives), prerequisites: cleanLines(input.prerequisites), methodology: cleanLines(input.methodology), accessibility: { required: true }, evaluation: { minimumScore: input.minimumScore, maxAttempts: input.maxAttempts }, records: ['conteúdo', 'logs de acesso', 'presença', 'avaliações', 'certificados'] }),
    instructorName: input.instructorName?.trim() || null, technicalResponsibleName: input.technicalResponsibleName?.trim() || null,
    modality: input.modality, workloadMinutes: Math.round(input.workloadMinutes), practicalWorkloadMinutes: Math.round(input.practicalWorkloadMinutes), validityDays: input.validityDays ?? null, minimumScore: input.minimumScore, maxAttempts: input.maxAttempts,
  } });
  await satisfyRequirement(input.workProjectId, 'audience', 'TrainingProgram', row.id);
  await satisfyRequirement(input.workProjectId, 'content', 'TrainingProgram', row.id);
  await satisfyRequirement(input.workProjectId, 'workload', 'TrainingProgram', row.id);
  if (row.instructorName || row.technicalResponsibleName) await satisfyRequirement(input.workProjectId, 'instructor', 'TrainingProgram', row.id);
  return row;
}

export async function createTrainingCourse(input: { tenantId: string; workProjectId: string; code: string; title: string; description?: string | null; templateCode?: string | null; modality: TrainingModality; workloadMinutes: number; practicalWorkloadMinutes?: number; validityDays?: number | null; minimumScore?: number; maxAttempts?: number; requiresPractical?: boolean; objectives?: string[]; prerequisites?: string[]; contentProgram?: string[]; userId?: string }) {
  const project = await trainingProject(input.tenantId, input.workProjectId);
  const program = await getOrCreateTrainingProgram(input);
  const code = input.code.trim().toUpperCase(); const title = input.title.trim();
  if (code.length < 2 || title.length < 3) throw new Error('Código e título do curso são obrigatórios');
  if (input.workloadMinutes < 1) throw new Error('Carga horária do curso deve ser positiva');
  const template = input.templateCode ? trainingTemplate(input.templateCode) : undefined;
  const existingVersion = await db.trainingCourse.findFirst({ where: { tenantId: input.tenantId, code }, orderBy: { version: 'desc' }, select: { version: true } });
  const course = await db.trainingCourse.create({ data: {
    tenantId: input.tenantId, companyId: project.companyId, code, title, description: input.description?.trim() || template?.description || null,
    version: (existingVersion?.version ?? 0) + 1, status: 'DRAFT', modality: input.modality,
    workloadMinutes: Math.round(input.workloadMinutes), practicalWorkloadMinutes: Math.max(0, Math.round(input.practicalWorkloadMinutes ?? 0)), validityDays: input.validityDays ?? null,
    minimumScore: input.minimumScore ?? Number(program.minimumScore), maxAttempts: input.maxAttempts ?? program.maxAttempts,
    requiresPractical: input.requiresPractical ?? template?.requiresPractical ?? false,
    objectives: toPrismaJson(cleanLines(input.objectives)), prerequisites: toPrismaJson(cleanLines(input.prerequisites)), contentProgram: toPrismaJson(cleanLines(input.contentProgram)),
    legalReferences: toPrismaJson(template?.legalReferences ?? []), metadata: toPrismaJson({ templateCode: template?.code ?? null, templateNotes: template?.notes ?? [] }), createdById: input.userId ?? null,
  } });
  await db.trainingProgramCourse.create({ data: { trainingProgramId: program.id, courseId: course.id, order: await db.trainingProgramCourse.count({ where: { trainingProgramId: program.id } }), required: true } });
  await satisfyRequirement(project.id, 'content', 'TrainingCourse', course.id);
  await satisfyRequirement(project.id, 'course_catalog', 'TrainingCourse', course.id);
  return course;
}

export async function addTrainingContent(input: { tenantId: string; workProjectId: string; courseId: string; moduleCode: string; moduleTitle: string; lessonCode: string; lessonTitle: string; kind: TrainingContentKind; estimatedMinutes: number; mandatory?: boolean; description?: string | null; content?: Record<string, unknown>; externalUrl?: string | null; fileId?: string | null }) {
  const program = await getOrCreateTrainingProgram(input);
  const linked = await db.trainingProgramCourse.findFirst({ where: { trainingProgramId: program.id, courseId: input.courseId }, include: { course: true } });
  if (!linked) throw new Error('Curso não pertence ao programa');
  if (linked.course.status !== 'DRAFT') throw new Error('Curso publicado é imutável; crie uma nova versão para alterar o conteúdo');
  if (input.estimatedMinutes < 0) throw new Error('Duração estimada inválida');
  if (input.fileId) {
    const file = await db.fileObject.findFirst({ where: { id: input.fileId, tenantId: input.tenantId } });
    if (!file) throw new Error('Arquivo não pertence à consultoria');
  }
  const module = await db.trainingModule.upsert({ where: { courseId_code: { courseId: input.courseId, code: input.moduleCode.trim().toUpperCase() } }, update: { title: input.moduleTitle.trim() }, create: { courseId: input.courseId, code: input.moduleCode.trim().toUpperCase(), title: input.moduleTitle.trim(), order: await db.trainingModule.count({ where: { courseId: input.courseId } }), mandatory: true } });
  const lesson = await db.trainingLesson.upsert({ where: { moduleId_code: { moduleId: module.id, code: input.lessonCode.trim().toUpperCase() } }, update: { title: input.lessonTitle.trim(), description: input.description?.trim() || null, kind: input.kind, estimatedMinutes: Math.round(input.estimatedMinutes), mandatory: input.mandatory ?? true, content: toPrismaJson(input.content ?? {}), externalUrl: input.externalUrl?.trim() || null, fileId: input.fileId ?? null }, create: { moduleId: module.id, code: input.lessonCode.trim().toUpperCase(), title: input.lessonTitle.trim(), description: input.description?.trim() || null, order: await db.trainingLesson.count({ where: { moduleId: module.id } }), kind: input.kind, estimatedMinutes: Math.round(input.estimatedMinutes), mandatory: input.mandatory ?? true, content: toPrismaJson(input.content ?? {}), externalUrl: input.externalUrl?.trim() || null, fileId: input.fileId ?? null } });
  await db.trainingModule.update({ where: { id: module.id }, data: { estimatedMinutes: { increment: Math.round(input.estimatedMinutes) } } });
  await satisfyRequirement(input.workProjectId, 'learning_materials', 'TrainingLesson', lesson.id);
  return lesson;
}

export async function createTrainingAssessment(input: { tenantId: string; workProjectId: string; courseId: string; title: string; passingScore: number; maxAttempts: number; type?: 'DIAGNOSTIC' | 'THEORETICAL' | 'PRACTICAL' | 'RECERTIFICATION' }) {
  const program = await getOrCreateTrainingProgram(input);
  const linked = await db.trainingProgramCourse.findFirst({ where: { trainingProgramId: program.id, courseId: input.courseId }, include: { course: true } });
  if (!linked) throw new Error('Curso não pertence ao programa');
  if (linked.course.status !== 'DRAFT') throw new Error('Curso publicado é imutável; crie uma nova versão para alterar a avaliação');
  if (input.passingScore < 0 || input.passingScore > 100 || input.maxAttempts < 1) throw new Error('Critérios de avaliação inválidos');
  const row = await db.trainingAssessment.create({ data: { courseId: input.courseId, title: input.title.trim(), type: input.type ?? 'THEORETICAL', passingScore: input.passingScore, maxAttempts: input.maxAttempts, randomizeQuestions: true, randomizeOptions: true } });
  await satisfyRequirement(input.workProjectId, 'passing_criteria', 'TrainingAssessment', row.id);
  return row;
}

export async function addTrainingQuestion(input: { tenantId: string; workProjectId: string; assessmentId: string; code: string; type: TrainingQuestionType; prompt: string; options?: unknown[]; correctAnswer: unknown; explanation?: string | null; weight?: number }) {
  const program = await getOrCreateTrainingProgram(input);
  const assessment = await db.trainingAssessment.findFirst({ where: { id: input.assessmentId, course: { programLinks: { some: { trainingProgramId: program.id } } } }, include: { course: true } });
  if (!assessment) throw new Error('Avaliação não pertence ao programa');
  if (assessment.course.status !== 'DRAFT') throw new Error('Curso publicado é imutável; crie uma nova versão para alterar questões');
  if (input.prompt.trim().length < 5) throw new Error('Enunciado da questão é obrigatório');
  if (input.type !== 'SHORT_TEXT' && input.correctAnswer == null) throw new Error('Resposta correta é obrigatória para questão objetiva');
  const row = await db.trainingQuestion.upsert({ where: { assessmentId_code: { assessmentId: assessment.id, code: input.code.trim().toUpperCase() } }, update: { type: input.type, prompt: input.prompt.trim(), options: toPrismaJson(input.options ?? []), correctAnswer: toPrismaJson(input.correctAnswer), explanation: input.explanation?.trim() || null, weight: input.weight ?? 1, active: true }, create: { assessmentId: assessment.id, code: input.code.trim().toUpperCase(), type: input.type, prompt: input.prompt.trim(), options: toPrismaJson(input.options ?? []), correctAnswer: toPrismaJson(input.correctAnswer), explanation: input.explanation?.trim() || null, weight: input.weight ?? 1, order: await db.trainingQuestion.count({ where: { assessmentId: assessment.id } }) } });
  await satisfyRequirement(input.workProjectId, 'assessment', 'TrainingQuestion', row.id);
  return row;
}

export async function publishTrainingCourse(input: { tenantId: string; workProjectId: string; courseId: string; userId?: string }) {
  const program = await getOrCreateTrainingProgram(input);
  const link = await db.trainingProgramCourse.findFirst({ where: { trainingProgramId: program.id, courseId: input.courseId }, include: { course: { include: { modules: { include: { lessons: true } }, assessments: { include: { questions: true } } } } } });
  if (!link) throw new Error('Curso não pertence ao programa');
  const course = link.course;
  if (!course.modules.some((module) => module.lessons.some((lesson) => lesson.mandatory))) throw new Error('Curso precisa de ao menos uma aula obrigatória');
  if (!course.assessments.some((assessment) => assessment.active && assessment.questions.some((question) => question.active))) throw new Error('Curso precisa de avaliação com questões');
  if (course.requiresPractical && course.practicalWorkloadMinutes < 1) throw new Error('Curso prático precisa registrar carga horária prática');
  const row = await db.trainingCourse.update({ where: { id: course.id }, data: { status: 'PUBLISHED', publishedAt: new Date() } });
  await satisfyRequirement(input.workProjectId, 'content', 'TrainingCourse', row.id);
  return row;
}

export async function saveTrainingRequirementRule(input: { tenantId: string; workProjectId: string; courseId?: string | null; pathId?: string | null; jobFunctionId?: string | null; gheId?: string | null; exposureAgentId?: string | null; riskCategory?: string | null; source: TrainingRequirementSource; recurrenceDays?: number | null; legalBasis?: string[] }) {
  const project = await trainingProject(input.tenantId, input.workProjectId);
  if (Boolean(input.courseId) === Boolean(input.pathId)) throw new Error('Informe um curso ou uma trilha, exclusivamente');
  if (input.courseId) {
    const course = await db.trainingCourse.findFirst({ where: { id: input.courseId, tenantId: input.tenantId } }); if (!course) throw new Error('Curso não pertence à consultoria');
  }
  if (input.pathId) {
    const path = await db.trainingPath.findFirst({ where: { id: input.pathId, tenantId: input.tenantId } }); if (!path) throw new Error('Trilha não pertence à consultoria');
  }
  const row = await db.trainingRequirementRule.create({ data: { tenantId: input.tenantId, companyId: project.companyId, courseId: input.courseId ?? null, pathId: input.pathId ?? null, jobFunctionId: input.jobFunctionId ?? null, gheId: input.gheId ?? null, exposureAgentId: input.exposureAgentId ?? null, riskCategory: input.riskCategory?.trim().toUpperCase() || null, source: input.source, recurrenceDays: input.recurrenceDays ?? null, legalBasis: toPrismaJson(cleanLines(input.legalBasis)), active: true } });
  await satisfyRequirement(input.workProjectId, 'risk_training_rules', 'TrainingRequirementRule', row.id);
  return row;
}

async function coursesForRule(rule: { courseId: string | null; pathId: string | null }) {
  if (rule.courseId) return [rule.courseId];
  if (!rule.pathId) return [];
  const rows = await db.trainingPathCourse.findMany({ where: { pathId: rule.pathId, required: true }, orderBy: { order: 'asc' }, select: { courseId: true } });
  return rows.map((item) => item.courseId);
}

export async function applyTrainingRequirementRules(input: { tenantId: string; workProjectId: string; dueInDays?: number; userId?: string }) {
  const project = await trainingProject(input.tenantId, input.workProjectId);
  const program = await getOrCreateTrainingProgram(input);
  const rules = await db.trainingRequirementRule.findMany({ where: { tenantId: input.tenantId, companyId: project.companyId, active: true } });
  const workers = await db.occupationalWorker.findMany({ where: { tenantId: input.tenantId, companyId: project.companyId, status: 'ACTIVE' }, include: { exposurePeriods: { include: { agents: true } } } });
  let created = 0;
  for (const worker of workers) {
    const context = { jobFunctionId: worker.jobFunctionId, gheId: worker.gheId, exposureAgentIds: worker.exposurePeriods.flatMap((period) => period.agents.map((agent) => agent.id)), riskCategories: worker.exposurePeriods.flatMap((period) => period.agents.map((agent) => agent.category)) };
    for (const rule of rules) {
      if (!ruleAppliesToWorker(rule, context)) continue;
      for (const courseId of await coursesForRule(rule)) {
        const existing = await db.trainingEnrollment.findFirst({ where: { tenantId: input.tenantId, trainingProgramId: program.id, workerId: worker.id, courseId, status: { notIn: ['CANCELLED', 'EXPIRED'] } } });
        if (existing) continue;
        const assignedAt = new Date();
        await db.trainingEnrollment.create({ data: { tenantId: input.tenantId, companyId: project.companyId, trainingProgramId: program.id, workerId: worker.id, courseId, pathId: rule.pathId, requirementRuleId: rule.id, source: rule.source, assignedAt, dueAt: trainingDueDate(assignedAt, input.dueInDays ?? 30), assignedById: input.userId ?? null } });
        created += 1;
      }
    }
  }
  if (created) await satisfyRequirement(input.workProjectId, 'attendance', 'TrainingEnrollment', String(created));
  return { created, workers: workers.length, rules: rules.length };
}

export async function enrollWorkerManually(input: { tenantId: string; workProjectId: string; workerId: string; courseId: string; dueAt?: Date | null; userId?: string }) {
  const project = await trainingProject(input.tenantId, input.workProjectId);
  const program = await getOrCreateTrainingProgram(input);
  const worker = await db.occupationalWorker.findFirst({ where: { id: input.workerId, tenantId: input.tenantId, companyId: project.companyId, status: 'ACTIVE' } });
  if (!worker) throw new Error('Trabalhador não pertence à empresa');
  const course = await db.trainingCourse.findFirst({ where: { id: input.courseId, tenantId: input.tenantId, status: 'PUBLISHED' } });
  if (!course) throw new Error('Curso publicado não encontrado');
  const current = await db.trainingEnrollment.findFirst({ where: { tenantId: input.tenantId, trainingProgramId: program.id, workerId: worker.id, courseId: course.id, status: { notIn: ['CANCELLED', 'EXPIRED'] } } });
  if (current) return current;
  return db.trainingEnrollment.create({ data: { tenantId: input.tenantId, companyId: project.companyId, trainingProgramId: program.id, workerId: worker.id, courseId: course.id, status: 'ASSIGNED', source: 'MANUAL', dueAt: input.dueAt ?? null, assignedById: input.userId ?? null } });
}


export async function issueTrainingAccessToken(input: { tenantId: string; enrollmentId: string; expiresInDays?: number }) {
  const enrollment = await db.trainingEnrollment.findFirst({ where: { id: input.enrollmentId, tenantId: input.tenantId, status: { notIn: ['CANCELLED', 'EXPIRED'] } }, include: { worker: { select: { fullName: true } }, course: { select: { title: true } } } });
  if (!enrollment) throw new Error('Matrícula ativa não encontrada');
  const token = randomToken(32);
  const issuedAt = new Date();
  const expiresAt = new Date(issuedAt);
  expiresAt.setUTCDate(expiresAt.getUTCDate() + Math.max(1, Math.min(365, Math.round(input.expiresInDays ?? 90))));
  await db.trainingEnrollment.update({ where: { id: enrollment.id }, data: { accessTokenHash: sha256(token), accessTokenIssuedAt: issuedAt, accessTokenExpiresAt: expiresAt } });
  return { token, expiresAt, workerName: enrollment.worker.fullName, courseTitle: enrollment.course.title };
}

export async function publicTrainingEnrollment(token: string) {
  if (token.length < 32 || token.length > 160) return null;
  const now = new Date();
  const enrollment = await db.trainingEnrollment.findFirst({
    where: { accessTokenHash: sha256(token), status: { notIn: ['CANCELLED', 'EXPIRED'] }, OR: [{ accessTokenExpiresAt: null }, { accessTokenExpiresAt: { gte: now } }] },
    include: {
      company: { select: { legalName: true, tradeName: true } }, worker: { select: { fullName: true } },
      course: { include: { modules: { include: { lessons: { orderBy: { order: 'asc' } } }, orderBy: { order: 'asc' } }, assessments: { where: { active: true }, include: { questions: { where: { active: true }, orderBy: { order: 'asc' } } } } } },
      lessonProgress: true, attempts: { orderBy: { submittedAt: 'desc' } }, practicalEvaluations: true, attendances: true, certificate: true,
    },
  });
  if (!enrollment) return null;
  await db.trainingEnrollment.update({ where: { id: enrollment.id }, data: { lastAccessAt: now, status: enrollment.status === 'ASSIGNED' ? 'IN_PROGRESS' : enrollment.status, startedAt: enrollment.startedAt ?? now } });
  return enrollment;
}

export async function recordPublicTrainingLessonProgress(input: { token: string; lessonId: string; completed: boolean; activeSeconds?: number; positionSeconds?: number; sessionTokenHash?: string | null; ipHash?: string | null; deviceHash?: string | null }) {
  const enrollment = await publicTrainingEnrollment(input.token);
  if (!enrollment) throw new Error('Acesso ao treinamento inválido ou expirado');
  return recordTrainingLessonProgress({ tenantId: enrollment.tenantId, enrollmentId: enrollment.id, lessonId: input.lessonId, completed: input.completed, activeSeconds: input.activeSeconds, positionSeconds: input.positionSeconds, sessionTokenHash: input.sessionTokenHash, ipHash: input.ipHash, deviceHash: input.deviceHash });
}

export async function submitPublicTrainingAssessment(input: { token: string; assessmentId: string; answers: Record<string, unknown> }) {
  const enrollment = await publicTrainingEnrollment(input.token);
  if (!enrollment) throw new Error('Acesso ao treinamento inválido ou expirado');
  return submitTrainingAssessment({ tenantId: enrollment.tenantId, enrollmentId: enrollment.id, assessmentId: input.assessmentId, answers: input.answers });
}

async function recalculateEnrollment(enrollmentId: string) {
  const enrollment = await db.trainingEnrollment.findUnique({ where: { id: enrollmentId }, include: { course: { include: { modules: { include: { lessons: true } }, assessments: true } }, lessonProgress: true, attempts: true, practicalEvaluations: true } });
  if (!enrollment) throw new Error('Matrícula não encontrada');
  const mandatoryLessons = enrollment.course.modules.flatMap((module) => module.lessons).filter((lesson) => lesson.mandatory);
  const completedLessonIds = new Set(enrollment.lessonProgress.filter((item) => item.status === 'COMPLETED').map((item) => item.lessonId));
  const mandatoryAssessments = enrollment.course.assessments.filter((item) => item.active && item.type !== 'DIAGNOSTIC');
  const passedAssessmentIds = new Set(enrollment.attempts.filter((item) => item.passed).map((item) => item.assessmentId));
  const practicalApproved = enrollment.practicalEvaluations.some((item) => item.status === 'APPROVED');
  const progress = calculateTrainingProgress({ mandatoryLessons: mandatoryLessons.length, completedMandatoryLessons: mandatoryLessons.filter((lesson) => completedLessonIds.has(lesson.id)).length, mandatoryAssessments: mandatoryAssessments.length, passedAssessments: mandatoryAssessments.filter((item) => passedAssessmentIds.has(item.id)).length, practicalRequired: enrollment.course.requiresPractical, practicalApproved });
  const completed = progress === 100;
  const bestScores = enrollment.attempts.filter((item) => item.score != null).map((item) => Number(item.score));
  return db.trainingEnrollment.update({ where: { id: enrollment.id }, data: { progress, status: completed ? 'COMPLETED' : progress > 0 ? 'IN_PROGRESS' : enrollment.status, startedAt: progress > 0 ? enrollment.startedAt ?? new Date() : enrollment.startedAt, completedAt: completed ? enrollment.completedAt ?? new Date() : null, finalScore: bestScores.length ? Math.max(...bestScores) : null } });
}

export async function recordTrainingLessonProgress(input: { tenantId: string; enrollmentId: string; lessonId: string; completed: boolean; activeSeconds?: number; positionSeconds?: number; sessionTokenHash?: string | null; ipHash?: string | null; deviceHash?: string | null }) {
  const enrollment = await db.trainingEnrollment.findFirst({ where: { id: input.enrollmentId, tenantId: input.tenantId }, include: { course: { include: { modules: { include: { lessons: true } } } } } });
  if (!enrollment) throw new Error('Matrícula não encontrada');
  if (!enrollment.course.modules.some((module) => module.lessons.some((lesson) => lesson.id === input.lessonId))) throw new Error('Aula não pertence ao curso da matrícula');
  const row = await db.trainingLessonProgress.upsert({ where: { enrollmentId_lessonId: { enrollmentId: enrollment.id, lessonId: input.lessonId } }, update: { status: input.completed ? 'COMPLETED' : 'IN_PROGRESS', startedAt: new Date(), completedAt: input.completed ? new Date() : null, activeSeconds: { increment: Math.max(0, Math.round(input.activeSeconds ?? 0)) }, lastPositionSeconds: Math.max(0, Math.round(input.positionSeconds ?? 0)) }, create: { enrollmentId: enrollment.id, lessonId: input.lessonId, status: input.completed ? 'COMPLETED' : 'IN_PROGRESS', startedAt: new Date(), completedAt: input.completed ? new Date() : null, activeSeconds: Math.max(0, Math.round(input.activeSeconds ?? 0)), lastPositionSeconds: Math.max(0, Math.round(input.positionSeconds ?? 0)) } });
  await db.trainingAccessLog.create({ data: { enrollmentId: enrollment.id, lessonId: input.lessonId, action: input.completed ? 'LESSON_COMPLETED' : 'LESSON_HEARTBEAT', durationSeconds: Math.max(0, Math.round(input.activeSeconds ?? 0)), sessionTokenHash: input.sessionTokenHash ?? null, ipHash: input.ipHash ?? null, deviceHash: input.deviceHash ?? null } });
  await recalculateEnrollment(enrollment.id);
  const trainingProgram = await db.trainingProgram.findUnique({ where: { id: enrollment.trainingProgramId }, select: { workProjectId: true } });
  if (trainingProgram) await satisfyRequirement(trainingProgram.workProjectId, 'access_time', 'TrainingLessonProgress', row.id);
  return row;
}

export async function submitTrainingAssessment(input: { tenantId: string; enrollmentId: string; assessmentId: string; answers: Record<string, unknown> }) {
  const enrollment = await db.trainingEnrollment.findFirst({ where: { id: input.enrollmentId, tenantId: input.tenantId }, include: { course: true } });
  if (!enrollment) throw new Error('Matrícula não encontrada');
  const assessment = await db.trainingAssessment.findFirst({ where: { id: input.assessmentId, courseId: enrollment.courseId, active: true }, include: { questions: { where: { active: true }, orderBy: { order: 'asc' } } } });
  if (!assessment) throw new Error('Avaliação não pertence ao curso');
  const previousAttempts = await db.trainingAssessmentAttempt.count({ where: { enrollmentId: enrollment.id, assessmentId: assessment.id, status: { not: 'CANCELLED' } } });
  const attemptNumber = nextAttemptNumber(previousAttempts, assessment.maxAttempts);
  const result = scoreAssessment({ questions: assessment.questions.map((question) => ({ id: question.id, type: question.type, correctAnswer: question.correctAnswer, weight: Number(question.weight) })), answers: input.answers, passingScore: Number(assessment.passingScore) });
  const status = result.manualReviewRequired ? 'PENDING_MANUAL_REVIEW' : result.passed ? 'PASSED' : 'FAILED';
  const row = await db.trainingAssessmentAttempt.create({ data: { enrollmentId: enrollment.id, assessmentId: assessment.id, attemptNumber, status, answers: toPrismaJson(input.answers), score: result.score, passed: result.passed, manualReviewRequired: result.manualReviewRequired, submittedAt: new Date(), feedback: result.manualReviewRequired ? 'Há questão discursiva que exige revisão humana.' : null } });
  await db.trainingAccessLog.create({ data: { enrollmentId: enrollment.id, action: 'ASSESSMENT_SUBMITTED', metadata: toPrismaJson({ assessmentId: assessment.id, attemptNumber, status }) } });
  await recalculateEnrollment(enrollment.id);
  const trainingProgram = await db.trainingProgram.findUnique({ where: { id: enrollment.trainingProgramId }, select: { workProjectId: true } });
  if (trainingProgram) await satisfyRequirement(trainingProgram.workProjectId, 'learning_results', 'TrainingAssessmentAttempt', row.id);
  return row;
}


export async function reviewTrainingAssessmentAttempt(input: { tenantId: string; attemptId: string; reviewerUserId: string; score: number; passed: boolean; feedback?: string | null }) {
  if (!Number.isFinite(input.score) || input.score < 0 || input.score > 100) throw new Error('Nota revisada deve estar entre 0 e 100');
  const attempt = await db.trainingAssessmentAttempt.findFirst({ where: { id: input.attemptId, enrollment: { tenantId: input.tenantId } }, include: { enrollment: true } });
  if (!attempt) throw new Error('Tentativa não encontrada');
  if (!attempt.manualReviewRequired || attempt.status !== 'PENDING_MANUAL_REVIEW') throw new Error('Tentativa não está pendente de revisão manual');
  const row = await db.trainingAssessmentAttempt.update({ where: { id: attempt.id }, data: { score: input.score, passed: input.passed, status: input.passed ? 'PASSED' : 'FAILED', reviewedAt: new Date(), reviewedById: input.reviewerUserId, feedback: input.feedback?.trim() || null, manualReviewRequired: false } });
  await recalculateEnrollment(attempt.enrollmentId);
  return row;
}

export async function savePracticalEvaluation(input: { tenantId: string; enrollmentId: string; title: string; approved: boolean; score?: number | null; checklist?: Array<Record<string, unknown>>; evidenceFileId?: string | null; evaluatorUserId: string; notes?: string | null }) {
  const enrollment = await db.trainingEnrollment.findFirst({ where: { id: input.enrollmentId, tenantId: input.tenantId }, include: { course: true } });
  if (!enrollment) throw new Error('Matrícula não encontrada');
  if (!enrollment.course.requiresPractical) throw new Error('Curso não exige avaliação prática');
  if (input.evidenceFileId) { const file = await db.fileObject.findFirst({ where: { id: input.evidenceFileId, tenantId: input.tenantId } }); if (!file) throw new Error('Evidência não pertence à consultoria'); }
  const row = await db.trainingPracticalEvaluation.create({ data: { enrollmentId: enrollment.id, title: input.title.trim(), status: input.approved ? 'APPROVED' : 'REJECTED', score: input.score ?? null, checklist: toPrismaJson(input.checklist ?? []), evidenceFileId: input.evidenceFileId ?? null, evaluatorUserId: input.evaluatorUserId, evaluatedAt: new Date(), approvedAt: input.approved ? new Date() : null, notes: input.notes?.trim() || null } });
  await recalculateEnrollment(enrollment.id);
  const trainingProgram = await db.trainingProgram.findUnique({ where: { id: enrollment.trainingProgramId }, select: { workProjectId: true } });
  if (trainingProgram) { await satisfyRequirement(trainingProgram.workProjectId, 'practical_part', 'TrainingPracticalEvaluation', row.id); await satisfyRequirement(trainingProgram.workProjectId, 'practical_assessment', 'TrainingPracticalEvaluation', row.id); }
  return row;
}

export async function issueTrainingCertificate(input: { tenantId: string; enrollmentId: string; issuedById: string; instructorName?: string | null; technicalResponsibleName?: string | null; fileId?: string | null }) {
  const enrollment = await db.trainingEnrollment.findFirst({ where: { id: input.enrollmentId, tenantId: input.tenantId }, include: { worker: true, company: true, course: { include: { modules: { include: { lessons: true } }, assessments: true, competencyRequirements: true } }, lessonProgress: true, attempts: true, practicalEvaluations: true, attendances: true, certificate: true } });
  if (!enrollment) throw new Error('Matrícula não encontrada');
  if (enrollment.certificate) return enrollment.certificate;
  const mandatoryLessons = enrollment.course.modules.flatMap((module) => module.lessons).filter((lesson) => lesson.mandatory);
  const completedLessonIds = new Set(enrollment.lessonProgress.filter((item) => item.status === 'COMPLETED').map((item) => item.lessonId));
  const mandatoryAssessments = enrollment.course.assessments.filter((item) => item.active && item.type !== 'DIAGNOSTIC');
  const passedAssessmentIds = new Set(enrollment.attempts.filter((item) => item.passed).map((item) => item.assessmentId));
  const eligibility = certificateEligibility({ enrollmentStatus: enrollment.status, mandatoryLessons: mandatoryLessons.length, completedMandatoryLessons: mandatoryLessons.filter((lesson) => completedLessonIds.has(lesson.id)).length, mandatoryAssessments: mandatoryAssessments.length, passedAssessments: mandatoryAssessments.filter((assessment) => passedAssessmentIds.has(assessment.id)).length, practicalRequired: enrollment.course.requiresPractical, practicalApproved: enrollment.practicalEvaluations.some((item) => item.status === 'APPROVED'), attendanceRequired: enrollment.course.modality !== 'E_LEARNING', attendanceSatisfied: enrollment.course.modality === 'E_LEARNING' || enrollment.attendances.some((item) => item.present) });
  if (!eligibility.eligible) throw new Error(eligibility.reasons.join(' '));
  if (input.fileId) { const file = await db.fileObject.findFirst({ where: { id: input.fileId, tenantId: input.tenantId } }); if (!file) throw new Error('Arquivo do certificado não pertence à consultoria'); }
  const issuedAt = new Date(); const hash = certificateVerificationHash({ tenantId: input.tenantId, companyId: enrollment.companyId, workerId: enrollment.workerId, enrollmentId: enrollment.id, courseCode: enrollment.course.code, issuedAt });
  const certificate = await db.trainingCertificate.create({ data: { tenantId: input.tenantId, companyId: enrollment.companyId, workerId: enrollment.workerId, enrollmentId: enrollment.id, code: certificateCode({ courseCode: enrollment.course.code, issuedAt, hash }), verificationHash: hash, status: 'ISSUED', issuedAt, expiresAt: expiryDate(issuedAt, enrollment.course.validityDays), workloadMinutes: enrollment.course.workloadMinutes, practicalWorkloadMinutes: enrollment.course.practicalWorkloadMinutes, finalScore: enrollment.finalScore, courseTitle: enrollment.course.title, courseVersion: enrollment.course.version, instructorName: input.instructorName?.trim() || null, technicalResponsibleName: input.technicalResponsibleName?.trim() || null, fileId: input.fileId ?? null, qrPayload: toPrismaJson({ path: `/certificates/${hash}`, course: enrollment.course.code, worker: enrollment.worker.fullName }), issuedById: input.issuedById } });
  for (const requirement of enrollment.course.competencyRequirements) {
    await db.workerCompetency.upsert({ where: { workerId_competencyId: { workerId: enrollment.workerId, competencyId: requirement.competencyId } }, update: { certificateId: certificate.id, status: 'VALID', source: 'TRAINING_CERTIFICATE', validFrom: issuedAt, validUntil: certificate.expiresAt, verifiedById: input.issuedById, verifiedAt: issuedAt }, create: { tenantId: input.tenantId, companyId: enrollment.companyId, workerId: enrollment.workerId, competencyId: requirement.competencyId, certificateId: certificate.id, status: 'VALID', source: 'TRAINING_CERTIFICATE', validFrom: issuedAt, validUntil: certificate.expiresAt, verifiedById: input.issuedById, verifiedAt: issuedAt } });
  }
  const trainingProgram = await db.trainingProgram.findUnique({ where: { id: enrollment.trainingProgramId }, select: { workProjectId: true } });
  if (trainingProgram) { await satisfyRequirement(trainingProgram.workProjectId, 'certificate', 'TrainingCertificate', certificate.id); await satisfyRequirement(trainingProgram.workProjectId, 'certificate_validity', 'TrainingCertificate', certificate.id); await satisfyRequirement(trainingProgram.workProjectId, 'competency_update', 'TrainingCertificate', certificate.id); await satisfyRequirement(trainingProgram.workProjectId, 'renewal_alerts', 'TrainingCertificate', certificate.id); }
  return certificate;
}


export async function revokeTrainingCertificate(input: { tenantId: string; certificateId: string; revokedById: string; reason: string }) {
  if (input.reason.trim().length < 10) throw new Error('Motivo detalhado da revogação é obrigatório');
  const certificate = await db.trainingCertificate.findFirst({ where: { id: input.certificateId, tenantId: input.tenantId } });
  if (!certificate) throw new Error('Certificado não encontrado');
  if (certificate.status === 'REVOKED') return certificate;
  const revokedAt = new Date();
  const row = await db.trainingCertificate.update({ where: { id: certificate.id }, data: { status: 'REVOKED', revokedAt, revokedReason: input.reason.trim() } });
  await db.workerCompetency.updateMany({ where: { certificateId: certificate.id }, data: { status: 'REVOKED', validUntil: revokedAt, notes: `Certificado revogado: ${input.reason.trim()}` } });
  return row;
}

export async function saveCompetencyDefinition(input: { tenantId: string; companyId?: string | null; code: string; name: string; category: string; description?: string | null; validityDays?: number | null; evidenceRequirements?: string[]; jobFunctionId?: string | null; gheId?: string | null; courseId?: string | null }) {
  const competency = await db.competencyDefinition.upsert({ where: { tenantId_code: { tenantId: input.tenantId, code: input.code.trim().toUpperCase() } }, update: { companyId: input.companyId ?? null, name: input.name.trim(), category: input.category.trim().toUpperCase(), description: input.description?.trim() || null, validityDays: input.validityDays ?? null, evidenceRequirements: toPrismaJson(cleanLines(input.evidenceRequirements)), active: true }, create: { tenantId: input.tenantId, companyId: input.companyId ?? null, code: input.code.trim().toUpperCase(), name: input.name.trim(), category: input.category.trim().toUpperCase(), description: input.description?.trim() || null, validityDays: input.validityDays ?? null, evidenceRequirements: toPrismaJson(cleanLines(input.evidenceRequirements)) } });
  if (input.jobFunctionId || input.gheId || input.courseId) await db.competencyRequirement.create({ data: { competencyId: competency.id, jobFunctionId: input.jobFunctionId ?? null, gheId: input.gheId ?? null, courseId: input.courseId ?? null, mandatory: true } });
  const trainingProgram = input.companyId ? await db.trainingProgram.findFirst({ where: { companyId: input.companyId }, orderBy: { updatedAt: 'desc' }, select: { workProjectId: true } }) : null;
  if (trainingProgram) await satisfyRequirement(trainingProgram.workProjectId, 'competency_matrix', 'CompetencyDefinition', competency.id);
  return competency;
}

export async function getTrainingOverview(input: { tenantId: string; workProjectId: string }) {
  const project = await trainingProject(input.tenantId, input.workProjectId);
  const program = await db.trainingProgram.findUnique({ where: { workProjectId: project.id }, include: { courses: { include: { course: { include: { modules: { include: { lessons: true } }, assessments: { include: { questions: true } } } } }, orderBy: { order: 'asc' } }, audits: { orderBy: { createdAt: 'desc' }, take: 1 } } });
  const enrollments = await db.trainingEnrollment.findMany({ where: { tenantId: input.tenantId, trainingProgramId: program?.id ?? '__none__' }, include: { worker: { select: { fullName: true } }, course: { select: { code: true, title: true, requiresPractical: true } }, certificate: true }, orderBy: { updatedAt: 'desc' } });
  const now = new Date(); const warning = new Date(now); warning.setUTCDate(warning.getUTCDate() + 30);
  return { project: { id: project.id, title: project.title, progress: project.progress, status: project.status }, program, courseCount: program?.courses.length ?? 0, enrollmentCount: enrollments.length, completedEnrollments: enrollments.filter((item) => item.status === 'COMPLETED').length, overdueEnrollments: enrollments.filter((item) => item.dueAt && item.dueAt < now && item.status !== 'COMPLETED').length, certificatesIssued: enrollments.filter((item) => item.certificate?.status === 'ISSUED').length, certificatesExpiring: enrollments.filter((item) => item.certificate?.expiresAt && item.certificate.expiresAt <= warning && item.certificate.expiresAt >= now).length, latestAudit: program?.audits[0] ?? null, enrollments };
}

export async function runTrainingAudit(input: { tenantId: string; workProjectId: string; userId?: string }) {
  const project = await trainingProject(input.tenantId, input.workProjectId); const program = await getOrCreateTrainingProgram(input);
  const courses = await db.trainingProgramCourse.findMany({ where: { trainingProgramId: program.id }, include: { course: { include: { modules: { include: { lessons: true } }, assessments: true } } } });
  const enrollments = await db.trainingEnrollment.findMany({ where: { tenantId: input.tenantId, trainingProgramId: program.id }, include: { accessLogs: true, practicalEvaluations: true, certificate: true } });
  const now = new Date(); const warning = new Date(now); warning.setUTCDate(warning.getUTCDate() + 30);
  const result = auditTrainingCompleteness({
    hasScope: Boolean(program.scope?.trim()), hasPedagogicalProject: Boolean(program.pedagogicalProject && Object.keys(program.pedagogicalProject as object).length), hasTargetAudience: Array.isArray(program.targetAudience) && program.targetAudience.length > 0, hasInstructor: Boolean(program.instructorName || program.technicalResponsibleName),
    courseCount: courses.length, publishedCourseCount: courses.filter((item) => item.course.status === 'PUBLISHED').length,
    coursesWithoutContent: courses.filter((item) => !item.course.modules.some((module) => module.lessons.some((lesson) => lesson.mandatory))).length,
    coursesWithoutAssessment: courses.filter((item) => !item.course.assessments.some((assessment) => assessment.active)).length,
    coursesWithoutPassingCriteria: courses.filter((item) => item.course.assessments.some((assessment) => Number(assessment.passingScore) < 0 || Number(assessment.passingScore) > 100)).length,
    enrollmentCount: enrollments.length, enrollmentsWithoutAccessEvidence: enrollments.filter((item) => !item.accessLogs.length).length,
    overdueEnrollments: enrollments.filter((item) => item.dueAt && item.dueAt < now && item.status !== 'COMPLETED').length,
    practicalPending: enrollments.filter((item) => item.status !== 'COMPLETED' && item.practicalEvaluations.some((evaluation) => evaluation.status === 'PENDING')).length,
    completedEnrollments: enrollments.filter((item) => item.status === 'COMPLETED').length,
    completedWithoutCertificate: enrollments.filter((item) => item.status === 'COMPLETED' && !item.certificate).length,
    certificatesExpiring: enrollments.filter((item) => item.certificate?.expiresAt && item.certificate.expiresAt <= warning && item.certificate.expiresAt >= now).length,
    requirementRuleCount: await db.trainingRequirementRule.count({ where: { tenantId: input.tenantId, companyId: project.companyId, active: true } }),
    competencyDefinitionCount: await db.competencyDefinition.count({ where: { tenantId: input.tenantId, OR: [{ companyId: project.companyId }, { companyId: null }], active: true } }), workflowProgress: project.progress,
  });
  const row = await db.trainingAuditRun.create({ data: { trainingProgramId: program.id, status: result.status, score: result.score, findings: toPrismaJson(result.findings), snapshot: toPrismaJson({ courseCount: courses.length, enrollmentCount: enrollments.length, completed: enrollments.filter((item) => item.status === 'COMPLETED').length, progress: project.progress }), createdById: input.userId ?? null } });
  if (result.status !== 'FAILED') await satisfyRequirement(input.workProjectId, 'technical_audit', 'TrainingAuditRun', row.id);
  return row;
}

export async function saveTrainingPath(input: { tenantId: string; workProjectId: string; code: string; title: string; description?: string | null; courseIds: string[]; validityDays?: number | null }) {
  const project = await trainingProject(input.tenantId, input.workProjectId);
  const code = input.code.trim().toUpperCase();
  if (code.length < 2 || input.title.trim().length < 3) throw new Error('Código e título da trilha são obrigatórios');
  const courseIds = [...new Set(input.courseIds.filter(Boolean))];
  if (!courseIds.length) throw new Error('A trilha precisa de ao menos um curso');
  const courses = await db.trainingCourse.findMany({ where: { id: { in: courseIds }, tenantId: input.tenantId, status: 'PUBLISHED' }, select: { id: true } });
  if (courses.length !== courseIds.length) throw new Error('Há curso ausente, não publicado ou de outra consultoria');
  const path = await db.trainingPath.upsert({ where: { tenantId_code: { tenantId: input.tenantId, code } }, update: { companyId: project.companyId, title: input.title.trim(), description: input.description?.trim() || null, status: 'PUBLISHED', validityDays: input.validityDays ?? null }, create: { tenantId: input.tenantId, companyId: project.companyId, code, title: input.title.trim(), description: input.description?.trim() || null, status: 'PUBLISHED', validityDays: input.validityDays ?? null } });
  await db.trainingPathCourse.deleteMany({ where: { pathId: path.id } });
  await db.trainingPathCourse.createMany({ data: courseIds.map((courseId, order) => ({ pathId: path.id, courseId, order, required: true })) });
  await satisfyRequirement(input.workProjectId, 'learning_paths', 'TrainingPath', path.id);
  return path;
}

export async function createTrainingSession(input: { tenantId: string; workProjectId: string; courseId: string; title: string; modality: TrainingModality; startsAt: Date; endsAt: Date; location?: string | null; meetingUrl?: string | null; instructorName?: string | null; capacity?: number | null; practicalPart?: boolean }) {
  const project = await trainingProject(input.tenantId, input.workProjectId);
  const program = await getOrCreateTrainingProgram(input);
  const course = await db.trainingCourse.findFirst({ where: { id: input.courseId, tenantId: input.tenantId, status: 'PUBLISHED' } });
  if (!course) throw new Error('Curso publicado não encontrado');
  if (input.endsAt <= input.startsAt) throw new Error('Horário final deve ser posterior ao inicial');
  if (input.modality === 'PRESENTIAL' && !input.location?.trim()) throw new Error('Local é obrigatório para sessão presencial');
  if (input.modality === 'LIVE_ONLINE' && !input.meetingUrl?.trim()) throw new Error('Link é obrigatório para sessão ao vivo');
  const row = await db.trainingSession.create({ data: { tenantId: input.tenantId, companyId: project.companyId, trainingProgramId: program.id, courseId: course.id, title: input.title.trim(), modality: input.modality, status: 'SCHEDULED', startsAt: input.startsAt, endsAt: input.endsAt, location: input.location?.trim() || null, meetingUrl: input.meetingUrl?.trim() || null, instructorName: input.instructorName?.trim() || null, capacity: input.capacity ?? null, practicalPart: input.practicalPart ?? false } });
  await satisfyRequirement(input.workProjectId, 'live_sessions', 'TrainingSession', row.id);
  return row;
}

export async function recordTrainingAttendance(input: { tenantId: string; sessionId: string; workerId: string; enrollmentId?: string | null; present: boolean; checkInAt?: Date | null; checkOutAt?: Date | null; signature?: Record<string, unknown> }) {
  const session = await db.trainingSession.findFirst({ where: { id: input.sessionId, tenantId: input.tenantId } });
  if (!session) throw new Error('Sessão não encontrada');
  const worker = await db.occupationalWorker.findFirst({ where: { id: input.workerId, tenantId: input.tenantId, companyId: session.companyId ?? undefined } });
  if (!worker) throw new Error('Trabalhador não pertence à consultoria ou à empresa da sessão');
  if (input.enrollmentId) {
    const enrollment = await db.trainingEnrollment.findFirst({ where: { id: input.enrollmentId, tenantId: input.tenantId, trainingProgramId: session.trainingProgramId, workerId: worker.id, courseId: session.courseId } });
    if (!enrollment) throw new Error('Matrícula não corresponde à sessão');
  }
  const checkInAt = input.checkInAt ?? (input.present ? new Date() : null); const checkOutAt = input.checkOutAt ?? null;
  const presenceMinutes = checkInAt && checkOutAt ? Math.max(0, Math.round((checkOutAt.getTime() - checkInAt.getTime()) / 60000)) : 0;
  const row = await db.trainingAttendance.upsert({ where: { sessionId_workerId: { sessionId: session.id, workerId: worker.id } }, update: { enrollmentId: input.enrollmentId ?? null, checkInAt, checkOutAt, presenceMinutes, present: input.present, signature: toPrismaJson(input.signature ?? {}) }, create: { sessionId: session.id, workerId: worker.id, enrollmentId: input.enrollmentId ?? null, checkInAt, checkOutAt, presenceMinutes, present: input.present, signature: toPrismaJson(input.signature ?? {}) } });
  if (input.enrollmentId) {
    await db.trainingAccessLog.create({ data: { enrollmentId: input.enrollmentId, action: input.present ? 'LIVE_CHECK_IN' : 'LIVE_CHECK_OUT', durationSeconds: presenceMinutes * 60, metadata: toPrismaJson({ sessionId: session.id }) } });
    await recalculateEnrollment(input.enrollmentId);
  }
  return row;
}
