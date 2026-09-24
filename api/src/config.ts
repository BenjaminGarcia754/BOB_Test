import path from "path";

function getEnv(key: string, defaultValue?: string): string {
  const val = process.env[key];
  if (val !== undefined && val !== "") return val;
  if (defaultValue !== undefined) return defaultValue;
  throw new Error(`Required environment variable ${key} is not set`);
}

function getEnvInt(key: string, defaultValue: number): number {
  const val = process.env[key];
  if (val !== undefined && val !== "") {
    const n = parseInt(val, 10);
    if (!isNaN(n)) return n;
  }
  return defaultValue;
}

export const config = {
  port: getEnvInt("PORT", 3000),
  workDir: path.resolve(getEnv("WORK_DIR", "./work")),
  ghidraHome: getEnv("GHIDRA_HOME", "/opt/ghidra"),
  analysisTimeoutMs: getEnvInt("ANALYSIS_TIMEOUT_MS", 300_000),
  maxQueueDepth: getEnvInt("MAX_QUEUE_DEPTH", 10),
  jobRetentionMs: getEnvInt("JOB_RETENTION_MS", 3_600_000),
  maxGhidraFunctions: getEnvInt("MAX_GHIDRA_FUNCTIONS", 20),
  maxZipFiles: 500,
  maxZipUncompressedBytes: 200 * 1024 * 1024,
  maxSourceZipBytes: 50 * 1024 * 1024,
  maxBinaryBytes: 100 * 1024 * 1024,
} as const;
