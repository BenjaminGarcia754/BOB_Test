"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.transition = transition;
exports.failJob = failJob;
exports.createInitialPhases = createInitialPhases;
exports.processJob = processJob;
exports.startWorker = startWorker;
exports.startCleanupLoop = startCleanupLoop;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const store_js_1 = require("./store.js");
const queue_js_1 = require("./queue.js");
const config_js_1 = require("../config.js");
const index_js_1 = require("../analysers/source/index.js");
const index_js_2 = require("../analysers/binary/index.js");
const generator_js_1 = require("../report/generator.js");
const PHASE_NAMES = ["queued", "preparing", "scanning", "reporting", "completed"];
function now() {
    return new Date().toISOString();
}
function transition(job, toPhase) {
    const currentPhaseName = job.status;
    const currentPhaseRecord = job.phases.find((p) => p.name === currentPhaseName);
    if (currentPhaseRecord && currentPhaseRecord.status === "running") {
        currentPhaseRecord.endedAt = now();
        currentPhaseRecord.status = "completed";
    }
    job.status = toPhase;
    job.updatedAt = now();
    const nextPhaseRecord = job.phases.find((p) => p.name === toPhase);
    if (nextPhaseRecord) {
        nextPhaseRecord.startedAt = now();
        nextPhaseRecord.status = toPhase === "completed" ? "completed" : "running";
        if (toPhase === "completed") {
            nextPhaseRecord.endedAt = now();
        }
    }
    (0, store_js_1.setJob)(job);
}
async function failJob(job, phase, err) {
    const currentPhaseRecord = job.phases.find((p) => p.name === job.status);
    if (currentPhaseRecord) {
        currentPhaseRecord.endedAt = now();
        currentPhaseRecord.status = "failed";
    }
    const message = err instanceof Error ? err.message : String(err);
    const cause = message.includes("TIMEOUT")
        ? "TIMEOUT"
        : message.includes("VALIDATION_ERROR")
            ? "VALIDATION_ERROR"
            : message.includes("TOOL_ERROR")
                ? "TOOL_ERROR"
                : "UNKNOWN";
    job.status = "failed";
    job.updatedAt = now();
    job.error = { phase, message, cause };
    (0, store_js_1.setJob)(job);
}
function buildInitialPhases() {
    return PHASE_NAMES.map((name, i) => ({
        name,
        startedAt: i === 0 ? now() : null,
        endedAt: null,
        status: i === 0 ? "running" : "pending",
    }));
}
function createInitialPhases() {
    return buildInitialPhases();
}
async function withTimeout(promise, ms, label) {
    let timer;
    const timeout = new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error(`TIMEOUT: ${label} exceeded ${ms}ms`)), ms);
    });
    try {
        const result = await Promise.race([promise, timeout]);
        return result;
    }
    finally {
        clearTimeout(timer);
    }
}
async function processJob(job) {
    try {
        // Mark queued phase as completed and transition to preparing
        const queuedPhase = job.phases.find((p) => p.name === "queued");
        if (queuedPhase) {
            queuedPhase.endedAt = now();
            queuedPhase.status = "completed";
        }
        transition(job, "preparing");
        // Prepare + scan + report all inside a single timeout race
        await withTimeout(runFullPipeline(job), config_js_1.config.analysisTimeoutMs, `job ${job.jobId}`);
    }
    catch (err) {
        await failJob(job, job.status, err);
    }
}
async function runFullPipeline(job) {
    // Prepare phase: handled inside the pipeline runners (git clone / zip extract / pe validate)
    // Scanning phase
    transition(job, "scanning");
    const workDir = job.workDir;
    let evidenceDocument;
    if (job.origin === "binary") {
        evidenceDocument = await (0, index_js_2.runBinaryPipeline)(job, workDir);
    }
    else {
        evidenceDocument = await (0, index_js_1.runSourcePipeline)(job, workDir);
    }
    // Reporting phase
    transition(job, "reporting");
    const outputDir = path_1.default.join(workDir, "report");
    fs_1.default.mkdirSync(outputDir, { recursive: true });
    await (0, generator_js_1.generateReport)(evidenceDocument, outputDir);
    // Write evidence.json
    fs_1.default.writeFileSync(path_1.default.join(workDir, "evidence.json"), JSON.stringify(evidenceDocument, null, 2), "utf-8");
    transition(job, "completed");
}
let workerRunning = false;
async function workerLoop() {
    while (true) {
        const job = (0, queue_js_1.dequeue)();
        if (job) {
            workerRunning = true;
            await processJob(job);
            workerRunning = false;
        }
        else {
            await new Promise((resolve) => setTimeout(resolve, 200));
        }
    }
}
function startWorker() {
    workerLoop().catch(() => {
        // Restart worker on unexpected crash
        setTimeout(startWorker, 1000);
    });
}
function startCleanupLoop() {
    setInterval(() => {
        const cutoff = Date.now() - config_js_1.config.jobRetentionMs;
        for (const job of (0, store_js_1.getAllJobs)()) {
            if ((job.status === "completed" || job.status === "failed") &&
                new Date(job.updatedAt).getTime() < cutoff) {
                try {
                    fs_1.default.rmSync(job.workDir, { recursive: true, force: true });
                }
                catch {
                    // Ignore cleanup errors
                }
                (0, store_js_1.deleteJob)(job.jobId);
            }
        }
    }, 5 * 60 * 1000);
}
//# sourceMappingURL=worker.js.map