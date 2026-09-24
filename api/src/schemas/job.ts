import { z } from "zod";
import { JobOrigin, JobStatus, PhaseStatus } from "./enums.js";

export const PhaseRecord = z.object({
  name: z.string(),
  startedAt: z.string().datetime().nullable(),
  endedAt: z.string().datetime().nullable(),
  status: PhaseStatus,
});
export type PhaseRecord = z.infer<typeof PhaseRecord>;

export const InputMetadata = z.object({
  name: z.string(),
  sha256: z.string().nullable(),
  commit: z.string().nullable(),
  url: z.string().url().nullable().optional(),
});
export type InputMetadata = z.infer<typeof InputMetadata>;

export const JobRecord = z.object({
  jobId: z.string().uuid(),
  origin: JobOrigin,
  status: JobStatus,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  input: InputMetadata,
  phases: z.array(PhaseRecord),
  warnings: z.array(z.string()),
  error: z
    .object({
      phase: z.string(),
      message: z.string(),
      cause: z.string(),
    })
    .nullable(),
  workDir: z.string(),
});
export type JobRecord = z.infer<typeof JobRecord>;
