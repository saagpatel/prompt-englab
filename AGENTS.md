<!-- portfolio-context:start -->
# Portfolio Context

## What This Project Is

Prompt Lab is a local full-stack prompt engineering workbench for developing, testing, versioning, and comparing prompts across Ollama, OpenAI, and Anthropic. It stores prompts, versions, responses, costs, and test cases locally in SQLite while supporting streaming, diffs, templates, OCR import, and analytics.

## Current State

v1.0.0 shipped 2026-03-22. All core features are implemented: multi-provider streaming (Ollama/OpenAI/Anthropic via SSE), prompt versioning with word-level diffs, template variables, named test cases with batch runner, A/B response comparison, cost dashboard, and OCR import. API keys are encrypted at rest with AES-256-GCM. GitHub Actions CI runs typecheck, lint, unit tests, and build on every push. A production Dockerfile is included. The `[Unreleased]` section of CHANGELOG is empty.

## Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js (App Router, Turbopack) |
| UI | Material UI 7, Emotion |
| Editor | Monaco Editor |
| Database | SQLite via Prisma + LibSQL adapter |
| LLM providers | OpenAI SDK, Anthropic SDK, Ollama REST |
| Streaming | Server-Sent Events (SSE) |
| OCR | Tesseract.js (client-side) |
| Charts | Recharts |
| Auth | API keys encrypted at rest (AES-256-GCM) |

## How To Run

- Install dependencies with `npm install`.
- Run database migrations with `npx prisma migrate dev`.
- Start local development with `npm run dev`.
- Build and run production mode with `npm run build && npm start`.

## Known Risks

- Provider API keys must remain encrypted at rest with AES-256-GCM.
- Local Ollama should remain the no-cloud path; cloud providers require explicit keys.
- Streaming routes and cost accounting are user-visible behavior; verify them after provider changes.
- Keep generated performance/docs artifacts out of context recovery commits.

## Next Recommended Move

All v1.0.0 features are shipped. The `[Unreleased]` section of CHANGELOG is empty — no planned next work is documented. Expand feature scope (additional providers, prompt sharing, team workspaces) or harden the existing surface (integration tests, rate-limit tuning, performance profiling).

<!-- portfolio-context:end -->
