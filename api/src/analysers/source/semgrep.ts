import fs from "fs";
import path from "path";
import { Observation, ToolRecord } from "../../schemas/index.js";
import { spawnSafe } from "../spawn.js";
import { stripSecrets } from "../secrets.js";

interface SemgrepResult {
  results?: SemgrepFinding[];
  errors?: unknown[];
}

interface SemgrepFinding {
  check_id: string;
  path: string;
  start: { line: number };
  extra: {
    message: string;
    severity?: string;
    lines?: string;
    metadata?: { severity?: string };
  };
}

export async function runSemgrep(
  sourceDir: string,
  rawOutputPath: string
): Promise<{ observations: Observation[]; toolRecord: ToolRecord }> {
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

  let toolRecord: ToolRecord = {
    name: "semgrep",
    version: null,
    status: "failed",
    dataDate: null,
    warning: null,
  };

  try {
    const result = await spawnSafe("semgrep", args, { timeout: 150_000 });

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
      fs.writeFileSync(
        path.join(path.dirname(rawOutputPath), "semgrep-stderr.txt"),
        result.stderr,
        "utf-8"
      );
    }

    let raw: SemgrepResult = {};
    try {
      const rawContent = fs.readFileSync(rawOutputPath, "utf-8");
      raw = JSON.parse(rawContent) as SemgrepResult;
    } catch {
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
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("ENOENT") || message.includes("not found")) {
      toolRecord.warning = "semgrep: not installed or scan failed";
    } else {
      toolRecord.warning = message.slice(0, 200);
    }
    return { observations: [], toolRecord };
  }
}

function normalise(raw: SemgrepResult, sourceDir: string): Observation[] {
  const findings = raw.results ?? [];
  return findings.map((f) => {
    const ruleId = f.check_id;
    const message = f.extra.message ?? "";
    const summary = `[${ruleId}] ${message}`.slice(0, 500);
    const rawDetail = f.extra.lines ?? "";
    const detail = stripSecrets(rawDetail).slice(0, 4000) || null;
    const severity =
      f.extra.severity ??
      (f.extra.metadata?.severity as string | undefined) ??
      "INFO";
    const relPath = path.relative(sourceDir, f.path).replace(/\\/g, "/");

    return {
      id: "obs-tmp",
      kind: "finding" as const,
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
