import { EvidenceDocument, Observation, Inference, ToolRecord } from "../schemas/index.js";

export function identificationSection(doc: EvidenceDocument): string {
  const { analysisId, origin, input, generatedAt } = doc;
  return `## Identification

| Field | Value |
|---|---|
| Analysis ID | \`${analysisId}\` |
| Origin | ${origin} |
| Input | ${input.name} |
| SHA-256 | \`${input.sha256 ?? "N/A (repository)"}\` |
| Git Commit | \`${input.commit ?? "N/A (file upload)"}\` |
| Analysed At | ${generatedAt} |
`;
}

export function analysisToolsSection(tools: ToolRecord[]): string {
  const rows = tools
    .map(
      (t) =>
        `| ${t.name} | ${t.status} | ${t.version ?? "—"} | ${t.dataDate ?? "—"} | ${t.warning ?? "—"} |`
    )
    .join("\n");
  return `## Analysis Summary

| Tool | Status | Version | Data Date | Coverage Notes |
|---|---|---|---|---|
${rows}
`;
}

export function observationEntry(obs: Observation): string {
  const sourceParts = [
    obs.source.tool,
    obs.source.path ? `path: ${obs.source.path}` : null,
    obs.source.line != null ? `line ${obs.source.line}` : null,
    obs.source.address ? `addr ${obs.source.address}` : null,
  ]
    .filter(Boolean)
    .join(" | ");

  const detailBlock = obs.detail ? `\n\`\`\`\n${obs.detail}\n\`\`\`\n` : "";

  return `### [${obs.id}] ${obs.summary}

- **Kind:** ${obs.kind}
- **Source:** ${sourceParts}
- **Tags:** ${obs.tags.length > 0 ? obs.tags.join(", ") : "—"}
> **Label: Observed**
${detailBlock}`;
}

export function inferenceEntry(inf: Inference): string {
  return `### [${inf.id}] ${inf.summary}

> **Label: Inferred** | Confidence: ${inf.confidence}

**Explanation:** ${inf.explanation}

**Supporting evidence:** ${inf.evidenceIds.join(", ")}
`;
}

export function dependencyEntry(obs: Observation): string {
  const ruleId = obs.source.ruleId ?? "—";
  const tags = obs.tags.join(", ");
  return `### ${obs.summary}

- **Advisory:** ${ruleId}
- **Summary:** ${obs.summary}
- **Severity tag:** ${tags}
- **Label: Finding for review** — this tool result requires manual confirmation.
  See: ${obs.source.tool} output reference [${obs.id}]
`;
}

export function unknownsSection(unknowns: string[]): string {
  if (unknowns.length === 0) return "";
  const items = unknowns.map((u) => `- ${u}`).join("\n");
  return `## Not Determined

The following aspects could not be established from the available evidence:

${items}
`;
}

export function preservationSection(doc: EvidenceDocument): string {
  const recs: string[] = [];
  const tags = doc.observations.flatMap((o) => o.tags);
  const hasNetwork = tags.includes("network");
  const hasRegistry = tags.includes("registry") || tags.includes("registry-ref");
  const cveDeps = doc.observations.filter((o) => o.kind === "dependency" && o.source.ruleId?.startsWith("CVE-"));
  const noManifest = doc.unknowns.some((u) => u.includes("manifest"));
  const hasRedacted = doc.warnings.some((w) => w.toLowerCase().includes("secret") || w.toLowerCase().includes("redact"));

  if (hasNetwork) recs.push("Preserve network configuration and protocol documentation alongside the binary.");
  if (hasRegistry) recs.push("Document registry keys referenced or modified by this application.");
  if (cveDeps.length > 0) recs.push(`Review and patch ${cveDeps.length} declared dependencies with known advisories before continued use.`);
  if (noManifest) recs.push("Recover or reconstruct the dependency manifest for long-term preservation.");
  if (hasRedacted) recs.push("Review redacted strings in the raw evidence file for potential credential material.");

  if (recs.length === 0) return "";

  const items = recs.map((r) => `- ${r}`).join("\n");
  return `## Preservation Recommendations

${items}
`;
}

export function limitationsSection(tools: ToolRecord[]): string {
  const trivyTool = tools.find((t) => t.name === "trivy");
  const dataDate = trivyTool?.dataDate ?? "unknown";
  return `## Limitations

- Static analysis only. No code was executed during this analysis.
- Ghidra pseudocode is a decompiler approximation and does not represent original source code.
- Semgrep rule coverage is limited to the rulesets active at scan time.
- Trivy vulnerability data reflects the database version dated ${dataDate}.
- A finding from a scanner does not confirm a vulnerability is exploitable.
- Strings and imports indicate capability, not confirmed use.
- This report was generated automatically and requires human review for any security or compliance decision.
`;
}

export function evidenceIndexSection(doc: EvidenceDocument): string {
  const obsRows = doc.observations
    .map(
      (o) =>
        `| ${o.id} | ${o.kind} | ${o.summary.slice(0, 60).replace(/\|/g, "\\|")} | ${o.source.tool} |`
    )
    .join("\n");
  const infRows = doc.inferences
    .map(
      (i) =>
        `| ${i.id} | inference | ${i.summary.slice(0, 60).replace(/\|/g, "\\|")} | — |`
    )
    .join("\n");

  const rows = [obsRows, infRows].filter(Boolean).join("\n");

  return `## Appendix: Evidence Index

| ID | Kind | Summary | Tool |
|---|---|---|---|
${rows || "| — | — | No evidence collected | — |"}
`;
}
