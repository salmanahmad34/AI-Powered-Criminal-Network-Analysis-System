# CrimeGraph AI — Development Governance Skill

## Purpose
This skill is mandatory for every development phase of CrimeGraph AI. The project is an educational/hackathon prototype using only synthetic or anonymized demo data. The coding agent must follow the approved architecture and phase boundaries and must never make unapproved architectural, security, UI, data, or feature changes.

## Mandatory Rules
1. Read this file before starting ANY phase.
2. Read the current `task.md`, `walkthrough.md`, README, relevant source files, and current tests before modifying code.
3. Treat the approved product specification and current phase prompt as the source of truth.
4. Implement ONLY the requested phase.
5. Do NOT silently implement future-phase features.
6. Do NOT remove, rename, replace, or rewrite existing working functionality unless the phase explicitly requires it.
7. Do NOT change the technology stack without explicit approval.
8. Do NOT change database architecture without explicit approval.
9. Do NOT introduce new dependencies unless necessary and clearly reported.
10. Do NOT delete existing data, reset databases, or perform destructive migrations without explicit approval.
11. Use synthetic/anonymized demo data only. Never use real criminal records, real CDRs, real bank records, private personal data, police databases, or unauthorized government APIs.
12. Never declare a person a criminal or guilty. AI outputs are investigation signals/leads only.
13. Important AI results must remain traceable to source records.
14. Human review is required for uncertain identity matches and high-impact decisions.

## Before Coding
Inspect the existing project, including:
- folder structure
- frontend/backend
- database schema
- authentication/RBAC
- APIs
- tests
- environment configuration
- `task.md`
- `walkthrough.md`

Before coding, provide a short plan listing files, database changes, API changes, UI changes, and tests. If the requested phase conflicts with the existing architecture, STOP and report the conflict instead of silently changing architecture.

## Phase Boundary Protection
Every phase has an explicit scope. Implement ONLY that scope. Future features may exist only as clearly labeled placeholders when needed.

Do not implement future-phase functionality early. For example, Phase 2 must not implement AI entity extraction, OCR entity extraction, entity resolution, cross-case linking, graph analytics, anomaly detection, or the AI assistant unless explicitly requested by the phase prompt.

## Change Safety
Before modifying an existing component:
1. Read the current implementation.
2. Understand dependencies.
3. Preserve existing behavior.
4. Make the smallest safe change.
5. Run relevant tests.

Never replace a working module merely because another implementation is easier.

## Database Safety
- Prefer additive migrations.
- Preserve existing models and data.
- Never silently reset or destroy the database.
- Never remove existing fields/models without approval.
- Verify relations and indexes.
- If a destructive migration is unavoidable, STOP and ask for approval.

## Dependency and Environment Safety
Before adding a package, check whether an existing dependency can do the job. Report necessary new dependencies and their purpose.

Never hard-code API keys, passwords, tokens, database credentials, or private keys. Use environment variables.

If Docker/Redis/Neo4j/PostgreSQL is unavailable, a clearly labeled development/mock fallback may be used only when it does not change the intended production architecture. The final report must clearly distinguish real, mocked, and planned infrastructure.

## Security
Maintain:
- authentication
- backend authorization
- RBAC
- input validation
- file validation
- safe file handling
- upload limits
- audit logging
- secure secrets handling

Never rely only on frontend authorization. Never expose unauthorized case data. Never execute uploaded files.

## AI Reliability and Safety
When AI/NLP features are implemented:
- Never invent evidence, entities, relationships, or sources.
- Return structured output.
- Include confidence where appropriate.
- Include source document/record references.
- State “insufficient evidence” when data is insufficient.
- Respect user/case authorization.
- Never make guilt/criminality determinations.

Use wording such as “Potential relationship detected,” not “Criminal relationship confirmed.”

## Testing
Every phase must include appropriate tests. Existing tests must continue passing. New functionality must have tests, including authorization and important failure paths. Run integration/workflow verification where applicable.

Never report “complete” without verification.

## No Fake Success
Never claim that AI, OCR, Neo4j, production databases, or security controls work if they are only mocked, planned, or untested. Clearly distinguish:
- IMPLEMENTED
- TESTED
- MOCKED
- PLANNED

## Documentation After Every Phase
Update:
- `task.md` with accurate completed/incomplete tasks.
- `walkthrough.md` with changes, files, database/API/UI changes, tests, results, limitations, and mock/fallback infrastructure.
- Create `docs/phases/PHASE-X-CHECKPOINT.md` containing scope, implemented features, files/modules changed, database/API changes, tests, verification, known limitations, explicitly NOT implemented features, and approval status.

Do not mark the next phase as started.

## Git / Change Review
If Git is available, inspect the diff before and after implementation. Look for unexpected files, unrelated changes, deleted functionality, debug code, secrets, temporary files, and accidental generated files. Do not silently clean unrelated user changes.

## UI Consistency
Preserve the approved CrimeGraph AI design:
- professional
- minimal
- readable
- desktop-first
- restrained colors
- strong whitespace
- clear hierarchy

Do not introduce neon/gaming UI, excessive gradients, excessive animation, unnecessary decoration, or green as the primary UI color. Do not redesign unrelated screens.

## Data Rules
All demo data must be synthetic, fictional, and clearly labeled as demo data. Never copy real personal information into seed data.

## Stop Conditions
STOP and ask for approval if:
1. A destructive database migration is required.
2. The existing architecture must be replaced.
3. A major new dependency is unexpectedly required.
4. A security-sensitive design decision is ambiguous.
5. A future-phase feature is necessary to complete the current phase.
6. Existing working functionality would need to be removed.
7. Real/private data would be required.
8. A government/private API would be required.
9. The implementation would change the approved product objective.
10. Unexpected unrelated changes are detected.

## Phase Completion Format
At the end of each phase provide:

# PHASE X COMPLETION REPORT

## Implemented
## Database
## APIs
## Frontend
## Security
## Tests
## Verification
## Mocked / Development Fallbacks
## Known Limitations
## NOT Implemented
## Files Changed
## Next Phase

Then STOP. Do not automatically continue.

## Core Product Principle
AUTHORIZED / SYNTHETIC DATA
→ DATA INGESTION
→ STRUCTURED DATA
→ AI EXTRACTION
→ ENTITY RESOLUTION
→ RELATIONSHIPS
→ GRAPH
→ NETWORK ANALYSIS
→ INVESTIGATION SIGNALS
→ HUMAN REVIEW
→ SOURCE-BACKED REPORT

The platform is an investigation-intelligence system, NOT an automated criminality or guilt-detection system.

## Golden Rule
When uncertain: DO LESS, NOT MORE. Preserve the working system, implement only the approved phase, report uncertainty, and ask before making architectural or destructive changes.
