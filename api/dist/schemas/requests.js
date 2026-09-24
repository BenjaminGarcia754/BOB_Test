"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.JobStatusResponse = exports.JobAcceptedResponse = exports.RepositoryRequest = void 0;
const zod_1 = require("zod");
const job_js_1 = require("./job.js");
exports.RepositoryRequest = zod_1.z.object({
    url: zod_1.z
        .string()
        .url()
        .refine((u) => {
        try {
            return new URL(u).hostname === "github.com";
        }
        catch {
            return false;
        }
    }, { message: "Only github.com repositories are accepted" })
        .refine((u) => /^https:\/\/github\.com\/[^/]+\/[^/?#]+/.test(u), {
        message: "URL must be https://github.com/<owner>/<repo>",
    }),
});
exports.JobAcceptedResponse = zod_1.z.object({
    jobId: zod_1.z.string().uuid(),
    status: zod_1.z.literal("queued"),
    createdAt: zod_1.z.string().datetime(),
    links: zod_1.z.object({
        status: zod_1.z.string(),
        report: zod_1.z.string(),
    }),
});
exports.JobStatusResponse = job_js_1.JobRecord.omit({ workDir: true });
//# sourceMappingURL=requests.js.map