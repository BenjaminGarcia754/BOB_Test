import { z } from "zod";
export declare const RepositoryRequest: z.ZodObject<{
    url: z.ZodEffects<z.ZodEffects<z.ZodString, string, string>, string, string>;
}, "strip", z.ZodTypeAny, {
    url: string;
}, {
    url: string;
}>;
export type RepositoryRequest = z.infer<typeof RepositoryRequest>;
export declare const JobAcceptedResponse: z.ZodObject<{
    jobId: z.ZodString;
    status: z.ZodLiteral<"queued">;
    createdAt: z.ZodString;
    links: z.ZodObject<{
        status: z.ZodString;
        report: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        status: string;
        report: string;
    }, {
        status: string;
        report: string;
    }>;
}, "strip", z.ZodTypeAny, {
    status: "queued";
    jobId: string;
    createdAt: string;
    links: {
        status: string;
        report: string;
    };
}, {
    status: "queued";
    jobId: string;
    createdAt: string;
    links: {
        status: string;
        report: string;
    };
}>;
export type JobAcceptedResponse = z.infer<typeof JobAcceptedResponse>;
export declare const JobStatusResponse: z.ZodObject<Omit<{
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
}, "workDir">, "strip", z.ZodTypeAny, {
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
}>;
export type JobStatusResponse = z.infer<typeof JobStatusResponse>;
//# sourceMappingURL=requests.d.ts.map