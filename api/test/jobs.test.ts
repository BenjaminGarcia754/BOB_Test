import request from "supertest";
import express from "express";
import os from "os";
import path from "path";
import fs from "fs";
import { createApp } from "../src/index.js";
import { setJob, getJob } from "../src/jobs/store.js";
import { JobRecord } from "../src/schemas/index.js";
import { createInitialPhases } from "../src/jobs/worker.js";

// Override WORK_DIR to a temp directory for tests
const tmpWorkDir = fs.mkdtempSync(path.join(os.tmpdir(), "jobs-test-"));
process.env.WORK_DIR = tmpWorkDir;

let app: express.Application;

beforeAll(() => {
  app = createApp();
});

afterAll(() => {
  fs.rmSync(tmpWorkDir, { recursive: true, force: true });
});

describe("POST /api/analyses/repository", () => {
  it("returns 202 with jobId, status queued, and links", async () => {
    const res = await request(app)
      .post("/api/analyses/repository")
      .send({ url: "https://github.com/owner/my-repo" })
      .set("Content-Type", "application/json");

    expect(res.status).toBe(202);
    expect(res.body.status).toBe("queued");
    expect(res.body.jobId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
    );
    expect(res.body.links.status).toMatch(/\/api\/analyses\//);
    expect(res.body.links.report).toMatch(/\/api\/analyses\//);
  });

  it("returns 400 for non-github URL", async () => {
    const res = await request(app)
      .post("/api/analyses/repository")
      .send({ url: "https://gitlab.com/owner/repo" })
      .set("Content-Type", "application/json");

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns 400 for invalid URL", async () => {
    const res = await request(app)
      .post("/api/analyses/repository")
      .send({ url: "not-a-url" })
      .set("Content-Type", "application/json");

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns 400 for missing url field", async () => {
    const res = await request(app)
      .post("/api/analyses/repository")
      .send({})
      .set("Content-Type", "application/json");

    expect(res.status).toBe(400);
  });
});

describe("GET /api/analyses/:id", () => {
  it("returns 404 for unknown job ID", async () => {
    const res = await request(app).get(
      "/api/analyses/00000000-0000-0000-0000-000000000000"
    );
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("JOB_NOT_FOUND");
  });

  it("returns 200 with job status for known job (no workDir field)", async () => {
    const now = new Date().toISOString();
    const job: JobRecord = {
      jobId: "11111111-1111-1111-1111-111111111111",
      origin: "source-repository",
      status: "queued",
      createdAt: now,
      updatedAt: now,
      input: { name: "test-repo", sha256: null, commit: null, url: "https://github.com/a/b" },
      phases: createInitialPhases(),
      warnings: [],
      error: null,
      workDir: path.join(tmpWorkDir, "11111111-1111-1111-1111-111111111111"),
    };
    setJob(job);

    const res = await request(app).get(
      "/api/analyses/11111111-1111-1111-1111-111111111111"
    );
    expect(res.status).toBe(200);
    expect(res.body.jobId).toBe(job.jobId);
    expect(res.body.workDir).toBeUndefined();
    expect(res.body.phases).toHaveLength(5);
  });
});

describe("GET /api/analyses/:id/report", () => {
  it("returns 404 for unknown job", async () => {
    const res = await request(app).get(
      "/api/analyses/99999999-9999-9999-9999-999999999999/report"
    );
    expect(res.status).toBe(404);
  });

  it("returns 409 REPORT_NOT_READY for in-progress job", async () => {
    const now = new Date().toISOString();
    const job: JobRecord = {
      jobId: "22222222-2222-2222-2222-222222222222",
      origin: "source-repository",
      status: "scanning",
      createdAt: now,
      updatedAt: now,
      input: { name: "repo", sha256: null, commit: null },
      phases: createInitialPhases(),
      warnings: [],
      error: null,
      workDir: path.join(tmpWorkDir, "22222222-2222-2222-2222-222222222222"),
    };
    setJob(job);

    const res = await request(app).get(
      "/api/analyses/22222222-2222-2222-2222-222222222222/report"
    );
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("REPORT_NOT_READY");
  });

  it("returns 409 JOB_FAILED for failed job", async () => {
    const now = new Date().toISOString();
    const job: JobRecord = {
      jobId: "33333333-3333-3333-3333-333333333333",
      origin: "binary",
      status: "failed",
      createdAt: now,
      updatedAt: now,
      input: { name: "sample.exe", sha256: null, commit: null },
      phases: createInitialPhases(),
      warnings: [],
      error: { phase: "scanning", message: "Ghidra not found", cause: "TOOL_ERROR" },
      workDir: path.join(tmpWorkDir, "33333333-3333-3333-3333-333333333333"),
    };
    setJob(job);

    const res = await request(app).get(
      "/api/analyses/33333333-3333-3333-3333-333333333333/report"
    );
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("JOB_FAILED");
  });

  it("returns completed report HTML when job is done", async () => {
    const { generateReport } = await import("../src/report/generator.js");
    const { FIXED_EVIDENCE } = await import("./fixtures.js");
    const now = new Date().toISOString();
    const jobId = "44444444-4444-4444-4444-444444444444";
    const workDir = path.join(tmpWorkDir, jobId);
    fs.mkdirSync(workDir, { recursive: true });

    await generateReport({ ...FIXED_EVIDENCE, analysisId: jobId }, path.join(workDir, "report"));

    const job: JobRecord = {
      jobId,
      origin: "source-repository",
      status: "completed",
      createdAt: now,
      updatedAt: now,
      input: { name: "test-repo", sha256: null, commit: null },
      phases: createInitialPhases(),
      warnings: [],
      error: null,
      workDir,
    };
    setJob(job);

    const res = await request(app).get(`/api/analyses/${jobId}/report?format=html`);
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toMatch(/text\/html/);
    expect(res.text).toContain("<!DOCTYPE html>");
  });
});

describe("POST /api/analyses/source-zip", () => {
  it("rejects non-zip file", async () => {
    const res = await request(app)
      .post("/api/analyses/source-zip")
      .attach("file", Buffer.from("this is not a zip"), "test.zip");

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("UNSUPPORTED_FILE");
  });

  it("accepts a valid zip and returns 202", async () => {
    // PK magic bytes header
    const zipMagic = Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x00, 0x00, 0x00, 0x00]);
    const res = await request(app)
      .post("/api/analyses/source-zip")
      .attach("file", zipMagic, { filename: "test.zip", contentType: "application/zip" });

    expect(res.status).toBe(202);
    expect(res.body.status).toBe("queued");
  });
});

describe("POST /api/analyses/binary", () => {
  it("rejects non-PE file", async () => {
    const res = await request(app)
      .post("/api/analyses/binary")
      .attach("file", Buffer.from("ELF binary here"), "test.elf");

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("UNSUPPORTED_FILE");
  });

  it("accepts a valid PE binary and returns 202", async () => {
    // MZ header + enough bytes to pass the 0x40 check
    const peMagic = Buffer.alloc(0x80, 0x00);
    peMagic[0] = 0x4d;
    peMagic[1] = 0x5a;
    const res = await request(app)
      .post("/api/analyses/binary")
      .attach("file", peMagic, { filename: "test.exe", contentType: "application/octet-stream" });

    expect(res.status).toBe(202);
    expect(res.body.status).toBe("queued");
  });
});
