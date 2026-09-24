import fs from "fs";
import path from "path";
import { Observation, ToolRecord } from "../../schemas/index.js";
import { spawnSafe } from "../spawn.js";
import { stripSecrets } from "../secrets.js";

interface TrivyOutput {
  SchemaVersion?: number;
  Metadata?: { DBStatus?: { UpdatedAt?: string } };
  Results?: TrivyResult[];
}

interface TrivyResult {
  Target: string;
  Type?: string;
  Vulnerabilities?: TrivyVuln[];
  Secrets?: TrivySecret[];
  Misconfigurations?: TrivyMisconfig[];
}

interface TrivyVuln {
  VulnerabilityID: string;
  PkgName: string;
  InstalledVersion: string;
  Title?: string;
  Description?: string;
  Severity?: string;
  CVSS?: unknown;
}

interface TrivySecret {
  RuleID: string;
  Title: string;
  Match?: string;
  Severity?: string;
  StartLine?: number;
  Target?: string;
}

interface TrivyMisconfig {
  AVDID?: string;
  Title?: string;
  Description?: string;
  Severity?: string;
  Message?: string;
}

export async function runTrivy(
  sourceDir: string,
  rawOutputPath: string
): Promise<{ observations: Observation[]; toolRecord: ToolRecord }> {
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

  let toolRecord: ToolRecord = {
    name: "trivy",
    version: null,
    status: "failed",
    dataDate: null,
    warning: null,
  };

  try {
    const result = await spawnSafe("trivy", args, { timeout: 150_000 });

    if (result.stderr) {
      fs.writeFileSync(
        path.join(path.dirname(rawOutputPath), "trivy-stderr.txt"),
        result.stderr,
        "utf-8"
      );
    }

    if (result.code !== 0 && result.code !== 1) {
      toolRecord.warning = `trivy exited with code ${result.code}: ${result.stderr.slice(0, 200)}`;
      return { observations: [], toolRecord };
    }

    let raw: TrivyOutput = {};
    try {
      const rawContent = fs.readFileSync(rawOutputPath, "utf-8");
      raw = JSON.parse(rawContent) as TrivyOutput;
    } catch {
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
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("ENOENT") || message.includes("not found")) {
      toolRecord.warning = "trivy: not installed or scan failed";
    } else {
      toolRecord.warning = message.slice(0, 200);
    }
    return { observations: [], toolRecord };
  }
}

function normalise(raw: TrivyOutput, sourceDir: string): Observation[] {
  const obs: Observation[] = [];
  for (const result of raw.Results ?? []) {
    const relTarget = path.relative(sourceDir, result.Target).replace(/\\/g, "/") || result.Target;
    const ecosystem = result.Type ?? "unknown";

    for (const vuln of result.Vulnerabilities ?? []) {
      const summary = `${vuln.PkgName}@${vuln.InstalledVersion}: ${vuln.Title ?? ""}`.slice(0, 500);
      const rawDetail = vuln.Description ?? "";
      const detail = stripSecrets(rawDetail).slice(0, 4000) || null;
      obs.push({
        id: "obs-tmp",
        kind: "dependency" as const,
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
        kind: "secret-pattern" as const,
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
        kind: "finding" as const,
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
