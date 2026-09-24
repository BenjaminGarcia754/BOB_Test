"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReportFormat = exports.ToolStatus = exports.ConfidenceLevel = exports.ObservationKind = exports.PhaseStatus = exports.JobStatus = exports.JobOrigin = void 0;
const zod_1 = require("zod");
exports.JobOrigin = zod_1.z.enum([
    "source-repository",
    "source-zip",
    "binary",
]);
exports.JobStatus = zod_1.z.enum([
    "queued",
    "preparing",
    "scanning",
    "reporting",
    "completed",
    "failed",
]);
exports.PhaseStatus = zod_1.z.enum(["pending", "running", "completed", "failed"]);
exports.ObservationKind = zod_1.z.enum([
    "import",
    "string",
    "file",
    "dependency",
    "finding",
    "function",
    "secret-pattern",
]);
exports.ConfidenceLevel = zod_1.z.enum(["low", "medium", "high"]);
exports.ToolStatus = zod_1.z.enum(["completed", "failed", "skipped", "partial"]);
exports.ReportFormat = zod_1.z.enum(["html", "markdown", "json"]);
//# sourceMappingURL=enums.js.map