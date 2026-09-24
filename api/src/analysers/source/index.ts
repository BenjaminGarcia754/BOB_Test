import fs from "fs";
import path from "path";
import { JobRecord, EvidenceDocument, Observation, Inference, ToolRecord } from "../../schemas/index.js";
import { cloneRepository, extractZip } from "./prepare.js";
import { runInventory } from "./inventory.js";
import { runSemgrep } from "./semgrep.js";
import { runTrivy } from "./trivy.js";

export async function runSourcePipeline(job: JobRecord, workDir: string): Promise<EvidenceDocument> {
  const rawDir = path.join(workDir, "raw");
  fs.mkdirSync(rawDir, { recursive: true });

  let sourceDir: string;
  let commit: string | null = null;
  let sha256: string | null = job.input.sha256;

  // Prepare phase: clone or extract
  if (job.origin === "source-repository") {
    sourceDir = path.join(workDir, "input", "repo");
    const url = job.input.url ?? "";
    commit = await cloneRepository(url, sourceDir);
    // Update job input with commit
    job.input = { ...job.input, commit };
  } else {
    // source-zip
    sourceDir = path.join(workDir, "input", "extracted");
    const zipPath = path.join(workDir, "input", "upload.zip");
    sha256 = await extractZip(zipPath, sourceDir);
    job.input = { ...job.input, sha256 };
  }

  // Inventory
  const inventory = runInventory(sourceDir);

  // Semgrep
  const semgrepOutputPath = path.join(rawDir, "semgrep.json");
  const { observations: semgrepObs, toolRecord: semgrepTool } = await runSemgrep(sourceDir, semgrepOutputPath);

  // Trivy
  const trivyOutputPath = path.join(rawDir, "trivy.json");
  const { observations: trivyObs, toolRecord: trivyTool } = await runTrivy(sourceDir, trivyOutputPath);

  // Check: at least one tool must succeed
  const semgrepFailed = semgrepTool.status === "failed";
  const trivyFailed = trivyTool.status === "failed";
  if (semgrepFailed && trivyFailed) {
    throw new Error("TOOL_ERROR: Both Semgrep and Trivy failed — no evidence was collected");
  }

  const warnings: string[] = [...job.warnings];
  if (semgrepFailed && semgrepTool.warning) warnings.push(`semgrep: ${semgrepTool.warning}`);
  if (trivyFailed && trivyTool.warning) warnings.push(`trivy: ${trivyTool.warning}`);

  const inventoryTool: ToolRecord = {
    name: "inventory",
    version: null,
    status: "completed",
    dataDate: null,
    warning: null,
  };

  const allObsRaw = [
    ...inventory.fileObservations,
    ...inventory.dependencyObservations,
    ...semgrepObs,
    ...trivyObs,
  ];

  const observations: Observation[] = allObsRaw.map((obs, i) => ({
    ...obs,
    id: `obs-${String(i + 1).padStart(3, "0")}`,
  }));

  const inferences = deriveSourceInferences(observations, inventory);
  const unknowns = deriveSourceUnknowns(inventory);

  return EvidenceDocument.parse({
    analysisId: job.jobId,
    origin: job.origin,
    generatedAt: new Date().toISOString(),
    input: { ...job.input, commit, sha256 },
    tools: [inventoryTool, semgrepTool, trivyTool],
    observations,
    inferences,
    unknowns,
    warnings,
  });
}

function deriveSourceInferences(observations: Observation[], inventory: ReturnType<typeof runInventory>): Inference[] {
  const inferences: Inference[] = [];
  let infIndex = 1;

  const depObs = observations.filter((o) => o.kind === "dependency");
  const fileObs = observations.filter((o) => o.kind === "file");
  const depNames = depObs.map((o) => o.summary.split("@")[0].toLowerCase());

  // "Project appears to be a web server"
  const entryFileObs = fileObs.filter((o) => o.tags.includes("entry-point"));
  const httpDeps = depObs.filter((o) => {
    const name = o.summary.split("@")[0].toLowerCase();
    return ["express", "fastify", "koa", "hapi", "flask", "django", "fastapi", "spring", "rails"].some((f) => name.includes(f));
  });
  if (entryFileObs.length >= 2 && httpDeps.length > 0) {
    const evidenceIds = [...entryFileObs.slice(0, 2).map((o) => o.id), httpDeps[0].id];
    inferences.push({
      id: `inf-${String(infIndex++).padStart(3, "0")}`,
      summary: "Project appears to be a web server",
      explanation: "Two or more entry-point files were found alongside an HTTP framework dependency.",
      confidence: "medium",
      evidenceIds,
    });
  }

  // "Project likely uses database access"
  const ORM_DEPS = ["sequelize", "typeorm", "prisma", "sqlalchemy", "django.db", "mongoose", "hibernate", "gorm"];
  const ormDep = depObs.find((o) => ORM_DEPS.some((d) => o.summary.toLowerCase().includes(d)));
  if (ormDep) {
    inferences.push({
      id: `inf-${String(infIndex++).padStart(3, "0")}`,
      summary: "Project likely uses database access",
      explanation: "An ORM or database framework was declared as a dependency.",
      confidence: "medium",
      evidenceIds: [ormDep.id],
    });
  }

  // "Authentication present"
  const AUTH_DEPS = ["passport", "bcrypt", "jwt", "jsonwebtoken", "authlib"];
  const authDep = depObs.find((o) => AUTH_DEPS.some((d) => o.summary.toLowerCase().includes(d)));
  if (authDep) {
    inferences.push({
      id: `inf-${String(infIndex++).padStart(3, "0")}`,
      summary: "Authentication mechanisms are present",
      explanation: "An authentication or hashing dependency was declared in the project manifest.",
      confidence: "medium",
      evidenceIds: [authDep.id],
    });
  }

  // "Environment variable configuration"
  const dotenvDep = depObs.find((o) => o.summary.toLowerCase().startsWith("dotenv@"));
  const envFile = fileObs.find((o) => {
    const p = (o.source.path ?? "").toLowerCase();
    return p.endsWith(".env.example") || p.endsWith("config.env");
  });
  if (dotenvDep && envFile) {
    inferences.push({
      id: `inf-${String(infIndex++).padStart(3, "0")}`,
      summary: "Project uses environment variable configuration",
      explanation: "The dotenv dependency is declared and an .env.example or config.env file was found.",
      confidence: "high",
      evidenceIds: [dotenvDep.id, envFile.id],
    });
  }

  return inferences;
}

function deriveSourceUnknowns(inventory: ReturnType<typeof runInventory>): string[] {
  const unknowns: string[] = [];
  if (inventory.languages.length === 0) {
    unknowns.push("Primary programming language could not be determined from file extensions.");
  }
  if (inventory.dependencyObservations.length === 0) {
    unknowns.push("No dependency manifest found — dependency list could not be determined.");
  }
  const hasEntryPoint = inventory.fileObservations.some((o) => o.tags.includes("entry-point"));
  if (!hasEntryPoint) {
    unknowns.push("No entry-point file identified.");
  }
  return unknowns;
}
