import fs from "fs";
import path from "path";
import { Observation, ToolRecord } from "../../schemas/index.js";
import { spawnSafe } from "../spawn.js";
import { shouldRedactString } from "../secrets.js";
import { config } from "../../config.js";

export interface GhidraRawOutput {
  format: string;
  architecture: string;
  compiler?: string;
  imageBase: string;
  imports: Array<{ library: string; name: string; address: string }>;
  strings: Array<{ value: string; address: string; length: number }>;
  functions: Array<{
    name: string;
    address: string;
    size: number;
    calledFunctions: string[];
    pseudocode: string;
  }>;
}

const IMPORT_CATEGORIES: Record<string, string[]> = {
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

export function categoriseImport(name: string): string {
  for (const [category, fns] of Object.entries(IMPORT_CATEGORIES)) {
    if (fns.includes(name)) return category;
  }
  return "other";
}

export function categoriseString(value: string): string[] {
  const tags: string[] = [];
  if (/\.(exe|dll|sys|bat|cmd)$/i.test(value)) tags.push("file-ref");
  if (/^https?:\/\//i.test(value)) tags.push("url");
  if (/HKEY_/i.test(value)) tags.push("registry-ref");
  if (/Software\\/.test(value)) tags.push("registry-ref");
  return tags;
}

export async function runGhidra(
  binaryPath: string,
  workDir: string,
  rawOutputPath: string
): Promise<{ observations: Observation[]; toolRecord: ToolRecord }> {
  const ghidraHeadless = path.join(config.ghidraHome, "support", "analyzeHeadless");

  // Check Ghidra exists
  if (!fs.existsSync(ghidraHeadless)) {
    throw new Error(`TOOL_ERROR: Ghidra not found at GHIDRA_HOME (${config.ghidraHome})`);
  }

  const ghidraProjectDir = path.join(workDir, "ghidra-project");
  const scriptsDir = path.resolve(
    path.join(__dirname, "..", "..", "..", "scripts", "ghidra")
  );
  const exportScriptPath = path.join(scriptsDir, "ExportAnalysis.java");
  const scriptLogPath = path.join(workDir, "raw", "ghidra-script.log");
  const ghidraLogPath = path.join(workDir, "raw", "ghidra.log");

  fs.mkdirSync(ghidraProjectDir, { recursive: true });

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
    const result = await spawnSafe(ghidraHeadless, args, {
      timeout: config.analysisTimeoutMs,
      cwd: workDir,
      env: {
        ...process.env,
        MAX_FUNCTIONS: String(config.maxGhidraFunctions),
        GHIDRA_OUTPUT: rawOutputPath,
      },
    });

    if (result.code !== 0) {
      fs.writeFileSync(
        path.join(workDir, "raw", "ghidra-stderr.txt"),
        result.stderr,
        "utf-8"
      );
      throw new Error(
        `TOOL_ERROR: Ghidra analyzeHeadless exited with code ${result.code}`
      );
    }

    let raw: GhidraRawOutput;
    try {
      const rawContent = fs.readFileSync(rawOutputPath, "utf-8");
      raw = JSON.parse(rawContent) as GhidraRawOutput;
    } catch {
      throw new Error("VALIDATION_ERROR: Ghidra export script produced invalid JSON");
    }

    const observations = normaliseGhidraOutput(raw);
    const toolRecord: ToolRecord = {
      name: "ghidra",
      version: null,
      status: "completed",
      dataDate: null,
      warning: raw.imports.length === 0 ? "No imports found in binary" : null,
    };

    return { observations, toolRecord };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    // Rethrow TOOL_ERROR and VALIDATION_ERROR as-is (job-failing errors)
    throw new Error(message.startsWith("TOOL_ERROR:") || message.startsWith("VALIDATION_ERROR:")
      ? message
      : `TOOL_ERROR: ${message}`
    );
  }
}

function normaliseGhidraOutput(raw: GhidraRawOutput): Observation[] {
  const obs: Observation[] = [];

  // Format / architecture observation
  obs.push({
    id: "obs-tmp",
    kind: "file" as const,
    summary: `PE binary: ${raw.format}, ${raw.architecture}`.slice(0, 500),
    detail: `Compiler hint: ${raw.compiler ?? "unknown"} | Image base: ${raw.imageBase}`,
    source: { tool: "ghidra", path: null, line: null, address: raw.imageBase, ruleId: null },
    tags: ["binary-format"],
  });

  // Imports
  for (const imp of raw.imports) {
    obs.push({
      id: "obs-tmp",
      kind: "import" as const,
      summary: `${imp.library} → ${imp.name}`.slice(0, 500),
      detail: null,
      source: { tool: "ghidra", path: null, line: null, address: imp.address, ruleId: null },
      tags: [categoriseImport(imp.name)],
    });
  }

  // Strings
  let redactedCount = 0;
  for (const str of raw.strings) {
    if (shouldRedactString(str.value)) {
      redactedCount++;
      continue;
    }
    obs.push({
      id: "obs-tmp",
      kind: "string" as const,
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
      kind: "secret-pattern" as const,
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
      kind: "function" as const,
      summary: `Function ${fn.name} at ${fn.address} (${fn.size} bytes)`.slice(0, 500),
      detail: fn.pseudocode?.slice(0, 4000) ?? null,
      source: { tool: "ghidra", path: null, line: null, address: fn.address, ruleId: null },
      tags: fn.calledFunctions.map((c) => `calls:${c}`),
    });
  }

  return obs;
}
