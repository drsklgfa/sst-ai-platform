declare module '@prisma/client' {
  export namespace Prisma {
    export type JsonPrimitive = string | number | boolean | null;
    export type JsonObject = { [Key in string]?: JsonValue };
    export interface JsonArray extends Array<JsonValue> {}
    export type JsonValue = JsonPrimitive | JsonObject | JsonArray;
    export type InputJsonObject = { readonly [Key in string]?: InputJsonValue | null };
    export interface InputJsonArray extends ReadonlyArray<InputJsonValue | null> {}
    export type InputJsonValue = string | number | boolean | InputJsonObject | InputJsonArray | { toJSON(): unknown };
    export const JsonNull: unique symbol;
    export const DbNull: unique symbol;
    export const AnyNull: unique symbol;
    export type JsonNull = typeof JsonNull;
    export type NullableJsonNullValueInput = typeof DbNull | typeof JsonNull;
    export type TransactionClient = PrismaClient;
    export type SortOrder = 'asc' | 'desc';
    export class PrismaClientKnownRequestError extends Error { code: string; meta?: unknown }
  }
  export const MembershipRole: { readonly OWNER: 'OWNER'; readonly ADMIN: 'ADMIN'; readonly RESPONSIBLE_TECH: 'RESPONSIBLE_TECH'; readonly OCCUPATIONAL_PHYSICIAN: 'OCCUPATIONAL_PHYSICIAN'; readonly MEDICAL_ASSISTANT: 'MEDICAL_ASSISTANT'; readonly CONSULTANT: 'CONSULTANT'; readonly ASSISTANT: 'ASSISTANT'; readonly REVIEWER: 'REVIEWER'; readonly COMMERCIAL: 'COMMERCIAL'; readonly FINANCE: 'FINANCE'; readonly READER: 'READER' };
  export type MembershipRole = (typeof MembershipRole)[keyof typeof MembershipRole];
  export const CompanyUserRole: { readonly RH_ADMIN: 'RH_ADMIN'; readonly SST: 'SST'; readonly MANAGER: 'MANAGER'; readonly ACTION_OWNER: 'ACTION_OWNER'; readonly DIRECTOR: 'DIRECTOR'; readonly READER: 'READER'; readonly AUDITOR: 'AUDITOR' };
  export type CompanyUserRole = (typeof CompanyUserRole)[keyof typeof CompanyUserRole];
  export const CompanyStatus: { readonly ACTIVE: 'ACTIVE'; readonly INACTIVE: 'INACTIVE'; readonly ARCHIVED: 'ARCHIVED' };
  export type CompanyStatus = (typeof CompanyStatus)[keyof typeof CompanyStatus];
  export const CampaignStatus: { readonly DRAFT: 'DRAFT'; readonly SCHEDULED: 'SCHEDULED'; readonly ACTIVE: 'ACTIVE'; readonly PAUSED: 'PAUSED'; readonly CLOSED: 'CLOSED'; readonly REOPENED: 'REOPENED'; readonly ARCHIVED: 'ARCHIVED'; readonly CANCELLED: 'CANCELLED' };
  export type CampaignStatus = (typeof CampaignStatus)[keyof typeof CampaignStatus];
  export const QuestionType: { readonly YES_NO: 'YES_NO'; readonly SINGLE_CHOICE: 'SINGLE_CHOICE'; readonly MULTI_CHOICE: 'MULTI_CHOICE'; readonly LIKERT: 'LIKERT'; readonly NUMBER: 'NUMBER'; readonly TEXT: 'TEXT'; readonly LONG_TEXT: 'LONG_TEXT'; readonly DATE: 'DATE'; readonly BODY_MAP: 'BODY_MAP'; readonly MATRIX: 'MATRIX'; readonly FILE: 'FILE' };
  export type QuestionType = (typeof QuestionType)[keyof typeof QuestionType];
  export const ResponseStatus: { readonly STARTED: 'STARTED'; readonly SUBMITTED: 'SUBMITTED'; readonly INVALIDATED: 'INVALIDATED' };
  export type ResponseStatus = (typeof ResponseStatus)[keyof typeof ResponseStatus];
  export const InspectionStatus: { readonly DRAFT: 'DRAFT'; readonly IN_PROGRESS: 'IN_PROGRESS'; readonly COMPLETED: 'COMPLETED'; readonly REVIEWED: 'REVIEWED' };
  export type InspectionStatus = (typeof InspectionStatus)[keyof typeof InspectionStatus];
  export const RiskLevel: { readonly VERY_LOW: 'VERY_LOW'; readonly LOW: 'LOW'; readonly MODERATE: 'MODERATE'; readonly HIGH: 'HIGH'; readonly CRITICAL: 'CRITICAL' };
  export type RiskLevel = (typeof RiskLevel)[keyof typeof RiskLevel];
  export const InspectionEvidenceKind: { readonly PHOTO: 'PHOTO'; readonly DOCUMENT: 'DOCUMENT'; readonly MEASUREMENT: 'MEASUREMENT'; readonly OTHER: 'OTHER' };
  export type InspectionEvidenceKind = (typeof InspectionEvidenceKind)[keyof typeof InspectionEvidenceKind];
  export const ActionStatus: { readonly DRAFT: 'DRAFT'; readonly PENDING_APPROVAL: 'PENDING_APPROVAL'; readonly NOT_STARTED: 'NOT_STARTED'; readonly IN_PROGRESS: 'IN_PROGRESS'; readonly WAITING_EVIDENCE: 'WAITING_EVIDENCE'; readonly WAITING_VALIDATION: 'WAITING_VALIDATION'; readonly COMPLETED: 'COMPLETED'; readonly PARTIAL: 'PARTIAL'; readonly REJECTED: 'REJECTED'; readonly CANCELLED: 'CANCELLED'; readonly OVERDUE: 'OVERDUE'; readonly EFFECTIVENESS_VERIFIED: 'EFFECTIVENESS_VERIFIED' };
  export type ActionStatus = (typeof ActionStatus)[keyof typeof ActionStatus];
  export const DocumentStatus: { readonly DRAFT: 'DRAFT'; readonly REVIEW: 'REVIEW'; readonly PREVIEW: 'PREVIEW'; readonly WAITING_DOCUMENTS: 'WAITING_DOCUMENTS'; readonly WAITING_SIGNATURE: 'WAITING_SIGNATURE'; readonly ISSUED_UNSIGNED: 'ISSUED_UNSIGNED'; readonly ISSUED_SIGNED: 'ISSUED_SIGNED'; readonly REPLACED: 'REPLACED'; readonly CANCELLED: 'CANCELLED'; readonly ARCHIVED: 'ARCHIVED' };
  export type DocumentStatus = (typeof DocumentStatus)[keyof typeof DocumentStatus];
  export const SignatureMethod: { readonly INTERNAL: 'INTERNAL'; readonly EXTERNAL_UPLOAD: 'EXTERNAL_UPLOAD'; readonly PROVIDER: 'PROVIDER'; readonly CERTIFICATE: 'CERTIFICATE'; readonly NONE: 'NONE' };
  export type SignatureMethod = (typeof SignatureMethod)[keyof typeof SignatureMethod];
  export const ConversationStatus: { readonly NEW: 'NEW'; readonly IN_PROGRESS: 'IN_PROGRESS'; readonly WAITING_COMPANY: 'WAITING_COMPANY'; readonly WAITING_CONSULTANT: 'WAITING_CONSULTANT'; readonly RESOLVED: 'RESOLVED'; readonly ARCHIVED: 'ARCHIVED'; readonly REOPENED: 'REOPENED' };
  export type ConversationStatus = (typeof ConversationStatus)[keyof typeof ConversationStatus];
  export const MessageChannel: { readonly PORTAL: 'PORTAL'; readonly EMAIL: 'EMAIL'; readonly WHATSAPP: 'WHATSAPP'; readonly SYSTEM: 'SYSTEM' };
  export type MessageChannel = (typeof MessageChannel)[keyof typeof MessageChannel];
  export const NotificationType: { readonly MESSAGE: 'MESSAGE'; readonly EVIDENCE: 'EVIDENCE'; readonly REPORT: 'REPORT'; readonly ACTION: 'ACTION'; readonly CAMPAIGN: 'CAMPAIGN'; readonly BACKUP: 'BACKUP'; readonly ACCESS: 'ACCESS'; readonly JOB: 'JOB'; readonly SYSTEM: 'SYSTEM' };
  export type NotificationType = (typeof NotificationType)[keyof typeof NotificationType];
  export const JobStatus: { readonly QUEUED: 'QUEUED'; readonly RUNNING: 'RUNNING'; readonly SUCCEEDED: 'SUCCEEDED'; readonly FAILED: 'FAILED'; readonly CANCELLED: 'CANCELLED' };
  export type JobStatus = (typeof JobStatus)[keyof typeof JobStatus];
  export const FileVisibility: { readonly PRIVATE: 'PRIVATE'; readonly COMPANY: 'COMPANY'; readonly PUBLIC_VERIFICATION: 'PUBLIC_VERIFICATION' };
  export type FileVisibility = (typeof FileVisibility)[keyof typeof FileVisibility];
  export const BackupType: { readonly COMPANY_FULL: 'COMPANY_FULL'; readonly COMPANY_DATA: 'COMPANY_DATA'; readonly PLATFORM_FULL: 'PLATFORM_FULL'; readonly PLATFORM_DATA: 'PLATFORM_DATA'; readonly DOCUMENTS_ONLY: 'DOCUMENTS_ONLY' };
  export type BackupType = (typeof BackupType)[keyof typeof BackupType];
  export const IntegrationProvider: { readonly DISABLED: 'DISABLED'; readonly SMTP: 'SMTP'; readonly RESEND: 'RESEND'; readonly OPENAI: 'OPENAI'; readonly GEMINI: 'GEMINI'; readonly WHATSAPP_CLOUD: 'WHATSAPP_CLOUD'; readonly CUSTOM: 'CUSTOM' };
  export type IntegrationProvider = (typeof IntegrationProvider)[keyof typeof IntegrationProvider];
  export const ServiceStatus: { readonly PROPOSAL: 'PROPOSAL'; readonly CONTRACTED: 'CONTRACTED'; readonly IN_PROGRESS: 'IN_PROGRESS'; readonly WAITING_CLIENT: 'WAITING_CLIENT'; readonly DELIVERED: 'DELIVERED'; readonly COMPLETED: 'COMPLETED'; readonly SUSPENDED: 'SUSPENDED'; readonly CANCELLED: 'CANCELLED'; readonly EXPIRED: 'EXPIRED' };
  export type ServiceStatus = (typeof ServiceStatus)[keyof typeof ServiceStatus];
  export const IncidentSeverity: { readonly LOW: 'LOW'; readonly MEDIUM: 'MEDIUM'; readonly HIGH: 'HIGH'; readonly CRITICAL: 'CRITICAL' };
  export type IncidentSeverity = (typeof IncidentSeverity)[keyof typeof IncidentSeverity];
  export const IncidentStatus: { readonly OPEN: 'OPEN'; readonly INVESTIGATING: 'INVESTIGATING'; readonly CONTAINED: 'CONTAINED'; readonly RESOLVED: 'RESOLVED'; readonly CLOSED: 'CLOSED' };
  export type IncidentStatus = (typeof IncidentStatus)[keyof typeof IncidentStatus];
  export const RecoveryTestStatus: { readonly QUEUED: 'QUEUED'; readonly RUNNING: 'RUNNING'; readonly PASSED: 'PASSED'; readonly FAILED: 'FAILED' };
  export type RecoveryTestStatus = (typeof RecoveryTestStatus)[keyof typeof RecoveryTestStatus];
  export const WorkProjectStatus: { readonly DRAFT: 'DRAFT'; readonly ACTIVE: 'ACTIVE'; readonly WAITING_INPUT: 'WAITING_INPUT'; readonly WAITING_APPROVAL: 'WAITING_APPROVAL'; readonly IN_REVIEW: 'IN_REVIEW'; readonly COMPLETED: 'COMPLETED'; readonly CANCELLED: 'CANCELLED'; readonly ARCHIVED: 'ARCHIVED' };
  export type WorkProjectStatus = (typeof WorkProjectStatus)[keyof typeof WorkProjectStatus];
  export const WorkflowStepStatus: { readonly NOT_STARTED: 'NOT_STARTED'; readonly IN_PROGRESS: 'IN_PROGRESS'; readonly BLOCKED: 'BLOCKED'; readonly COMPLETED: 'COMPLETED'; readonly NOT_APPLICABLE: 'NOT_APPLICABLE' };
  export type WorkflowStepStatus = (typeof WorkflowStepStatus)[keyof typeof WorkflowStepStatus];
  export const WorkRequirementStatus: { readonly PENDING: 'PENDING'; readonly SATISFIED: 'SATISFIED'; readonly WAIVED: 'WAIVED'; readonly BLOCKED: 'BLOCKED' };
  export type WorkRequirementStatus = (typeof WorkRequirementStatus)[keyof typeof WorkRequirementStatus];
  export const ApprovalStatus: { readonly PENDING: 'PENDING'; readonly APPROVED: 'APPROVED'; readonly REJECTED: 'REJECTED'; readonly CANCELLED: 'CANCELLED'; readonly EXPIRED: 'EXPIRED' };
  export type ApprovalStatus = (typeof ApprovalStatus)[keyof typeof ApprovalStatus];
  export const ChangeSetStatus: { readonly DRAFT: 'DRAFT'; readonly PENDING_APPROVAL: 'PENDING_APPROVAL'; readonly APPLIED: 'APPLIED'; readonly REVERTED: 'REVERTED'; readonly REJECTED: 'REJECTED'; readonly FAILED: 'FAILED' };
  export type ChangeSetStatus = (typeof ChangeSetStatus)[keyof typeof ChangeSetStatus];
  export const AIThreadStatus: { readonly ACTIVE: 'ACTIVE'; readonly PAUSED: 'PAUSED'; readonly COMPLETED: 'COMPLETED'; readonly ARCHIVED: 'ARCHIVED' };
  export type AIThreadStatus = (typeof AIThreadStatus)[keyof typeof AIThreadStatus];
  export const AIMessageRole: { readonly SYSTEM: 'SYSTEM'; readonly USER: 'USER'; readonly ASSISTANT: 'ASSISTANT'; readonly TOOL: 'TOOL' };
  export type AIMessageRole = (typeof AIMessageRole)[keyof typeof AIMessageRole];
  export const AIToolExecutionStatus: { readonly PLANNED: 'PLANNED'; readonly WAITING_APPROVAL: 'WAITING_APPROVAL'; readonly RUNNING: 'RUNNING'; readonly SUCCEEDED: 'SUCCEEDED'; readonly FAILED: 'FAILED'; readonly CANCELLED: 'CANCELLED' };
  export type AIToolExecutionStatus = (typeof AIToolExecutionStatus)[keyof typeof AIToolExecutionStatus];
  export const AIAutonomyMode: { readonly ASSISTANT: 'ASSISTANT'; readonly COPILOT: 'COPILOT'; readonly SUPERVISED_AUTONOMY: 'SUPERVISED_AUTONOMY' };
  export type AIAutonomyMode = (typeof AIAutonomyMode)[keyof typeof AIAutonomyMode];
  export const AIRiskLevel: { readonly LOW: 'LOW'; readonly MEDIUM: 'MEDIUM'; readonly HIGH: 'HIGH'; readonly CRITICAL: 'CRITICAL' };
  export type AIRiskLevel = (typeof AIRiskLevel)[keyof typeof AIRiskLevel];
  export const LegacyImportStatus: { readonly DRAFT: 'DRAFT'; readonly QUEUED: 'QUEUED'; readonly ANALYZING: 'ANALYZING'; readonly REVIEW: 'REVIEW'; readonly READY: 'READY'; readonly IMPORTING: 'IMPORTING'; readonly COMPLETED: 'COMPLETED'; readonly FAILED: 'FAILED'; readonly CANCELLED: 'CANCELLED' };
  export type LegacyImportStatus = (typeof LegacyImportStatus)[keyof typeof LegacyImportStatus];
  export const LegacyDocumentStatus: { readonly UPLOADED: 'UPLOADED'; readonly QUEUED: 'QUEUED'; readonly ANALYZING: 'ANALYZING'; readonly REVIEW: 'REVIEW'; readonly APPROVED: 'APPROVED'; readonly REJECTED: 'REJECTED'; readonly FAILED: 'FAILED' };
  export type LegacyDocumentStatus = (typeof LegacyDocumentStatus)[keyof typeof LegacyDocumentStatus];
  export const LegacyDocumentKind: { readonly UNKNOWN: 'UNKNOWN'; readonly PGR: 'PGR'; readonly PCMSO: 'PCMSO'; readonly LTCAT: 'LTCAT'; readonly INSALUBRIDADE: 'INSALUBRIDADE'; readonly PERICULOSIDADE: 'PERICULOSIDADE'; readonly AET: 'AET'; readonly AEP: 'AEP'; readonly HIGIENE_OCUPACIONAL: 'HIGIENE_OCUPACIONAL'; readonly INVENTARIO_RISCOS: 'INVENTARIO_RISCOS'; readonly PLANO_ACAO: 'PLANO_ACAO'; readonly ASO: 'ASO'; readonly PPP: 'PPP'; readonly ORDEM_SERVICO: 'ORDEM_SERVICO'; readonly TREINAMENTO: 'TREINAMENTO'; readonly OUTRO: 'OUTRO' };
  export type LegacyDocumentKind = (typeof LegacyDocumentKind)[keyof typeof LegacyDocumentKind];
  export const LegacyFactStatus: { readonly EXTRACTED: 'EXTRACTED'; readonly NEEDS_REVIEW: 'NEEDS_REVIEW'; readonly APPROVED: 'APPROVED'; readonly REJECTED: 'REJECTED'; readonly APPLIED: 'APPLIED' };
  export type LegacyFactStatus = (typeof LegacyFactStatus)[keyof typeof LegacyFactStatus];
  export const LegacyConflictStatus: { readonly OPEN: 'OPEN'; readonly RESOLVED: 'RESOLVED'; readonly IGNORED: 'IGNORED' };
  export type LegacyConflictStatus = (typeof LegacyConflictStatus)[keyof typeof LegacyConflictStatus];
  export const FieldVisitStatus: { readonly DRAFT: 'DRAFT'; readonly IN_PROGRESS: 'IN_PROGRESS'; readonly PAUSED: 'PAUSED'; readonly COMPLETED: 'COMPLETED'; readonly REVIEWED: 'REVIEWED'; readonly CANCELLED: 'CANCELLED' };
  export type FieldVisitStatus = (typeof FieldVisitStatus)[keyof typeof FieldVisitStatus];
  export const FieldCaptureKind: { readonly PHOTO: 'PHOTO'; readonly VIDEO: 'VIDEO'; readonly AUDIO: 'AUDIO'; readonly DOCUMENT: 'DOCUMENT'; readonly NOTE: 'NOTE'; readonly MEASUREMENT: 'MEASUREMENT' };
  export type FieldCaptureKind = (typeof FieldCaptureKind)[keyof typeof FieldCaptureKind];
  export const FieldCaptureStatus: { readonly CAPTURED: 'CAPTURED'; readonly QUEUED: 'QUEUED'; readonly ANALYZING: 'ANALYZING'; readonly REVIEW: 'REVIEW'; readonly READY: 'READY'; readonly FAILED: 'FAILED'; readonly REJECTED: 'REJECTED' };
  export type FieldCaptureStatus = (typeof FieldCaptureStatus)[keyof typeof FieldCaptureStatus];
  export const AIAttachmentKind: { readonly IMAGE: 'IMAGE'; readonly AUDIO: 'AUDIO'; readonly DOCUMENT: 'DOCUMENT'; readonly SPREADSHEET: 'SPREADSHEET'; readonly TEXT: 'TEXT'; readonly OTHER: 'OTHER' };
  export type AIAttachmentKind = (typeof AIAttachmentKind)[keyof typeof AIAttachmentKind];
  export const AIAttachmentStatus: { readonly UPLOADED: 'UPLOADED'; readonly ANALYZING: 'ANALYZING'; readonly READY: 'READY'; readonly FAILED: 'FAILED' };
  export type AIAttachmentStatus = (typeof AIAttachmentStatus)[keyof typeof AIAttachmentStatus];
  export const ExposureProgramStatus: { readonly DRAFT: 'DRAFT'; readonly IN_PROGRESS: 'IN_PROGRESS'; readonly REVIEW: 'REVIEW'; readonly APPROVED: 'APPROVED'; readonly ARCHIVED: 'ARCHIVED' };
  export type ExposureProgramStatus = (typeof ExposureProgramStatus)[keyof typeof ExposureProgramStatus];
  export const ExposurePurpose: { readonly LTCAT: 'LTCAT'; readonly INSALUBRIDADE: 'INSALUBRIDADE'; readonly PERICULOSIDADE: 'PERICULOSIDADE'; readonly HIGIENE_OCUPACIONAL: 'HIGIENE_OCUPACIONAL' };
  export type ExposurePurpose = (typeof ExposurePurpose)[keyof typeof ExposurePurpose];
  export const ExposurePeriodStatus: { readonly DRAFT: 'DRAFT'; readonly ACTIVE: 'ACTIVE'; readonly CLOSED: 'CLOSED'; readonly SUPERSEDED: 'SUPERSEDED'; readonly ARCHIVED: 'ARCHIVED' };
  export type ExposurePeriodStatus = (typeof ExposurePeriodStatus)[keyof typeof ExposurePeriodStatus];
  export const ExposureAgentCategory: { readonly PHYSICAL: 'PHYSICAL'; readonly CHEMICAL: 'CHEMICAL'; readonly BIOLOGICAL: 'BIOLOGICAL'; readonly ERGONOMIC: 'ERGONOMIC'; readonly PSYCHOSOCIAL: 'PSYCHOSOCIAL'; readonly ACCIDENT: 'ACCIDENT'; readonly DANGEROUS_CONDITION: 'DANGEROUS_CONDITION'; readonly OTHER: 'OTHER' };
  export type ExposureAgentCategory = (typeof ExposureAgentCategory)[keyof typeof ExposureAgentCategory];
  export const ExposureAssessmentMethod: { readonly QUALITATIVE: 'QUALITATIVE'; readonly QUANTITATIVE: 'QUANTITATIVE'; readonly MIXED: 'MIXED' };
  export type ExposureAssessmentMethod = (typeof ExposureAssessmentMethod)[keyof typeof ExposureAssessmentMethod];
  export const ExposurePattern: { readonly PERMANENT: 'PERMANENT'; readonly INTERMITTENT: 'INTERMITTENT'; readonly OCCASIONAL: 'OCCASIONAL'; readonly EVENTUAL: 'EVENTUAL'; readonly UNKNOWN: 'UNKNOWN' };
  export type ExposurePattern = (typeof ExposurePattern)[keyof typeof ExposurePattern];
  export const ExposureControlType: { readonly EPC: 'EPC'; readonly EPI: 'EPI'; readonly ADMINISTRATIVE: 'ADMINISTRATIVE'; readonly COLLECTIVE_ORGANIZATIONAL: 'COLLECTIVE_ORGANIZATIONAL' };
  export type ExposureControlType = (typeof ExposureControlType)[keyof typeof ExposureControlType];
  export const ControlEffectiveness: { readonly UNKNOWN: 'UNKNOWN'; readonly EFFECTIVE: 'EFFECTIVE'; readonly PARTIAL: 'PARTIAL'; readonly INEFFECTIVE: 'INEFFECTIVE'; readonly NOT_APPLICABLE: 'NOT_APPLICABLE' };
  export type ControlEffectiveness = (typeof ControlEffectiveness)[keyof typeof ControlEffectiveness];
  export const TechnicalConclusionStatus: { readonly DRAFT: 'DRAFT'; readonly REVIEW: 'REVIEW'; readonly APPROVED: 'APPROVED'; readonly REJECTED: 'REJECTED'; readonly ARCHIVED: 'ARCHIVED' };
  export type TechnicalConclusionStatus = (typeof TechnicalConclusionStatus)[keyof typeof TechnicalConclusionStatus];
  export const LtcatExposureConclusion: { readonly NO_SPECIAL_EXPOSURE: 'NO_SPECIAL_EXPOSURE'; readonly SPECIAL_EXPOSURE_15_YEARS: 'SPECIAL_EXPOSURE_15_YEARS'; readonly SPECIAL_EXPOSURE_20_YEARS: 'SPECIAL_EXPOSURE_20_YEARS'; readonly SPECIAL_EXPOSURE_25_YEARS: 'SPECIAL_EXPOSURE_25_YEARS'; readonly NEEDS_REVIEW: 'NEEDS_REVIEW' };
  export type LtcatExposureConclusion = (typeof LtcatExposureConclusion)[keyof typeof LtcatExposureConclusion];
  export const InsalubrityDegree: { readonly NONE: 'NONE'; readonly MINIMUM: 'MINIMUM'; readonly MEDIUM: 'MEDIUM'; readonly MAXIMUM: 'MAXIMUM'; readonly NEEDS_REVIEW: 'NEEDS_REVIEW' };
  export type InsalubrityDegree = (typeof InsalubrityDegree)[keyof typeof InsalubrityDegree];
  export const DangerousConditionCategory: { readonly EXPLOSIVES: 'EXPLOSIVES'; readonly FLAMMABLES: 'FLAMMABLES'; readonly ROBBERY_VIOLENCE: 'ROBBERY_VIOLENCE'; readonly ELECTRICITY: 'ELECTRICITY'; readonly MOTORCYCLE: 'MOTORCYCLE'; readonly IONIZING_RADIATION: 'IONIZING_RADIATION'; readonly TRAFFIC_AGENT: 'TRAFFIC_AGENT'; readonly OTHER: 'OTHER' };
  export type DangerousConditionCategory = (typeof DangerousConditionCategory)[keyof typeof DangerousConditionCategory];
  export const DangerousConclusion: { readonly NOT_CHARACTERIZED: 'NOT_CHARACTERIZED'; readonly CHARACTERIZED: 'CHARACTERIZED'; readonly NEEDS_REVIEW: 'NEEDS_REVIEW' };
  export type DangerousConclusion = (typeof DangerousConclusion)[keyof typeof DangerousConclusion];
  export const PppDraftStatus: { readonly DRAFT: 'DRAFT'; readonly REVIEW: 'REVIEW'; readonly READY: 'READY'; readonly ISSUED: 'ISSUED'; readonly ARCHIVED: 'ARCHIVED' };
  export type PppDraftStatus = (typeof PppDraftStatus)[keyof typeof PppDraftStatus];
  export const ExposureAuditStatus: { readonly PASSED: 'PASSED'; readonly PASSED_WITH_WARNINGS: 'PASSED_WITH_WARNINGS'; readonly FAILED: 'FAILED' };
  export type ExposureAuditStatus = (typeof ExposureAuditStatus)[keyof typeof ExposureAuditStatus];
  export const HygieneProgramStatus: { readonly DRAFT: 'DRAFT'; readonly IN_PROGRESS: 'IN_PROGRESS'; readonly REVIEW: 'REVIEW'; readonly APPROVED: 'APPROVED'; readonly ARCHIVED: 'ARCHIVED' };
  export type HygieneProgramStatus = (typeof HygieneProgramStatus)[keyof typeof HygieneProgramStatus];
  export const HygieneAgentCategory: { readonly NOISE: 'NOISE'; readonly HEAT: 'HEAT'; readonly WHOLE_BODY_VIBRATION: 'WHOLE_BODY_VIBRATION'; readonly HAND_ARM_VIBRATION: 'HAND_ARM_VIBRATION'; readonly ILLUMINANCE: 'ILLUMINANCE'; readonly CHEMICAL: 'CHEMICAL'; readonly PARTICULATE: 'PARTICULATE'; readonly BIOLOGICAL: 'BIOLOGICAL'; readonly COLD: 'COLD'; readonly HUMIDITY: 'HUMIDITY'; readonly RADIATION: 'RADIATION'; readonly OTHER: 'OTHER' };
  export type HygieneAgentCategory = (typeof HygieneAgentCategory)[keyof typeof HygieneAgentCategory];
  export const HygieneSamplingStrategy: { readonly PERSONAL: 'PERSONAL'; readonly AREA: 'AREA'; readonly TASK: 'TASK'; readonly SCREENING: 'SCREENING'; readonly CONFIRMATORY: 'CONFIRMATORY'; readonly DIRECT_READING: 'DIRECT_READING'; readonly INTEGRATED_SAMPLE: 'INTEGRATED_SAMPLE'; readonly OTHER: 'OTHER' };
  export type HygieneSamplingStrategy = (typeof HygieneSamplingStrategy)[keyof typeof HygieneSamplingStrategy];
  export const HygieneSamplingPlanStatus: { readonly DRAFT: 'DRAFT'; readonly PLANNED: 'PLANNED'; readonly IN_FIELD: 'IN_FIELD'; readonly PROCESSING: 'PROCESSING'; readonly REVIEW: 'REVIEW'; readonly APPROVED: 'APPROVED'; readonly CANCELLED: 'CANCELLED' };
  export type HygieneSamplingPlanStatus = (typeof HygieneSamplingPlanStatus)[keyof typeof HygieneSamplingPlanStatus];
  export const HygieneMeasurementStatus: { readonly DRAFT: 'DRAFT'; readonly COLLECTED: 'COLLECTED'; readonly CALCULATED: 'CALCULATED'; readonly REVIEW: 'REVIEW'; readonly APPROVED: 'APPROVED'; readonly REJECTED: 'REJECTED'; readonly INVALID: 'INVALID' };
  export type HygieneMeasurementStatus = (typeof HygieneMeasurementStatus)[keyof typeof HygieneMeasurementStatus];
  export const HygieneResultInterpretation: { readonly BELOW_ACTION_LEVEL: 'BELOW_ACTION_LEVEL'; readonly BETWEEN_ACTION_AND_LIMIT: 'BETWEEN_ACTION_AND_LIMIT'; readonly ABOVE_LIMIT: 'ABOVE_LIMIT'; readonly INCONCLUSIVE: 'INCONCLUSIVE'; readonly NOT_APPLICABLE: 'NOT_APPLICABLE' };
  export type HygieneResultInterpretation = (typeof HygieneResultInterpretation)[keyof typeof HygieneResultInterpretation];
  export const MeasurementInstrumentType: { readonly DOSIMETER: 'DOSIMETER'; readonly SOUND_LEVEL_METER: 'SOUND_LEVEL_METER'; readonly ACOUSTIC_CALIBRATOR: 'ACOUSTIC_CALIBRATOR'; readonly HEAT_STRESS_METER: 'HEAT_STRESS_METER'; readonly VIBRATION_METER: 'VIBRATION_METER'; readonly SAMPLING_PUMP: 'SAMPLING_PUMP'; readonly FLOW_CALIBRATOR: 'FLOW_CALIBRATOR'; readonly LUX_METER: 'LUX_METER'; readonly GAS_DETECTOR: 'GAS_DETECTOR'; readonly THERMOMETER: 'THERMOMETER'; readonly HYGROMETER: 'HYGROMETER'; readonly OTHER: 'OTHER' };
  export type MeasurementInstrumentType = (typeof MeasurementInstrumentType)[keyof typeof MeasurementInstrumentType];
  export const MeasurementInstrumentStatus: { readonly AVAILABLE: 'AVAILABLE'; readonly RESERVED: 'RESERVED'; readonly IN_USE: 'IN_USE'; readonly CALIBRATION: 'CALIBRATION'; readonly MAINTENANCE: 'MAINTENANCE'; readonly BLOCKED: 'BLOCKED'; readonly RETIRED: 'RETIRED' };
  export type MeasurementInstrumentStatus = (typeof MeasurementInstrumentStatus)[keyof typeof MeasurementInstrumentStatus];
  export const InstrumentCalibrationStatus: { readonly VALID: 'VALID'; readonly EXPIRING: 'EXPIRING'; readonly EXPIRED: 'EXPIRED'; readonly REJECTED: 'REJECTED'; readonly PENDING: 'PENDING' };
  export type InstrumentCalibrationStatus = (typeof InstrumentCalibrationStatus)[keyof typeof InstrumentCalibrationStatus];
  export const InstrumentEventType: { readonly ACQUIRED: 'ACQUIRED'; readonly RESERVED: 'RESERVED'; readonly CHECKED_OUT: 'CHECKED_OUT'; readonly RETURNED: 'RETURNED'; readonly CALIBRATED: 'CALIBRATED'; readonly MAINTENANCE: 'MAINTENANCE'; readonly TRANSFERRED: 'TRANSFERRED'; readonly BLOCKED: 'BLOCKED'; readonly RETIRED: 'RETIRED' };
  export type InstrumentEventType = (typeof InstrumentEventType)[keyof typeof InstrumentEventType];
  export const HygieneAuditStatus: { readonly PASSED: 'PASSED'; readonly PASSED_WITH_WARNINGS: 'PASSED_WITH_WARNINGS'; readonly FAILED: 'FAILED' };
  export type HygieneAuditStatus = (typeof HygieneAuditStatus)[keyof typeof HygieneAuditStatus];
  export const ErgonomicsProgramStatus: { readonly DRAFT: 'DRAFT'; readonly IN_PROGRESS: 'IN_PROGRESS'; readonly REVIEW: 'REVIEW'; readonly APPROVED: 'APPROVED'; readonly ARCHIVED: 'ARCHIVED' };
  export type ErgonomicsProgramStatus = (typeof ErgonomicsProgramStatus)[keyof typeof ErgonomicsProgramStatus];
  export const ErgonomicAssessmentStage: { readonly AEP: 'AEP'; readonly AET: 'AET' };
  export type ErgonomicAssessmentStage = (typeof ErgonomicAssessmentStage)[keyof typeof ErgonomicAssessmentStage];
  export const ErgonomicDemandSource: { readonly WORKER: 'WORKER'; readonly CIPA: 'CIPA'; readonly HEALTH_SURVEILLANCE: 'HEALTH_SURVEILLANCE'; readonly ACCIDENT_OR_INCIDENT: 'ACCIDENT_OR_INCIDENT'; readonly PROCESS_CHANGE: 'PROCESS_CHANGE'; readonly LEGAL_REQUIREMENT: 'LEGAL_REQUIREMENT'; readonly PGR: 'PGR'; readonly MANAGEMENT: 'MANAGEMENT'; readonly OTHER: 'OTHER' };
  export type ErgonomicDemandSource = (typeof ErgonomicDemandSource)[keyof typeof ErgonomicDemandSource];
  export const ErgonomicWorkDimension: { readonly PHYSICAL: 'PHYSICAL'; readonly COGNITIVE: 'COGNITIVE'; readonly ORGANIZATIONAL: 'ORGANIZATIONAL'; readonly PSYCHOSOCIAL: 'PSYCHOSOCIAL'; readonly ENVIRONMENTAL: 'ENVIRONMENTAL'; readonly ACCESSIBILITY: 'ACCESSIBILITY'; readonly OTHER: 'OTHER' };
  export type ErgonomicWorkDimension = (typeof ErgonomicWorkDimension)[keyof typeof ErgonomicWorkDimension];
  export const ErgonomicMethodType: { readonly RULA: 'RULA'; readonly REBA: 'REBA'; readonly NIOSH: 'NIOSH'; readonly STRAIN_INDEX: 'STRAIN_INDEX'; readonly OCRA_CHECKLIST: 'OCRA_CHECKLIST'; readonly ROSA: 'ROSA'; readonly QEC: 'QEC'; readonly SNOOK_CIRIELLO: 'SNOOK_CIRIELLO'; readonly MANUAL: 'MANUAL'; readonly CUSTOM: 'CUSTOM' };
  export type ErgonomicMethodType = (typeof ErgonomicMethodType)[keyof typeof ErgonomicMethodType];
  export const ErgonomicAssessmentStatus: { readonly DRAFT: 'DRAFT'; readonly CALCULATED: 'CALCULATED'; readonly REVIEW: 'REVIEW'; readonly APPROVED: 'APPROVED'; readonly REJECTED: 'REJECTED' };
  export type ErgonomicAssessmentStatus = (typeof ErgonomicAssessmentStatus)[keyof typeof ErgonomicAssessmentStatus];
  export const AepConclusion: { readonly NO_FURTHER_ACTION: 'NO_FURTHER_ACTION'; readonly IMPROVEMENT_ACTIONS: 'IMPROVEMENT_ACTIONS'; readonly AET_REQUIRED: 'AET_REQUIRED'; readonly INCONCLUSIVE: 'INCONCLUSIVE' };
  export type AepConclusion = (typeof AepConclusion)[keyof typeof AepConclusion];
  export const ErgonomicFindingStatus: { readonly IDENTIFIED: 'IDENTIFIED'; readonly VALIDATED: 'VALIDATED'; readonly DISMISSED: 'DISMISSED'; readonly ACTION_PLANNED: 'ACTION_PLANNED'; readonly CONTROLLED: 'CONTROLLED'; readonly ARCHIVED: 'ARCHIVED' };
  export type ErgonomicFindingStatus = (typeof ErgonomicFindingStatus)[keyof typeof ErgonomicFindingStatus];
  export const ErgonomicsAuditStatus: { readonly PASSED: 'PASSED'; readonly PASSED_WITH_WARNINGS: 'PASSED_WITH_WARNINGS'; readonly FAILED: 'FAILED' };
  export type ErgonomicsAuditStatus = (typeof ErgonomicsAuditStatus)[keyof typeof ErgonomicsAuditStatus];
  export const PgrProgramStatus: { readonly DRAFT: 'DRAFT'; readonly IN_PROGRESS: 'IN_PROGRESS'; readonly REVIEW: 'REVIEW'; readonly APPROVED: 'APPROVED'; readonly ARCHIVED: 'ARCHIVED' };
  export type PgrProgramStatus = (typeof PgrProgramStatus)[keyof typeof PgrProgramStatus];
  export const PgrRiskStatus: { readonly IDENTIFIED: 'IDENTIFIED'; readonly ASSESSED: 'ASSESSED'; readonly TREATMENT_PLANNED: 'TREATMENT_PLANNED'; readonly CONTROLLED: 'CONTROLLED'; readonly MONITORING: 'MONITORING'; readonly ARCHIVED: 'ARCHIVED' };
  export type PgrRiskStatus = (typeof PgrRiskStatus)[keyof typeof PgrRiskStatus];
  export const PgrHazardCategory: { readonly PHYSICAL: 'PHYSICAL'; readonly CHEMICAL: 'CHEMICAL'; readonly BIOLOGICAL: 'BIOLOGICAL'; readonly ERGONOMIC: 'ERGONOMIC'; readonly PSYCHOSOCIAL: 'PSYCHOSOCIAL'; readonly ACCIDENT: 'ACCIDENT'; readonly OTHER: 'OTHER' };
  export type PgrHazardCategory = (typeof PgrHazardCategory)[keyof typeof PgrHazardCategory];
  export const WorkerParticipationKind: { readonly INTERVIEW: 'INTERVIEW'; readonly WORKSHOP: 'WORKSHOP'; readonly CIPA: 'CIPA'; readonly CONSULTATION: 'CONSULTATION'; readonly CAMPAIGN: 'CAMPAIGN'; readonly OBSERVATION: 'OBSERVATION'; readonly FOCUS_GROUP: 'FOCUS_GROUP'; readonly OTHER: 'OTHER' };
  export type WorkerParticipationKind = (typeof WorkerParticipationKind)[keyof typeof WorkerParticipationKind];
  export const PsychosocialAssessmentStatus: { readonly DRAFT: 'DRAFT'; readonly COLLECTING: 'COLLECTING'; readonly CONSOLIDATING: 'CONSOLIDATING'; readonly REVIEW: 'REVIEW'; readonly APPROVED: 'APPROVED'; readonly CANCELLED: 'CANCELLED' };
  export type PsychosocialAssessmentStatus = (typeof PsychosocialAssessmentStatus)[keyof typeof PsychosocialAssessmentStatus];
  export const PgrFindingStatus: { readonly IDENTIFIED: 'IDENTIFIED'; readonly VALIDATED: 'VALIDATED'; readonly DISMISSED: 'DISMISSED'; readonly TREATMENT_PLANNED: 'TREATMENT_PLANNED' };
  export type PgrFindingStatus = (typeof PgrFindingStatus)[keyof typeof PgrFindingStatus];
  export const PgrAuditStatus: { readonly PASSED: 'PASSED'; readonly PASSED_WITH_WARNINGS: 'PASSED_WITH_WARNINGS'; readonly FAILED: 'FAILED' };
  export type PgrAuditStatus = (typeof PgrAuditStatus)[keyof typeof PgrAuditStatus];
  export const PcmsoProgramStatus: { readonly DRAFT: 'DRAFT'; readonly IN_PROGRESS: 'IN_PROGRESS'; readonly REVIEW: 'REVIEW'; readonly APPROVED: 'APPROVED'; readonly ARCHIVED: 'ARCHIVED' };
  export type PcmsoProgramStatus = (typeof PcmsoProgramStatus)[keyof typeof PcmsoProgramStatus];
  export const OccupationalWorkerStatus: { readonly ACTIVE: 'ACTIVE'; readonly LEAVE: 'LEAVE'; readonly TERMINATED: 'TERMINATED'; readonly ARCHIVED: 'ARCHIVED' };
  export type OccupationalWorkerStatus = (typeof OccupationalWorkerStatus)[keyof typeof OccupationalWorkerStatus];
  export const MedicalProviderKind: { readonly CLINIC: 'CLINIC'; readonly LABORATORY: 'LABORATORY'; readonly INTERNAL_SERVICE: 'INTERNAL_SERVICE'; readonly PARTNER: 'PARTNER'; readonly OTHER: 'OTHER' };
  export type MedicalProviderKind = (typeof MedicalProviderKind)[keyof typeof MedicalProviderKind];
  export const MedicalProfessionalRole: { readonly RESPONSIBLE_PHYSICIAN: 'RESPONSIBLE_PHYSICIAN'; readonly EXAMINING_PHYSICIAN: 'EXAMINING_PHYSICIAN'; readonly OCCUPATIONAL_NURSE: 'OCCUPATIONAL_NURSE'; readonly MEDICAL_ASSISTANT: 'MEDICAL_ASSISTANT' };
  export type MedicalProfessionalRole = (typeof MedicalProfessionalRole)[keyof typeof MedicalProfessionalRole];
  export const OccupationalExamType: { readonly ADMISSION: 'ADMISSION'; readonly PERIODIC: 'PERIODIC'; readonly RETURN_TO_WORK: 'RETURN_TO_WORK'; readonly RISK_CHANGE: 'RISK_CHANGE'; readonly POINT_MONITORING: 'POINT_MONITORING'; readonly TERMINATION: 'TERMINATION' };
  export type OccupationalExamType = (typeof OccupationalExamType)[keyof typeof OccupationalExamType];
  export const MedicalExamKind: { readonly CLINICAL: 'CLINICAL'; readonly COMPLEMENTARY: 'COMPLEMENTARY' };
  export type MedicalExamKind = (typeof MedicalExamKind)[keyof typeof MedicalExamKind];
  export const PcmsoCallStatus: { readonly DRAFT: 'DRAFT'; readonly SCHEDULED: 'SCHEDULED'; readonly NOTIFIED: 'NOTIFIED'; readonly CONFIRMED: 'CONFIRMED'; readonly COMPLETED: 'COMPLETED'; readonly NO_SHOW: 'NO_SHOW'; readonly CANCELLED: 'CANCELLED' };
  export type PcmsoCallStatus = (typeof PcmsoCallStatus)[keyof typeof PcmsoCallStatus];
  export const AsoStatus: { readonly DRAFT: 'DRAFT'; readonly REVIEW: 'REVIEW'; readonly ISSUED: 'ISSUED'; readonly CANCELLED: 'CANCELLED'; readonly ARCHIVED: 'ARCHIVED' };
  export type AsoStatus = (typeof AsoStatus)[keyof typeof AsoStatus];
  export const AsoFitnessResult: { readonly PENDING: 'PENDING'; readonly FIT: 'FIT'; readonly FIT_WITH_RESTRICTIONS: 'FIT_WITH_RESTRICTIONS'; readonly UNFIT: 'UNFIT' };
  export type AsoFitnessResult = (typeof AsoFitnessResult)[keyof typeof AsoFitnessResult];
  export const AsoExamResultStatus: { readonly PENDING: 'PENDING'; readonly COMPLETED: 'COMPLETED'; readonly ALTERED: 'ALTERED'; readonly NOT_APPLICABLE: 'NOT_APPLICABLE' };
  export type AsoExamResultStatus = (typeof AsoExamResultStatus)[keyof typeof AsoExamResultStatus];
  export const PcmsoReportStatus: { readonly DRAFT: 'DRAFT'; readonly REVIEW: 'REVIEW'; readonly APPROVED: 'APPROVED'; readonly ARCHIVED: 'ARCHIVED' };
  export type PcmsoReportStatus = (typeof PcmsoReportStatus)[keyof typeof PcmsoReportStatus];
  export const EsocialEventStatus: { readonly DRAFT: 'DRAFT'; readonly READY: 'READY'; readonly VALIDATED: 'VALIDATED'; readonly SENT: 'SENT'; readonly ACCEPTED: 'ACCEPTED'; readonly REJECTED: 'REJECTED'; readonly CANCELLED: 'CANCELLED' };
  export type EsocialEventStatus = (typeof EsocialEventStatus)[keyof typeof EsocialEventStatus];
  export const MedicalAccessAction: { readonly VIEW: 'VIEW'; readonly CREATE: 'CREATE'; readonly UPDATE: 'UPDATE'; readonly ISSUE: 'ISSUE'; readonly EXPORT: 'EXPORT'; readonly PREPARE_ESOCIAL: 'PREPARE_ESOCIAL' };
  export type MedicalAccessAction = (typeof MedicalAccessAction)[keyof typeof MedicalAccessAction];
  export const PcmsoAuditStatus: { readonly PASSED: 'PASSED'; readonly PASSED_WITH_WARNINGS: 'PASSED_WITH_WARNINGS'; readonly FAILED: 'FAILED' };
  export type PcmsoAuditStatus = (typeof PcmsoAuditStatus)[keyof typeof PcmsoAuditStatus];
  export const TrainingProgramStatus: { readonly DRAFT: 'DRAFT'; readonly ACTIVE: 'ACTIVE'; readonly IN_REVIEW: 'IN_REVIEW'; readonly APPROVED: 'APPROVED'; readonly ARCHIVED: 'ARCHIVED' };
  export type TrainingProgramStatus = (typeof TrainingProgramStatus)[keyof typeof TrainingProgramStatus];
  export const TrainingCourseStatus: { readonly DRAFT: 'DRAFT'; readonly IN_REVIEW: 'IN_REVIEW'; readonly PUBLISHED: 'PUBLISHED'; readonly ARCHIVED: 'ARCHIVED' };
  export type TrainingCourseStatus = (typeof TrainingCourseStatus)[keyof typeof TrainingCourseStatus];
  export const TrainingModality: { readonly PRESENTIAL: 'PRESENTIAL'; readonly LIVE_ONLINE: 'LIVE_ONLINE'; readonly E_LEARNING: 'E_LEARNING'; readonly BLENDED: 'BLENDED' };
  export type TrainingModality = (typeof TrainingModality)[keyof typeof TrainingModality];
  export const TrainingContentKind: { readonly TEXT: 'TEXT'; readonly VIDEO: 'VIDEO'; readonly AUDIO: 'AUDIO'; readonly PDF: 'PDF'; readonly PRESENTATION: 'PRESENTATION'; readonly EXTERNAL_LINK: 'EXTERNAL_LINK'; readonly LIVE_SESSION: 'LIVE_SESSION'; readonly PRACTICAL_ACTIVITY: 'PRACTICAL_ACTIVITY' };
  export type TrainingContentKind = (typeof TrainingContentKind)[keyof typeof TrainingContentKind];
  export const TrainingLessonStatus: { readonly NOT_STARTED: 'NOT_STARTED'; readonly IN_PROGRESS: 'IN_PROGRESS'; readonly COMPLETED: 'COMPLETED'; readonly WAIVED: 'WAIVED' };
  export type TrainingLessonStatus = (typeof TrainingLessonStatus)[keyof typeof TrainingLessonStatus];
  export const TrainingAssessmentType: { readonly DIAGNOSTIC: 'DIAGNOSTIC'; readonly THEORETICAL: 'THEORETICAL'; readonly PRACTICAL: 'PRACTICAL'; readonly RECERTIFICATION: 'RECERTIFICATION' };
  export type TrainingAssessmentType = (typeof TrainingAssessmentType)[keyof typeof TrainingAssessmentType];
  export const TrainingQuestionType: { readonly SINGLE_CHOICE: 'SINGLE_CHOICE'; readonly MULTIPLE_CHOICE: 'MULTIPLE_CHOICE'; readonly TRUE_FALSE: 'TRUE_FALSE'; readonly SHORT_TEXT: 'SHORT_TEXT' };
  export type TrainingQuestionType = (typeof TrainingQuestionType)[keyof typeof TrainingQuestionType];
  export const TrainingAttemptStatus: { readonly IN_PROGRESS: 'IN_PROGRESS'; readonly SUBMITTED: 'SUBMITTED'; readonly PENDING_MANUAL_REVIEW: 'PENDING_MANUAL_REVIEW'; readonly PASSED: 'PASSED'; readonly FAILED: 'FAILED'; readonly CANCELLED: 'CANCELLED' };
  export type TrainingAttemptStatus = (typeof TrainingAttemptStatus)[keyof typeof TrainingAttemptStatus];
  export const TrainingPathStatus: { readonly DRAFT: 'DRAFT'; readonly PUBLISHED: 'PUBLISHED'; readonly ARCHIVED: 'ARCHIVED' };
  export type TrainingPathStatus = (typeof TrainingPathStatus)[keyof typeof TrainingPathStatus];
  export const TrainingEnrollmentStatus: { readonly ASSIGNED: 'ASSIGNED'; readonly NOT_STARTED: 'NOT_STARTED'; readonly IN_PROGRESS: 'IN_PROGRESS'; readonly AWAITING_PRACTICAL: 'AWAITING_PRACTICAL'; readonly AWAITING_REVIEW: 'AWAITING_REVIEW'; readonly COMPLETED: 'COMPLETED'; readonly FAILED: 'FAILED'; readonly EXPIRED: 'EXPIRED'; readonly CANCELLED: 'CANCELLED' };
  export type TrainingEnrollmentStatus = (typeof TrainingEnrollmentStatus)[keyof typeof TrainingEnrollmentStatus];
  export const TrainingRequirementSource: { readonly MANUAL: 'MANUAL'; readonly JOB_FUNCTION: 'JOB_FUNCTION'; readonly GHE: 'GHE'; readonly RISK: 'RISK'; readonly EXPOSURE: 'EXPOSURE'; readonly EQUIPMENT: 'EQUIPMENT'; readonly LEGAL_RULE: 'LEGAL_RULE'; readonly AI_SUGGESTION: 'AI_SUGGESTION' };
  export type TrainingRequirementSource = (typeof TrainingRequirementSource)[keyof typeof TrainingRequirementSource];
  export const TrainingSessionStatus: { readonly DRAFT: 'DRAFT'; readonly SCHEDULED: 'SCHEDULED'; readonly IN_PROGRESS: 'IN_PROGRESS'; readonly COMPLETED: 'COMPLETED'; readonly CANCELLED: 'CANCELLED' };
  export type TrainingSessionStatus = (typeof TrainingSessionStatus)[keyof typeof TrainingSessionStatus];
  export const TrainingPracticalStatus: { readonly PENDING: 'PENDING'; readonly IN_PROGRESS: 'IN_PROGRESS'; readonly APPROVED: 'APPROVED'; readonly REJECTED: 'REJECTED' };
  export type TrainingPracticalStatus = (typeof TrainingPracticalStatus)[keyof typeof TrainingPracticalStatus];
  export const TrainingCertificateStatus: { readonly ISSUED: 'ISSUED'; readonly EXPIRED: 'EXPIRED'; readonly REVOKED: 'REVOKED' };
  export type TrainingCertificateStatus = (typeof TrainingCertificateStatus)[keyof typeof TrainingCertificateStatus];
  export const TrainingAccessAction: { readonly LOGIN: 'LOGIN'; readonly LESSON_OPENED: 'LESSON_OPENED'; readonly LESSON_HEARTBEAT: 'LESSON_HEARTBEAT'; readonly LESSON_COMPLETED: 'LESSON_COMPLETED'; readonly ASSESSMENT_STARTED: 'ASSESSMENT_STARTED'; readonly ASSESSMENT_SUBMITTED: 'ASSESSMENT_SUBMITTED'; readonly LIVE_CHECK_IN: 'LIVE_CHECK_IN'; readonly LIVE_CHECK_OUT: 'LIVE_CHECK_OUT'; readonly MATERIAL_DOWNLOADED: 'MATERIAL_DOWNLOADED' };
  export type TrainingAccessAction = (typeof TrainingAccessAction)[keyof typeof TrainingAccessAction];
  export const CompetencyStatus: { readonly PENDING: 'PENDING'; readonly VALID: 'VALID'; readonly EXPIRING: 'EXPIRING'; readonly EXPIRED: 'EXPIRED'; readonly SUSPENDED: 'SUSPENDED'; readonly REVOKED: 'REVOKED' };
  export type CompetencyStatus = (typeof CompetencyStatus)[keyof typeof CompetencyStatus];
  export const TrainingAuditStatus: { readonly PASSED: 'PASSED'; readonly PASSED_WITH_WARNINGS: 'PASSED_WITH_WARNINGS'; readonly FAILED: 'FAILED' };
  export type TrainingAuditStatus = (typeof TrainingAuditStatus)[keyof typeof TrainingAuditStatus];
  export const OperationalProgramStatus: { readonly DRAFT: 'DRAFT'; readonly ACTIVE: 'ACTIVE'; readonly IN_REVIEW: 'IN_REVIEW'; readonly COMPLETED: 'COMPLETED'; readonly ARCHIVED: 'ARCHIVED' };
  export type OperationalProgramStatus = (typeof OperationalProgramStatus)[keyof typeof OperationalProgramStatus];
  export const OperationalRecordStatus: { readonly DRAFT: 'DRAFT'; readonly ACTIVE: 'ACTIVE'; readonly PENDING_APPROVAL: 'PENDING_APPROVAL'; readonly APPROVED: 'APPROVED'; readonly REJECTED: 'REJECTED'; readonly CLOSED: 'CLOSED'; readonly CANCELLED: 'CANCELLED'; readonly EXPIRED: 'EXPIRED' };
  export type OperationalRecordStatus = (typeof OperationalRecordStatus)[keyof typeof OperationalRecordStatus];
  export const PpeTransactionType: { readonly ISSUE: 'ISSUE'; readonly RETURN: 'RETURN'; readonly EXCHANGE: 'EXCHANGE'; readonly LOSS: 'LOSS'; readonly DAMAGE: 'DAMAGE'; readonly INSPECTION: 'INSPECTION' };
  export type PpeTransactionType = (typeof PpeTransactionType)[keyof typeof PpeTransactionType];
  export const SafetyIncidentKind: { readonly ACCIDENT: 'ACCIDENT'; readonly OCCUPATIONAL_DISEASE: 'OCCUPATIONAL_DISEASE'; readonly NEAR_MISS: 'NEAR_MISS'; readonly UNSAFE_CONDITION: 'UNSAFE_CONDITION'; readonly PROPERTY_DAMAGE: 'PROPERTY_DAMAGE'; readonly ENVIRONMENTAL: 'ENVIRONMENTAL' };
  export type SafetyIncidentKind = (typeof SafetyIncidentKind)[keyof typeof SafetyIncidentKind];
  export const IncidentInvestigationMethod: { readonly FIVE_WHYS: 'FIVE_WHYS'; readonly BARRIER_ANALYSIS: 'BARRIER_ANALYSIS'; readonly CAUSE_TREE: 'CAUSE_TREE'; readonly BOW_TIE: 'BOW_TIE'; readonly CUSTOM: 'CUSTOM' };
  export type IncidentInvestigationMethod = (typeof IncidentInvestigationMethod)[keyof typeof IncidentInvestigationMethod];
  export const WorkPermitType: { readonly WORK_AT_HEIGHT: 'WORK_AT_HEIGHT'; readonly CONFINED_SPACE: 'CONFINED_SPACE'; readonly ELECTRICAL: 'ELECTRICAL'; readonly HOT_WORK: 'HOT_WORK'; readonly EXCAVATION: 'EXCAVATION'; readonly LIFTING: 'LIFTING'; readonly MAINTENANCE: 'MAINTENANCE'; readonly CHEMICAL: 'CHEMICAL'; readonly LOCKOUT_TAGOUT: 'LOCKOUT_TAGOUT'; readonly OTHER: 'OTHER' };
  export type WorkPermitType = (typeof WorkPermitType)[keyof typeof WorkPermitType];
  export const WorkPermitStatus: { readonly DRAFT: 'DRAFT'; readonly PENDING_APPROVAL: 'PENDING_APPROVAL'; readonly AUTHORIZED: 'AUTHORIZED'; readonly ACTIVE: 'ACTIVE'; readonly SUSPENDED: 'SUSPENDED'; readonly CLOSED: 'CLOSED'; readonly CANCELLED: 'CANCELLED'; readonly EXPIRED: 'EXPIRED' };
  export type WorkPermitStatus = (typeof WorkPermitStatus)[keyof typeof WorkPermitStatus];
  export const MachineAssetStatus: { readonly ACTIVE: 'ACTIVE'; readonly RESTRICTED: 'RESTRICTED'; readonly BLOCKED: 'BLOCKED'; readonly MAINTENANCE: 'MAINTENANCE'; readonly DECOMMISSIONED: 'DECOMMISSIONED' };
  export type MachineAssetStatus = (typeof MachineAssetStatus)[keyof typeof MachineAssetStatus];
  export const EmergencyDrillStatus: { readonly PLANNED: 'PLANNED'; readonly IN_PROGRESS: 'IN_PROGRESS'; readonly COMPLETED: 'COMPLETED'; readonly CANCELLED: 'CANCELLED' };
  export type EmergencyDrillStatus = (typeof EmergencyDrillStatus)[keyof typeof EmergencyDrillStatus];
  export const CipaCycleStatus: { readonly PLANNING: 'PLANNING'; readonly ELECTION: 'ELECTION'; readonly ACTIVE: 'ACTIVE'; readonly COMPLETED: 'COMPLETED'; readonly CANCELLED: 'CANCELLED' };
  export type CipaCycleStatus = (typeof CipaCycleStatus)[keyof typeof CipaCycleStatus];
  export const ContractorComplianceStatus: { readonly PENDING: 'PENDING'; readonly COMPLIANT: 'COMPLIANT'; readonly PARTIAL: 'PARTIAL'; readonly NON_COMPLIANT: 'NON_COMPLIANT'; readonly BLOCKED: 'BLOCKED'; readonly EXPIRED: 'EXPIRED' };
  export type ContractorComplianceStatus = (typeof ContractorComplianceStatus)[keyof typeof ContractorComplianceStatus];
  export const ComplianceObligationStatus: { readonly NOT_APPLICABLE: 'NOT_APPLICABLE'; readonly PENDING: 'PENDING'; readonly IN_PROGRESS: 'IN_PROGRESS'; readonly COMPLIANT: 'COMPLIANT'; readonly NON_COMPLIANT: 'NON_COMPLIANT'; readonly OVERDUE: 'OVERDUE'; readonly WAIVED: 'WAIVED' };
  export type ComplianceObligationStatus = (typeof ComplianceObligationStatus)[keyof typeof ComplianceObligationStatus];
  export const EsocialEventType: { readonly S2210: 'S2210'; readonly S2220: 'S2220'; readonly S2240: 'S2240' };
  export type EsocialEventType = (typeof EsocialEventType)[keyof typeof EsocialEventType];
  export const EsocialEnvironment: { readonly RESTRICTED: 'RESTRICTED'; readonly PRODUCTION: 'PRODUCTION' };
  export type EsocialEnvironment = (typeof EsocialEnvironment)[keyof typeof EsocialEnvironment];
  export const EsocialQueueStatus: { readonly DRAFT: 'DRAFT'; readonly VALIDATED: 'VALIDATED'; readonly QUEUED: 'QUEUED'; readonly SENDING: 'SENDING'; readonly ACCEPTED: 'ACCEPTED'; readonly REJECTED: 'REJECTED'; readonly CANCELLED: 'CANCELLED' };
  export type EsocialQueueStatus = (typeof EsocialQueueStatus)[keyof typeof EsocialQueueStatus];
  export const BillingInterval: { readonly MONTHLY: 'MONTHLY'; readonly YEARLY: 'YEARLY'; readonly ONE_TIME: 'ONE_TIME' };
  export type BillingInterval = (typeof BillingInterval)[keyof typeof BillingInterval];
  export const SubscriptionStatus: { readonly TRIAL: 'TRIAL'; readonly ACTIVE: 'ACTIVE'; readonly PAST_DUE: 'PAST_DUE'; readonly SUSPENDED: 'SUSPENDED'; readonly CANCELLED: 'CANCELLED'; readonly EXPIRED: 'EXPIRED' };
  export type SubscriptionStatus = (typeof SubscriptionStatus)[keyof typeof SubscriptionStatus];
  export const BillingInvoiceStatus: { readonly DRAFT: 'DRAFT'; readonly OPEN: 'OPEN'; readonly PAID: 'PAID'; readonly VOID: 'VOID'; readonly OVERDUE: 'OVERDUE'; readonly REFUNDED: 'REFUNDED' };
  export type BillingInvoiceStatus = (typeof BillingInvoiceStatus)[keyof typeof BillingInvoiceStatus];
  export const BillingUsageMetric: { readonly AI_REQUESTS: 'AI_REQUESTS'; readonly AI_TOKENS: 'AI_TOKENS'; readonly STORAGE_BYTES: 'STORAGE_BYTES'; readonly ACTIVE_COMPANIES: 'ACTIVE_COMPANIES'; readonly ACTIVE_USERS: 'ACTIVE_USERS'; readonly DOCUMENTS: 'DOCUMENTS'; readonly TRAINING_ENROLLMENTS: 'TRAINING_ENROLLMENTS' };
  export type BillingUsageMetric = (typeof BillingUsageMetric)[keyof typeof BillingUsageMetric];
  export const PaymentProvider: { readonly MANUAL: 'MANUAL'; readonly ASAAS: 'ASAAS'; readonly MERCADO_PAGO: 'MERCADO_PAGO'; readonly STRIPE: 'STRIPE'; readonly CUSTOM: 'CUSTOM' };
  export type PaymentProvider = (typeof PaymentProvider)[keyof typeof PaymentProvider];
  export const PaymentEventStatus: { readonly RECEIVED: 'RECEIVED'; readonly PROCESSING: 'PROCESSING'; readonly PROCESSED: 'PROCESSED'; readonly FAILED: 'FAILED'; readonly IGNORED: 'IGNORED' };
  export type PaymentEventStatus = (typeof PaymentEventStatus)[keyof typeof PaymentEventStatus];
  export interface Tenant { id: string; [key: string]: any }
  export interface User { id: string; [key: string]: any }
  export interface Membership { id: string; [key: string]: any }
  export interface UserInvite { id: string; [key: string]: any }
  export interface Session { id: string; [key: string]: any }
  export interface Company { id: string; [key: string]: any }
  export interface CompanyContact { id: string; [key: string]: any }
  export interface CompanyAccess { id: string; [key: string]: any }
  export interface Establishment { id: string; [key: string]: any }
  export interface Sector { id: string; [key: string]: any }
  export interface GHE { id: string; [key: string]: any }
  export interface JobFunction { id: string; [key: string]: any }
  export interface Workstation { id: string; [key: string]: any }
  export interface ServiceContract { id: string; [key: string]: any }
  export interface Questionnaire { id: string; [key: string]: any }
  export interface QuestionnaireVersion { id: string; [key: string]: any }
  export interface Question { id: string; [key: string]: any }
  export interface QuestionOption { id: string; [key: string]: any }
  export interface Campaign { id: string; [key: string]: any }
  export interface CampaignTarget { id: string; [key: string]: any }
  export interface CampaignQuestionnaire { id: string; [key: string]: any }
  export interface AnonymousCode { id: string; [key: string]: any }
  export interface ResponseSession { id: string; [key: string]: any }
  export interface Answer { id: string; [key: string]: any }
  export interface BodyPain { id: string; [key: string]: any }
  export interface Inspection { id: string; [key: string]: any }
  export interface InspectionItem { id: string; [key: string]: any }
  export interface InspectionEvidence { id: string; [key: string]: any }
  export interface Methodology { id: string; [key: string]: any }
  export interface Calculation { id: string; [key: string]: any }
  export interface Risk { id: string; [key: string]: any }
  export interface ActionPlan { id: string; [key: string]: any }
  export interface ActionItem { id: string; [key: string]: any }
  export interface ActionEvidence { id: string; [key: string]: any }
  export interface DocumentType { id: string; [key: string]: any }
  export interface DocumentTemplate { id: string; [key: string]: any }
  export interface DocumentTemplateVersion { id: string; [key: string]: any }
  export interface Document { id: string; [key: string]: any }
  export interface DocumentVersion { id: string; [key: string]: any }
  export interface DocumentSnapshot { id: string; [key: string]: any }
  export interface DocumentSection { id: string; [key: string]: any }
  export interface DocumentFile { id: string; [key: string]: any }
  export interface Signature { id: string; [key: string]: any }
  export interface DocumentAuditRun { id: string; [key: string]: any }
  export interface Conversation { id: string; [key: string]: any }
  export interface ConversationParticipant { id: string; [key: string]: any }
  export interface Message { id: string; [key: string]: any }
  export interface MessageAttachment { id: string; [key: string]: any }
  export interface EntityComment { id: string; [key: string]: any }
  export interface CommentAttachment { id: string; [key: string]: any }
  export interface Notification { id: string; [key: string]: any }
  export interface FileObject { id: string; [key: string]: any }
  export interface BackupExport { id: string; [key: string]: any }
  export interface ImportRun { id: string; [key: string]: any }
  export interface Job { id: string; [key: string]: any }
  export interface TenantSecurityPolicy { id: string; [key: string]: any }
  export interface SecurityIncident { id: string; [key: string]: any }
  export interface RecoveryTest { id: string; [key: string]: any }
  export interface ServiceHeartbeat { id: string; [key: string]: any }
  export interface IntegrationConfig { id: string; [key: string]: any }
  export interface AuditLog { id: string; [key: string]: any }
  export interface WorkflowTemplate { id: string; [key: string]: any }
  export interface WorkProject { id: string; [key: string]: any }
  export interface WorkflowStep { id: string; [key: string]: any }
  export interface WorkflowRequirement { id: string; [key: string]: any }
  export interface WorkflowArtifact { id: string; [key: string]: any }
  export interface WorkflowDecision { id: string; [key: string]: any }
  export interface ChangeSet { id: string; [key: string]: any }
  export interface ApprovalRequest { id: string; [key: string]: any }
  export interface LegacyImportBatch { id: string; [key: string]: any }
  export interface LegacyImportDocument { id: string; [key: string]: any }
  export interface LegacyExtractedFact { id: string; [key: string]: any }
  export interface LegacyImportConflict { id: string; [key: string]: any }
  export interface FieldVisit { id: string; [key: string]: any }
  export interface FieldCapture { id: string; [key: string]: any }
  export interface AIMessageAttachment { id: string; [key: string]: any }
  export interface PgrProgram { id: string; [key: string]: any }
  export interface PgrRiskAssessment { id: string; [key: string]: any }
  export interface PgrParticipationRecord { id: string; [key: string]: any }
  export interface PsychosocialAssessment { id: string; [key: string]: any }
  export interface PsychosocialFinding { id: string; [key: string]: any }
  export interface PgrAuditRun { id: string; [key: string]: any }
  export interface PcmsoProgram { id: string; [key: string]: any }
  export interface MedicalProvider { id: string; [key: string]: any }
  export interface MedicalProfessional { id: string; [key: string]: any }
  export interface OccupationalWorker { id: string; [key: string]: any }
  export interface PcmsoExamCatalog { id: string; [key: string]: any }
  export interface PcmsoExamRequirement { id: string; [key: string]: any }
  export interface PcmsoCall { id: string; [key: string]: any }
  export interface OccupationalAso { id: string; [key: string]: any }
  export interface OccupationalAsoExam { id: string; [key: string]: any }
  export interface PcmsoAnalyticalReport { id: string; [key: string]: any }
  export interface EsocialS2220Draft { id: string; [key: string]: any }
  export interface MedicalDataAccessLog { id: string; [key: string]: any }
  export interface PcmsoAuditRun { id: string; [key: string]: any }
  export interface OccupationalTechnicalProfessional { id: string; [key: string]: any }
  export interface OccupationalExposureProgram { id: string; [key: string]: any }
  export interface OccupationalExposurePeriod { id: string; [key: string]: any }
  export interface OccupationalExposureAgent { id: string; [key: string]: any }
  export interface OccupationalExposureMeasurement { id: string; [key: string]: any }
  export interface OccupationalExposureControl { id: string; [key: string]: any }
  export interface LtcatTechnicalConclusion { id: string; [key: string]: any }
  export interface InsalubrityAssessment { id: string; [key: string]: any }
  export interface DangerousConditionAssessment { id: string; [key: string]: any }
  export interface PppDraft { id: string; [key: string]: any }
  export interface EsocialS2240Draft { id: string; [key: string]: any }
  export interface ExposureAuditRun { id: string; [key: string]: any }
  export interface OccupationalHygieneProgram { id: string; [key: string]: any }
  export interface HygieneSamplingPlan { id: string; [key: string]: any }
  export interface HygieneMeasurement { id: string; [key: string]: any }
  export interface MeasurementInstrument { id: string; [key: string]: any }
  export interface InstrumentCalibration { id: string; [key: string]: any }
  export interface InstrumentEvent { id: string; [key: string]: any }
  export interface HygieneAuditRun { id: string; [key: string]: any }
  export interface ErgonomicsProgram { id: string; [key: string]: any }
  export interface ErgonomicDemand { id: string; [key: string]: any }
  export interface ErgonomicWorkSituation { id: string; [key: string]: any }
  export interface ErgonomicParticipation { id: string; [key: string]: any }
  export interface ErgonomicAssessment { id: string; [key: string]: any }
  export interface ErgonomicFinding { id: string; [key: string]: any }
  export interface ErgonomicPreliminaryDecision { id: string; [key: string]: any }
  export interface ErgonomicsAuditRun { id: string; [key: string]: any }
  export interface AIThread { id: string; [key: string]: any }
  export interface AIMessage { id: string; [key: string]: any }
  export interface AIToolExecution { id: string; [key: string]: any }
  export interface AIUsageRecord { id: string; [key: string]: any }
  export interface TrainingProgram { id: string; [key: string]: any }
  export interface TrainingCourse { id: string; [key: string]: any }
  export interface TrainingProgramCourse { id: string; [key: string]: any }
  export interface TrainingModule { id: string; [key: string]: any }
  export interface TrainingLesson { id: string; [key: string]: any }
  export interface TrainingAssessment { id: string; [key: string]: any }
  export interface TrainingQuestion { id: string; [key: string]: any }
  export interface TrainingPath { id: string; [key: string]: any }
  export interface TrainingPathCourse { id: string; [key: string]: any }
  export interface TrainingRequirementRule { id: string; [key: string]: any }
  export interface TrainingEnrollment { id: string; [key: string]: any }
  export interface TrainingLessonProgress { id: string; [key: string]: any }
  export interface TrainingAssessmentAttempt { id: string; [key: string]: any }
  export interface TrainingPracticalEvaluation { id: string; [key: string]: any }
  export interface TrainingSession { id: string; [key: string]: any }
  export interface TrainingAttendance { id: string; [key: string]: any }
  export interface TrainingAccessLog { id: string; [key: string]: any }
  export interface TrainingCertificate { id: string; [key: string]: any }
  export interface CompetencyDefinition { id: string; [key: string]: any }
  export interface CompetencyRequirement { id: string; [key: string]: any }
  export interface WorkerCompetency { id: string; [key: string]: any }
  export interface TrainingAuditRun { id: string; [key: string]: any }
  export interface OperationalSstProgram { id: string; [key: string]: any }
  export interface PpeCatalogItem { id: string; [key: string]: any }
  export interface PpeTransaction { id: string; [key: string]: any }
  export interface SafetyIncidentRecord { id: string; [key: string]: any }
  export interface IncidentInvestigation { id: string; [key: string]: any }
  export interface WorkPermit { id: string; [key: string]: any }
  export interface MachineAsset { id: string; [key: string]: any }
  export interface ChemicalProduct { id: string; [key: string]: any }
  export interface EmergencyPlan { id: string; [key: string]: any }
  export interface EmergencyDrill { id: string; [key: string]: any }
  export interface CipaCycle { id: string; [key: string]: any }
  export interface ContractorCompany { id: string; [key: string]: any }
  export interface ComplianceObligation { id: string; [key: string]: any }
  export interface OperationalAuditRun { id: string; [key: string]: any }
  export interface EsocialEventQueue { id: string; [key: string]: any }
  export interface CompanyPortalRequest { id: string; [key: string]: any }
  export interface SaasPlan { id: string; [key: string]: any }
  export interface TenantSubscription { id: string; [key: string]: any }
  export interface BillingInvoice { id: string; [key: string]: any }
  export interface BillingUsageRecord { id: string; [key: string]: any }
  export interface PaymentWebhookEvent { id: string; [key: string]: any }
  export class PrismaClient {
    constructor(options?: any);
    tenant: any;
    user: any;
    membership: any;
    userInvite: any;
    session: any;
    company: any;
    companyContact: any;
    companyAccess: any;
    establishment: any;
    sector: any;
    gHE: any;
    jobFunction: any;
    workstation: any;
    serviceContract: any;
    questionnaire: any;
    questionnaireVersion: any;
    question: any;
    questionOption: any;
    campaign: any;
    campaignTarget: any;
    campaignQuestionnaire: any;
    anonymousCode: any;
    responseSession: any;
    answer: any;
    bodyPain: any;
    inspection: any;
    inspectionItem: any;
    inspectionEvidence: any;
    methodology: any;
    calculation: any;
    risk: any;
    actionPlan: any;
    actionItem: any;
    actionEvidence: any;
    documentType: any;
    documentTemplate: any;
    documentTemplateVersion: any;
    document: any;
    documentVersion: any;
    documentSnapshot: any;
    documentSection: any;
    documentFile: any;
    signature: any;
    documentAuditRun: any;
    conversation: any;
    conversationParticipant: any;
    message: any;
    messageAttachment: any;
    entityComment: any;
    commentAttachment: any;
    notification: any;
    fileObject: any;
    backupExport: any;
    importRun: any;
    job: any;
    tenantSecurityPolicy: any;
    securityIncident: any;
    recoveryTest: any;
    serviceHeartbeat: any;
    integrationConfig: any;
    auditLog: any;
    workflowTemplate: any;
    workProject: any;
    workflowStep: any;
    workflowRequirement: any;
    workflowArtifact: any;
    workflowDecision: any;
    changeSet: any;
    approvalRequest: any;
    legacyImportBatch: any;
    legacyImportDocument: any;
    legacyExtractedFact: any;
    legacyImportConflict: any;
    fieldVisit: any;
    fieldCapture: any;
    aIMessageAttachment: any;
    pgrProgram: any;
    pgrRiskAssessment: any;
    pgrParticipationRecord: any;
    psychosocialAssessment: any;
    psychosocialFinding: any;
    pgrAuditRun: any;
    pcmsoProgram: any;
    medicalProvider: any;
    medicalProfessional: any;
    occupationalWorker: any;
    pcmsoExamCatalog: any;
    pcmsoExamRequirement: any;
    pcmsoCall: any;
    occupationalAso: any;
    occupationalAsoExam: any;
    pcmsoAnalyticalReport: any;
    esocialS2220Draft: any;
    medicalDataAccessLog: any;
    pcmsoAuditRun: any;
    occupationalTechnicalProfessional: any;
    occupationalExposureProgram: any;
    occupationalExposurePeriod: any;
    occupationalExposureAgent: any;
    occupationalExposureMeasurement: any;
    occupationalExposureControl: any;
    ltcatTechnicalConclusion: any;
    insalubrityAssessment: any;
    dangerousConditionAssessment: any;
    pppDraft: any;
    esocialS2240Draft: any;
    exposureAuditRun: any;
    occupationalHygieneProgram: any;
    hygieneSamplingPlan: any;
    hygieneMeasurement: any;
    measurementInstrument: any;
    instrumentCalibration: any;
    instrumentEvent: any;
    hygieneAuditRun: any;
    ergonomicsProgram: any;
    ergonomicDemand: any;
    ergonomicWorkSituation: any;
    ergonomicParticipation: any;
    ergonomicAssessment: any;
    ergonomicFinding: any;
    ergonomicPreliminaryDecision: any;
    ergonomicsAuditRun: any;
    aIThread: any;
    aIMessage: any;
    aIToolExecution: any;
    aIUsageRecord: any;
    trainingProgram: any;
    trainingCourse: any;
    trainingProgramCourse: any;
    trainingModule: any;
    trainingLesson: any;
    trainingAssessment: any;
    trainingQuestion: any;
    trainingPath: any;
    trainingPathCourse: any;
    trainingRequirementRule: any;
    trainingEnrollment: any;
    trainingLessonProgress: any;
    trainingAssessmentAttempt: any;
    trainingPracticalEvaluation: any;
    trainingSession: any;
    trainingAttendance: any;
    trainingAccessLog: any;
    trainingCertificate: any;
    competencyDefinition: any;
    competencyRequirement: any;
    workerCompetency: any;
    trainingAuditRun: any;
    operationalSstProgram: any;
    ppeCatalogItem: any;
    ppeTransaction: any;
    safetyIncidentRecord: any;
    incidentInvestigation: any;
    workPermit: any;
    machineAsset: any;
    chemicalProduct: any;
    emergencyPlan: any;
    emergencyDrill: any;
    cipaCycle: any;
    contractorCompany: any;
    complianceObligation: any;
    operationalAuditRun: any;
    esocialEventQueue: any;
    companyPortalRequest: any;
    saasPlan: any;
    tenantSubscription: any;
    billingInvoice: any;
    billingUsageRecord: any;
    paymentWebhookEvent: any;
    $transaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T>;
    $transaction<T extends readonly unknown[]>(items: T): Promise<T>;
    $queryRaw<T = unknown>(query: TemplateStringsArray | any, ...values: any[]): Promise<T>;
    $executeRaw(query: TemplateStringsArray | any, ...values: any[]): Promise<number>;
    $disconnect(): Promise<void>;
  }
}
