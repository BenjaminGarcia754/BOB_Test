"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.categoriseImport = categoriseImport;
exports.categoriseString = categoriseString;
exports.runGhidra = runGhidra;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const spawn_js_1 = require("../spawn.js");
const secrets_js_1 = require("../secrets.js");
const config_js_1 = require("../../config.js");
const IMPORT_CATEGORIES = {
    "file-io": [
        "CreateFileW", "CreateFileA", "ReadFile", "WriteFile", "DeleteFileW", "DeleteFileA",
        "OpenFile", "SetFilePointer", "CloseHandle", "FindFirstFileW", "FindNextFileW",
    ],
    network: [
        "WSAStartup", "WSACleanup", "connect", "send", "recv", "bind", "listen", "accept",
        "InternetOpenA", "InternetOpenW", "HttpSendRequestA", "WinHttpOpen",
        "socket", "closesocket", "gethostbyname",
    ],
    crypto: [
        "CryptEncrypt", "CryptDecrypt", "BCryptHashData", "BCryptEncrypt", "BCryptDecrypt",
        "CryptAcquireContextW", "CryptAcquireContextA", "MD5Init", "SHA1Init", "CryptHashData",
    ],
    process: [
        "CreateProcessW", "CreateProcessA", "OpenProcess", "TerminateProcess",
        "ShellExecuteW", "ShellExecuteA", "WinExec",
    ],
    registry: [
        "RegOpenKeyExW", "RegOpenKeyExA", "RegSetValueExW", "RegSetValueExA",
        "RegQueryValueExW", "RegDeleteKeyW", "RegCreateKeyExW",
    ],
    memory: [
        "VirtualAlloc", "VirtualAllocEx", "VirtualProtect", "HeapAlloc", "HeapFree",
        "GlobalAlloc", "LocalAlloc",
    ],
    debug: [
        "IsDebuggerPresent", "CheckRemoteDebuggerPresent", "OutputDebugStringA",
        "NtQueryInformationProcess",
    ],
    injection: [
        "WriteProcessMemory", "CreateRemoteThread", "NtCreateThreadEx",
        "QueueUserAPC", "SetWindowsHookExA",
    ],
};
function categoriseImport(name) {
    for (const [category, fns] of Object.entries(IMPORT_CATEGORIES)) {
        if (fns.includes(name))
            return category;
    }
    return "other";
}
function categoriseString(value) {
    const tags = [];
    if (/\.(exe|dll|sys|bat|cmd)$/i.test(value))
        tags.push("file-ref");
    if (/^https?:\/\//i.test(value))
        tags.push("url");
    if (/HKEY_/i.test(value))
        tags.push("registry-ref");
    if (/Software\\/.test(value))
        tags.push("registry-ref");
    return tags;
}
async function runGhidra(binaryPath, workDir, rawOutputPath) {
    const ghidraHeadless = path_1.default.join(config_js_1.config.ghidraHome, "support", "analyzeHeadless");
    // Check Ghidra exists
    if (!fs_1.default.existsSync(ghidraHeadless)) {
        throw new Error(`TOOL_ERROR: Ghidra not found at GHIDRA_HOME (${config_js_1.config.ghidraHome})`);
    }
    const ghidraProjectDir = path_1.default.join(workDir, "ghidra-project");
    const scriptsDir = path_1.default.resolve(path_1.default.join(__dirname, "..", "..", "..", "scripts", "ghidra"));
    const exportScriptPath = path_1.default.join(scriptsDir, "ExportAnalysis.java");
    const scriptLogPath = path_1.default.join(workDir, "raw", "ghidra-script.log");
    const ghidraLogPath = path_1.default.join(workDir, "raw", "ghidra.log");
    fs_1.default.mkdirSync(ghidraProjectDir, { recursive: true });
    const args = [
        ghidraProjectDir,
        "TempProject",
        "-import",
        binaryPath,
        "-postScript",
        exportScriptPath,
        "-scriptPath",
        scriptsDir,
        "-scriptlog",
        scriptLogPath,
        "-log",
        ghidraLogPath,
        "-deleteProject",
    ];
    try {
        const result = await (0, spawn_js_1.spawnSafe)(ghidraHeadless, args, {
            timeout: config_js_1.config.analysisTimeoutMs,
            cwd: workDir,
            env: {
                ...process.env,
                MAX_FUNCTIONS: String(config_js_1.config.maxGhidraFunctions),
                GHIDRA_OUTPUT: rawOutputPath,
            },
        });
        if (result.code !== 0) {
            fs_1.default.writeFileSync(path_1.default.join(workDir, "raw", "ghidra-stderr.txt"), result.stderr, "utf-8");
            throw new Error(`TOOL_ERROR: Ghidra analyzeHeadless exited with code ${result.code}`);
        }
        let raw;
        try {
            const rawContent = fs_1.default.readFileSync(rawOutputPath, "utf-8");
            raw = JSON.parse(rawContent);
        }
        catch {
            throw new Error("VALIDATION_ERROR: Ghidra export script produced invalid JSON");
        }
        const observations = normaliseGhidraOutput(raw);
        const toolRecord = {
            name: "ghidra",
            version: null,
            status: "completed",
            dataDate: null,
            warning: raw.imports.length === 0 ? "No imports found in binary" : null,
        };
        return { observations, toolRecord };
    }
    catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        // Rethrow TOOL_ERROR and VALIDATION_ERROR as-is (job-failing errors)
        throw new Error(message.startsWith("TOOL_ERROR:") || message.startsWith("VALIDATION_ERROR:")
            ? message
            : `TOOL_ERROR: ${message}`);
    }
}
function normaliseGhidraOutput(raw) {
    const obs = [];
    // Format / architecture observation
    obs.push({
        id: "obs-tmp",
        kind: "file",
        summary: `PE binary: ${raw.format}, ${raw.architecture}`.slice(0, 500),
        detail: `Compiler hint: ${raw.compiler ?? "unknown"} | Image base: ${raw.imageBase}`,
        source: { tool: "ghidra", path: null, line: null, address: raw.imageBase, ruleId: null },
        tags: ["binary-format"],
    });
    // Imports
    for (const imp of raw.imports) {
        obs.push({
            id: "obs-tmp",
            kind: "import",
            summary: `${imp.library} → ${imp.name}`.slice(0, 500),
            detail: null,
            source: { tool: "ghidra", path: null, line: null, address: imp.address, ruleId: null },
            tags: [categoriseImport(imp.name)],
        });
    }
    // Strings
    let redactedCount = 0;
    for (const str of raw.strings) {
        if ((0, secrets_js_1.shouldRedactString)(str.value)) {
            redactedCount++;
            continue;
        }
        obs.push({
            id: "obs-tmp",
            kind: "string",
            summary: str.value.slice(0, 120),
            detail: str.value.slice(0, 4000),
            source: { tool: "ghidra", path: null, line: null, address: str.address, ruleId: null },
            tags: categoriseString(str.value),
        });
    }
    if (redactedCount > 0) {
        // Add a warning observation about redacted strings
        obs.push({
            id: "obs-tmp",
            kind: "secret-pattern",
            summary: `${redactedCount} strings excluded from observations due to potential secret content`,
            detail: null,
            source: { tool: "ghidra", path: null, line: null, address: null, ruleId: null },
            tags: ["redacted"],
        });
    }
    // Functions
    for (const fn of raw.functions) {
        obs.push({
            id: "obs-tmp",
            kind: "function",
            summary: `Function ${fn.name} at ${fn.address} (${fn.size} bytes)`.slice(0, 500),
            detail: fn.pseudocode?.slice(0, 4000) ?? null,
            source: { tool: "ghidra", path: null, line: null, address: fn.address, ruleId: null },
            tags: fn.calledFunctions.map((c) => `calls:${c}`),
        });
    }
    return obs;
}
//# sourceMappingURL=ghidra.js.map