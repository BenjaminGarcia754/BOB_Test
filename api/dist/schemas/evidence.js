"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EvidenceDocument = exports.ToolRecord = exports.Inference = exports.Observation = exports.ObservationSource = void 0;
const zod_1 = require("zod");
const enums_js_1 = require("./enums.js");
const job_js_1 = require("./job.js");
exports.ObservationSource = zod_1.z.object({
    tool: zod_1.z.string(),
    path: zod_1.z.string().nullable(),
    line: zod_1.z.number().int().positive().nullable(),
    address: zod_1.z.string().nullable(),
    ruleId: zod_1.z.string().nullable(),
});
exports.Observation = zod_1.z.object({
    id: zod_1.z.string(),
    kind: enums_js_1.ObservationKind,
    summary: zod_1.z.string().max(500),
    detail: zod_1.z.string().max(4000).nullable(),
    source: exports.ObservationSource,
    tags: zod_1.z.array(zod_1.z.string()).default([]),
});
exports.Inference = zod_1.z.object({
    id: zod_1.z.string(),
    summary: zod_1.z.string().max(500),
    explanation: zod_1.z.string(),
    confidence: enums_js_1.ConfidenceLevel,
    evidenceIds: zod_1.z.array(zod_1.z.string()).min(1),
});
exports.ToolRecord = zod_1.z.object({
    name: zod_1.z.string(),
    version: zod_1.z.string().nullable(),
    status: enums_js_1.ToolStatus,
    dataDate: zod_1.z.string().nullable(),
    warning: zod_1.z.string().nullable(),
});
exports.EvidenceDocument = zod_1.z.object({
    analysisId: zod_1.z.string().uuid(),
    origin: enums_js_1.JobOrigin,
    generatedAt: zod_1.z.string().datetime(),
    input: job_js_1.InputMetadata,
    tools: zod_1.z.array(exports.ToolRecord),
    observations: zod_1.z.array(exports.Observation),
    inferences: zod_1.z.array(exports.Inference),
    unknowns: zod_1.z.array(zod_1.z.string()),
    warnings: zod_1.z.array(zod_1.z.string()),
});
//# sourceMappingURL=evidence.js.map