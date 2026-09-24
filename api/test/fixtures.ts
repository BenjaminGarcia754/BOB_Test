import { EvidenceDocument } from "../src/schemas/index.js";

export const FIXED_EVIDENCE: EvidenceDocument = {
  analysisId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  origin: "source-repository",
  generatedAt: "2024-01-01T00:00:00.000Z",
  input: {
    name: "test-repo",
    sha256: null,
    commit: "abc123def456abc123def456abc123def456abc123",
  },
  tools: [
    { name: "inventory", version: null, status: "completed", dataDate: null, warning: null },
    { name: "semgrep", version: null, status: "completed", dataDate: null, warning: null },
    { name: "trivy", version: null, status: "completed", dataDate: "2024-01-01", warning: null },
  ],
  observations: [
    {
      id: "obs-001",
      kind: "file",
      summary: "File: src/index.ts",
      detail: null,
      source: { tool: "inventory", path: "src/index.ts", line: null, address: null, ruleId: null },
      tags: ["lang:typescript", "entry-point"],
    },
    {
      id: "obs-002",
      kind: "file",
      summary: "File: src/app.ts",
      detail: null,
      source: { tool: "inventory", path: "src/app.ts", line: null, address: null, ruleId: null },
      tags: ["lang:typescript", "entry-point"],
    },
    {
      id: "obs-003",
      kind: "dependency",
      summary: "express@4.18.0 (from package.json)",
      detail: null,
      source: { tool: "inventory", path: "package.json", line: null, address: null, ruleId: null },
      tags: ["manifest:package.json"],
    },
    {
      id: "obs-004",
      kind: "finding",
      summary: "[python.security.test-rule] Cross-site scripting vulnerability",
      detail: "const userInput = req.body.data;",
      source: { tool: "semgrep", path: "src/routes.ts", line: 42, address: null, ruleId: "python.security.test-rule" },
      tags: ["severity:WARNING"],
    },
    {
      id: "obs-005",
      kind: "dependency",
      summary: "lodash@4.17.20: Prototype Pollution",
      detail: "A prototype pollution vulnerability was found.",
      source: { tool: "trivy", path: "package-lock.json", line: null, address: null, ruleId: "CVE-2021-23337" },
      tags: ["severity:HIGH", "ecosystem:npm"],
    },
  ],
  inferences: [
    {
      id: "inf-001",
      summary: "Project appears to be a web server",
      explanation: "Two or more entry-point files were found alongside an HTTP framework dependency.",
      confidence: "medium",
      evidenceIds: ["obs-001", "obs-002", "obs-003"],
    },
  ],
  unknowns: ["No entry-point function identified."],
  warnings: [],
};
