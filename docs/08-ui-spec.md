# UI Specification

> Code Archaeologist · docs/08-ui-spec.md  
> React 18 + TypeScript + Vite

---

## 1. Pages

| Route | Component | Description |
|---|---|---|
| `/` | `HomePage` | Three submission options |
| `/analyses/:id` | `JobStatusPage` | Live polling of job phases |
| `/analyses/:id/report` | `ReportPage` | Rendered report with download buttons |

---

## 2. HomePage (`/`)

### Layout

- Header: product name + tagline.
- Three cards, one per analysis type:
  - **Public Repository** — URL text input + Submit button.
  - **Source ZIP** — file input (accepts `.zip`) + Submit button.
  - **Binary Sample** — file input (accepts `.exe`, no MIME restriction on client) + Submit button.
- Footer: disclaimer ("Static analysis only. No code is executed.").

### Behaviour

1. User selects a card and fills in the input.
2. Client validates locally:
   - URL: must start with `https://github.com/`.
   - ZIP: must have `.zip` extension and be ≤ 50 MB.
   - Binary: must be ≤ 100 MB.
3. On submit: POST to the appropriate endpoint.
4. On 202: navigate to `/analyses/:id`.
5. On error: display inline error below the card (never navigate away).

### No authentication, no user accounts, no payment UI.

---

## 3. JobStatusPage (`/analyses/:id`)

### Layout

- Job header: origin badge + job ID + creation time.
- Phase progress bar (5 phases in order):
  - `queued → preparing → scanning → reporting → completed`
  - Each phase shown as a step; current phase highlighted; failed phase shown in red.
- Warnings panel (if `warnings.length > 0`): collapsible yellow box.
- Error panel (if `status === "failed"`): red box with phase, message, and cause.
- Input metadata card: name, SHA-256 or commit, origin.
- When `status === "completed"`: "View Report" button → `/analyses/:id/report`.

### Polling

```ts
// Poll every 2 seconds while status is not terminal
const TERMINAL = new Set(["completed", "failed"]);

useEffect(() => {
  if (TERMINAL.has(status)) return;
  const timer = setInterval(async () => {
    const res = await fetchJobStatus(id);
    setJob(res);
  }, 2000);
  return () => clearInterval(timer);
}, [id, status]);
```

Stops polling on `completed` or `failed`.

---

## 4. ReportPage (`/analyses/:id/report`)

### Layout

- Report header: analysis ID, input name, origin badge, generation date.
- Section navigator (sticky sidebar or top tabs for mobile).
- Report sections rendered from the `EvidenceDocument` JSON (fetched via `?format=json`):
  - Each section as described in the report generator spec.
  - Observation-kind badges:
    - `Observed` — blue
    - `Inferred` — amber
    - `Not Determined` — grey
    - `Finding for review` — red
- Download bar at top with three buttons:
  - **Download HTML** → `GET /api/analyses/:id/report?format=html`
  - **Download Markdown** → `GET /api/analyses/:id/report?format=markdown`
  - **Download JSON** → `GET /api/analyses/:id/report?format=json`
- "Back to Status" link → `/analyses/:id`.

### Evidence References

Each inference section lists its `evidenceIds` as clickable anchor links that jump to the corresponding observation entry in the "Observed Findings" section.

---

## 5. API Client

```ts
// web/src/api/client.ts

const BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:3000";

export async function createRepositoryAnalysis(url: string): Promise<JobAcceptedResponse>;
export async function createSourceZipAnalysis(file: File): Promise<JobAcceptedResponse>;
export async function createBinaryAnalysis(file: File): Promise<JobAcceptedResponse>;
export async function getJobStatus(id: string): Promise<JobStatusResponse>;
export async function getReport(id: string, format?: "html" | "markdown" | "json"): Promise<string | EvidenceDocument>;
```

All functions throw a typed `ApiError` on non-2xx responses with `{ code, message, details }`.

---

## 6. Error States

| State | Display |
|---|---|
| Network error on POST | Card-level error: "Could not reach the server. Check that the API is running." |
| 400 Validation | Field-level error with message from API |
| 413 File too large | "File exceeds the {N} MB limit." |
| 404 Job not found | Full-page message: "Job not found or expired." |
| 409 Report not ready | Redirect back to `/analyses/:id` with note "Report not ready yet." |
| Job `failed` | Red error panel on JobStatusPage (no report link shown) |

---

## 7. Non-Requirements

- No login / authentication screens.
- No user management.
- No pagination (demo: small number of jobs).
- No real-time WebSocket (polling is sufficient).
- No complex visualisations (tables and badges suffice).
- No dark mode toggle (out of scope for hackathon).
- The web UI must **not** display a job as complete before receiving `status: "completed"` from the API.

---

## 8. Environment Config

```
VITE_API_BASE=http://localhost:3000
```

---

## 9. Build & Dev

```bash
# Development
cd web
npm install
npm run dev        # Vite dev server at http://localhost:5173

# Production build
npm run build      # outputs to web/dist/
```

The API sets `Access-Control-Allow-Origin: http://localhost:5173` in development.
