import { z } from "zod";
export declare const ObservationSource: z.ZodObject<{
    tool: z.ZodString;
    path: z.ZodNullable<z.ZodString>;
    line: z.ZodNullable<z.ZodNumber>;
    address: z.ZodNullable<z.ZodString>;
    ruleId: z.ZodNullable<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    path: string | null;
    tool: string;
    line: number | null;
    address: string | null;
    ruleId: string | null;
}, {
    path: string | null;
    tool: string;
    line: number | null;
    address: string | null;
    ruleId: string | null;
}>;
export type ObservationSource = z.infer<typeof ObservationSource>;
export declare const Observation: z.ZodObject<{
    id: z.ZodString;
    kind: z.ZodEnum<["import", "string", "file", "dependency", "finding", "function", "secret-pattern"]>;
    summary: z.ZodString;
    detail: z.ZodNullable<z.ZodString>;
    source: z.ZodObject<{
        tool: z.ZodString;
        path: z.ZodNullable<z.ZodString>;
        line: z.ZodNullable<z.ZodNumber>;
        address: z.ZodNullable<z.ZodString>;
        ruleId: z.ZodNullable<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        path: string | null;
        tool: string;
        line: number | null;
        address: string | null;
        ruleId: string | null;
    }, {
        path: string | null;
        tool: string;
        line: number | null;
        address: string | null;
        ruleId: string | null;
    }>;
    tags: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    id: string;
    kind: "string" | "function" | "import" | "file" | "dependency" | "finding" | "secret-pattern";
    summary: string;
    detail: string | null;
    source: {
        path: string | null;
        tool: string;
        line: number | null;
        address: string | null;
        ruleId: string | null;
    };
    tags: string[];
}, {
    id: string;
    kind: "string" | "function" | "import" | "file" | "dependency" | "finding" | "secret-pattern";
    summary: string;
    detail: string | null;
    source: {
        path: string | null;
        tool: string;
        line: number | null;
        address: string | null;
        ruleId: string | null;
    };
    tags?: string[] | undefined;
}>;
export type Observation = z.infer<typeof Observation>;
export declare const Inference: z.ZodObject<{
    id: z.ZodString;
    summary: z.ZodString;
    explanation: z.ZodString;
    confidence: z.ZodEnum<["low", "medium", "high"]>;
    evidenceIds: z.ZodArray<z.ZodString, "many">;
}, "strip", z.ZodTypeAny, {
    id: string;
    summary: string;
    explanation: string;
    confidence: "low" | "medium" | "high";
    evidenceIds: string[];
}, {
    id: string;
    summary: string;
    explanation: string;
    confidence: "low" | "medium" | "high";
    evidenceIds: string[];
}>;
export type Inference = z.infer<typeof Inference>;
export declare const ToolRecord: z.ZodObject<{
    name: z.ZodString;
    version: z.ZodNullable<z.ZodString>;
    status: z.ZodEnum<["completed", "failed", "skipped", "partial"]>;
    dataDate: z.ZodNullable<z.ZodString>;
    warning: z.ZodNullable<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    status: "completed" | "failed" | "skipped" | "partial";
    name: string;
    version: string | null;
    dataDate: string | null;
    warning: string | null;
}, {
    status: "completed" | "failed" | "skipped" | "partial";
    name: string;
    version: string | null;
    dataDate: string | null;
    warning: string | null;
}>;
export type ToolRecord = z.infer<typeof ToolRecord>;
export declare const EvidenceDocument: z.ZodObject<{
    analysisId: z.ZodString;
    origin: z.ZodEnum<["source-repository", "source-zip", "binary"]>;
    generatedAt: z.ZodString;
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
    tools: z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        version: z.ZodNullable<z.ZodString>;
        status: z.ZodEnum<["completed", "failed", "skipped", "partial"]>;
        dataDate: z.ZodNullable<z.ZodString>;
        warning: z.ZodNullable<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        status: "completed" | "failed" | "skipped" | "partial";
        name: string;
        version: string | null;
        dataDate: string | null;
        warning: string | null;
    }, {
        status: "completed" | "failed" | "skipped" | "partial";
        name: string;
        version: string | null;
        dataDate: string | null;
        warning: string | null;
    }>, "many">;
    observations: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        kind: z.ZodEnum<["import", "string", "file", "dependency", "finding", "function", "secret-pattern"]>;
        summary: z.ZodString;
        detail: z.ZodNullable<z.ZodString>;
        source: z.ZodObject<{
            tool: z.ZodString;
            path: z.ZodNullable<z.ZodString>;
            line: z.ZodNullable<z.ZodNumber>;
            address: z.ZodNullable<z.ZodString>;
            ruleId: z.ZodNullable<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            path: string | null;
            tool: string;
            line: number | null;
            address: string | null;
            ruleId: string | null;
        }, {
            path: string | null;
            tool: string;
            line: number | null;
            address: string | null;
            ruleId: string | null;
        }>;
        tags: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        kind: "string" | "function" | "import" | "file" | "dependency" | "finding" | "secret-pattern";
        summary: string;
        detail: string | null;
        source: {
            path: string | null;
            tool: string;
            line: number | null;
            address: string | null;
            ruleId: string | null;
        };
        tags: string[];
    }, {
        id: string;
        kind: "string" | "function" | "import" | "file" | "dependency" | "finding" | "secret-pattern";
        summary: string;
        detail: string | null;
        source: {
            path: string | null;
            tool: string;
            line: number | null;
            address: string | null;
            ruleId: string | null;
        };
        tags?: string[] | undefined;
    }>, "many">;
    inferences: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        summary: z.ZodString;
        explanation: z.ZodString;
        confidence: z.ZodEnum<["low", "medium", "high"]>;
        evidenceIds: z.ZodArray<z.ZodString, "many">;
    }, "strip", z.ZodTypeAny, {
        id: string;
        summary: string;
        explanation: string;
        confidence: "low" | "medium" | "high";
        evidenceIds: string[];
    }, {
        id: string;
        summary: string;
        explanation: string;
        confidence: "low" | "medium" | "high";
        evidenceIds: string[];
    }>, "many">;
    unknowns: z.ZodArray<z.ZodString, "many">;
    warnings: z.ZodArray<z.ZodString, "many">;
}, "strip", z.ZodTypeAny, {
    origin: "source-repository" | "source-zip" | "binary";
    input: {
        name: string;
        sha256: string | null;
        commit: string | null;
        url?: string | null | undefined;
    };
    warnings: string[];
    analysisId: string;
    generatedAt: string;
    tools: {
        status: "completed" | "failed" | "skipped" | "partial";
        name: string;
        version: string | null;
        dataDate: string | null;
        warning: string | null;
    }[];
    observations: {
        id: string;
        kind: "string" | "function" | "import" | "file" | "dependency" | "finding" | "secret-pattern";
        summary: string;
        detail: string | null;
        source: {
            path: string | null;
            tool: string;
            line: number | null;
            address: string | null;
            ruleId: string | null;
        };
        tags: string[];
    }[];
    inferences: {
        id: string;
        summary: string;
        explanation: string;
        confidence: "low" | "medium" | "high";
        evidenceIds: string[];
    }[];
    unknowns: string[];
}, {
    origin: "source-repository" | "source-zip" | "binary";
    input: {
        name: string;
        sha256: string | null;
        commit: string | null;
        url?: string | null | undefined;
    };
    warnings: string[];
    analysisId: string;
    generatedAt: string;
    tools: {
        status: "completed" | "failed" | "skipped" | "partial";
        name: string;
        version: string | null;
        dataDate: string | null;
        warning: string | null;
    }[];
    observations: {
        id: string;
        kind: "string" | "function" | "import" | "file" | "dependency" | "finding" | "secret-pattern";
        summary: string;
        detail: string | null;
        source: {
            path: string | null;
            tool: string;
            line: number | null;
            address: string | null;
            ruleId: string | null;
        };
        tags?: string[] | undefined;
    }[];
    inferences: {
        id: string;
        summary: string;
        explanation: string;
        confidence: "low" | "medium" | "high";
        evidenceIds: string[];
    }[];
    unknowns: string[];
}>;
export type EvidenceDocument = z.infer<typeof EvidenceDocument>;
//# sourceMappingURL=evidence.d.ts.map