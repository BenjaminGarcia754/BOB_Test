import { z } from "zod";
export declare const PhaseRecord: z.ZodObject<{
    name: z.ZodString;
    startedAt: z.ZodNullable<z.ZodString>;
    endedAt: z.ZodNullable<z.ZodString>;
    status: z.ZodEnum<["pending", "running", "completed", "failed"]>;
}, "strip", z.ZodTypeAny, {
    status: "completed" | "failed" | "pending" | "running";
    name: string;
    startedAt: string | null;
    endedAt: string | null;
}, {
    status: "completed" | "failed" | "pending" | "running";
    name: string;
    startedAt: string | null;
    endedAt: string | null;
}>;
export type PhaseRecord = z.infer<typeof PhaseRecord>;
export declare const InputMetadata: z.ZodObject<{
    name: z.ZodString;
    sha256: z.ZodNullable<z.ZodString>;
    commit: z.ZodNullable<z.ZodString>;
    url: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    name: string;
    sha256: string | null;
    commit: string | null;
    url?: string | null | undefined;
}, {
    name: string;
    sha256: string | null;
    commit: string | null;
    url?: string | null | undefined;
}>;
export type InputMetadata = z.infer<typeof InputMetadata>;
export declare const JobRecord: z.ZodObject<{
    jobId: z.ZodString;
    origin: z.ZodEnum<["source-repository", "source-zip", "binary"]>;
    status: z.ZodEnum<["queued", "preparing", "scanning", "reporting", "completed", "failed"]>;
    createdAt: z.ZodString;
    updatedAt: z.ZodString;
    input: z.ZodObject<{
        name: z.ZodString;
        sha256: z.ZodNullable<z.ZodString>;
        commit: z.ZodNullable<z.ZodString>;
        url: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    }, "strip", z.ZodTypeAny, {
        name: string;
        sha256: string | null;
        commit: string | null;
        url?: string | null | undefined;
    }, {
        name: string;
        sha256: string | null;
        commit: string | null;
        url?: string | null | undefined;
    }>;
    phases: z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        startedAt: z.ZodNullable<z.ZodString>;
        endedAt: z.ZodNullable<z.ZodString>;
        status: z.ZodEnum<["pending", "running", "completed", "failed"]>;
    }, "strip", z.ZodTypeAny, {
        status: "completed" | "failed" | "pending" | "running";
        name: string;
        startedAt: string | null;
        endedAt: string | null;
    }, {
        status: "completed" | "failed" | "pending" | "running";
        name: string;
        startedAt: string | null;
        endedAt: string | null;
    }>, "many">;
    warnings: z.ZodArray<z.ZodString, "many">;
    error: z.ZodNullable<z.ZodObject<{
        phase: z.ZodString;
        message: z.ZodString;
        cause: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        message: string;
        phase: string;
        cause: string;
    }, {
        message: string;
        phase: string;
        cause: string;
    }>>;
    workDir: z.ZodString;
}, "strip", z.ZodTypeAny, {
    status: "queued" | "preparing" | "scanning" | "reporting" | "completed" | "failed";
    jobId: string;
    origin: "source-repository" | "source-zip" | "binary";
    createdAt: string;
    updatedAt: string;
    input: {
        name: string;
        sha256: string | null;
        commit: string | null;
        url?: string | null | undefined;
    };
    phases: {
        status: "completed" | "failed" | "pending" | "running";
        name: string;
        startedAt: string | null;
        endedAt: string | null;
    }[];
    warnings: string[];
    error: {
        message: string;
        phase: string;
        cause: string;
    } | null;
    workDir: string;
}, {
    status: "queued" | "preparing" | "scanning" | "reporting" | "completed" | "failed";
    jobId: string;
    origin: "source-repository" | "source-zip" | "binary";
    createdAt: string;
    updatedAt: string;
    input: {
        name: string;
        sha256: string | null;
        commit: string | null;
        url?: string | null | undefined;
    };
    phases: {
        status: "completed" | "failed" | "pending" | "running";
        name: string;
        startedAt: string | null;
        endedAt: string | null;
    }[];
    warnings: string[];
    error: {
        message: string;
        phase: string;
        cause: string;
    } | null;
    workDir: string;
}>;
export type JobRecord = z.infer<typeof JobRecord>;
//# sourceMappingURL=job.d.ts.map