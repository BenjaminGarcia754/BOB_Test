"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.analysesRouter = void 0;
const express_1 = require("express");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const crypto_1 = __importDefault(require("crypto"));
const uuid_1 = require("uuid");
const index_js_1 = require("../schemas/index.js");
const store_js_1 = require("../jobs/store.js");
const queue_js_1 = require("../jobs/queue.js");
const worker_js_1 = require("../jobs/worker.js");
const validate_js_1 = require("../middleware/validate.js");
const upload_js_1 = require("../middleware/upload.js");
const config_js_1 = require("../config.js");
exports.analysesRouter = (0, express_1.Router)();
function now() {
    return new Date().toISOString();
}
function buildJobAcceptedResponse(job) {
    return {
        jobId: job.jobId,
        status: "queued",
        createdAt: job.createdAt,
        links: {
            status: `/api/analyses/${job.jobId}`,
            report: `/api/analyses/${job.jobId}/report`,
        },
    };
}
function createAndEnqueueJob(origin, input, workDir) {
    const jobId = (0, uuid_1.v4)();
    const ts = now();
    const job = {
        jobId,
        origin,
        status: "queued",
        createdAt: ts,
        updatedAt: ts,
        input,
        phases: (0, worker_js_1.createInitialPhases)(),
        warnings: [],
        error: null,
        workDir,
    };
    (0, store_js_1.setJob)(job);
    (0, queue_js_1.enqueue)(job);
    return job;
}
// POST /api/analyses/repository
exports.analysesRouter.post("/repository", (0, validate_js_1.validateBody)(index_js_1.RepositoryRequest), (req, res) => {
    if ((0, queue_js_1.isFull)()) {
        res.status(503).json({
            error: { code: "QUEUE_FULL", message: "Analysis queue is full. Try again later." },
        });
        return;
    }
    const { url } = req.body;
    const urlObj = new URL(url);
    const repoSlug = urlObj.pathname.replace(/^\//, "").replace(/\.git$/, "");
    const jobId = (0, uuid_1.v4)();
    const workDir = path_1.default.join(config_js_1.config.workDir, jobId);
    fs_1.default.mkdirSync(workDir, { recursive: true });
    const job = createAndEnqueueJob("source-repository", { name: repoSlug, sha256: null, commit: null, url }, workDir);
    // Update jobId to the one we created
    Object.assign(job, { jobId: job.jobId });
    res.status(202).json(buildJobAcceptedResponse(job));
});
// POST /api/analyses/source-zip
exports.analysesRouter.post("/source-zip", upload_js_1.sourceZipUpload.single("file"), upload_js_1.handleMulterError, upload_js_1.validateZipMagic, (req, res) => {
    if ((0, queue_js_1.isFull)()) {
        res.status(503).json({
            error: { code: "QUEUE_FULL", message: "Analysis queue is full. Try again later." },
        });
        return;
    }
    const file = req.file;
    const sha256 = crypto_1.default.createHash("sha256").update(file.buffer).digest("hex");
    const jobId = (0, uuid_1.v4)();
    const workDir = path_1.default.join(config_js_1.config.workDir, jobId);
    const inputDir = path_1.default.join(workDir, "input");
    fs_1.default.mkdirSync(inputDir, { recursive: true });
    const uploadPath = path_1.default.join(inputDir, "upload.zip");
    fs_1.default.writeFileSync(uploadPath, file.buffer);
    const job = createAndEnqueueJob("source-zip", { name: file.originalname || "upload.zip", sha256, commit: null }, workDir);
    res.status(202).json(buildJobAcceptedResponse(job));
});
// POST /api/analyses/binary
exports.analysesRouter.post("/binary", upload_js_1.binaryUpload.single("file"), upload_js_1.handleMulterError, upload_js_1.validatePEMagic, (req, res) => {
    if ((0, queue_js_1.isFull)()) {
        res.status(503).json({
            error: { code: "QUEUE_FULL", message: "Analysis queue is full. Try again later." },
        });
        return;
    }
    const file = req.file;
    const sha256 = crypto_1.default.createHash("sha256").update(file.buffer).digest("hex");
    const jobId = (0, uuid_1.v4)();
    const workDir = path_1.default.join(config_js_1.config.workDir, jobId);
    const inputDir = path_1.default.join(workDir, "input");
    fs_1.default.mkdirSync(inputDir, { recursive: true });
    const uploadPath = path_1.default.join(inputDir, "upload.exe");
    fs_1.default.writeFileSync(uploadPath, file.buffer);
    const job = createAndEnqueueJob("binary", { name: file.originalname || "upload.exe", sha256, commit: null }, workDir);
    res.status(202).json(buildJobAcceptedResponse(job));
});
// GET /api/analyses/:id
exports.analysesRouter.get("/:id", (req, res) => {
    const job = (0, store_js_1.getJob)(req.params["id"]);
    if (!job) {
        res.status(404).json({
            error: { code: "JOB_NOT_FOUND", message: "No job found with the given ID" },
        });
        return;
    }
    // Return JobRecord minus workDir
    const { workDir: _workDir, ...statusResponse } = job;
    res.status(200).json(statusResponse);
});
// GET /api/analyses/:id/report
exports.analysesRouter.get("/:id/report", (req, res) => {
    const job = (0, store_js_1.getJob)(req.params["id"]);
    if (!job) {
        res.status(404).json({
            error: { code: "JOB_NOT_FOUND", message: "No job found with the given ID" },
        });
        return;
    }
    if (job.status === "failed") {
        res.status(409).json({
            error: {
                code: "JOB_FAILED",
                message: "Analysis failed; no report available",
                details: { status: job.status, jobId: job.jobId, error: job.error },
            },
        });
        return;
    }
    if (job.status !== "completed") {
        res.status(409).json({
            error: {
                code: "REPORT_NOT_READY",
                message: "Analysis is still in progress",
                details: { status: job.status, jobId: job.jobId },
            },
        });
        return;
    }
    const formatParam = req.query.format || "html";
    const formatResult = index_js_1.ReportFormat.safeParse(formatParam);
    if (!formatResult.success) {
        res.status(400).json({
            error: {
                code: "VALIDATION_ERROR",
                message: "Invalid format parameter. Use html, markdown, or json.",
            },
        });
        return;
    }
    const format = formatResult.data;
    const reportDir = path_1.default.join(job.workDir, "report");
    try {
        if (format === "html") {
            const html = fs_1.default.readFileSync(path_1.default.join(reportDir, "report.html"), "utf-8");
            res.setHeader("Content-Type", "text/html; charset=utf-8");
            res.status(200).send(html);
        }
        else if (format === "markdown") {
            const md = fs_1.default.readFileSync(path_1.default.join(reportDir, "report.md"), "utf-8");
            res.setHeader("Content-Type", "text/markdown; charset=utf-8");
            res.status(200).send(md);
        }
        else {
            const json = fs_1.default.readFileSync(path_1.default.join(reportDir, "report.json"), "utf-8");
            res.setHeader("Content-Type", "application/json; charset=utf-8");
            res.status(200).send(json);
        }
    }
    catch {
        res.status(500).json({
            error: { code: "INTERNAL_ERROR", message: "Report files not found on disk" },
        });
    }
});
//# sourceMappingURL=analyses.js.map