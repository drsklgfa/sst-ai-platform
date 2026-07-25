import { detectFactConflicts, factNeedsReview, normalizeCnpj } from '@/domain/legacy-import/consolidation';
import { extractLocalDocumentText } from '@/domain/legacy-import/local-text';
import { legacyExtractionPrompt, LEGACY_EXTRACTION_SYSTEM, submitLegacyExtractionTool } from '@/domain/legacy-import/prompt';
import { parseLegacyExtraction } from '@/domain/legacy-import/schema';
import { workflowDefinitionFor } from '@/domain/workflows/templates';
import { createAIProviderClient, type AIFileInput } from './integrations/ai';
import { loadActiveAIConfiguration } from './ai-config';
import { createWorkProjectFromDefinition } from './work-projects';
import { toPrismaJson } from './prisma-json';
import { storage } from './storage';
import { db } from './db';

function targetServicesFrom(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string').map((item) => item.toUpperCase()) : [];
}

function valueOf(fact: { value: unknown; normalizedValue: unknown }) {
  return fact.normalizedValue ?? fact.value;
}

function stringValue(fact: { value: unknown; normalizedValue: unknown } | undefined) {
  if (!fact) return null;
  const value = valueOf(fact);
  if (typeof value === 'string') return value.trim() || null;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return null;
}

function numberValue(fact: { value: unknown; normalizedValue: unknown } | undefined) {
  if (!fact) return null;
  const value = valueOf(fact);
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const parsed = Number(String(value ?? '').replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : null;
}

function bestFact(facts: any[], entityType: string, fieldPath: string, entityKey?: string | null) {
  return facts
    .filter((fact) => fact.entityType === entityType && fact.fieldPath === fieldPath && (entityKey === undefined || (fact.entityKey ?? null) === entityKey))
    .sort((a, b) => b.confidence - a.confidence)[0];
}

function uniqueEntityKeys(facts: any[], entityType: string) {
  return [...new Set(facts.filter((fact) => fact.entityType === entityType).map((fact) => fact.entityKey).filter((value): value is string => Boolean(value)))];
}

export async function refreshLegacyImportConflicts(batchId: string) {
  const facts = await db.legacyExtractedFact.findMany({
    where: { batchId, status: { not: 'REJECTED' } },
    select: { id: true, entityType: true, entityKey: true, fieldPath: true, value: true, normalizedValue: true, confidence: true, status: true },
  });
  const ignored = await db.legacyImportConflict.findMany({ where: { batchId, status: 'IGNORED' }, select: { fieldPath: true } });
  const ignoredPaths = new Set(ignored.map((item) => item.fieldPath));
  const conflicts = detectFactConflicts(facts).filter((conflict) => !ignoredPaths.has(conflict.fieldPath));
  await db.$transaction(async (tx) => {
    await tx.legacyImportConflict.deleteMany({ where: { batchId, status: 'OPEN' } });
    if (conflicts.length) {
      await tx.legacyImportConflict.createMany({
        data: conflicts.map((conflict) => ({
          batchId,
          kind: conflict.kind,
          fieldPath: conflict.fieldPath,
          summary: conflict.summary,
          factIds: toPrismaJson(conflict.factIds),
          metadata: toPrismaJson({ values: conflict.values }),
        })),
      });
    }
  });
  const [pendingFacts, approvedFacts, pendingDocuments] = await Promise.all([
    db.legacyExtractedFact.count({ where: { batchId, status: { in: ['EXTRACTED', 'NEEDS_REVIEW'] } } }),
    db.legacyExtractedFact.count({ where: { batchId, status: { in: ['APPROVED', 'APPLIED'] } } }),
    db.legacyImportDocument.count({ where: { batchId, status: { in: ['UPLOADED', 'QUEUED', 'ANALYZING'] } } }),
  ]);
  const status = !pendingDocuments && !conflicts.length && !pendingFacts && approvedFacts ? 'READY' : pendingDocuments ? 'ANALYZING' : 'REVIEW';
  await db.legacyImportBatch.update({ where: { id: batchId }, data: { status } });
  return conflicts;
}

export async function analyzeLegacyImportDocument(documentId: string) {
  const document = await db.legacyImportDocument.findUniqueOrThrow({
    where: { id: documentId },
    include: { batch: true, file: true },
  });
  await db.legacyImportDocument.update({ where: { id: document.id }, data: { status: 'ANALYZING', error: null } });
  await db.legacyImportBatch.update({ where: { id: document.batchId }, data: { status: 'ANALYZING', startedAt: document.batch.startedAt ?? new Date(), error: null } });

  try {
    const configuration = await loadActiveAIConfiguration(document.batch.tenantId);
    if (!configuration) throw new Error('Nenhum provedor de IA ativo foi configurado para a consultoria');
    const data = await storage.get(document.file.storageKey);
    const localText = await extractLocalDocumentText({ data, mimeType: document.file.mimeType, filename: document.file.originalName });
    const settings = configuration.settings;
    const batchMetadata = document.batch.metadata && typeof document.batch.metadata === 'object' && !Array.isArray(document.batch.metadata)
      ? document.batch.metadata as Record<string, unknown>
      : {};
    if (settings.dataPolicy === 'PROTECTED' && batchMetadata.documentsAnonymized !== true) {
      throw new Error('No modo protegido, confirme que os documentos foram anonimizados antes de enviá-los ao provedor de IA');
    }
    const needsVision = document.file.mimeType === 'application/pdf' || document.file.mimeType.startsWith('image/');
    const model = needsVision
      ? settings.modelVision || settings.modelAdvanced || settings.modelEconomy
      : settings.modelEconomy || settings.modelAdvanced || settings.modelVision;
    if (!model) throw new Error('Nenhum modelo compatível foi configurado');
    const client = createAIProviderClient({ provider: configuration.provider, model, apiKey: configuration.apiKey });
    const files: AIFileInput[] = needsVision || !localText ? [{ filename: document.file.originalName, mimeType: document.file.mimeType, data }] : [];
    const response = await client.complete({
      system: LEGACY_EXTRACTION_SYSTEM,
      prompt: legacyExtractionPrompt({ filename: document.file.originalName, targetServices: targetServicesFrom(document.batch.targetServices), localText: localText ?? undefined }),
      files,
      tools: [submitLegacyExtractionTool],
      toolChoice: 'required',
      maxOutputTokens: 32_000,
    });
    const call = response.toolCalls.find((item) => item.name === submitLegacyExtractionTool.name);
    let raw: unknown = call?.arguments;
    if (!raw && response.text) {
      try { raw = JSON.parse(response.text); } catch { throw new Error('O provedor não retornou a extração estruturada esperada'); }
    }
    const extraction = parseLegacyExtraction(raw);

    await db.$transaction(async (tx) => {
      await tx.legacyExtractedFact.deleteMany({ where: { documentId: document.id } });
      await tx.legacyImportDocument.update({
        where: { id: document.id },
        data: {
          status: 'REVIEW',
          detectedKind: extraction.detectedKind,
          referenceYear: extraction.referenceYear ?? null,
          pageCount: extraction.pageCount ?? null,
          language: extraction.language ?? null,
          provider: configuration.provider,
          model,
          summary: extraction.summary,
          rawExtraction: toPrismaJson(extraction),
          analyzedAt: new Date(),
          error: null,
        },
      });
      if (extraction.facts.length) {
        await tx.legacyExtractedFact.createMany({
          data: extraction.facts.map((fact) => ({
            batchId: document.batchId,
            documentId: document.id,
            domain: fact.domain.toUpperCase(),
            entityType: fact.entityType.toUpperCase(),
            entityKey: fact.entityKey || null,
            parentEntityKey: fact.parentEntityKey || null,
            fieldPath: fact.fieldPath,
            label: fact.label,
            value: toPrismaJson(fact.value),
            normalizedValue: fact.normalizedValue === undefined || fact.normalizedValue === null ? undefined : toPrismaJson(fact.normalizedValue),
            sourcePage: fact.sourcePage ?? null,
            sourceLocator: fact.sourceLocator || null,
            sourceExcerpt: fact.sourceExcerpt || null,
            confidence: fact.confidence,
            status: factNeedsReview(fact.confidence, fact.domain.toUpperCase()) ? 'NEEDS_REVIEW' : 'EXTRACTED',
            metadata: toPrismaJson(fact.metadata ?? {}),
          })),
        });
      }
      await tx.aIUsageRecord.create({
        data: {
          tenantId: document.batch.tenantId,
          workProjectId: document.batch.workProjectId,
          userId: document.batch.createdById,
          provider: configuration.provider,
          model,
          purpose: 'LEGACY_DOCUMENT_EXTRACTION',
          inputTokens: response.inputTokens,
          outputTokens: response.outputTokens,
          metadata: toPrismaJson({ batchId: document.batchId, documentId: document.id, fileId: document.fileObjectId }),
        },
      });
    });
    await refreshLegacyImportConflicts(document.batchId);
    const pending = await db.legacyImportDocument.count({ where: { batchId: document.batchId, status: { in: ['UPLOADED', 'QUEUED', 'ANALYZING'] } } });
    await db.legacyImportBatch.update({ where: { id: document.batchId }, data: { status: pending ? 'ANALYZING' : 'REVIEW' } });
    await db.auditLog.create({
      data: {
        tenantId: document.batch.tenantId,
        userId: document.batch.createdById,
        companyId: document.batch.companyId,
        action: 'LEGACY_DOCUMENT_ANALYZED',
        entityType: 'LegacyImportDocument',
        entityId: document.id,
        after: toPrismaJson({ kind: extraction.detectedKind, facts: extraction.facts.length, warnings: extraction.warnings, provider: configuration.provider, model }),
      },
    });
    return { documentId: document.id, kind: extraction.detectedKind, facts: extraction.facts.length };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await db.legacyImportDocument.update({ where: { id: document.id }, data: { status: 'FAILED', error: message } });
    const successful = await db.legacyImportDocument.count({ where: { batchId: document.batchId, status: { in: ['REVIEW', 'APPROVED'] } } });
    const pending = await db.legacyImportDocument.count({ where: { batchId: document.batchId, status: { in: ['UPLOADED', 'QUEUED', 'ANALYZING'] } } });
    await db.legacyImportBatch.update({ where: { id: document.batchId }, data: { status: pending ? 'ANALYZING' : successful ? 'REVIEW' : 'FAILED', error: successful ? null : message } });
    throw error;
  }
}

export async function commitLegacyImportBatch(input: { batchId: string; tenantId: string; userId: string }): Promise<{ company: any; projects: Array<{ id: string; serviceType: string }>; appliedFacts: number }> {
  const batch = await db.legacyImportBatch.findFirst({
    where: { id: input.batchId, tenantId: input.tenantId },
    include: { documents: { include: { file: true } }, conflicts: { where: { status: 'OPEN' } } },
  });
  if (!batch) throw new Error('Importação não encontrada');
  if (batch.status === 'COMPLETED') throw new Error('Esta importação já foi aplicada');
  if (batch.conflicts.length) throw new Error('Resolva os conflitos antes de aplicar a importação');
  const facts = await db.legacyExtractedFact.findMany({ where: { batchId: batch.id, status: 'APPROVED' }, orderBy: [{ confidence: 'desc' }, { createdAt: 'asc' }] });
  if (!facts.length) throw new Error('Aprove ao menos um dado antes de aplicar a importação');
  await db.legacyImportBatch.update({ where: { id: batch.id }, data: { status: 'IMPORTING', error: null } });

  try {
    const legalName = stringValue(bestFact(facts, 'COMPANY', 'legalName')) ?? stringValue(bestFact(facts, 'COMPANY', 'name'));
    const rawCnpj = stringValue(bestFact(facts, 'COMPANY', 'cnpj'));
    const cnpj = normalizeCnpj(rawCnpj);
    let company = batch.companyId ? await db.company.findFirst({ where: { id: batch.companyId, tenantId: input.tenantId } }) : null;
    if (!company && cnpj) company = await db.company.findFirst({ where: { tenantId: input.tenantId, cnpj } });
    if (!company) {
      if (!batch.autoCreateCompany) throw new Error('Vincule uma empresa existente ou permita o cadastro automático após a revisão');
      if (!legalName) throw new Error('A razão social precisa ser aprovada para cadastrar uma nova empresa');
      company = await db.company.create({
        data: {
          tenantId: input.tenantId,
          legalName,
          tradeName: stringValue(bestFact(facts, 'COMPANY', 'tradeName')),
          cnpj,
          primaryCnae: stringValue(bestFact(facts, 'COMPANY', 'primaryCnae')) ?? stringValue(bestFact(facts, 'COMPANY', 'cnae')),
          riskGrade: numberValue(bestFact(facts, 'COMPANY', 'riskGrade')),
          employeeCount: Math.max(0, Math.round(numberValue(bestFact(facts, 'COMPANY', 'employeeCount')) ?? 0)),
          settings: toPrismaJson({ importedFromLegacyBatchId: batch.id }),
        },
      });
    } else {
      const updates: Record<string, unknown> = {};
      if (!company.tradeName) updates.tradeName = stringValue(bestFact(facts, 'COMPANY', 'tradeName'));
      if (!company.cnpj && cnpj) updates.cnpj = cnpj;
      if (!company.primaryCnae) updates.primaryCnae = stringValue(bestFact(facts, 'COMPANY', 'primaryCnae')) ?? stringValue(bestFact(facts, 'COMPANY', 'cnae'));
      if (!company.riskGrade) updates.riskGrade = numberValue(bestFact(facts, 'COMPANY', 'riskGrade'));
      if (!company.employeeCount) updates.employeeCount = Math.max(0, Math.round(numberValue(bestFact(facts, 'COMPANY', 'employeeCount')) ?? 0));
      if (Object.values(updates).some((value) => value !== null && value !== undefined && value !== '')) {
        company = await db.company.update({ where: { id: company.id }, data: updates });
      }
    }

    const appliedEntities = new Map<string, { type: string; id: string }>();
    appliedEntities.set('COMPANY:', { type: 'Company', id: company.id });

    const establishmentKeys = uniqueEntityKeys(facts, 'ESTABLISHMENT');
    if (!establishmentKeys.length && facts.some((fact) => ['SECTOR', 'GHE', 'FUNCTION'].includes(fact.entityType))) establishmentKeys.push('main');
    for (const key of establishmentKeys) {
      const name = stringValue(bestFact(facts, 'ESTABLISHMENT', 'name', key)) ?? (key === 'main' ? 'Unidade principal' : key);
      let establishment = await db.establishment.findFirst({ where: { companyId: company.id, name: { equals: name, mode: 'insensitive' } } });
      if (!establishment) {
        establishment = await db.establishment.create({
          data: {
            companyId: company.id,
            name,
            cnpj: normalizeCnpj(stringValue(bestFact(facts, 'ESTABLISHMENT', 'cnpj', key))),
            addressLine: stringValue(bestFact(facts, 'ESTABLISHMENT', 'addressLine', key)) ?? stringValue(bestFact(facts, 'ESTABLISHMENT', 'address', key)),
            number: stringValue(bestFact(facts, 'ESTABLISHMENT', 'number', key)),
            district: stringValue(bestFact(facts, 'ESTABLISHMENT', 'district', key)),
            city: stringValue(bestFact(facts, 'ESTABLISHMENT', 'city', key)),
            state: stringValue(bestFact(facts, 'ESTABLISHMENT', 'state', key)),
            zipCode: stringValue(bestFact(facts, 'ESTABLISHMENT', 'zipCode', key)),
            employeeCount: Math.max(0, Math.round(numberValue(bestFact(facts, 'ESTABLISHMENT', 'employeeCount', key)) ?? 0)),
          },
        });
      }
      appliedEntities.set(`ESTABLISHMENT:${key}`, { type: 'Establishment', id: establishment.id });
    }

    for (const key of uniqueEntityKeys(facts, 'SECTOR')) {
      const name = stringValue(bestFact(facts, 'SECTOR', 'name', key)) ?? key;
      const parentKey = facts.find((fact) => fact.entityType === 'SECTOR' && fact.entityKey === key && fact.parentEntityKey)?.parentEntityKey ?? establishmentKeys[0] ?? 'main';
      const parent = appliedEntities.get(`ESTABLISHMENT:${parentKey}`) ?? appliedEntities.get(`ESTABLISHMENT:${establishmentKeys[0] ?? 'main'}`);
      if (!parent) continue;
      let sector = await db.sector.findFirst({ where: { establishmentId: parent.id, name: { equals: name, mode: 'insensitive' } } });
      if (!sector) {
        sector = await db.sector.create({ data: { establishmentId: parent.id, name, description: stringValue(bestFact(facts, 'SECTOR', 'description', key)), employeeCount: Math.max(0, Math.round(numberValue(bestFact(facts, 'SECTOR', 'employeeCount', key)) ?? 0)) } });
      }
      appliedEntities.set(`SECTOR:${key}`, { type: 'Sector', id: sector.id });
    }

    for (const key of uniqueEntityKeys(facts, 'GHE')) {
      const name = stringValue(bestFact(facts, 'GHE', 'name', key)) ?? key;
      const parentKey = facts.find((fact) => fact.entityType === 'GHE' && fact.entityKey === key && fact.parentEntityKey)?.parentEntityKey;
      const parent = parentKey ? appliedEntities.get(`SECTOR:${parentKey}`) : [...appliedEntities.entries()].find(([entryKey]) => entryKey.startsWith('SECTOR:'))?.[1];
      if (!parent) continue;
      let ghe = await db.gHE.findFirst({ where: { sectorId: parent.id, name: { equals: name, mode: 'insensitive' } } });
      if (!ghe) {
        ghe = await db.gHE.create({ data: { sectorId: parent.id, name, code: stringValue(bestFact(facts, 'GHE', 'code', key)), description: stringValue(bestFact(facts, 'GHE', 'description', key)), employeeCount: Math.max(0, Math.round(numberValue(bestFact(facts, 'GHE', 'employeeCount', key)) ?? 0)), shift: stringValue(bestFact(facts, 'GHE', 'shift', key)), workday: stringValue(bestFact(facts, 'GHE', 'workday', key)), metadata: toPrismaJson({ importedFromLegacyBatchId: batch.id }) } });
      }
      appliedEntities.set(`GHE:${key}`, { type: 'GHE', id: ghe.id });
    }

    for (const key of uniqueEntityKeys(facts, 'FUNCTION')) {
      const name = stringValue(bestFact(facts, 'FUNCTION', 'name', key)) ?? key;
      const parentKey = facts.find((fact) => fact.entityType === 'FUNCTION' && fact.entityKey === key && fact.parentEntityKey)?.parentEntityKey;
      const parent = parentKey ? appliedEntities.get(`GHE:${parentKey}`) : [...appliedEntities.entries()].find(([entryKey]) => entryKey.startsWith('GHE:'))?.[1];
      if (!parent) continue;
      let jobFunction = await db.jobFunction.findFirst({ where: { gheId: parent.id, name: { equals: name, mode: 'insensitive' } } });
      if (!jobFunction) {
        const activitiesFact = bestFact(facts, 'FUNCTION', 'activities', key);
        jobFunction = await db.jobFunction.create({ data: { gheId: parent.id, name, cbo: stringValue(bestFact(facts, 'FUNCTION', 'cbo', key)), description: stringValue(bestFact(facts, 'FUNCTION', 'description', key)), employeeCount: Math.max(0, Math.round(numberValue(bestFact(facts, 'FUNCTION', 'employeeCount', key)) ?? 0)), activities: activitiesFact ? toPrismaJson(valueOf(activitiesFact)) : toPrismaJson([]) } });
      }
      appliedEntities.set(`FUNCTION:${key}`, { type: 'JobFunction', id: jobFunction.id });
    }

    const services = targetServicesFrom(batch.targetServices).map((service) => service === 'TREINAMENTOS' ? 'TREINAMENTO' : service);
    const projects: Array<{ id: string; serviceType: string }> = [];
    for (const serviceType of services) {
      try { workflowDefinitionFor(serviceType); } catch { continue; }
      const definition = workflowDefinitionFor(serviceType);
      let project = await db.workProject.findFirst({ where: { legacyImportBatchId: batch.id, serviceType } });
      if (!project) {
        project = await createWorkProjectFromDefinition({
          tenantId: input.tenantId,
          companyId: company.id,
          serviceType,
          title: `${definition.name} — ${company.tradeName ?? company.legalName}`,
          responsibleUserId: input.userId,
          legacyImportBatchId: batch.id,
          metadata: { legacyImportBatchId: batch.id, source: 'LEGACY_IMPORT' },
        });
      }
      for (const document of batch.documents) {
        const existingArtifact = await db.workflowArtifact.findFirst({ where: { workProjectId: project.id, fileId: document.fileObjectId, kind: 'LEGACY_SOURCE' } });
        if (!existingArtifact) {
          await db.workflowArtifact.create({ data: { workProjectId: project.id, kind: 'LEGACY_SOURCE', title: document.file.originalName, fileId: document.fileObjectId, entityType: 'LegacyImportDocument', entityId: document.id, metadata: toPrismaJson({ detectedKind: document.detectedKind, referenceYear: document.referenceYear }) } });
        }
      }
      projects.push(project);
    }

    const primaryProject = projects[0] ?? null;
    if (primaryProject) {
      const summary = `Migração do acervo antigo: ${facts.length} dados aprovados`;
      const existingChangeSet = await db.changeSet.findFirst({ where: { workProjectId: primaryProject.id, summary } });
      if (!existingChangeSet) {
        await db.changeSet.create({
          data: {
            workProjectId: primaryProject.id,
            status: 'APPLIED',
            summary,
            operations: toPrismaJson([...appliedEntities.entries()].map(([key, value]) => ({ key, ...value }))),
            requestedById: input.userId,
            appliedById: input.userId,
            appliedAt: new Date(),
            metadata: toPrismaJson({ legacyImportBatchId: batch.id, createdProjects: projects.map((project) => project.id) }),
          },
        });
      }
    }

    for (const fact of facts) {
      const entity = appliedEntities.get(`${fact.entityType}:${fact.entityKey ?? ''}`) ?? (fact.entityType === 'COMPANY' ? appliedEntities.get('COMPANY:') : undefined);
      await db.legacyExtractedFact.update({ where: { id: fact.id }, data: { status: entity ? 'APPLIED' : 'APPROVED', appliedEntityType: entity?.type, appliedEntityId: entity?.id } });
    }
    await db.legacyImportDocument.updateMany({ where: { batchId: batch.id, status: 'REVIEW' }, data: { status: 'APPROVED', approvedAt: new Date() } });
    await db.legacyImportBatch.update({ where: { id: batch.id }, data: { companyId: company.id, workProjectId: primaryProject?.id ?? null, status: 'COMPLETED', completedAt: new Date(), error: null } });
    await db.auditLog.create({ data: { tenantId: input.tenantId, userId: input.userId, companyId: company.id, action: 'LEGACY_IMPORT_APPLIED', entityType: 'LegacyImportBatch', entityId: batch.id, after: toPrismaJson({ companyId: company.id, facts: facts.length, projects: projects.map((project) => ({ id: project.id, serviceType: project.serviceType })) }) } });
    return { company, projects, appliedFacts: facts.length };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await db.legacyImportBatch.update({ where: { id: batch.id }, data: { status: 'FAILED', error: message } });
    throw error;
  }
}
