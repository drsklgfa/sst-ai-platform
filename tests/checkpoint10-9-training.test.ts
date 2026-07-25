import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { auditTrainingCompleteness } from '../src/domain/training/audit.ts';
import { calculateTrainingProgress, nextAttemptNumber, scoreAssessment } from '../src/domain/training/assessment.ts';
import { certificateCode, certificateEligibility, certificateVerificationHash, expiryDate } from '../src/domain/training/certificates.ts';
import { recommendTrainingTemplates, trainingTemplate, trainingTemplateCatalog } from '../src/domain/training/catalog.ts';
import { competencyState, ruleAppliesToWorker, trainingDueDate } from '../src/domain/training/requirements.ts';
import { workflowDefinitionFor } from '../src/domain/workflows/templates.ts';
import { hasCompanyPermission, hasTenantPermission } from '../src/lib/rbac.ts';

const schema = readFileSync('prisma/schema.prisma', 'utf8');
const env = readFileSync('src/lib/env.ts', 'utf8');
const lib = readFileSync('src/lib/training.ts', 'utf8');
const assessmentSource = readFileSync('src/domain/training/assessment.ts', 'utf8');
const page = readFileSync('src/app/(app)/training/[id]/page.tsx', 'utf8');
const sections = readFileSync('src/domain/documents/default-sections.ts', 'utf8');
const aiCatalog = readFileSync('src/domain/ai/operational-tools.ts', 'utf8');
const aiTools = readFileSync('src/lib/ai-tools.ts', 'utf8');
const certificateRoute = readFileSync('src/app/api/training/[id]/enrollments/[enrollmentId]/certificate/route.ts', 'utf8');
const practicalRoute = readFileSync('src/app/api/training/[id]/enrollments/[enrollmentId]/practical/route.ts', 'utf8');
const publicRoute = readFileSync('src/app/api/public/training-certificates/[code]/route.ts', 'utf8');
const learnerPage = readFileSync('src/app/learn/[token]/page.tsx', 'utf8');
const lessonPage = readFileSync('src/app/learn/[token]/lessons/[lessonId]/page.tsx', 'utf8');
const learnerClient = readFileSync('src/components/training/learner-lesson-client.tsx', 'utf8');
const accessRoute = readFileSync('src/app/api/training/[id]/enrollments/[enrollmentId]/access-link/route.ts', 'utf8');
const reviewRoute = readFileSync('src/app/api/training/[id]/enrollments/[enrollmentId]/assessments/[assessmentId]/attempts/[attemptId]/review/route.ts', 'utf8');
const revokeRoute = readFileSync('src/app/api/training/[id]/enrollments/[enrollmentId]/certificate/revoke/route.ts', 'utf8');
const publicAssessmentRoute = readFileSync('src/app/api/public/training/[token]/assessments/[assessmentId]/route.ts', 'utf8');
const publicMaterialRoute = readFileSync('src/app/api/public/training/[token]/materials/[lessonId]/route.ts', 'utf8');

const modelNames = ['TrainingProgram','TrainingCourse','TrainingProgramCourse','TrainingModule','TrainingLesson','TrainingAssessment','TrainingQuestion','TrainingPath','TrainingPathCourse','TrainingRequirementRule','TrainingEnrollment','TrainingLessonProgress','TrainingAssessmentAttempt','TrainingPracticalEvaluation','TrainingSession','TrainingAttendance','TrainingAccessLog','TrainingCertificate','CompetencyDefinition','CompetencyRequirement','WorkerCompetency','TrainingAuditRun'];

test('schema cria universidade corporativa, avaliações, certificados e competências', () => {
  for (const model of modelNames) assert.match(schema, new RegExp(`model ${model} \\{`));
  for (const name of ['TrainingModality','TrainingCourseStatus','TrainingEnrollmentStatus','TrainingAttemptStatus','TrainingCertificateStatus','CompetencyStatus','TrainingAuditStatus']) assert.match(schema, new RegExp(`enum ${name} \\{`));
  assert.match(schema, /model TrainingAccessLog \{[\s\S]*durationSeconds[\s\S]*sessionTokenHash[\s\S]*ipHash[\s\S]*deviceHash/);
});

test('workflow treinamento versão 2 cobre projeto, trilhas, acesso, avaliação, certificado e competência', () => {
  const workflow=workflowDefinitionFor('TREINAMENTO'); assert.equal(workflow.version,2);
  const codes=workflow.steps.flatMap(step=>step.requirements.map(item=>item.code));
  for (const code of ['audience','records_retention','course_catalog','learning_paths','risk_training_rules','competency_matrix','learning_materials','attendance','access_time','live_sessions','practical_part','assessment','passing_criteria','practical_assessment','learning_results','certificate','certificate_validity','competency_update','renewal_alerts']) assert.ok(codes.includes(code));
});

test('catálogo de cursos é amplo e evita cargas genéricas indevidas', () => {
  assert.ok(trainingTemplateCatalog.length >= 15);
  assert.equal(trainingTemplate('NR35_HEIGHT')?.requiresPractical,true);
  assert.equal(trainingTemplate('NR10_ELECTRICAL')?.notes.some(note=>note.includes('carga horária genérica')),true);
  assert.equal(trainingTemplate('DDS_MICROTRAINING')?.notes.some(note=>note.includes('Não substitui')),true);
});

test('recomendação por risco sempre inclui integração e cursos relacionados', () => {
  const codes=recommendTrainingTemplates(['HEIGHT','ELECTRICAL','PPE']).map(item=>item.code);
  for (const code of ['SST_INTEGRATION','NR35_HEIGHT','NR10_ELECTRICAL','NR06_EPI']) assert.ok(codes.includes(code));
  assert.equal(new Set(codes).size,codes.length);
});

test('pontuação objetiva é determinística e suporta pesos', () => {
  const result=scoreAssessment({passingScore:70,questions:[{id:'q1',type:'SINGLE_CHOICE',correctAnswer:'A',weight:2},{id:'q2',type:'TRUE_FALSE',correctAnswer:true,weight:1}],answers:{q1:'A',q2:false}});
  assert.equal(result.manualReviewRequired,false); assert.equal(result.score,66.67); assert.equal(result.passed,false);
});

test('questão discursiva exige revisão humana e não inventa nota final', () => {
  const result=scoreAssessment({passingScore:70,questions:[{id:'q1',type:'SHORT_TEXT',correctAnswer:null,weight:1}],answers:{q1:'resposta'}});
  assert.equal(result.manualReviewRequired,true); assert.equal(result.score,null); assert.equal(result.passed,null);
});

test('múltipla escolha normaliza ordem sem aceitar alternativas diferentes', () => {
  const passed=scoreAssessment({passingScore:100,questions:[{id:'q',type:'MULTIPLE_CHOICE',correctAnswer:['A','C']}],answers:{q:['C','A']}});
  const failed=scoreAssessment({passingScore:100,questions:[{id:'q',type:'MULTIPLE_CHOICE',correctAnswer:['A','C']}],answers:{q:['A','B']}});
  assert.equal(passed.passed,true); assert.equal(failed.passed,false);
});

test('progresso combina aulas, avaliação e prática', () => {
  assert.equal(calculateTrainingProgress({mandatoryLessons:4,completedMandatoryLessons:2,mandatoryAssessments:1,passedAssessments:1,practicalRequired:true,practicalApproved:false}),60);
  assert.equal(calculateTrainingProgress({mandatoryLessons:4,completedMandatoryLessons:4,mandatoryAssessments:1,passedAssessments:1,practicalRequired:true,practicalApproved:true}),100);
});

test('controle de tentativas bloqueia excesso', () => {
  assert.equal(nextAttemptNumber(1,3),2);
  assert.throws(()=>nextAttemptNumber(3,3),/Limite de tentativas atingido/);
});

test('certificado exige aulas, avaliações, prática e presença quando aplicável', () => {
  const blocked=certificateEligibility({enrollmentStatus:'IN_PROGRESS',mandatoryLessons:3,completedMandatoryLessons:2,mandatoryAssessments:1,passedAssessments:0,practicalRequired:true,practicalApproved:false,attendanceRequired:true,attendanceSatisfied:false});
  assert.equal(blocked.eligible,false); assert.ok(blocked.reasons.length>=4);
  const allowed=certificateEligibility({enrollmentStatus:'COMPLETED',mandatoryLessons:3,completedMandatoryLessons:3,mandatoryAssessments:1,passedAssessments:1,practicalRequired:true,practicalApproved:true,attendanceRequired:true,attendanceSatisfied:true});
  assert.equal(allowed.eligible,true);
});

test('código e hash de verificação são estáveis e validade é calculada', () => {
  const issuedAt=new Date('2026-07-23T12:00:00Z');
  const hash=certificateVerificationHash({tenantId:'t',companyId:'c',workerId:'w',enrollmentId:'e',courseCode:'NR35',issuedAt});
  assert.equal(hash.length,64); assert.match(certificateCode({courseCode:'NR35',issuedAt,hash}),/^NR35-20260723-/);
  assert.equal(expiryDate(issuedAt,365)?.toISOString().slice(0,10),'2027-07-23');
});

test('regras vinculam função, GHE, risco e exposição sem escapar do escopo', () => {
  const worker={jobFunctionId:'f1',gheId:'g1',riskCategories:['ERGONOMIC'],exposureAgentIds:['a1']};
  assert.equal(ruleAppliesToWorker({id:'r',active:true,courseId:'c',jobFunctionId:'f1',gheId:'g1',riskCategory:'ERGONOMIC',exposureAgentId:'a1'},worker),true);
  assert.equal(ruleAppliesToWorker({id:'r',active:true,courseId:'c',jobFunctionId:'f2'},worker),false);
  assert.equal(ruleAppliesToWorker({id:'r',active:false,courseId:'c'},worker),false);
});

test('prazos e competências distinguem válido, próximo do vencimento e vencido', () => {
  assert.equal(trainingDueDate(new Date('2026-01-01T00:00:00Z'),30)?.toISOString().slice(0,10),'2026-01-31');
  const ref=new Date('2026-07-23T00:00:00Z');
  assert.equal(competencyState(new Date('2026-12-01T00:00:00Z'),ref),'VALID');
  assert.equal(competencyState(new Date('2026-08-01T00:00:00Z'),ref),'EXPIRING');
  assert.equal(competencyState(new Date('2026-07-01T00:00:00Z'),ref),'EXPIRED');
});

test('auditoria reprova lacunas essenciais e aprova programa completo', () => {
  const complete={hasScope:true,hasPedagogicalProject:true,hasTargetAudience:true,hasInstructor:true,courseCount:1,publishedCourseCount:1,coursesWithoutContent:0,coursesWithoutAssessment:0,coursesWithoutPassingCriteria:0,enrollmentCount:1,enrollmentsWithoutAccessEvidence:0,overdueEnrollments:0,practicalPending:0,completedEnrollments:1,completedWithoutCertificate:0,certificatesExpiring:0,requirementRuleCount:1,competencyDefinitionCount:1,workflowProgress:100};
  assert.equal(auditTrainingCompleteness(complete).status,'PASSED');
  const failed=auditTrainingCompleteness({...complete,hasScope:false,hasPedagogicalProject:false,courseCount:0,coursesWithoutContent:1,coursesWithoutAssessment:1,practicalPending:1,completedWithoutCertificate:1});
  assert.equal(failed.status,'FAILED');
  for (const code of ['TR_SCOPE','TR_PEDAGOGICAL_PROJECT','TR_COURSE','TR_CONTENT','TR_ASSESSMENT','TR_PRACTICAL','TR_CERTIFICATE']) assert.ok(failed.findings.some(item=>item.code===code));
});

test('RBAC separa gestão, instrução, avaliação e emissão de certificado', () => {
  assert.equal(hasTenantPermission('CONSULTANT','training.manage'),true);
  assert.equal(hasTenantPermission('CONSULTANT','training.certificate.issue'),false);
  assert.equal(hasTenantPermission('REVIEWER','training.evaluate'),true);
  assert.equal(hasTenantPermission('RESPONSIBLE_TECH','training.certificate.issue'),true);
  assert.equal(hasCompanyPermission('RH_ADMIN','training.take'),true);
});

test('serviço registra logs, impede certificado incompleto e atualiza competência', () => {
  assert.match(lib,/TrainingAccessLog|trainingAccessLog\.create/);
  assert.match(lib,/certificateEligibility/);
  assert.match(lib,/workerCompetency\.upsert/);
  assert.match(lib,/ruleAppliesToWorker/);
  assert.match(assessmentSource,/Limite de tentativas atingido/);
});

test('rotas reservam prática e certificado a permissões específicas', () => {
  assert.match(practicalRoute,/authorizeTenantApi\('training\.evaluate'\)/);
  assert.match(certificateRoute,/authorizeTenantApi\('training\.certificate\.issue'\)/);
  assert.match(publicRoute,/verificationHash/);
});

test('interface cobre projeto pedagógico, cursos, provas, trilhas, matrículas e certificados', () => {
  for (const text of ['Projeto pedagógico e governança','Criar curso versionado','Adicionar aula ou material','Avaliações e banco de questões','Trilhas e regras por função, GHE ou risco','Matriz de competências','Matrículas, avaliações e certificados']) assert.match(page,new RegExp(text));
});

test('modelo documental possui estrutura completa de treinamento', () => {
  for (const code of ['PEDAGOGICAL_PROJECT','COURSE_STRUCTURE','DELIVERY_EVIDENCE','LEARNING_ASSESSMENT','CERTIFICATES','COMPETENCY_MATRIX']) assert.match(sections,new RegExp(code));
});

test('copiloto recebe panorama e auditoria sem emitir certificados ou aprovar prática', () => {
  assert.match(aiCatalog,/get_training_overview/); assert.match(aiCatalog,/run_training_audit/);
  assert.match(aiTools,/getTrainingOverview/); assert.match(aiTools,/runTrainingAudit/);
  assert.doesNotMatch(aiCatalog,/issue_training_certificate|approve_practical|revoke_certificate|set_competency_valid/i);
});

test('módulos permanecem atrás de feature flags desativadas por padrão', () => {
  for (const flag of ['FEATURE_CORPORATE_UNIVERSITY','FEATURE_TRAINING_ASSESSMENTS','FEATURE_COMPETENCY_MATRIX','FEATURE_TRAINING_CERTIFICATES']) assert.match(env,new RegExp(`${flag}: booleanFromString\\.default\\(false\\)`));
});


test('matrículas e turmas pertencem ao programa correto e não vazam entre ciclos anuais', () => {
  assert.match(schema, /model TrainingEnrollment \{[\s\S]*trainingProgramId[\s\S]*trainingProgram\s+TrainingProgram/);
  assert.match(schema, /model TrainingSession \{[\s\S]*trainingProgramId[\s\S]*trainingProgram\s+TrainingProgram/);
  assert.match(lib, /trainingProgramId: program\.id/);
  assert.match(lib, /trainingProgramId: program\?\.id \?\? '__none__'/);
});

test('curso publicado é imutável e exige nova versão para alterações', () => {
  assert.match(lib, /Curso publicado é imutável; crie uma nova versão/);
  assert.match(lib, /version: \(existingVersion\?\.version \?\? 0\) \+ 1/);
});

test('acesso individual usa token aleatório armazenado somente como hash e com validade', () => {
  assert.match(schema, /accessTokenHash\s+String\?\s+@unique/);
  assert.match(schema, /accessTokenExpiresAt\s+DateTime\?/);
  assert.match(lib, /randomToken\(32\)/);
  assert.match(lib, /accessTokenHash: sha256\(token\)/);
  assert.match(accessRoute, /authorizeTenantApi\('training\.manage'\)/);
});

test('portal do aluno entrega aulas, avaliações e materiais sem expor resposta correta', () => {
  assert.match(learnerPage, /Universidade Corporativa/);
  assert.match(lessonPage, /Material protegido|Abrir material protegido/);
  assert.match(publicAssessmentRoute, /submitPublicTrainingAssessment/);
  assert.match(publicMaterialRoute, /publicTrainingEnrollment/);
  assert.doesNotMatch(learnerPage, /correctAnswer/);
});

test('tempo ativo usa heartbeat real e não atribui duração estimada como presença', () => {
  assert.match(learnerClient, /60_000/);
  assert.match(learnerClient, /LESSON_HEARTBEAT|completed', 'false'/);
  assert.doesNotMatch(learnerPage, /estimatedMinutes\*60/);
});

test('questões discursivas possuem revisão humana separada', () => {
  assert.match(lib, /reviewTrainingAssessmentAttempt/);
  assert.match(lib, /PENDING_MANUAL_REVIEW/);
  assert.match(reviewRoute, /authorizeTenantApi\('training\.evaluate'\)/);
  assert.match(reviewRoute, /TRAINING_ASSESSMENT_REVIEWED/);
});

test('certificados podem ser revogados com motivo e invalidam competências derivadas', () => {
  assert.match(lib, /revokeTrainingCertificate/);
  assert.match(lib, /workerCompetency\.updateMany/);
  assert.match(revokeRoute, /authorizeTenantApi\('training\.certificate\.issue'\)/);
  assert.match(revokeRoute, /TRAINING_CERTIFICATE_REVOKED/);
});

test('endpoints públicos aplicam token, limite de requisições e não liberam decisão técnica', () => {
  assert.match(publicAssessmentRoute, /checkRateLimit/);
  assert.match(publicAssessmentRoute, /publicTrainingEnrollment/);
  assert.doesNotMatch(publicAssessmentRoute, /training\.certificate\.issue|savePracticalEvaluation/);
});
