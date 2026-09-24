import os from "os";
import path from "path";
import fs from "fs";
import { generateReport } from "../src/report/generator.js";
import { FIXED_EVIDENCE } from "./fixtures.js";

describe("report generator", () => {
  let outputDir: string;

  beforeEach(() => {
    outputDir = fs.mkdtempSync(path.join(os.tmpdir(), "report-test-"));
  });

  afterEach(() => {
    fs.rmSync(outputDir, { recursive: true, force: true });
  });

  it("generates report files on disk", async () => {
    await generateReport(FIXED_EVIDENCE, outputDir);
    expect(fs.existsSync(path.join(outputDir, "report.md"))).toBe(true);
    expect(fs.existsSync(path.join(outputDir, "report.html"))).toBe(true);
    expect(fs.existsSync(path.join(outputDir, "report.json"))).toBe(true);
  });

  it("report.md contains all required section headings", async () => {
    const { markdown } = await generateReport(FIXED_EVIDENCE, outputDir);
    expect(markdown).toContain("## Identification");
    expect(markdown).toContain("## Analysis Summary");
    expect(markdown).toContain("## Observed Findings");
    expect(markdown).toContain("## Justified Inferences");
    expect(markdown).toContain("## Dependencies & Risks");
    expect(markdown).toContain("## Limitations");
    expect(markdown).toContain("## Appendix: Evidence Index");
  });

  it("report.md references all observation IDs", async () => {
    const { markdown } = await generateReport(FIXED_EVIDENCE, outputDir);
    for (const obs of FIXED_EVIDENCE.observations) {
      expect(markdown).toContain(obs.id);
    }
  });

  it("report.md references all inference IDs", async () => {
    const { markdown } = await generateReport(FIXED_EVIDENCE, outputDir);
    for (const inf of FIXED_EVIDENCE.inferences) {
      expect(markdown).toContain(inf.id);
    }
  });

  it("every inference evidenceId references a real observation ID", async () => {
    const obsIds = new Set(FIXED_EVIDENCE.observations.map((o) => o.id));
    for (const inf of FIXED_EVIDENCE.inferences) {
      for (const eid of inf.evidenceIds) {
        expect(obsIds.has(eid)).toBe(true);
      }
    }
  });

  it("HTML output contains no external URLs in src attributes", async () => {
    const { html } = await generateReport(FIXED_EVIDENCE, outputDir);
    // No src="http..." or src="//..."
    expect(html).not.toMatch(/src="https?:\/\//);
    expect(html).not.toMatch(/src="\/\//);
    // No external stylesheet links
    expect(html).not.toMatch(/<link[^>]+rel="stylesheet"[^>]+href="https?:\/\//);
  });

  it("HTML is self-contained (no external script tags)", async () => {
    const { html } = await generateReport(FIXED_EVIDENCE, outputDir);
    expect(html).not.toMatch(/<script[^>]+src="https?:\/\//);
  });

  it("report.json matches the evidence document", async () => {
    await generateReport(FIXED_EVIDENCE, outputDir);
    const reportJson = JSON.parse(
      fs.readFileSync(path.join(outputDir, "report.json"), "utf-8")
    ) as typeof FIXED_EVIDENCE;
    expect(reportJson.analysisId).toBe(FIXED_EVIDENCE.analysisId);
    expect(reportJson.observations.length).toBe(FIXED_EVIDENCE.observations.length);
  });

  it("is deterministic — same input produces same output", async () => {
    const dir1 = fs.mkdtempSync(path.join(os.tmpdir(), "report-det1-"));
    const dir2 = fs.mkdtempSync(path.join(os.tmpdir(), "report-det2-"));
    try {
      const { markdown: md1, html: h1 } = await generateReport(FIXED_EVIDENCE, dir1);
      const { markdown: md2, html: h2 } = await generateReport(FIXED_EVIDENCE, dir2);
      expect(md1).toBe(md2);
      expect(h1).toBe(h2);
    } finally {
      fs.rmSync(dir1, { recursive: true, force: true });
      fs.rmSync(dir2, { recursive: true, force: true });
    }
  });
});
