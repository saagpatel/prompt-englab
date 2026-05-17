<!-- portfolio-context:start -->
# Portfolio Context

## What This Project Is

Prompt Lab is a local full-stack prompt engineering workbench for developing, testing, versioning, and comparing prompts across Ollama, OpenAI, and Anthropic. It stores prompts, versions, responses, costs, and test cases locally in SQLite while supporting streaming, diffs, templates, OCR import, and analytics.

## Current State

The repo is active local web-app work. Existing untracked `.perf-results` and `docs/` folders are local/generated or parallel-session artifacts, so this recovery pass should only add the context file.

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

Add only the context file for this recovery pass, then continue with provider streaming, prompt versioning, test-case, and encrypted-key behavior behind normal app verification.

<!-- portfolio-context:end -->
