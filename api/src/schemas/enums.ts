import { z } from "zod";

export const JobOrigin = z.enum([
  "source-repository",
  "source-zip",
  "binary",
]);
export type JobOrigin = z.infer<typeof JobOrigin>;

export const JobStatus = z.enum([
  "queued",
  "preparing",
  "scanning",
  "reporting",
  "completed",
  "failed",
]);
export type JobStatus = z.infer<typeof JobStatus>;

export const PhaseStatus = z.enum(["pending", "running", "completed", "failed"]);
export type PhaseStatus = z.infer<typeof PhaseStatus>;

export const ObservationKind = z.enum([
  "import",
  "string",
  "file",
  "dependency",
  "finding",
  "function",
  "secret-pattern",
]);
export type ObservationKind = z.infer<typeof ObservationKind>;

export const ConfidenceLevel = z.enum(["low", "medium", "high"]);
export type ConfidenceLevel = z.infer<typeof ConfidenceLevel>;

export const ToolStatus = z.enum(["completed", "failed", "skipped", "partial"]);
export type ToolStatus = z.infer<typeof ToolStatus>;

export const ReportFormat = z.enum(["html", "markdown", "json"]);
export type ReportFormat = z.infer<typeof ReportFormat>;
