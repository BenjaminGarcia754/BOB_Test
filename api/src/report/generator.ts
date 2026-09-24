import fs from "fs";
import path from "path";
import { marked } from "marked";
import { EvidenceDocument } from "../schemas/index.js";
import {
  identificationSection,
  analysisToolsSection,
  observationEntry,
  inferenceEntry,
  dependencyEntry,
  unknownsSection,
  preservationSection,
  limitationsSection,
  evidenceIndexSection,
} from "./templates.js";

export async function generateReport(
  evidence: EvidenceDocument,
  outputDir: string
): Promise<{ markdown: string; html: string }> {
  const markdown = buildMarkdown(evidence);
  const html = await buildHtml(markdown, evidence);

  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(path.join(outputDir, "report.md"), markdown, "utf-8");
  fs.writeFileSync(path.join(outputDir, "report.html"), html, "utf-8");
  fs.writeFileSync(
    path.join(outputDir, "report.json"),
    JSON.stringify(evidence, null, 2),
    "utf-8"
  );

  return { markdown, html };
}

function buildMarkdown(doc: EvidenceDocument): string {
  const sections: string[] = [];

  // Title
  sections.push(`# Code Archaeologist Analysis Report\n`);

  // No-results banner
  if (doc.observations.length === 0) {
    sections.push(`> ⚠️ **Warning:** Analysis produced no observations. Review tool warnings.\n`);
  }

  // Warnings
  if (doc.warnings.length > 0) {
    const warnList = doc.warnings.map((w) => `> - ${w}`).join("\n");
    sections.push(`> **Analysis Warnings:**\n${warnList}\n`);
  }

  sections.push(identificationSection(doc));
  sections.push(analysisToolsSection(doc.tools));

  // Section 3: Observed Findings
  sections.push(`## Observed Findings\n`);

  const nonDepObs = doc.observations.filter((o) => o.kind !== "dependency");
  if (nonDepObs.length === 0) {
    sections.push("_No non-dependency observations recorded._\n");
  } else {
    for (const obs of nonDepObs) {
      sections.push(observationEntry(obs));
    }
  }

  // Section 4: Justified Inferences
  sections.push(`## Justified Inferences\n`);
  if (doc.inferences.length === 0) {
    sections.push("_No inferences could be derived from the available evidence._\n");
  } else {
    for (const inf of doc.inferences) {
      sections.push(inferenceEntry(inf));
    }
  }

  // Section 5: Dependencies & Risks
  sections.push(`## Dependencies & Risks\n`);
  const depObs = doc.observations.filter((o) => o.kind === "dependency");
  if (depObs.length === 0) {
    sections.push("_No dependency observations recorded._\n");
  } else {
    for (const obs of depObs) {
      sections.push(dependencyEntry(obs));
    }
  }

  // Section 6: Unknowns
  sections.push(unknownsSection(doc.unknowns));

  // Section 7: Preservation Recommendations
  sections.push(preservationSection(doc));

  // Section 8: Limitations
  sections.push(limitationsSection(doc.tools));

  // Section 9: Appendix
  sections.push(evidenceIndexSection(doc));

  return sections.join("\n");
}

async function buildHtml(markdown: string, doc: EvidenceDocument): Promise<string> {
  const body = await marked.parse(markdown);

  // Build table of contents from ## headings
  const headings: string[] = [];
  const headingRegex = /^## (.+)$/gm;
  let m: RegExpExecArray | null;
  while ((m = headingRegex.exec(markdown)) !== null) {
    headings.push(m[1]);
  }

  const toc = headings
    .map((h) => {
      const anchor = h.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
      return `<li><a href="#${anchor}">${h}</a></li>`;
    })
    .join("\n");

  const css = `
    * { box-sizing: border-box; }
    body { font-family: -apple-system, "Segoe UI", system-ui, sans-serif; font-size: 15px; line-height: 1.6; color: #1f2328; background: #fff; margin: 0; padding: 20px; }
    .container { max-width: 900px; margin: 0 auto; }
    h1 { font-size: 1.8em; border-bottom: 2px solid #3b82d4; padding-bottom: 8px; }
    h2 { font-size: 1.3em; border-bottom: 1px solid #e5e7eb; padding-bottom: 4px; margin-top: 32px; }
    h3 { font-size: 1.1em; margin-top: 24px; }
    table { border-collapse: collapse; width: 100%; margin: 12px 0; font-size: 14px; }
    th, td { border: 1px solid #e5e7eb; padding: 6px 10px; text-align: left; }
    th { background: #f7f8fa; font-weight: 600; }
    code { background: #f7f8fa; padding: 2px 5px; border-radius: 3px; font-size: 13px; }
    pre { background: #f7f8fa; padding: 12px; border-radius: 4px; overflow-x: auto; border: 1px solid #e5e7eb; }
    pre code { background: none; padding: 0; }
    blockquote { border-left: 4px solid #3b82d4; margin: 0; padding: 4px 16px; background: #f0f6ff; }
    .badge-observed { display: inline-block; background: #3b82d4; color: #fff; padding: 1px 7px; border-radius: 3px; font-size: 12px; font-weight: 600; }
    .badge-inferred { display: inline-block; background: #d97706; color: #fff; padding: 1px 7px; border-radius: 3px; font-size: 12px; font-weight: 600; }
    .badge-unknown { display: inline-block; background: #6b7280; color: #fff; padding: 1px 7px; border-radius: 3px; font-size: 12px; font-weight: 600; }
    .badge-finding { display: inline-block; background: #dc2626; color: #fff; padding: 1px 7px; border-radius: 3px; font-size: 12px; font-weight: 600; }
    .toc { background: #f7f8fa; border: 1px solid #e5e7eb; border-radius: 4px; padding: 12px 20px; margin-bottom: 24px; }
    .toc h2 { font-size: 1em; margin: 0 0 8px; border: none; }
    .toc ul { margin: 0; padding-left: 18px; }
    .toc li { margin: 2px 0; }
    a { color: #3b82d4; }
    footer { margin-top: 40px; padding-top: 12px; border-top: 1px solid #e5e7eb; text-align: center; font-size: 12px; color: #57606a; }
  `;

  // Post-process HTML to render badge-style labels
  const processedBody = body
    .replace(/<strong>Label: Observed<\/strong>/g, '<span class="badge-observed">Observed</span>')
    .replace(/<strong>Label: Inferred<\/strong>/g, '<span class="badge-inferred">Inferred</span>')
    .replace(/<strong>Label: Finding for review<\/strong>/g, '<span class="badge-finding">Finding for review</span>');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Code Archaeologist Report — ${doc.input.name}</title>
<style>${css}</style>
</head>
<body>
<div class="container">
<nav class="toc">
  <h2>Table of Contents</h2>
  <ul>
    ${toc}
  </ul>
</nav>
${processedBody}
</div>
<footer>Made with IBM Bob</footer>
</body>
</html>`;
}
