# Prompt Lab

[![TypeScript](https://img.shields.io/badge/TypeScript-%233178c6?style=flat-square&logo=typescript)](#) [![License](https://img.shields.io/badge/license-MIT-blue?style=flat-square)](#)

> Build better prompts faster — version control, multi-provider streaming, side-by-side comparison, and cost visibility in one workbench.

Prompt Lab is a full-stack prompt engineering environment for developing, testing, and comparing LLM prompts across Ollama, OpenAI, and Anthropic. It brings the development discipline of a real engineering tool to prompt iteration: version history with word-level diffs, template variables, named test cases, A/B response comparison, and a cost dashboard — all running locally with SQLite and zero required cloud services.

## Features

- **Multi-Provider Streaming** — Run prompts against Ollama (local), OpenAI, or Anthropic with real-time SSE token streaming; switch providers with a tab click
- **Version Control** — Every save creates a versioned snapshot with change notes; compare any two versions with a visual word-level diff and restore with one click
- **Template Variables** — `{{variable}}` syntax is auto-detected and filled via dialog before execution; define reusable values via test cases
- **Test Case Runner** — Named test cases with expected outputs; run individually or batch-run all cases across any model; pass/fail tracked per run
- **A/B Response Comparison** — Select any two responses for a word-level diff; pick A/B winners to track model performance over time
- **Cost Dashboard** — Per-request cost estimates using provider pricing tables; aggregated by model in analytics charts
- **OCR Import** — Client-side Tesseract.js OCR extracts text from screenshots and injects it directly into your prompt

## Quick Start

### Prerequisites

- Node.js 20+
- npm
- [Ollama](https://ollama.ai) (optional — enables local model runs without API keys)

### Installation

```bash
git clone https://github.com/saagpatel/prompt-englab.git
cd prompt-englab
npm install
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

## Tech Stack

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

## Architecture

Prompt Lab is a Next.js App Router application. API routes handle LLM provider calls and stream tokens back to the client via SSE. All prompts, versions, responses, and test results are stored in a local SQLite database via Prisma with the LibSQL adapter — no Docker or external services required. Provider API keys are encrypted with AES-256-GCM before being written to the database. The Monaco editor is loaded client-side and wired to debounced auto-save.

## License

MIT
