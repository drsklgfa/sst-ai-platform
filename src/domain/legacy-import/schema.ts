import { z } from 'zod';
import { LEGACY_DOCUMENT_KINDS } from './catalog';

const jsonValue: any = z.lazy(() => z.union([z.string(), z.number(), z.boolean(), z.null(), z.array(jsonValue), z.record(z.string(), jsonValue)]));

export const legacyFactSchema = z.object({
  domain: z.string().trim().min(1).max(80),
  entityType: z.string().trim().min(1).max(80),
  entityKey: z.string().trim().max(200).optional().nullable(),
  parentEntityKey: z.string().trim().max(200).optional().nullable(),
  fieldPath: z.string().trim().min(1).max(200),
  label: z.string().trim().min(1).max(200),
  value: jsonValue,
  normalizedValue: jsonValue.optional().nullable(),
  sourcePage: z.number().int().positive().optional().nullable(),
  sourceLocator: z.string().trim().max(300).optional().nullable(),
  sourceExcerpt: z.string().trim().max(1200).optional().nullable(),
  confidence: z.number().int().min(0).max(100),
  metadata: z.record(z.string(), jsonValue).optional().default({}),
});

export const legacyExtractionSchema = z.object({
  detectedKind: z.enum(LEGACY_DOCUMENT_KINDS),
  referenceYear: z.number().int().min(1900).max(2200).optional().nullable(),
  pageCount: z.number().int().positive().max(5000).optional().nullable(),
  language: z.string().trim().max(20).optional().nullable(),
  summary: z.string().trim().max(4000),
  facts: z.array(legacyFactSchema).max(1000),
  warnings: z.array(z.string().trim().max(500)).max(100).optional().default([]),
});

export type LegacyExtraction = z.infer<typeof legacyExtractionSchema>;

export function parseLegacyExtraction(value: unknown): LegacyExtraction {
  return legacyExtractionSchema.parse(value);
}
