import { z } from "zod";
import {
  RepositoryRequest,
  EvidenceDocument,
  JobRecord,
  Observation,
  Inference,
  ObservationKind,
  JobStatus,
  JobOrigin,
} from "../src/schemas/index.js";
import { createInitialPhases } from "../src/jobs/worker.js";
import { FIXED_EVIDENCE } from "./fixtures.js";

describe("RepositoryRequest schema", () => {
  it("accepts a valid github.com URL", () => {
    expect(() =>
      RepositoryRequest.parse({ url: "https://github.com/owner/repo" })
    ).not.toThrow();
  });

  it("rejects a non-github URL", () => {
    expect(() =>
      RepositoryRequest.parse({ url: "https://gitlab.com/owner/repo" })
    ).toThrow();
  });

  it("rejects a URL without owner/repo path", () => {
    expect(() =>
      RepositoryRequest.parse({ url: "https://github.com/" })
    ).toThrow();
  });

  it("rejects a non-URL string", () => {
    expect(() => RepositoryRequest.parse({ url: "not-a-url" })).toThrow();
  });

  it("accepts github URLs with extra path segments", () => {
    expect(() =>
      RepositoryRequest.parse({ url: "https://github.com/owner/repo/tree/main" })
    ).not.toThrow();
  });
});

describe("EvidenceDocument schema", () => {
  it("accepts the fixed evidence fixture", () => {
    expect(() => EvidenceDocument.parse(FIXED_EVIDENCE)).not.toThrow();
  });

  it("rejects evidenceIds that are empty arrays", () => {
    const bad = {
      ...FIXED_EVIDENCE,
      inferences: [
        {
          id: "inf-001",
          summary: "test inference",
          explanation: "no evidence",
          confidence: "low",
          evidenceIds: [], // must have min 1
        },
      ],
    };
    expect(() => EvidenceDocument.parse(bad)).toThrow();
  });

  it("rejects invalid observation kind", () => {
    const bad = {
      ...FIXED_EVIDENCE,
      observations: [
        {
          ...FIXED_EVIDENCE.observations[0],
          kind: "not-a-valid-kind",
        },
      ],
    };
    expect(() => EvidenceDocument.parse(bad)).toThrow();
  });

  it("rejects summary over 500 chars", () => {
    const bad = {
      ...FIXED_EVIDENCE,
      observations: [
        {
          ...FIXED_EVIDENCE.observations[0],
          summary: "x".repeat(501),
        },
      ],
    };
    expect(() => EvidenceDocument.parse(bad)).toThrow();
  });

  it("rejects detail over 4000 chars", () => {
    const bad = {
      ...FIXED_EVIDENCE,
      observations: [
        {
          ...FIXED_EVIDENCE.observations[0],
          detail: "x".repeat(4001),
        },
      ],
    };
    expect(() => EvidenceDocument.parse(bad)).toThrow();
  });

  it("rejects non-uuid analysisId", () => {
    expect(() =>
      EvidenceDocument.parse({ ...FIXED_EVIDENCE, analysisId: "not-a-uuid" })
    ).toThrow();
  });

  it("rejects invalid origin", () => {
    expect(() =>
      EvidenceDocument.parse({ ...FIXED_EVIDENCE, origin: "unknown-origin" })
    ).toThrow();
  });

  it("accepts null detail in observations", () => {
    expect(() =>
      EvidenceDocument.parse({
        ...FIXED_EVIDENCE,
        observations: [
          { ...FIXED_EVIDENCE.observations[0], detail: null },
        ],
      })
    ).not.toThrow();
  });

  it("accepts all valid confidence levels", () => {
    for (const conf of ["low", "medium", "high"] as const) {
      expect(() =>
        EvidenceDocument.parse({
          ...FIXED_EVIDENCE,
          inferences: [
            { ...FIXED_EVIDENCE.inferences[0], confidence: conf },
          ],
        })
      ).not.toThrow();
    }
  });
});

describe("JobRecord schema", () => {
  it("accepts a valid job record", () => {
    const now = new Date().toISOString();
    const job = {
      jobId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      origin: "source-repository",
      status: "queued",
      createdAt: now,
      updatedAt: now,
      input: { name: "repo", sha256: null, commit: null },
      phases: createInitialPhases(),
      warnings: [],
      error: null,
      workDir: "/tmp/work/job1",
    };
    expect(() => JobRecord.parse(job)).not.toThrow();
  });

  it("rejects invalid status", () => {
    const now = new Date().toISOString();
    const job = {
      jobId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      origin: "source-repository",
      status: "invalid-status",
      createdAt: now,
      updatedAt: now,
      input: { name: "repo", sha256: null, commit: null },
      phases: [],
      warnings: [],
      error: null,
      workDir: "/tmp",
    };
    expect(() => JobRecord.parse(job)).toThrow();
  });
});

describe("ObservationKind enum", () => {
  it("accepts all valid kinds", () => {
    const kinds = ["import", "string", "file", "dependency", "finding", "function", "secret-pattern"] as const;
    for (const kind of kinds) {
      expect(() => ObservationKind.parse(kind)).not.toThrow();
    }
  });

  it("rejects unknown kind", () => {
    expect(() => ObservationKind.parse("unknown")).toThrow();
  });
});
