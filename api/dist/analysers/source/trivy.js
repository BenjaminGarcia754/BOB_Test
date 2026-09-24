"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runTrivy = runTrivy;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const spawn_js_1 = require("../spawn.js");
const secrets_js_1 = require("../secrets.js");
async function runTrivy(sourceDir, rawOutputPath) {
    const args = [
        "fs",
        "--format",
        "json",
        "--output",
        rawOutputPath,
        "--timeout",
        "2m",
        "--skip-update",
        sourceDir,
    ];
    let toolRecord = {
        name: "trivy",
        version: null,
        status: "failed",
        dataDate: null,
        warning: null,
    };
    try {
        const result = await (0, spawn_js_1.spawnSafe)("trivy", args, { timeout: 150_000 });
        if (result.stderr) {
            fs_1.default.writeFileSync(path_1.default.join(path_1.default.dirname(rawOutputPath), "trivy-stderr.txt"), result.stderr, "utf-8");
        }
        if (result.code !== 0 && result.code !== 1) {
            toolRecord.warning = `trivy exited with code ${result.code}: ${result.stderr.slice(0, 200)}`;
            return { observations: [], toolRecord };
        }
        let raw = {};
        try {
            const rawContent = fs_1.default.readFileSync(rawOutputPath, "utf-8");
            raw = JSON.parse(rawContent);
        }
        catch {
            toolRecord.warning = "trivy output could not be parsed";
            return { observations: [], toolRecord };
        }
        const dataDate = raw.Metadata?.DBStatus?.UpdatedAt ?? null;
        const observations = normalise(raw, sourceDir);
        toolRecord = {
            name: "trivy",
            version: null,
            status: "completed",
            dataDate,
            warning: null,
        };
        return { observations, toolRecord };
    }
    catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        if (message.includes("ENOENT") || message.includes("not found")) {
            toolRecord.warning = "trivy: not installed or scan failed";
        }
        else {
            toolRecord.warning = message.slice(0, 200);
        }
        return { observations: [], toolRecord };
    }
}
function normalise(raw, sourceDir) {
    const obs = [];
    for (const result of raw.Results ?? []) {
        const relTarget = path_1.default.relative(sourceDir, result.Target).replace(/\\/g, "/") || result.Target;
        const ecosystem = result.Type ?? "unknown";
        for (const vuln of result.Vulnerabilities ?? []) {
            const summary = `${vuln.PkgName}@${vuln.InstalledVersion}: ${vuln.Title ?? ""}`.slice(0, 500);
            const rawDetail = vuln.Description ?? "";
            const detail = (0, secrets_js_1.stripSecrets)(rawDetail).slice(0, 4000) || null;
            obs.push({
                id: "obs-tmp",
                kind: "dependency",
                summary,
                detail,
                source: {
                    tool: "trivy",
                    path: relTarget,
                    line: null,
                    address: null,
                    ruleId: vuln.VulnerabilityID,
                },
                tags: [
                    `severity:${(vuln.Severity ?? "UNKNOWN").toUpperCase()}`,
                    `ecosystem:${ecosystem}`,
                ],
            });
        }
        for (const secret of result.Secrets ?? []) {
            const match = secret.Match ?? "";
            obs.push({
                id: "obs-tmp",
                kind: "secret-pattern",
                summary: `${secret.Title} (${secret.RuleID})`.slice(0, 500),
                detail: match ? "[REDACTED — potential secret]" : null,
                source: {
                    tool: "trivy",
                    path: secret.Target ?? relTarget,
                    line: secret.StartLine ?? null,
                    address: null,
                    ruleId: secret.RuleID,
                },
                tags: [`severity:${(secret.Severity ?? "HIGH").toUpperCase()}`],
            });
        }
        for (const misconfig of result.Misconfigurations ?? []) {
            const summary = `${misconfig.Title ?? ""}: ${misconfig.Message ?? ""}`.slice(0, 500);
            const detail = misconfig.Description?.slice(0, 4000) ?? null;
            obs.push({
                id: "obs-tmp",
                kind: "finding",
                summary,
                detail,
                source: {
                    tool: "trivy",
                    path: relTarget,
                    line: null,
                    address: null,
                    ruleId: misconfig.AVDID ?? null,
                },
                tags: [`severity:${(misconfig.Severity ?? "UNKNOWN").toUpperCase()}`],
            });
        }
    }
    return obs;
}
//# sourceMappingURL=trivy.js.map