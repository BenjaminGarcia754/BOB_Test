import { z } from "zod";
import { ObservationKind, ConfidenceLevel, ToolStatus, JobOrigin } from "./enums.js";
import { InputMetadata } from "./job.js";

export const ObservationSource = z.object({
  tool: z.string(),
  path: z.string().nullable(),
  line: z.number().int().positive().nullable(),
  address: z.string().nullable(),
  ruleId: z.string().nullable(),
});
export type ObservationSource = z.infer<typeof ObservationSource>;

export const Observation = z.object({
  id: z.string(),
  kind: ObservationKind,
  summary: z.string().max(500),
  detail: z.string().max(4000).nullable(),
  source: ObservationSource,
  tags: z.array(z.string()).default([]),
});
export type Observation = z.infer<typeof Observation>;

export const Inference = z.object({
  id: z.string(),
  summary: z.string().max(500),
  explanation: z.string(),
  confidence: ConfidenceLevel,
  evidenceIds: z.array(z.string()).min(1),
});
export type Inference = z.infer<typeof Inference>;

export const ToolRecord = z.object({
  name: z.string(),
  version: z.string().nullable(),
  status: ToolStatus,
  dataDate: z.string().nullable(),
  warning: z.string().nullable(),
});
export type ToolRecord = z.infer<typeof ToolRecord>;

export const EvidenceDocument = z.object({
  analysisId: z.string().uuid(),
  origin: JobOrigin,
  generatedAt: z.string().datetime(),
  input: InputMetadata,
  tools: z.array(ToolRecord),
  observations: z.array(Observation),
  inferences: z.array(Inference),
  unknowns: z.array(z.string()),
  warnings: z.array(z.string()),
});
export type EvidenceDocument = z.infer<typeof EvidenceDocument>;
