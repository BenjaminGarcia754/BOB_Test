import fs from "fs";
import path from "path";
import { JobRecord, PhaseRecord } from "../schemas/index.js";
import { setJob, deleteJob, getAllJobs } from "./store.js";
import { dequeue } from "./queue.js";
import { config } from "../config.js";
import { runSourcePipeline } from "../analysers/source/index.js";
import { runBinaryPipeline } from "../analysers/binary/index.js";
import { generateReport } from "../report/generator.js";

type PhaseName = "queued" | "preparing" | "scanning" | "reporting" | "completed";

const PHASE_NAMES: PhaseName[] = ["queued", "preparing", "scanning", "reporting", "completed"];

function now(): string {
  return new Date().toISOString();
}

export function transition(job: JobRecord, toPhase: PhaseName): void {
  const currentPhaseName = job.status;
  const currentPhaseRecord = job.phases.find((p) => p.name === currentPhaseName);
  if (currentPhaseRecord && currentPhaseRecord.status === "running") {
    currentPhaseRecord.endedAt = now();
    currentPhaseRecord.status = "completed";
  }

  job.status = toPhase;
  job.updatedAt = now();

  const nextPhaseRecord = job.phases.find((p) => p.name === toPhase);
  if (nextPhaseRecord) {
    nextPhaseRecord.startedAt = now();
    nextPhaseRecord.status = toPhase === "completed" ? "completed" : "running";
    if (toPhase === "completed") {
      nextPhaseRecord.endedAt = now();
    }
  }

  setJob(job);
}

export async function failJob(job: JobRecord, phase: string, err: unknown): Promise<void> {
  const currentPhaseRecord = job.phases.find((p) => p.name === job.status);
  if (currentPhaseRecord) {
    currentPhaseRecord.endedAt = now();
    currentPhaseRecord.status = "failed";
  }

  const message = err instanceof Error ? err.message : String(err);
  const cause =
    message.includes("TIMEOUT")
      ? "TIMEOUT"
      : message.includes("VALIDATION_ERROR")
      ? "VALIDATION_ERROR"
      : message.includes("TOOL_ERROR")
      ? "TOOL_ERROR"
      : "UNKNOWN";

  job.status = "failed";
  job.updatedAt = now();
  job.error = { phase, message, cause };
  setJob(job);
}

function buildInitialPhases(): PhaseRecord[] {
  return PHASE_NAMES.map((name, i) => ({
    name,
    startedAt: i === 0 ? now() : null,
    endedAt: null,
    status: i === 0 ? ("running" as const) : ("pending" as const),
  }));
}

export function createInitialPhases(): PhaseRecord[] {
  return buildInitialPhases();
}

async function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`TIMEOUT: ${label} exceeded ${ms}ms`)), ms);
  });
  try {
    const result = await Promise.race([promise, timeout]);
    return result;
  } finally {
    clearTimeout(timer!);
  }
}

export async function processJob(job: JobRecord): Promise<void> {
  try {
    // Mark queued phase as completed and transition to preparing
    const queuedPhase = job.phases.find((p) => p.name === "queued");
    if (queuedPhase) {
      queuedPhase.endedAt = now();
      queuedPhase.status = "completed";
    }
    transition(job, "preparing");

    // Prepare + scan + report all inside a single timeout race
    await withTimeout(
      runFullPipeline(job),
      config.analysisTimeoutMs,
      `job ${job.jobId}`
    );
  } catch (err) {
    await failJob(job, job.status, err);
  }
}

async function runFullPipeline(job: JobRecord): Promise<void> {
  // Prepare phase: handled inside the pipeline runners (git clone / zip extract / pe validate)
  // Scanning phase
  transition(job, "scanning");
  const workDir = job.workDir;

  let evidenceDocument;
  if (job.origin === "binary") {
    evidenceDocument = await runBinaryPipeline(job, workDir);
  } else {
    evidenceDocument = await runSourcePipeline(job, workDir);
  }

  // Reporting phase
  transition(job, "reporting");
  const outputDir = path.join(workDir, "report");
  fs.mkdirSync(outputDir, { recursive: true });
  await generateReport(evidenceDocument, outputDir);

  // Write evidence.json
  fs.writeFileSync(
    path.join(workDir, "evidence.json"),
    JSON.stringify(evidenceDocument, null, 2),
    "utf-8"
  );

  transition(job, "completed");
}

let workerRunning = false;

async function workerLoop(): Promise<void> {
  while (true) {
    const job = dequeue();
    if (job) {
      workerRunning = true;
      await processJob(job);
      workerRunning = false;
    } else {
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }
}

export function startWorker(): void {
  workerLoop().catch(() => {
    // Restart worker on unexpected crash
    setTimeout(startWorker, 1000);
  });
}

export function startCleanupLoop(): void {
  setInterval(() => {
    const cutoff = Date.now() - config.jobRetentionMs;
    for (const job of getAllJobs()) {
      if (
        (job.status === "completed" || job.status === "failed") &&
        new Date(job.updatedAt).getTime() < cutoff
      ) {
        try {
          fs.rmSync(job.workDir, { recursive: true, force: true });
        } catch {
          // Ignore cleanup errors
        }
        deleteJob(job.jobId);
      }
    }
  }, 5 * 60 * 1000);
}
