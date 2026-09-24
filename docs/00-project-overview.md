# Code Archaeologist — Project Overview

> IBM Bob 2.0 Hackathon · 25–27 September 2026  
> Version: 1.0 · Status: Documentation Phase

---

## 1. Problem Statement

Understanding and preserving a legacy or poorly-documented application requires locating system components, dependencies, and technical evidence. When only the executable remains, recovering that knowledge becomes even harder. Manual investigation across separate artefacts is time-consuming and error-prone.

## 2. Solution

A web application where a user submits:

- A **public GitHub repository URL** — to analyse source code.
- A **ZIP of authorised source code** — to analyse a private or local codebase.
- A **sample binary (PE x64)** — to analyse a compiled executable via static inspection only.

The platform creates an analysis job, runs open-source static tools in isolation, and produces a **preservation report** that clearly distinguishes observed facts from inferences and explicitly marks what could not be determined.

## 3. Core Constraints

| Constraint | Rule |
|---|---|
| No code execution | The submitted source, scripts, and binary are **never** executed |
| No paid AI APIs | The report generator is deterministic; no tokens are spent per report |
| No fabricated results | If a tool fails, the report shows partial analysis with explicit gaps |
| No secrets in reports | `.env`, tokens, keys are excluded from all outputs |
| Static tools only | Ghidra (headless), Semgrep CE, Trivy — all free |
| Local queue | In-memory job queue sufficient for demo; SQLite persistence optional |

## 4. Team Deliverables

| Priority | Deliverable | Verifiable Output |
|---|---|---|
| 1 | Shared Zod schema + deterministic report generator | Test with fixed sample; trace every inference to evidence IDs |
| 2 | Job lifecycle API + one intake route + polling | 202 on POST; GET shows real phase transitions |
| 3 | Source pipeline: URL/ZIP, inventory, Semgrep/Trivy, normalisation | Own sample repo analysed end-to-end |
| 4 | Binary pipeline: Ghidra headless, exporter script, normalisation | Own PE x64 sample analysed; cross-referenced with reserved source |
| 5 | React UI: 3 screens, demo, documentation | Full flow from submission to downloadable report |

## 5. Out of Scope

- Private repos / GitHub authentication
- Running submitted code or binaries
- Emulation or source reconstruction
- Confirmed security vulnerability declarations (findings are "for review")
- Paid AI summarisation
- Public deployment accepting arbitrary binaries

## 6. Bob IDE Usage

- Bob IDE is the **primary development environment** and is mandatory for hackathon eligibility.
- Each participant must save PNG screenshots of relevant task summaries to `bob_sessions/`.
- Monitor Bobcoins per task (40 coins per account). The product does NOT consume Bobcoins when users generate reports.

## 7. Repository Structure

```
code-archaeologist/
├── api/                  # Express + TypeScript API
│   ├── src/
│   │   ├── routes/       # Route handlers
│   │   ├── jobs/         # Job queue and worker
│   │   ├── analysers/    # Source and binary pipelines
│   │   ├── report/       # Deterministic report generator
│   │   ├── schemas/      # Zod contracts (shared)
│   │   └── index.ts
│   ├── package.json
│   └── tsconfig.json
├── web/                  # React + TypeScript + Vite UI
│   ├── src/
│   │   ├── pages/        # Home, JobStatus, Report
│   │   ├── components/
│   │   └── api/          # Typed fetch helpers
│   ├── package.json
│   └── vite.config.ts
├── samples/              # Team-owned demo artefacts
│   ├── demo-repo.zip
│   └── demo-binary.exe
├── bob_sessions/         # Required: PNG task summaries per participant
├── docs/                 # This documentation
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
├── BOB_IDE_PROJECT_BRIEF.md
└── README.md
```

## 8. Technology Stack

| Layer | Technology | Rationale |
|---|---|---|
| API | Node.js 20 + Express 5 + TypeScript 5 | Familiar, fast to wire |
| Validation | Zod 3 | Runtime-safe contracts shared across API/worker |
| Job queue | In-memory worker (BullMQ optional) | Demo-sufficient; no external dependency |
| Source analysis | Semgrep CE, Trivy | Free, CLI JSON output |
| Binary analysis | Ghidra 11 headless + custom Java script | Authoritative decompiler |
| Report | Template literal generator (Markdown → HTML) | No AI tokens |
| Web | React 18 + TypeScript + Vite | Standard hackathon stack |
| Persistence | File system (work dirs) + optional SQLite | Simplest for demo |

## 9. Licence & Data Policy

- Only team-owned or explicitly authorised samples used.
- Public repos: verify terms permit this use; log URL + licence.
- No PII, no client data, no social media data.
- Temporary work directories cleaned after configured retention.
