import fs from "fs";
import path from "path";
import crypto from "crypto";
import { JobRecord, EvidenceDocument, Observation, Inference } from "../../schemas/index.js";
import { validatePEBinary } from "./validate.js";
import { runGhidra } from "./ghidra.js";

export async function runBinaryPipeline(job: JobRecord, workDir: string): Promise<EvidenceDocument> {
  const rawDir = path.join(workDir, "raw");
  fs.mkdirSync(rawDir, { recursive: true });

  const binaryPath = path.join(workDir, "input", "upload.exe");

  // Validate PE binary during preparing step
  const buffer = fs.readFileSync(binaryPath);
  validatePEBinary(buffer);

  // Compute SHA-256 if not already set
  const sha256 = job.input.sha256 ?? crypto.createHash("sha256").update(buffer).digest("hex");
  job.input = { ...job.input, sha256 };

  // Run Ghidra
  const ghidraOutputPath = path.join(rawDir, "ghidra.json");
  const { observations: rawObs, toolRecord } = await runGhidra(
    binaryPath,
    workDir,
    ghidraOutputPath
  );

  const observations: Observation[] = rawObs.map((obs, i) => ({
    ...obs,
    id: `obs-${String(i + 1).padStart(3, "0")}`,
  }));

  const inferences = deriveBinaryInferences(observations);
  const unknowns = deriveBinaryUnknowns(observations);
  const warnings = [...job.warnings];

  const secretPatternObs = observations.find(
    (o) => o.kind === "secret-pattern" && o.tags.includes("redacted")
  );
  if (secretPatternObs) {
    warnings.push("High-entropy or secret-pattern strings were excluded from observations.");
  }

  return EvidenceDocument.parse({
    analysisId: job.jobId,
    origin: job.origin,
    generatedAt: new Date().toISOString(),
    input: { ...job.input, sha256, commit: null },
    tools: [toolRecord],
    observations,
    inferences,
    unknowns,
    warnings,
  });
}

function getTaggedImports(observations: Observation[], tag: string): Observation[] {
  return observations.filter((o) => o.kind === "import" && o.tags.includes(tag));
}

function deriveBinaryInferences(observations: Observation[]): Inference[] {
  const inferences: Inference[] = [];
  let infIndex = 1;

  const inferenceRules: Array<{
    tag: string;
    minCount: number;
    summary: string;
    explanation: string;
  }> = [
    {
      tag: "network",
      minCount: 2,
      summary: "Binary makes network connections",
      explanation: "Two or more network-related Windows API imports were found (e.g. WSAStartup, connect).",
    },
    {
      tag: "file-io",
      minCount: 2,
      summary: "Binary reads from or writes to the file system",
      explanation: "Two or more file I/O Windows API imports were found.",
    },
    {
      tag: "registry",
      minCount: 1,
      summary: "Binary interacts with Windows registry",
      explanation: "Registry-related API imports were found.",
    },
    {
      tag: "injection",
      minCount: 1,
      summary: "Binary may perform code injection",
      explanation: "Process injection API imports were found (e.g. WriteProcessMemory, CreateRemoteThread).",
    },
    {
      tag: "debug",
      minCount: 1,
      summary: "Binary contains anti-debug logic",
      explanation: "Debug-detection API imports were found (e.g. IsDebuggerPresent).",
    },
    {
      tag: "crypto",
      minCount: 2,
      summary: "Binary may use cryptography",
      explanation: "Multiple cryptographic API imports were found.",
    },
  ];

  for (const rule of inferenceRules) {
    const matching = getTaggedImports(observations, rule.tag);
    if (matching.length >= rule.minCount) {
      const confidence = matching.length >= 3 ? "medium" : "low";
      inferences.push({
        id: `inf-${String(infIndex++).padStart(3, "0")}`,
        summary: rule.summary,
        explanation: rule.explanation,
        confidence,
        evidenceIds: matching.slice(0, Math.max(rule.minCount, 3)).map((o) => o.id),
      });
    }
  }

  return inferences;
}

function deriveBinaryUnknowns(observations: Observation[]): string[] {
  const unknowns: string[] = [];
  const fileObs = observations.find((o) => o.kind === "file" && o.tags.includes("binary-format"));
  if (!fileObs) {
    unknowns.push("Binary format and architecture could not be determined.");
  }
  unknowns.push("Original source language cannot be confirmed from binary alone.");
  const hasFunctions = observations.some((o) => o.kind === "function");
  if (!hasFunctions) {
    unknowns.push("No entry-point function identified.");
  }
  return unknowns;
}
