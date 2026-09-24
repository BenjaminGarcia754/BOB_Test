"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runSemgrep = runSemgrep;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const spawn_js_1 = require("../spawn.js");
const secrets_js_1 = require("../secrets.js");
async function runSemgrep(sourceDir, rawOutputPath) {
    const args = [
        "--config",
        "auto",
        "--json",
        "--output",
        rawOutputPath,
        "--timeout",
        "120",
        "--max-memory",
        "512",
        "--no-git-ignore",
        sourceDir,
    ];
    let toolRecord = {
        name: "semgrep",
        version: null,
        status: "failed",
        dataDate: null,
        warning: null,
    };
    try {
        const result = await (0, spawn_js_1.spawnSafe)("semgrep", args, { timeout: 150_000 });
        // Semgrep exits with code 1 when findings are found — that's OK
        if (result.code > 1) {
            toolRecord = {
                name: "semgrep",
                version: null,
                status: "failed",
                dataDate: null,
                warning: `semgrep exited with code ${result.code}: ${result.stderr.slice(0, 200)}`,
            };
            return { observations: [], toolRecord };
        }
        // Write stderr for debugging even on success
        if (result.stderr) {
            fs_1.default.writeFileSync(path_1.default.join(path_1.default.dirname(rawOutputPath), "semgrep-stderr.txt"), result.stderr, "utf-8");
        }
        let raw = {};
        try {
            const rawContent = fs_1.default.readFileSync(rawOutputPath, "utf-8");
            raw = JSON.parse(rawContent);
        }
        catch {
            toolRecord.warning = "semgrep output could not be parsed";
            return { observations: [], toolRecord };
        }
        const observations = normalise(raw, sourceDir);
        toolRecord = {
            name: "semgrep",
            version: null,
            status: "completed",
            dataDate: null,
            warning: null,
        };
        return { observations, toolRecord };
    }
    catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        if (message.includes("ENOENT") || message.includes("not found")) {
            toolRecord.warning = "semgrep: not installed or scan failed";
        }
        else {
            toolRecord.warning = message.slice(0, 200);
        }
        return { observations: [], toolRecord };
    }
}
function normalise(raw, sourceDir) {
    const findings = raw.results ?? [];
    return findings.map((f) => {
        const ruleId = f.check_id;
        const message = f.extra.message ?? "";
        const summary = `[${ruleId}] ${message}`.slice(0, 500);
        const rawDetail = f.extra.lines ?? "";
        const detail = (0, secrets_js_1.stripSecrets)(rawDetail).slice(0, 4000) || null;
        const severity = f.extra.severity ??
            f.extra.metadata?.severity ??
            "INFO";
        const relPath = path_1.default.relative(sourceDir, f.path).replace(/\\/g, "/");
        return {
            id: "obs-tmp",
            kind: "finding",
            summary,
            detail,
            source: {
                tool: "semgrep",
                path: relPath,
                line: f.start.line,
                address: null,
                ruleId,
            },
            tags: [`severity:${severity.toUpperCase()}`],
        };
    });
}
//# sourceMappingURL=semgrep.js.map