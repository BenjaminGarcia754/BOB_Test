"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.JobRecord = exports.InputMetadata = exports.PhaseRecord = void 0;
const zod_1 = require("zod");
const enums_js_1 = require("./enums.js");
exports.PhaseRecord = zod_1.z.object({
    name: zod_1.z.string(),
    startedAt: zod_1.z.string().datetime().nullable(),
    endedAt: zod_1.z.string().datetime().nullable(),
    status: enums_js_1.PhaseStatus,
});
exports.InputMetadata = zod_1.z.object({
    name: zod_1.z.string(),
    sha256: zod_1.z.string().nullable(),
    commit: zod_1.z.string().nullable(),
    url: zod_1.z.string().url().nullable().optional(),
});
exports.JobRecord = zod_1.z.object({
    jobId: zod_1.z.string().uuid(),
    origin: enums_js_1.JobOrigin,
    status: enums_js_1.JobStatus,
    createdAt: zod_1.z.string().datetime(),
    updatedAt: zod_1.z.string().datetime(),
    input: exports.InputMetadata,
    phases: zod_1.z.array(exports.PhaseRecord),
    warnings: zod_1.z.array(zod_1.z.string()),
    error: zod_1.z
        .object({
        phase: zod_1.z.string(),
        message: zod_1.z.string(),
        cause: zod_1.z.string(),
    })
        .nullable(),
    workDir: zod_1.z.string(),
});
//# sourceMappingURL=job.js.map