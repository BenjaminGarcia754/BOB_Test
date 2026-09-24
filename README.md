# Code Archaeologist

> **IBM Bob 2.0 Hackathon** · 25–27 September 2026  
> Static analysis and preservation reporting for legacy repositories and binaries.

---

## What It Does

Submit a public GitHub repository, a ZIP of authorised source code, or a PE x64 binary sample. Code Archaeologist runs free, open-source static analysis tools in isolation and generates a **preservation report** that clearly distinguishes:

- **Observed** — facts directly extracted by a tool.
- **Inferred** — conclusions from multiple corroborating observations, labelled with confidence.
- **Not Determined** — aspects that could not be established from the evidence.

No code is ever executed. No paid AI APIs are used. Every claim in the report traces back to a concrete tool result.

---

## Requirements

| Tool | Version | Notes |
|---|---|---|
| Node.js | ≥ 20 | API and web |
| npm | ≥ 10 | |
| git | any | Required for repository analysis |
| Semgrep CE | latest | `pip install semgrep` or from [semgrep.dev](https://semgrep.dev) |
| Trivy | ≥ 0.50 | From [trivy.dev](https://trivy.dev) |
| Ghidra | 11.x | From [ghidra.re](https://ghidra.re); requires Java 17+ |
| Java | ≥ 17 | Required by Ghidra |

---

## Quick Start

```bash
# 1. Clone the repository
git clone https://github.com/<your-team>/code-archaeologist
cd code-archaeologist

# 2. Configure environment
cp api/.env.example api/.env
# Edit api/.env — set GHIDRA_HOME to your Ghidra installation path

# 3. Update Trivy vulnerability database (do this before the demo)
trivy image --download-db-only

# 4. Install and start the API
cd api
npm install
npm run dev

# 5. Install and start the web (new terminal)
cd web
npm install
npm run dev

# 6. Open http://localhost:5173
```

---

## Environment Variables (`api/.env`)

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3000` | API listen port |
| `WORK_DIR` | `./work` | Base directory for job work-dirs |
| `MAX_ZIP_MB` | `50` | Max ZIP upload size in MB |
| `MAX_BINARY_MB` | `100` | Max binary upload size in MB |
| `ANALYSIS_TIMEOUT_MS` | `300000` | 5 min per analysis phase |
| `JOB_RETENTION_MS` | `3600000` | 1 hour before work-dir cleanup |
| `GHIDRA_HOME` | `/opt/ghidra` | Path to Ghidra installation |
| `SEMGREP_BIN` | `semgrep` | Semgrep binary name (must be in PATH) |
| `TRIVY_BIN` | `trivy` | Trivy binary name (must be in PATH) |
| `MAX_GHIDRA_FUNCTIONS` | `20` | Max functions with pseudocode exported |

---

## Project Structure

```
code-archaeologist/
├── api/              # Express + TypeScript API
├── web/              # React + TypeScript + Vite UI
├── samples/          # Team-owned demo artefacts (binary, source ZIP)
├── bob_sessions/     # Required: PNG task summaries per participant
├── docs/             # Full project documentation
│   ├── 00-project-overview.md
│   ├── 01-architecture.md
│   ├── 02-api-contracts.md
│   ├── 03-data-models.md
│   ├── 04-job-lifecycle.md
│   ├── 05-source-pipeline.md
│   ├── 06-binary-pipeline.md
│   ├── 07-report-generator.md
│   ├── 08-ui-spec.md
│   └── 09-acceptance-criteria.md
└── BOB_IDE_PROJECT_BRIEF.md
```

---

## Running Tests

```bash
cd api
npm test
```

---

## Demo Samples

Team-owned samples are located in `samples/`. See `samples/README.md` for licence notes and SHA-256 hashes.

---

## Limitations

- In-memory job queue: jobs are lost on server restart.
- One concurrent analysis job (demo constraint).
- Binary analysis requires Ghidra; if unavailable, job fails with a clear message.
- Trivy vulnerability data reflects the database version at scan time.
- This tool is for demo and research use; not for production security assessment.

---

## Licence

[MIT](LICENSE) — see `samples/README.md` for sample artefact licences.
