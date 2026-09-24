# API Contracts

> Code Archaeologist · docs/02-api-contracts.md  
> Base URL: `http://localhost:3000`

All requests and responses use `application/json` unless noted. All error responses share the same envelope.

---

## Error Envelope

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human-readable description",
    "details": {}          // optional: field-level Zod errors
  }
}
```

### Error Codes

| Code | HTTP Status | Meaning |
|---|---|---|
| `VALIDATION_ERROR` | 400 | Request body/params failed Zod validation |
| `UNSUPPORTED_FILE` | 400 | Wrong MIME type or magic bytes |
| `FILE_TOO_LARGE` | 413 | Upload exceeds configured limit |
| `HOST_NOT_ALLOWED` | 400 | Repo URL host is not `github.com` |
| `JOB_NOT_FOUND` | 404 | No job with given ID |
| `REPORT_NOT_READY` | 409 | Job has not reached `completed` state yet |
| `JOB_FAILED` | 409 | Job is in `failed` state; no report available |
| `INTERNAL_ERROR` | 500 | Unexpected server error |

---

## Endpoints

---

### `POST /api/analyses/repository`

Submit a public GitHub repository for analysis.

**Request**

```
Content-Type: application/json
```

```json
{
  "url": "https://github.com/owner/repo"
}
```

**Zod schema**

```ts
z.object({
  url: z
    .string()
    .url()
    .refine(
      (u) => new URL(u).hostname === "github.com",
      "Only github.com repositories are accepted"
    )
    .refine(
      (u) => /^https:\/\/github\.com\/[^/]+\/[^/]+/.test(u),
      "URL must match https://github.com/<owner>/<repo>"
    ),
})
```

**Response 202 — Accepted**

```json
{
  "jobId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "status": "queued",
  "createdAt": "2026-09-25T10:00:00.000Z",
  "links": {
    "status": "/api/analyses/a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "report": "/api/analyses/a1b2c3d4-e5f6-7890-abcd-ef1234567890/report"
  }
}
```

---

### `POST /api/analyses/source-zip`

Upload a ZIP archive of authorised source code.

**Request**

```
Content-Type: multipart/form-data
```

| Field | Type | Required | Constraints |
|---|---|---|---|
| `file` | file | yes | MIME `application/zip`; max 50 MB |

**Response 202** — same shape as repository endpoint.

**Additional error: `FILE_TOO_LARGE` (413), `UNSUPPORTED_FILE` (400)**

---

### `POST /api/analyses/binary`

Upload a PE x64 binary sample for static analysis.

**Request**

```
Content-Type: multipart/form-data
```

| Field | Type | Required | Constraints |
|---|---|---|---|
| `file` | file | yes | PE magic (`MZ` header); max 100 MB |

**Response 202** — same shape as repository endpoint.

**Additional errors: `FILE_TOO_LARGE` (413), `UNSUPPORTED_FILE` (400)**

---

### `GET /api/analyses/:id`

Poll a job for its current status and phase metadata.

**Path parameters**

| Param | Type | Description |
|---|---|---|
| `id` | UUID string | Job identifier returned on creation |

**Response 200**

```json
{
  "jobId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "origin": "source-repository",
  "status": "scanning",
  "createdAt": "2026-09-25T10:00:00.000Z",
  "updatedAt": "2026-09-25T10:00:12.000Z",
  "input": {
    "name": "my-repo",
    "sha256": null,
    "commit": "a3f8c2d1b9e7f0123456789abcdef01234567890"
  },
  "phases": [
    { "name": "queued",    "startedAt": "2026-09-25T10:00:00.000Z", "endedAt": "2026-09-25T10:00:01.000Z", "status": "completed" },
    { "name": "preparing", "startedAt": "2026-09-25T10:00:01.000Z", "endedAt": "2026-09-25T10:00:05.000Z", "status": "completed" },
    { "name": "scanning",  "startedAt": "2026-09-25T10:00:05.000Z", "endedAt": null,                       "status": "running" },
    { "name": "reporting", "startedAt": null,                       "endedAt": null,                       "status": "pending" },
    { "name": "completed", "startedAt": null,                       "endedAt": null,                       "status": "pending" }
  ],
  "warnings": [],
  "error": null
}
```

**`status` values:** `queued | preparing | scanning | reporting | completed | failed`

**`phases[n].status` values:** `pending | running | completed | failed`

**Response 404** — job not found.

---

### `GET /api/analyses/:id/report`

Download the completed analysis report.

**Query parameters (optional)**

| Param | Values | Default | Description |
|---|---|---|---|
| `format` | `html`, `markdown`, `json` | `html` | Desired report format |

**Response 200 — HTML** (`Content-Type: text/html`)
**Response 200 — Markdown** (`Content-Type: text/markdown`)
**Response 200 — JSON** (`Content-Type: application/json`) — full `EvidenceDocument`

**Response 404** — job not found.

**Response 409** — job not yet completed or has failed.

```json
{
  "error": {
    "code": "REPORT_NOT_READY",
    "message": "Analysis is still in progress",
    "details": {
      "status": "scanning",
      "jobId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
    }
  }
}
```

---

## Rate Limits (Demo)

| Limit | Value | Notes |
|---|---|---|
| Concurrent jobs | 1 | In-memory worker, single slot |
| Max queue depth | 10 | Subsequent submissions receive `503` with `QUEUE_FULL` |
| Analysis timeout | 5 min | Per job; exceeded → `failed` with `TIMEOUT` cause |
| Job retention | 1 hour | After which work-dir is deleted and job is purged |

---

## OpenAPI 3.1 Summary (Paths)

```yaml
openapi: "3.1.0"
info:
  title: Code Archaeologist API
  version: "1.0.0"
paths:
  /api/analyses/repository:
    post:
      operationId: createRepositoryAnalysis
      summary: Submit a public GitHub repository for analysis
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/RepositoryRequest'
      responses:
        '202': { $ref: '#/components/responses/JobAccepted' }
        '400': { $ref: '#/components/responses/ValidationError' }

  /api/analyses/source-zip:
    post:
      operationId: createSourceZipAnalysis
      summary: Upload a ZIP of authorised source code
      requestBody:
        required: true
        content:
          multipart/form-data:
            schema:
              type: object
              properties:
                file: { type: string, format: binary }
      responses:
        '202': { $ref: '#/components/responses/JobAccepted' }
        '400': { $ref: '#/components/responses/ValidationError' }
        '413': { $ref: '#/components/responses/FileTooLarge' }

  /api/analyses/binary:
    post:
      operationId: createBinaryAnalysis
      summary: Upload a PE x64 binary for static analysis
      requestBody:
        required: true
        content:
          multipart/form-data:
            schema:
              type: object
              properties:
                file: { type: string, format: binary }
      responses:
        '202': { $ref: '#/components/responses/JobAccepted' }
        '400': { $ref: '#/components/responses/ValidationError' }
        '413': { $ref: '#/components/responses/FileTooLarge' }

  /api/analyses/{id}:
    get:
      operationId: getAnalysisStatus
      summary: Poll a job for its current status
      parameters:
        - name: id
          in: path
          required: true
          schema: { type: string, format: uuid }
      responses:
        '200': { $ref: '#/components/responses/JobStatus' }
        '404': { $ref: '#/components/responses/NotFound' }

  /api/analyses/{id}/report:
    get:
      operationId: getAnalysisReport
      summary: Download the completed report
      parameters:
        - name: id
          in: path
          required: true
          schema: { type: string, format: uuid }
        - name: format
          in: query
          schema:
            type: string
            enum: [html, markdown, json]
            default: html
      responses:
        '200':
          description: Report content
          content:
            text/html: {}
            text/markdown: {}
            application/json: {}
        '404': { $ref: '#/components/responses/NotFound' }
        '409': { $ref: '#/components/responses/ReportNotReady' }
```
