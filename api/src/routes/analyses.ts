import { Router, Request, Response } from "express";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { v4 as uuidv4 } from "uuid";
import { RepositoryRequest, ReportFormat } from "../schemas/index.js";
import { JobRecord } from "../schemas/index.js";
import { getJob, setJob } from "../jobs/store.js";
import { enqueue, isFull } from "../jobs/queue.js";
import { createInitialPhases } from "../jobs/worker.js";
import { validateBody } from "../middleware/validate.js";
import {
  sourceZipUpload,
  binaryUpload,
  validateZipMagic,
  validatePEMagic,
  handleMulterError,
} from "../middleware/upload.js";
import { config } from "../config.js";

export const analysesRouter = Router();

function now(): string {
  return new Date().toISOString();
}

function buildJobAcceptedResponse(job: JobRecord) {
  return {
    jobId: job.jobId,
    status: "queued" as const,
    createdAt: job.createdAt,
    links: {
      status: `/api/analyses/${job.jobId}`,
      report: `/api/analyses/${job.jobId}/report`,
    },
  };
}

function createAndEnqueueJob(
  origin: JobRecord["origin"],
  input: JobRecord["input"],
  workDir: string
): JobRecord {
  const jobId = uuidv4();
  const ts = now();
  const job: JobRecord = {
    jobId,
    origin,
    status: "queued",
    createdAt: ts,
    updatedAt: ts,
    input,
    phases: createInitialPhases(),
    warnings: [],
    error: null,
    workDir,
  };
  setJob(job);
  enqueue(job);
  return job;
}

// POST /api/analyses/repository
analysesRouter.post(
  "/repository",
  validateBody(RepositoryRequest),
  (req: Request, res: Response): void => {
    if (isFull()) {
      res.status(503).json({
        error: { code: "QUEUE_FULL", message: "Analysis queue is full. Try again later." },
      });
      return;
    }

    const { url } = req.body as { url: string };
    const urlObj = new URL(url);
    const repoSlug = urlObj.pathname.replace(/^\//, "").replace(/\.git$/, "");
    const jobId = uuidv4();
    const workDir = path.join(config.workDir, jobId);
    fs.mkdirSync(workDir, { recursive: true });

    const job = createAndEnqueueJob(
      "source-repository",
      { name: repoSlug, sha256: null, commit: null, url },
      workDir
    );
    // Update jobId to the one we created
    Object.assign(job, { jobId: job.jobId });

    res.status(202).json(buildJobAcceptedResponse(job));
  }
);

// POST /api/analyses/source-zip
analysesRouter.post(
  "/source-zip",
  sourceZipUpload.single("file"),
  handleMulterError,
  validateZipMagic,
  (req: Request, res: Response): void => {
    if (isFull()) {
      res.status(503).json({
        error: { code: "QUEUE_FULL", message: "Analysis queue is full. Try again later." },
      });
      return;
    }

    const file = req.file!;
    const sha256 = crypto.createHash("sha256").update(file.buffer).digest("hex");
    const jobId = uuidv4();
    const workDir = path.join(config.workDir, jobId);
    const inputDir = path.join(workDir, "input");
    fs.mkdirSync(inputDir, { recursive: true });
    const uploadPath = path.join(inputDir, "upload.zip");
    fs.writeFileSync(uploadPath, file.buffer);

    const job = createAndEnqueueJob(
      "source-zip",
      { name: file.originalname || "upload.zip", sha256, commit: null },
      workDir
    );

    res.status(202).json(buildJobAcceptedResponse(job));
  }
);

// POST /api/analyses/binary
analysesRouter.post(
  "/binary",
  binaryUpload.single("file"),
  handleMulterError,
  validatePEMagic,
  (req: Request, res: Response): void => {
    if (isFull()) {
      res.status(503).json({
        error: { code: "QUEUE_FULL", message: "Analysis queue is full. Try again later." },
      });
      return;
    }

    const file = req.file!;
    const sha256 = crypto.createHash("sha256").update(file.buffer).digest("hex");
    const jobId = uuidv4();
    const workDir = path.join(config.workDir, jobId);
    const inputDir = path.join(workDir, "input");
    fs.mkdirSync(inputDir, { recursive: true });
    const uploadPath = path.join(inputDir, "upload.exe");
    fs.writeFileSync(uploadPath, file.buffer);

    const job = createAndEnqueueJob(
      "binary",
      { name: file.originalname || "upload.exe", sha256, commit: null },
      workDir
    );

    res.status(202).json(buildJobAcceptedResponse(job));
  }
);

// GET /api/analyses/:id
analysesRouter.get("/:id", (req: Request, res: Response): void => {
  const job = getJob(req.params["id"] as string);
  if (!job) {
    res.status(404).json({
      error: { code: "JOB_NOT_FOUND", message: "No job found with the given ID" },
    });
    return;
  }

  // Return JobRecord minus workDir
  const { workDir: _workDir, ...statusResponse } = job;
  res.status(200).json(statusResponse);
});

// GET /api/analyses/:id/report
analysesRouter.get("/:id/report", (req: Request, res: Response): void => {
  const job = getJob(req.params["id"] as string);
  if (!job) {
    res.status(404).json({
      error: { code: "JOB_NOT_FOUND", message: "No job found with the given ID" },
    });
    return;
  }

  if (job.status === "failed") {
    res.status(409).json({
      error: {
        code: "JOB_FAILED",
        message: "Analysis failed; no report available",
        details: { status: job.status, jobId: job.jobId, error: job.error },
      },
    });
    return;
  }

  if (job.status !== "completed") {
    res.status(409).json({
      error: {
        code: "REPORT_NOT_READY",
        message: "Analysis is still in progress",
        details: { status: job.status, jobId: job.jobId },
      },
    });
    return;
  }

  const formatParam = (req.query.format as string) || "html";
  const formatResult = ReportFormat.safeParse(formatParam);
  if (!formatResult.success) {
    res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid format parameter. Use html, markdown, or json.",
      },
    });
    return;
  }

  const format = formatResult.data;
  const reportDir = path.join(job.workDir, "report");

  try {
    if (format === "html") {
      const html = fs.readFileSync(path.join(reportDir, "report.html"), "utf-8");
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.status(200).send(html);
    } else if (format === "markdown") {
      const md = fs.readFileSync(path.join(reportDir, "report.md"), "utf-8");
      res.setHeader("Content-Type", "text/markdown; charset=utf-8");
      res.status(200).send(md);
    } else {
      const json = fs.readFileSync(path.join(reportDir, "report.json"), "utf-8");
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.status(200).send(json);
    }
  } catch {
    res.status(500).json({
      error: { code: "INTERNAL_ERROR", message: "Report files not found on disk" },
    });
  }
});
