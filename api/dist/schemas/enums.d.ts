import { z } from "zod";
export declare const JobOrigin: z.ZodEnum<["source-repository", "source-zip", "binary"]>;
export type JobOrigin = z.infer<typeof JobOrigin>;
export declare const JobStatus: z.ZodEnum<["queued", "preparing", "scanning", "reporting", "completed", "failed"]>;
export type JobStatus = z.infer<typeof JobStatus>;
export declare const PhaseStatus: z.ZodEnum<["pending", "running", "completed", "failed"]>;
export type PhaseStatus = z.infer<typeof PhaseStatus>;
export declare const ObservationKind: z.ZodEnum<["import", "string", "file", "dependency", "finding", "function", "secret-pattern"]>;
export type ObservationKind = z.infer<typeof ObservationKind>;
export declare const ConfidenceLevel: z.ZodEnum<["low", "medium", "high"]>;
export type ConfidenceLevel = z.infer<typeof ConfidenceLevel>;
export declare const ToolStatus: z.ZodEnum<["completed", "failed", "skipped", "partial"]>;
export type ToolStatus = z.infer<typeof ToolStatus>;
export declare const ReportFormat: z.ZodEnum<["html", "markdown", "json"]>;
export type ReportFormat = z.infer<typeof ReportFormat>;
//# sourceMappingURL=enums.d.ts.map