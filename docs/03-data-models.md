# Data Models

> Code Archaeologist · docs/03-data-models.md  
> All types are TypeScript/Zod; canonical source lives in `api/src/schemas/`

---

## 1. Core Enumerations

```ts
// api/src/schemas/enums.ts

export const JobOrigin = z.enum([
  "source-repository",
  "source-zip",
  "binary",
]);
export type JobOrigin = z.infer<typeof JobOrigin>;

export const JobStatus = z.enum([
  "queued",
  "preparing",
  "scanning",
  "reporting",
  "completed",
  "failed",
]);
export type JobStatus = z.infer<typeof JobStatus>;

export const PhaseStatus = z.enum(["pending", "running", "completed", "failed"]);
export type PhaseStatus = z.infer<typeof PhaseStatus>;

export const ObservationKind = z.enum([
  "import",         // imported symbol (binary)
  "string",         // extracted string (binary)
  "file",           // file in source/zip
  "dependency",     // declared dependency (manifest)
  "finding",        // Semgrep/Trivy finding
  "function",       // decompiled function (binary)
  "secret-pattern", // potential secret/key pattern detected
]);
export type ObservationKind = z.infer<typeof ObservationKind>;

export const ConfidenceLevel = z.enum(["low", "medium", "high"]);
export type ConfidenceLevel = z.infer<typeof ConfidenceLevel>;

export const ToolStatus = z.enum(["completed", "failed", "skipped", "partial"]);
export type ToolStatus = z.infer<typeof ToolStatus>;

export const ReportFormat = z.enum(["html", "markdown", "json"]);
export type ReportFormat = z.infer<typeof ReportFormat>;
```

---

## 2. Job Models

```ts
// api/src/schemas/job.ts

export const PhaseRecord = z.object({
  name: z.string(),
  startedAt: z.string().datetime().nullable(),
  endedAt: z.string().datetime().nullable(),
  status: PhaseStatus,
});
export type PhaseRecord = z.infer<typeof PhaseRecord>;

export const InputMetadata = z.object({
  /** Original filename or repo slug */
  name: z.string(),
  /** SHA-256 hex of the submitted file, or null for repo jobs */
  sha256: z.string().nullable(),
  /** Git commit SHA, or null for file jobs */
  commit: z.string().nullable(),
  /** Original URL, or null for file jobs */
  url: z.string().url().nullable().optional(),
});
export type InputMetadata = z.infer<typeof InputMetadata>;

export const JobRecord = z.object({
  jobId: z.string().uuid(),
  origin: JobOrigin,
  status: JobStatus,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  input: InputMetadata,
  phases: z.array(PhaseRecord),
  warnings: z.array(z.string()),
  /** Failure cause when status === "failed" */
  error: z
    .object({
      phase: z.string(),
      message: z.string(),
      /** "TIMEOUT" | "TOOL_ERROR" | "VALIDATION_ERROR" | "UNKNOWN" */
      cause: z.string(),
    })
    .nullable(),
  /** Absolute path to the work-dir on disk */
  workDir: z.string(),
});
export type JobRecord = z.infer<typeof JobRecord>;
```

---

## 3. Evidence / Observation Models

```ts
// api/src/schemas/evidence.ts

export const ObservationSource = z.object({
  tool: z.string(),                         // "ghidra" | "semgrep" | "trivy" | "inventory"
  path: z.string().nullable(),              // relative file path within analysed artefact
  line: z.number().int().positive().nullable(),
  address: z.string().nullable(),           // hex address e.g. "0x401000", binary only
  ruleId: z.string().nullable(),            // Semgrep rule ID or Trivy advisory ID
});
export type ObservationSource = z.infer<typeof ObservationSource>;

export const Observation = z.object({
  id: z.string(),                           // "obs-001", monotonically incremented
  kind: ObservationKind,
  summary: z.string().max(500),
  detail: z.string().nullable(),            // longer text (pseudocode, string content, etc.)
  source: ObservationSource,
  tags: z.array(z.string()).default([]),    // free-form tags e.g. ["crypto", "network"]
});
export type Observation = z.infer<typeof Observation>;

export const Inference = z.object({
  id: z.string(),                           // "inf-001"
  summary: z.string().max(500),
  explanation: z.string(),
  confidence: ConfidenceLevel,
  evidenceIds: z.array(z.string()).min(1),  // must reference at least one obs ID
});
export type Inference = z.infer<typeof Inference>;

export const ToolRecord = z.object({
  name: z.string(),
  version: z.string().nullable(),
  status: ToolStatus,
  dataDate: z.string().nullable(),          // Trivy DB date, Semgrep rule date, etc.
  warning: z.string().nullable(),
});
export type ToolRecord = z.infer<typeof ToolRecord>;

export const EvidenceDocument = z.object({
  analysisId: z.string().uuid(),
  origin: JobOrigin,
  generatedAt: z.string().datetime(),
  input: InputMetadata,
  tools: z.array(ToolRecord),
  observations: z.array(Observation),
  inferences: z.array(Inference),
  unknowns: z.array(z.string()),            // things that could not be determined
  warnings: z.array(z.string()),
});
export type EvidenceDocument = z.infer<typeof EvidenceDocument>;
```

---

## 4. Request / Response Models

```ts
// api/src/schemas/requests.ts

/** POST /api/analyses/repository */
export const RepositoryRequest = z.object({
  url: z
    .string()
    .url()
    .refine((u) => new URL(u).hostname === "github.com", {
      message: "Only github.com repositories are accepted",
    })
    .refine((u) => /^https:\/\/github\.com\/[^/]+\/[^/?#]+/.test(u), {
      message: "URL must be https://github.com/<owner>/<repo>",
    }),
});
export type RepositoryRequest = z.infer<typeof RepositoryRequest>;

/** Multipart file constraints — validated in middleware */
export const FileUploadConstraints = z.object({
  maxBytes: z.number(),
  allowedMimeTypes: z.array(z.string()),
  magicBytesValidator: z
    .function()
    .args(z.instanceof(Buffer))
    .returns(z.boolean())
    .optional(),
});

/** 202 response body */
export const JobAcceptedResponse = z.object({
  jobId: z.string().uuid(),
  status: z.literal("queued"),
  createdAt: z.string().datetime(),
  links: z.object({
    status: z.string(),
    report: z.string(),
  }),
});
export type JobAcceptedResponse = z.infer<typeof JobAcceptedResponse>;

/** GET /api/analyses/:id response — JobRecord minus internal workDir */
export const JobStatusResponse = JobRecord.omit({ workDir: true });
export type JobStatusResponse = z.infer<typeof JobStatusResponse>;
```

---

## 5. Model Relationships

```
JobRecord
  ├── input: InputMetadata
  ├── phases: PhaseRecord[]
  └── error?: { phase, message, cause }

EvidenceDocument
  ├── input: InputMetadata          (copied from JobRecord at reporting time)
  ├── tools: ToolRecord[]
  ├── observations: Observation[]
  │     └── source: ObservationSource
  ├── inferences: Inference[]       (each references observation IDs)
  ├── unknowns: string[]
  └── warnings: string[]
```

---

## 6. File Layout on Disk

Each job gets a work directory: `<WORK_DIR>/<jobId>/`

```
<jobId>/
├── meta.json              # serialised JobRecord (status snapshots)
├── input/
│   ├── upload.zip         # or upload.exe / (cloned repo files)
│   └── repo/              # cloned source (repo jobs)
├── raw/
│   ├── semgrep.json       # raw Semgrep CLI output
│   ├── trivy.json         # raw Trivy CLI output
│   └── ghidra.json        # raw Ghidra script output
├── evidence.json          # validated EvidenceDocument
└── report/
    ├── report.md
    ├── report.html
    └── report.json        # same as evidence.json
```

> **Note:** `meta.json` is written on every status transition.  
> If the process restarts, jobs in non-terminal states appear as `failed` with cause `UNKNOWN`.  
> SQLite persistence (optional) stores JobRecord rows for recovery.

---

## 7. Validation Rules Summary

| Field | Rule |
|---|---|
| `url` (repo) | Must be `https://github.com/<owner>/<repo>` exactly |
| ZIP file | MIME `application/zip` + PK magic bytes `50 4B 03 04` |
| Binary file | PE magic bytes `4D 5A` (MZ header) at offset 0 |
| ZIP extraction | No `../` path components; no symlinks; max 500 files; max 200 MB uncompressed |
| `observations[].id` | Format `obs-NNN` (3+ digits, zero-padded) |
| `inferences[].evidenceIds` | All IDs must exist in `observations` of the same document |
| `observations[].detail` | Pseudocode and strings capped at 4 000 characters |
| `observations[].summary` | Max 500 characters |
| File paths in observations | Must be relative; must not contain `..` |
