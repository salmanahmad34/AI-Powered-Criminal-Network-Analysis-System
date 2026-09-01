# Phase 3 Checkpoint — AI/NLP Extraction & Gateway

This document details the features, configurations, and verification results implemented for **Phase 3** (AI/NLP Extraction & Multi-Provider AI Gateway) of CrimeGraph AI.

---

## 1. Implemented Features

### A. Multi-Provider AI Gateway (`AIProviderManager`)
- **Abstractions Layer**: Implemented a central provider management system (`AIProviderManager`) that serves as the exclusive entry point for AI calls.
- **Enabled Providers**:
  - **Google Gemini API**: Configured as the primary provider with configurable model (default: `gemini-1.5-pro`).
  - **OpenRouter Gemma**: Configured as the secondary provider (`google/gemma-4-26b-a4b-it:free`).
  - **OpenRouter GLM**: Configured as the tertiary fallback provider (`z-ai/glm-5.2:free`).
- **Configurable Fallbacks & Failovers**: Outbound requests automatically fallback on error classes (timeout, HTTP 429, 5xx) to the next priority provider. Non-transient errors (invalid credentials, bad schemas) stop early.
- **Circuit Breaker**: Outage-prone providers are put in a `COOLDOWN` status (e.g. 60 seconds) and skipped from priority queues until their cooldown timer expires and they pass a health check.
- **Telemetry logging**: Logs duration, model used, cost inputs/outputs tokens, and fallback histories to the database.

### B. Document Extraction & NLP Structured Pipeline
- **Buffer Stream Extractor**: Developed plain-text extractors for `.txt` and simple text-based `.pdf` files.
- **Extraction Pipeline**: Reads document buffers, calls the AI Provider Gateway with structured system prompts, validates schema outputs via Zod, and instantiates raw `ExtractedEntity` and `ExtractedRelationship` logs.
- **Normalized Profile Seeding**: Consolidates raw extractions into case-wide `Entity`, `EntityAlias`, and `EntityIdentifier` profiles, making them fully viewable under case layouts.
- **Queue Pipeline Integration**: Integrated real AI text/NLP parsing milestones into the Case Ingestion progress tracking (`VALIDATING` -> `PROCESSING` -> `COMPLETED`).

### C. Admin & Case Dashboards (UI)
- **AI Health Status Panel**: Created an admin dashboard at `/admin` displaying provider priority rankings, models, current states (`HEALTHY`, `COOLDOWN`, `DISABLED`), cooldown timers, and enable/disable toggle triggers.
- **Entities tab**: Created a dedicated Case Entities and Relationships visual catalog. Clicking "Trace Source" calls the **Source Traceability Inspector** displaying exact text snippets and files where the AI discovered the entity.
- **Documents tab**: Added a dedicated vault layout showing checksum verifies and document formats.

---

## 2. Database Changes
Added three additive models to the Prisma schema:
- `AIProvider`: Active configurations, health status, and cooldown timelines.
- `AIRequest`: Request telemetry tracking duration, model, and failovers.
- `AIUsage`: Cost and token metrics (input/output counts).

---

## 3. Implemented API Routes
- `GET /api/ai/providers`: Retrieves registered providers status logs (Auditors/Admins only).
- `POST /api/ai/providers/:providerId/toggle`: Toggles provider enabled state (Admins only).
- `POST /api/ai/query`: Manual testing query (Investigators/Senior Officers).
- `GET /api/cases/:id/relationships`: Fetches case connection links.

---

## 5. Verification Results

### Automated Vitest Suite (`backend/src/tests/ai.test.ts`)
The integration tests cover:
- Successful Gemini content extraction
- Rate limit failover (429) from Gemini to OpenRouter Gemma
- Timeout failover from Gemini to OpenRouter Gemma
- Circuit breaker cooldown bypasses
- Schema validation failures
- Missing API key configuration handling
- RBAC permission blocks on provider admin controls

Running:
`npx vitest run src/tests/ai.test.ts`

```bash
 RUN  v2.1.9 D:/cyber security network analysis system/backend

 ✓ src/tests/ai.test.ts (9 tests) 105ms

 Test Files  1 passed (1)
      Tests  9 passed (9)
   Start at  11:35:11
   Duration  7.63s
```
All **9 integration tests** passed successfully.

---

## 6. Known Limitations
- PDF parsing extracts basic single-column layout text streams. For scanned image files, OCR belongs to future expansion.
- Local sandbox mode runs in mock database environment by default.

---

## 7. Features Explicitly NOT Implemented (Phase Boundary)
- Graph analytics centrality algorithms (degree, betweenness, community detection).
- Cross-case profile identity resolution.
- Investigation chat assistant.
- Criminality/guilt automated profiling scores.

---

## 8. Approval Status
- **Phase 3 Specification Plan**: Approved by User.
- **Phase 3 Implementation**: Completed and verified.
