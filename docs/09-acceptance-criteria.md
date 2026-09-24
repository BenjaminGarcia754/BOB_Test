# Acceptance Criteria

> Code Archaeologist · docs/09-acceptance-criteria.md

---

## 1. Source Analysis

### Happy Path

| # | Input | Expected Result |
|---|---|---|
| S1 | Valid `https://github.com/owner/repo` (public) | Status `completed`; `input.commit` populated; report has ≥1 `file` observation; no empty sections |
| S2 | Valid `.zip` of team source | Status `completed`; `input.sha256` populated; report lists files and dependencies |
| S3 | ZIP containing a `package.json` | Report includes at least the declared dependencies as `dependency` observations |
| S4 | Source with a known Semgrep rule hit | Report contains a `finding` observation with `source.ruleId` and `source.line` |

### Error / Rejection Path

| # | Input | Expected Result |
|---|---|---|
| S5 | ZIP containing `../etc/passwd` path | 400 response or job `failed` with `VALIDATION_ERROR`; no extraction |
| S6 | Private repo URL `https://github.com/org/private-repo` | Job fails during `preparing` with appropriate message (git clone fails) |
| S7 | Non-GitHub URL (e.g. `https://gitlab.com/…`) | 400 `HOST_NOT_ALLOWED` — rejected before job creation |
| S8 | ZIP > 50 MB | 413 `FILE_TOO_LARGE` — rejected before job creation |
| S9 | File with `.zip` extension but wrong magic bytes | 400 `UNSUPPORTED_FILE` |
| S10 | Semgrep not installed | Job completes with `partial` coverage warning; Trivy results still present |

---

## 2. Binary Analysis

| # | Input | Expected Result |
|---|---|---|
| B1 | Team-owned PE x64 binary | Status `completed`; imports listed with addresses; ≥1 function with pseudocode |
| B2 | Binary with known network imports | Report contains ≥1 network-tagged `import` observation |
| B3 | Non-PE file (e.g. a JPEG renamed to `.exe`) | 400 `UNSUPPORTED_FILE` — rejected before job creation |
| B4 | Binary > 100 MB | 413 `FILE_TOO_LARGE` |
| B5 | Ghidra timeout (artificially low timeout in test) | Job `failed` with `cause: "TIMEOUT"`; no partial report |
| B6 | Ghidra not installed | Job `failed` with `cause: "TOOL_ERROR"` |

---

## 3. Report Quality

| # | Rule | Verification |
|---|---|---|
| R1 | Every inference has `evidenceIds` referencing real observation IDs | Automated: parse JSON, cross-reference IDs |
| R2 | No scanner result without findings ≠ "system is safe" | Manual: check report wording; "no findings" section must say "no findings detected by {tool}" |
| R3 | All redacted-content items show `[REDACTED]` placeholder | Automated: scan `observations` for private key patterns |
| R4 | "Unknown" section is present and non-empty for binary analysis | Automated: check `unknowns.length > 0` |
| R5 | HTML report is self-contained (no external CSS/JS URLs) | Automated: parse HTML, check for external `src`/`href` |
| R6 | Raw tool JSON files exist in `work-dir/raw/` for every completed job | Automated: file system check after job completes |

---

## 4. API Contract

| # | Rule | Verification |
|---|---|---|
| A1 | POST responds before analysis completes | Measure: POST response time < 500 ms |
| A2 | Polling shows real phase transitions | Manual: watch GET responses while job runs |
| A3 | `GET /report` returns `409 REPORT_NOT_READY` before completion | Automated: call immediately after POST, expect 409 |
| A4 | `GET /report?format=json` returns valid `EvidenceDocument` | Automated: parse and validate with Zod schema |
| A5 | `GET /analyses/:unknownId` returns 404 | Automated |
| A6 | ZIP upload over limit returns 413 before worker is invoked | Automated: check no work-dir created |

---

## 5. Demo Validation Table

Record these before the final submission by running the demo against team samples:

| # | Claim Tested | Source? (binary vs source file) | Result | Notes |
|---|---|---|---|---|
| D1 | Binary imports `CreateFileW` | binary | — | Fill during demo |
| D2 | Binary imports a network function | binary | — | Fill during demo |
| D3 | Source contains a dependency with a known CVE | source-zip | — | Fill during demo |
| D4 | Source entry-point identified | source-zip | — | Fill during demo |
| D5 | Binary pseudocode references a file path string | binary | — | Fill during demo |
| D6 | Inference labelled correctly as inferred (not observed) | both | — | Fill during demo |
| D7 | Report download works for HTML and JSON | both | — | Fill during demo |
| D8 | Analysis time measured (start to `completed`) | both | — | Record seconds |

---

## 6. Pre-Submission Checklist

- [ ] Tests pass from a clean environment (`npm test` in `api/`).
- [ ] Full demo from scratch: submit repo URL + submit binary → both reach `completed`.
- [ ] `bob_sessions/` contains ≥1 PNG per team member of relevant task summaries.
- [ ] No secrets, tokens, or `.env` files committed to the repository.
- [ ] `README.md` has installation and run instructions reproducible from scratch.
- [ ] `samples/` contains only team-owned or authorised artefacts with licence notes.
- [ ] Trivy DB is updated and `dataDate` is recorded in at least one demo report.
- [ ] Validation table (section 5 above) is filled in.
- [ ] Lablab submission fields checked and deadline confirmed.
