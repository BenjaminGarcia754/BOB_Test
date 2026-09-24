"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
const path_1 = __importDefault(require("path"));
function getEnv(key, defaultValue) {
    const val = process.env[key];
    if (val !== undefined && val !== "")
        return val;
    if (defaultValue !== undefined)
        return defaultValue;
    throw new Error(`Required environment variable ${key} is not set`);
}
function getEnvInt(key, defaultValue) {
    const val = process.env[key];
    if (val !== undefined && val !== "") {
        const n = parseInt(val, 10);
        if (!isNaN(n))
            return n;
    }
    return defaultValue;
}
exports.config = {
    port: getEnvInt("PORT", 3000),
    workDir: path_1.default.resolve(getEnv("WORK_DIR", "./work")),
    ghidraHome: getEnv("GHIDRA_HOME", "/opt/ghidra"),
    analysisTimeoutMs: getEnvInt("ANALYSIS_TIMEOUT_MS", 300_000),
    maxQueueDepth: getEnvInt("MAX_QUEUE_DEPTH", 10),
    jobRetentionMs: getEnvInt("JOB_RETENTION_MS", 3_600_000),
    maxGhidraFunctions: getEnvInt("MAX_GHIDRA_FUNCTIONS", 20),
    maxZipFiles: 500,
    maxZipUncompressedBytes: 200 * 1024 * 1024,
    maxSourceZipBytes: 50 * 1024 * 1024,
    maxBinaryBytes: 100 * 1024 * 1024,
};
//# sourceMappingURL=config.js.map