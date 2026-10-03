# Prompt Lab

[![TypeScript](https://img.shields.io/badge/TypeScript-%233178c6?style=flat-square&logo=typescript)](#) [![License](https://img.shields.io/badge/license-MIT-blue?style=flat-square)](#)

> Build better prompts faster — version control, multi-provider streaming, side-by-side comparison, and cost visibility in one workbench.

Prompt Lab is a full-stack prompt engineering environment for developing, testing, and comparing LLM prompts across Ollama, OpenAI, and Anthropic. It brings the development discipline of a real engineering tool to prompt iteration: version history with word-level diffs, template variables, named test cases, A/B response comparison, and a cost dashboard — all running locally with SQLite and zero required cloud services.

## Features

- **Multi-Provider Streaming** — Run prompts against Ollama (local), OpenAI, or Anthropic with real-time SSE token streaming; switch providers with a tab click
- **Version Control** — Creating a prompt or saving changed content or system prompts creates a versioned snapshot with change notes; compare any two versions with a visual word-level diff and load a selected version into the editor
- **Template Variables** — `{{variable}}` syntax is auto-detected and filled via dialog before execution; define reusable values via test cases
- **Test Case Runner** — Named test cases with expected outputs; run individually or batch-run all cases across any model; pass/fail tracked per run
- **A/B Response Comparison** — Select any two responses for a word-level diff; pick A/B winners to track model performance over time
- **Cost Dashboard** — Per-request cost estimates using provider pricing tables; aggregated by model in analytics charts
- **OCR Import** — Client-side Tesseract.js OCR extracts text from screenshots and injects it directly into your prompt
- **Long-Goal Prompt Fuzzer** — Deterministic local contract mutations detect authority widening, ambiguous completion, unverifiable proof, unsafe cleanup, and silent UNKNOWN handling without grading writing style

## Long-Goal Prompt Fuzzer

Run the bundled synthetic contract fixtures and emit deterministic JSON:

```bash
npm run --silent fuzz:long-goal
```

The tool accepts only bundled synthetic or explicitly supplied JSON prompt
fixtures. It does not invoke providers, write to the database, launch tasks,
publish, deploy, or inspect private task output. See
[`tools/long-goal-prompt-fuzzer/README.md`](tools/long-goal-prompt-fuzzer/README.md)
for the fixture schema, mutation families, and verification commands.

## Quick Start

### Prerequisites

- Node.js 20 (20.19+), 22 (22.12+), or 24+
- npm
- [Ollama](https://ollama.ai) (optional — enables local model runs without API keys)

### Installation

```bash
git clone https://github.com/saagpatel/prompt-englab.git
cd prompt-englab
npm ci
# Configure the isolated environment described below before migrating.
npx prisma migrate dev
```

### Run (development)

```bash
npm run dev
```

### Build

```bash
npm run build && npm start
```

### Docker

A production Dockerfile is included. It builds the Next.js app and runs on port 3000. It sets `DATABASE_URL=file:./data/prod.db`, but the application adapter opens `/app/dev.db`; the `/app/data` volume below does not persist the application's database.

```bash
docker build -t prompt-englab .
docker run -p 3000:3000 -e ENCRYPTION_SECRET=<32-byte-hex> -v /your/data:/app/data prompt-englab
```

## Verification and isolated development

Run from the repository root with Node.js 20 (20.19+), 22 (22.12+), or 24+ and the npm lockfile
(the locked Prisma engine is stricter than the Next.js minimum):

```bash
npm ci
npm run prisma:generate             # local generated client; no migration
npm run typecheck
npm run lint -- --max-warnings 30    # same warning allowance as CI
npm test -- --runInBand src/lib/__tests__/templateUtils.test.ts
npm test -- --runInBand --coverage   # broader CI unit/coverage lane
npm run build                       # also generates Prisma client via prebuild
```

For encryption tests, supply a 64-hex-character **synthetic test-only**
`ENCRYPTION_SECRET`, as `.github/workflows/verify.yml` does. Do not reuse
production secrets or provider keys. Jest tests and the
[contract fuzzer](tools/long-goal-prompt-fuzzer/README.md) run local fixtures;
provider calls are separate capability checks, not prerequisites for these gates.
No standalone formatter script is configured.

For a new disposable checkout, set `DATABASE_URL=file:../dev.db` for Prisma
migrations and generate a private 32-byte hex `ENCRYPTION_SECRET` in an ignored
local environment file before `npx prisma migrate dev` / `npm run dev`.
Migrations mutate that database. The current application adapter in
`src/lib/prisma.ts` opens **dev.db in the working directory**, regardless of
`DATABASE_URL`, so isolate the entire checkout for interactive tests and never
point migration tooling at an existing personal database. Changing the encryption
secret makes previously encrypted keys unreadable. Provider keys are optional;
do not invoke cloud providers or start Ollama simply to verify documentation.

For changed UI, streaming or analytics behavior, exercise affected flows at
`http://localhost:3000` with synthetic prompts and fixture/mocked responses in
that disposable checkout. Provider-backed runs require separately authorized
capability evidence. Pure documentation changes do not require browser runs.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js (App Router) |
| UI | Material UI 7, Emotion |
| Editor | Monaco Editor |
| Database | SQLite via Prisma + LibSQL adapter |
| LLM providers | OpenAI SDK, Anthropic SDK, Ollama REST |
| Streaming | Server-Sent Events (SSE) |
| OCR | Tesseract.js (client-side) |
| Charts | Recharts |
| Auth | API keys encrypted at rest (AES-256-GCM) |

## Architecture

Prompt Lab is a Next.js App Router application. API routes handle LLM provider calls and stream tokens back to the client via SSE. All prompts, versions, responses, and test results are stored in a local SQLite database via Prisma with the LibSQL adapter — no Docker or external services required. Provider API keys are encrypted with AES-256-GCM before being written to the database. The Monaco editor is loaded client-side; prompts are saved explicitly via the Save button or keyboard shortcut.

## License

MIT
