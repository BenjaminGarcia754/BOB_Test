import fs from "fs";
import path from "path";
import { JobRecord } from "../schemas/index.js";
import { config } from "../config.js";

const jobMap = new Map<string, JobRecord>();

export function getJob(id: string): JobRecord | undefined {
  return jobMap.get(id);
}

export function setJob(job: JobRecord): void {
  jobMap.set(job.jobId, job);
  persistMeta(job);
}

export function deleteJob(id: string): void {
  jobMap.delete(id);
}

export function getAllJobs(): JobRecord[] {
  return Array.from(jobMap.values());
}

function persistMeta(job: JobRecord): void {
  try {
    const metaPath = path.join(config.workDir, job.jobId, "meta.json");
    fs.mkdirSync(path.dirname(metaPath), { recursive: true });
    fs.writeFileSync(metaPath, JSON.stringify(job, null, 2), "utf-8");
  } catch {
    // Non-fatal: in-memory state is authoritative
  }
}
