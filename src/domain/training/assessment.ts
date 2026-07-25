export type AssessmentQuestionInput = {
  id: string;
  type: 'SINGLE_CHOICE' | 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'SHORT_TEXT';
  correctAnswer: unknown;
  weight?: number;
};

export type AssessmentScore = {
  score: number | null;
  passed: boolean | null;
  manualReviewRequired: boolean;
  objectiveWeight: number;
  totalWeight: number;
  details: Array<{ questionId: string; correct: boolean | null; earned: number; weight: number }>;
};

const normalizeScalar = (value: unknown) => String(value ?? '').trim().toLowerCase();
const normalizeArray = (value: unknown) => (Array.isArray(value) ? value : [value]).map(normalizeScalar).filter(Boolean).sort();

export function scoreAssessment(input: { questions: AssessmentQuestionInput[]; answers: Record<string, unknown>; passingScore: number }): AssessmentScore {
  if (!input.questions.length) return { score: null, passed: null, manualReviewRequired: true, objectiveWeight: 0, totalWeight: 0, details: [] };
  let earned = 0;
  let objectiveWeight = 0;
  let totalWeight = 0;
  let manualReviewRequired = false;
  const details = input.questions.map((question) => {
    const weight = Number.isFinite(question.weight) && Number(question.weight) > 0 ? Number(question.weight) : 1;
    totalWeight += weight;
    if (question.type === 'SHORT_TEXT') {
      manualReviewRequired = true;
      return { questionId: question.id, correct: null, earned: 0, weight };
    }
    objectiveWeight += weight;
    const answer = input.answers[question.id];
    const correct = question.type === 'MULTIPLE_CHOICE'
      ? JSON.stringify(normalizeArray(answer)) === JSON.stringify(normalizeArray(question.correctAnswer))
      : normalizeScalar(answer) === normalizeScalar(question.correctAnswer);
    if (correct) earned += weight;
    return { questionId: question.id, correct, earned: correct ? weight : 0, weight };
  });
  if (manualReviewRequired) return { score: null, passed: null, manualReviewRequired: true, objectiveWeight, totalWeight, details };
  const score = totalWeight > 0 ? Math.round((earned / totalWeight) * 10000) / 100 : 0;
  return { score, passed: score >= input.passingScore, manualReviewRequired: false, objectiveWeight, totalWeight, details };
}

export function calculateTrainingProgress(input: { mandatoryLessons: number; completedMandatoryLessons: number; mandatoryAssessments: number; passedAssessments: number; practicalRequired: boolean; practicalApproved: boolean }): number {
  const lessonWeight = input.mandatoryLessons > 0 ? 60 : 0;
  const assessmentWeight = input.mandatoryAssessments > 0 ? 30 : 0;
  const practicalWeight = input.practicalRequired ? 10 : 0;
  const totalWeight = lessonWeight + assessmentWeight + practicalWeight || 100;
  const lessonPart = input.mandatoryLessons > 0 ? (Math.min(input.completedMandatoryLessons, input.mandatoryLessons) / input.mandatoryLessons) * lessonWeight : 0;
  const assessmentPart = input.mandatoryAssessments > 0 ? (Math.min(input.passedAssessments, input.mandatoryAssessments) / input.mandatoryAssessments) * assessmentWeight : 0;
  const practicalPart = input.practicalRequired && input.practicalApproved ? practicalWeight : 0;
  return Math.max(0, Math.min(100, Math.round(((lessonPart + assessmentPart + practicalPart) / totalWeight) * 100)));
}

export function nextAttemptNumber(previousAttempts: number, maxAttempts: number): number {
  if (!Number.isInteger(previousAttempts) || previousAttempts < 0) throw new Error('Quantidade anterior de tentativas inválida.');
  if (!Number.isInteger(maxAttempts) || maxAttempts < 1) throw new Error('Limite de tentativas inválido.');
  if (previousAttempts >= maxAttempts) throw new Error('Limite de tentativas atingido.');
  return previousAttempts + 1;
}
