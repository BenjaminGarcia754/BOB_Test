# Implementation Plan

> Code Archaeologist · docs/10-implementation-plan.md  
> Ordered by priority. Each task is a self-contained Bob IDE session.

---

## Bobcoins Budget Guidance

- 40 Bobcoins per account.
- Estimate ~3–5 Bobcoins per focused implementation task (schema design, route implementation, pipeline).
- Reserve ~5 Bobcoins for debugging and final review.
- **The product does not spend Bobcoins when users generate reports.**

---

## Task Sequence

---

### Task 01 — Shared Schemas + Report Generator

**Bob IDE prompt to use:**
> "Diseña y prueba un esquema Zod común para observaciones de fuente y binario. Implementa un reporte Markdown determinista en el que cada inferencia apunte a IDs de evidencia; comienza con una muestra fija realista. Muestra un caso observado, uno inferido y uno desconocido."

**Files to create:**
```
api/src/schemas/enums.ts
api/src/schemas/evidence.ts
api/src/schemas/job.ts
api/src/schemas/requests.ts
api/src/schemas/index.ts
api/src/report/generator.ts
api/src/report/templates.ts
api/test/report.test.ts
```

**Acceptance:** `npm test` passes; report output has all 3 label types; every inference has valid `evidenceIds`.

**Screenshot:** `bob_sessions/<name>_task01_schemas_report.png`

---

### Task 02 — Job Queue + API Skeleton

**Bob IDE prompt:**
> "Implementa el ciclo `queued/preparing/scanning/reporting/completed/failed` en la API. POST devuelve 202 con jobId y GET permite seguirlo. Verifica éxito, error y timeout con una tarea de prueba; no bloquees la solicitud HTTP."

**Files to create:**
```
api/src/jobs/queue.ts
api/src/jobs/worker.ts
api/src/jobs/store.ts
api/src/routes/analyses.ts
api/src/middleware/validate.ts
api/src/middleware/upload.ts
api/src/index.ts
api/.env.example
api/package.json
api/tsconfig.json
api/test/jobs.test.ts
```

**Acceptance:** POST → 202; GET shows phases transitioning; a mock job reaches `completed`; a timed-out job reaches `failed`.

**Screenshot:** `bob_sessions/<name>_task02_jobs_api.png`

---

### Task 03 — Source Pipeline

**Bob IDE prompt:**
> "Implementa la ingesta de ZIP y repositorio público permitidos. No ejecutes código del repo. Normaliza inventario y resultados JSON de Semgrep CE y Trivy; registra herramientas fallidas como cobertura parcial. Prueba un repo de muestra propio."

**Files to create:**
```
api/src/analysers/source/index.ts
api/src/analysers/source/prepare.ts
api/src/analysers/source/inventory.ts
api/src/analysers/source/semgrep.ts
api/src/analysers/source/trivy.ts
api/src/analysers/source/normalise.ts
api/test/source-pipeline.test.ts
```

**Acceptance:** own sample repo → `completed` with commit recorded; own ZIP → `completed` with SHA-256; ZIP with `../` rejected; non-GitHub URL rejected at API layer.

**Screenshot:** `bob_sessions/<name>_task03_source_pipeline.png`

---

### Task 04 — Binary Pipeline

**Bob IDE prompt:**
> "Automatiza Ghidra headless para nuestra muestra PE x64. Escribe un script que exporte imports, cadenas relevantes y hasta N funciones con direcciones y pseudocódigo; añade timeout y valida el JSON. Contrasta los hallazgos con el fuente reservado."

**Files to create:**
```
api/src/analysers/binary/index.ts
api/src/analysers/binary/validate.ts
api/src/analysers/binary/ghidra.ts
api/src/analysers/binary/normalise.ts
api/scripts/ghidra/ExportAnalysis.java
api/test/binary-pipeline.test.ts
```

**Acceptance:** own PE x64 binary → `completed`; imports + strings + functions in evidence; non-PE file → 400; Ghidra timeout → `failed`.

**Screenshot:** `bob_sessions/<name>_task04_binary_pipeline.png`

---

### Task 05 — React Web UI

**Bob IDE prompt:**
> "Construye la web React para crear un job, seguir estados reales y mostrar el reporte con referencias. Revisa el flujo completo y prepara instrucciones reproducibles. No muestres hallazgos simulados como reales."

**Files to create:**
```
web/src/pages/HomePage.tsx
web/src/pages/JobStatusPage.tsx
web/src/pages/ReportPage.tsx
web/src/api/client.ts
web/src/components/PhaseStepper.tsx
web/src/components/ObservationCard.tsx
web/src/components/InferenceCard.tsx
web/src/App.tsx
web/src/main.tsx
web/index.html
web/package.json
web/vite.config.ts
web/tsconfig.json
```

**Acceptance:** full flow from submission form to downloaded HTML report; no job shown as complete before API says so; all three input types submit without error.

**Screenshot:** `bob_sessions/<name>_task05_web_ui.png`

---

### Task 06 — Integration Test + Demo Prep

**Bob IDE prompt:**
> "Ejecuta la demo completa desde un entorno limpio con los artefactos de muestra. Registra tiempos, rellena la tabla de validación y comprueba que no hay secretos en el repositorio."

**Work items:**
- Run full end-to-end with `samples/demo-binary.exe` and `samples/demo-repo.zip`.
- Fill in `docs/09-acceptance-criteria.md` — Demo Validation Table (section 5).
- Run `npm test` in `api/` from scratch.
- Verify `bob_sessions/` has all required screenshots.
- Check no secrets committed (`git grep -i "api.key\|password\|secret"`).
- Record analysis times.

**Screenshot:** `bob_sessions/<name>_task06_integration_demo.png`

---

## Parallel Work Distribution

```
Team Member A: Task 01 (schemas) → Task 03 (source pipeline)
Team Member B: Task 02 (jobs/API) → Task 04 (binary pipeline)
Team Member C: Task 05 (web UI)  → Task 06 (integration)
```

**Integration point after Task 01 + Task 02:** merge schemas and job queue before starting pipelines.

---

## Risk Register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Ghidra not available on demo machine | Medium | High | Install and test before kickoff; document manual install steps |
| Trivy DB stale / download fails | Medium | Medium | Pre-download DB; use `--skip-update` flag |
| Semgrep takes too long on large repo | Medium | Medium | Use `--timeout 120` flag; add size limit on repo clone |
| Bobcoins exhausted mid-implementation | Low | High | Work in short focused tasks; check balance after each task |
| git clone of private/deleted repo | High | Low | API rejects all non-github.com; job fails gracefully with message |
| ZIP path traversal slip | Low | Critical | Use safe-extract helper; add automated test S5 |
