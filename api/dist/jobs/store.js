"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getJob = getJob;
exports.setJob = setJob;
exports.deleteJob = deleteJob;
exports.getAllJobs = getAllJobs;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const config_js_1 = require("../config.js");
const jobMap = new Map();
function getJob(id) {
    return jobMap.get(id);
}
function setJob(job) {
    jobMap.set(job.jobId, job);
    persistMeta(job);
}
function deleteJob(id) {
    jobMap.delete(id);
}
function getAllJobs() {
    return Array.from(jobMap.values());
}
function persistMeta(job) {
    try {
        const metaPath = path_1.default.join(config_js_1.config.workDir, job.jobId, "meta.json");
        fs_1.default.mkdirSync(path_1.default.dirname(metaPath), { recursive: true });
        fs_1.default.writeFileSync(metaPath, JSON.stringify(job, null, 2), "utf-8");
    }
    catch {
        // Non-fatal: in-memory state is authoritative
    }
}
//# sourceMappingURL=store.js.map