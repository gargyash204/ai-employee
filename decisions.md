# AI Runtime - Design Decisions & Architecture

## Overview

This document captures the evolution of the project, the rationale behind major product and engineering decisions, and the tradeoffs made during implementation.

Rather than documenting only *what* was built, this document explains *why* it was built this way, what alternatives were considered, and which production concerns were intentionally left out because this project focuses on demonstrating the core philosophy behind an AI Runtime.

For current system shape and user flow, see [docs/architecture.md](./docs/architecture.md). For feature-level APIs and invariants, see [`.cursor/memory/`](./.cursor/memory/).

---

## Notes (current scope & constraints)

These are deliberate demo boundaries—not accidental omissions.

**Auth.** Multi-user auth is out of scope for now. Only a single account path exists; the product focus is runtime governance, not identity.

**Rate limits & credits.** App-level rate limiting is out of scope. The demo uses NVIDIA-hosted models with limited infra credits. Excess use can hit provider rate limits or exhaust credits and stop the stack—treat usage as scarce.

**Langfuse lag.** Trace ingestion is eventually consistent. After a run, wait before opening **View Trace**; the UI/API may be ready before Langfuse has the span.

**Version editability.** Only a **Draft** version can be updated. **Published** and **Archived** versions are read-only history.

**Execution polling.** Production create/resume return immediately and the UI polls status. That is intentional for a single-process demo—we are not solving durable queues or multi-instance scale here.

**Paste text, not a document parser.** The original path was full doc parsing + querying (object storage, OCR packages, parse pipelines). That adds infra and maintenance overhead without proving the runtime thesis. Parsing is removed: paste the document text, then query/extract against versioned instructions. Querying a long-running governed job is the same strategy Zamp uses for durable AI work—a small, controllable slice of a larger agent stack (tool-like), with governance, observability, and accountability so humans can see what happened and what to improve.

**AI eval over unit/e2e as the focus.** Instead of centering traditional unit or e2e tests for prompt behaviour, this project treats **AI evaluation as the primary quality gate**—and ships it as a first-class product feature. Versioning, Dataset Manager, and Development Studio exist so users can measure regressions themselves before publish. That same power should be maintained for any AI feature a developer adds: grow a real dataset, run every prompt change through eval, and only promote to production when the suite says behaviour did not break. At scale, “does this prompt change break anything?” is answered by eval on a large dataset—not by brittle string asserts in a CI unit test. Today eval checks a limited surface (semantic pass/fail and related aggregates); it can be extended for users with richer gates—token usage, cost, latency, and similar production metrics—without changing the core loop.

**Model choice.** Calls go through NVIDIA-provided Llama open-source models: cheaper for a demo, and avoids exposing other provider credentials. Those APIs can occasionally time out. Production can s`wap in a stronger LLM via the existing `AiProvider` boundary. There is **no LLM fallback** on failure yet; adding one (or changing models) is straightforward later.

**PII.** PII redaction/masking is not handled today. That would need another app layer and more setup. Handle before a real production deployment.

---

# The Original Problem

The assignment was intentionally open-ended around AI and document processing.

Initially, the obvious solution was to build another AI-powered document parser that could extract structured information from invoices, receipts or contracts.

However, while researching the problem, one question became more interesting than document extraction itself:

> **How do users trust an AI system that is making business decisions?**

Today's LLMs are already capable of extracting structured data reasonably well.

The harder problem begins **after** extraction.

Questions like these become much more important:

- Why did the AI extract this value?
- What happens if I change my prompt?
- Will existing documents still work?
- How much does every prompt change cost?
- Which prompt version generated this output?
- Can I audit every decision later?

Those questions shifted the focus completely.

Instead of building another document parser, the project became an **AI Runtime** whose purpose is making AI behaviour observable, predictable and accountable.

---

# Inspiration from Zamp

While studying Zamp, one idea stood out.

Zamp is not positioning AI as another assistant.

They position AI as an **AI Employee**.

That distinction changes everything.

An employee is expected to have:

- Accountability
- Traceability
- Predictable behaviour
- Measurable performance
- Auditability

If AI is truly an employee, users should never blindly trust it.

They should always understand:

- what the AI will do
- why it did it
- what changed
- whether it can be trusted before deployment

This became the core philosophy of the project.

---

# Core Philosophy

Prompts are effectively business logic.

Changing a prompt is no different from deploying new production code.

Yet prompt changes are frequently pushed into production without understanding:

- what behaviour changed
- which documents regress
- latency changes
- token consumption
- execution cost
- production impact

For long-running AI workflows, this is dangerous.

The runtime therefore attempts to answer one central question:

> **"If I modify this prompt, exactly what will happen before I deploy it?"**

Every design decision flows from this idea.

---

# Product Evolution

The product started as "another document parser," then shifted to an **AI Runtime** once the interesting problem became trust and governance after extraction—not OCR or prompting tricks.

Capabilities landed in roughly this order; each step exists because the previous one was not enough to answer *"what happens if I change this prompt before I deploy?"*

| Stage | What shipped | Why it exists |
|-------|----------------|---------------|
| **AI Runtime** | Named workflows; extraction as one workload | Demonstrate reliable AI systems, not another parser |
| **Versioning** | Draft → Published → Archived; `activeVersionId` | Prompts are business logic; history and safe promotion |
| **Development Studio** | Paste document; A/B Draft vs Published; optional regression | Experiment before production |
| **Dataset Manager** | Q&A cases; immutable run history; semantic scoring | Regression must be measurable, not manual |
| **Studio ↔ Evaluation split** | Studio triggers runs; `EvaluationService` owns scoring | One scoring path; curation/reports stay in Dataset Manager |
| **Production Executions** | Published-only jobs; checkpoints; pause / resume | Testing ≠ production |
| **Audit + Langfuse** | Append-only activity feed; optional traces; Overview merge | Accountability + production-style observability |
| **Overview** | One tab for lifecycle health | Operators need a single source of "what happened" |

Day-to-day loop:

```
Draft instructions
      ↓
Development Studio (document + optional A/B + optional regression)
      ↓
Dataset Manager (curate Q&A + read reports)
      ↓
Publish (explicit)
      ↓
Production Executions
      ↓
Overview (audit ⊕ Langfuse)
```

Detail on tabs, APIs, and invariants lives in [docs/architecture.md](./docs/architecture.md) and [`.cursor/memory/`](./.cursor/memory/). The rest of this document records durable engineering tradeoffs.

---

# Engineering Decisions

This project intentionally focuses on demonstrating the architecture behind an AI Runtime rather than building an internet-scale distributed system.

Several engineering decisions were deliberately simplified.

---

## Monolithic Modular Architecture

The backend is implemented as a modular NestJS monolith.

### Why

The project explores domain modelling rather than distributed systems.

Keeping everything inside one deployable application makes development significantly simpler while maintaining clean module boundaries.

### Future Production Design

Potential services:

- Runtime Service
- Prompt Service
- Evaluation Service
- Execution Service
- Audit Service
- Notification Service

### Tradeoff

**Pros**

- Easier development
- Simpler deployment
- Easier debugging

**Cons**

- Independent scaling is not possible

---

## Repository Pattern

Backend flow:

```
Controller
    ↓
Service
    ↓
Repository
    ↓
TypeORM
    ↓
MySQL
```

### Why

Business logic should remain independent from persistence.

### Tradeoff

**Pros**

- Clean separation
- Easier testing
- Future database flexibility

**Cons**

- More boilerplate

---

## Single Database

All application data resides in one MySQL database.

### Why

The project focuses on AI runtime behaviour rather than database scalability.

Relationships between runtimes, prompts, evaluations and executions remain easy to understand.

### Production Alternative

- Read replicas
- Database partitioning
- Sharding
- Analytics database

### Tradeoff

**Pros**

- Simple architecture
- Easy setup

**Cons**

- Limited scalability

---

## Local Compose vs Railway Demo

Two run modes, same application code.

### Local (Docker Compose)

Full developer stack via `docker compose up --build`:

- Frontend (Vite)
- Backend (Nest)
- MySQL
- phpMyAdmin
- **Self-hosted Langfuse** (UI typically on port 3100)

Goal: clone → one command → complete environment with hot reload.

### Demo (Railway)

Minimal public demo documented in [docs/deploy-railway.md](./docs/deploy-railway.md):

- **One app container** (nginx SPA + Nest API)
- **Railway MySQL**
- **Langfuse Cloud** for observability ("View Trace" opens Cloud, not local Langfuse)
- NVIDIA API for model calls

Self-hosted Langfuse and phpMyAdmin stay **local-only**. Railway is a stoppable demo surface, not a production multi-service topology.

### Why

Local Compose optimises for onboarding and parity with the full observability stack.

Railway optimises for a shareable demo without hosting Langfuse/phpMyAdmin in the cloud.

### Tradeoff

**Pros**

- Excellent local onboarding
- Cheap, stoppable public demo
- Same app; only infra wiring differs (`LANGFUSE_*` points at self-hosted vs Cloud)

**Cons**

- Two environments to reason about
- Local Compose uses more machine resources
- Demo is not horizontally scaled or multi-region

---

## Single Worker Execution

All executions run in one backend process (in-process fire-and-forget). Create/resume return immediately; the UI polls until the job settles. There is no Redis/BullMQ/worker fleet.

### Why

The objective is demonstrating runtime lifecycle rather than distributed execution.

Queues and worker orchestration would significantly increase infrastructure complexity without contributing to the project's central idea. Polling is enough for a single-process demo.

### Production Alternative

- RabbitMQ
- Kafka
- AWS SQS
- Multiple workers
- Retry queues
- Dead Letter Queues

### Tradeoff

**Pros**

- Easy debugging
- Minimal infrastructure
- HTTP handlers stay short-lived

**Cons**

- Limited throughput
- No horizontal scaling
- Lost in-flight work if the process dies mid-run

---

## Synchronous AI Calls

Every AI request is executed synchronously (awaited to completion). Studio returns extraction results before optional background regression finishes; production executions and Studio regression both continue in-process without a durable queue (HTTP already returned; clients poll).

### Why

The project emphasizes governance and observability.

Streaming responses and a real worker fleet would add complexity without improving the demonstration. In-process background work is enough to keep HTTP responsive.

### Production Alternative

- Streaming responses
- Background workers / durable queues
- Multi-instance async execution

### Tradeoff

**Pros**

- Simpler implementation
- Easier debugging

**Cons**

- Higher end-to-end latency for long runs
- Provider request timeouts still surface on individual AI calls

---

## Small Evaluation Datasets

Evaluation datasets are intentionally small. Cases are Q&A only; one document is supplied per run.

### Why

The objective is demonstrating regression testing rather than benchmarking models.

Large multi-document suites would increase execution time and infrastructure costs.

### Production Alternative

- Thousands of evaluation examples
- Per-case or multi-document suites
- Parallel execution
- Distributed evaluation

### Tradeoff

**Pros**

- Fast iteration
- Quick feedback

**Cons**

- Lower statistical confidence

---

## Checkpointed Execution Lifecycle

Executions follow a staged lifecycle with persisted checkpoints and pause/resume.

This is intentionally a thin orchestrator—not a full workflow engine (no DAGs, branching, or human-approval steps).

### Why

The goal is showing that long-running AI tasks require lifecycle management.

Building a complete workflow engine would significantly increase project scope.

### Production Alternative

- DAG execution
- Conditional branching
- Human approvals
- Distributed checkpointing
- Queue-backed workers

### Tradeoff

**Pros**

- Easy to understand
- Demonstrates core concepts (checkpoint, pause, resume)

**Cons**

- Less workflow flexibility

---

## Evaluation Metrics

The runtime currently measures:

- Semantic pass / fail (LLM-as-judge, score 0–10; pass if score > 7; exact match short-circuits)
- Aggregate dataset score (% passed)
- Per-case latency
- A/B compare (improved / regressed between latest completed runs)
- Token usage where captured via AI provider / Langfuse

### Why

These metrics answer the questions users ask before deploying prompt changes, while keeping scoring understandable.

### Production Alternative

- Persist per-case semantic scores in UI / results table
- Precision / Recall suites
- Hallucination detection
- Domain-specific validators
- Cost attribution per prompt version as a first-class metric

### Tradeoff

**Pros**

- Meaningful beyond brittle string equality
- Still relatively fast to interpret

**Cons**

- Judge model adds cost and non-determinism
- Not a full eval platform

---

## Langfuse as an Infrastructure Concern

Langfuse ingestion is **optional at runtime**: if keys are unset, AI calls still succeed and `traceId` stays null. The Overview dashboard remains usable from audit events alone.

Business modules never call Langfuse HTTP directly—they go through `LangfuseService`. Replacing Langfuse means swapping that module, not rewriting Studio / Evaluation / Execution logic.

### Why

Observability should remain an infrastructure concern rather than business logic.

### Tradeoff

**Pros**

- Loose coupling at the business-module boundary
- Dashboard degrades gracefully without telemetry
- Easy replacement of the tracing backend

**Cons**

- Application still depends on the Langfuse service wrapper
- Duplicate trace storage when enabled

---

## Session Auth, No Multi-tenancy

The project uses simple session authentication but assumes a **single logical tenant** (no orgs, workspaces, or RBAC).

### Why

Tenant isolation introduces workspace management and authorization complexity outside the scope of demonstrating AI runtime concepts.

### Production Alternative

- Organizations
- Workspaces
- RBAC
- Tenant-aware execution

### Tradeoff

**Pros**

- Simpler domain model

**Cons**

- Not SaaS-ready

---

## Manual Prompt Promotion

Prompt versions never become production automatically.

Publishing requires an explicit user action. Production executions refuse Draft versions and require `activeVersionId`.

### Why

Prompt updates are effectively production deployments.

Human approval is intentionally required before rollout.

### Production Alternative

- Approval workflows
- Canary deployments
- A/B prompt rollout
- CI/CD for prompts

### Tradeoff

**Pros**

- Prevents accidental deployments
- Encourages governance

**Cons**

- Additional deployment step

---

# Future Roadmap

Several production capabilities were intentionally left out because they solve scaling problems rather than the primary problem of AI accountability.

Possible future enhancements include:

- Distributed worker architecture
- Queue-based execution
- Parallel / multi-document evaluation
- Multi-tenancy
- RBAC
- Prompt approval workflows
- Canary deployments
- Richer evaluation analytics (persisted judge scores, cost rollups)
- Workflow orchestration (DAGs, human-in-the-loop)
- Streaming execution
- Horizontal database scaling
- Read replicas
- Sharding
- Kubernetes deployment

---

# Final Vision

This project is **not** a document parser.

It is **not** an OCR application.

It is **not** a chatbot.

It is a simplified **AI Runtime** inspired by Zamp's philosophy of treating AI as an **AI Employee**.

The focus is on **governance rather than generation**.

The runtime gives users confidence to deploy AI by answering questions that matter in production:

- What exactly will the AI do?
- Which prompt version generated this output?
- What changed after updating the prompt?
- Will my prompt regress on existing Q&A cases for this document?
- How much latency will it introduce?
- How many tokens will it consume?
- Which model produced this response?
- What happened during every execution step?
- Can I audit everything later?

The engineering choices intentionally prioritise **correctness, observability, accountability and governance over scale**.

The hypothesis behind this project is that **trust is the hardest problem in production AI systems**.

Once users understand exactly **what happened**, **why it happened**, and **what will change before deployment**, traditional engineering challenges such as distributed workers, orchestration and horizontal scaling become incremental infrastructure improvements rather than fundamental product problems.

---

# PDF Upload & Parsing Decisions

This section records architectural decisions introduced after the original Runtime scope, when PDF upload and parsing were requested for the Execution workflow. Earlier decisions intentionally deferred document parsing so the project could prove Runtime governance first. This follow-on work adds ingestion without turning the product into a document-intelligence platform, and without rewriting the existing AI execution pipeline.

---

## 1. Replace Manual Text Input with PDF Upload

**Decision:** Execution accepts a PDF upload instead of pasted text.

**Context:** The first version used pasted text to avoid OCR and storage complexity. A later request asked for a more realistic document workflow.

**Why:** Business documents usually arrive as PDFs. Upload support demonstrates end-to-end ingestion while still feeding the Runtime only text.

**Tradeoffs:** Better product realism at the cost of multipart upload, validation, and parsing complexity.

**Future evolution:** Additional formats can reuse the same upload → parse → execute path.

---

## 2. Support Only PDF

**Decision:** Only PDF is supported in the current version.

**Context:** Full multi-format ingestion was out of scope for a demo.

**Why:** PDF covers the common business case with the smallest implementation surface.

**Tradeoffs:** DOCX, images, spreadsheets, and email are unsupported.

**Future evolution:** New formats plug in via `ParserStrategy` without changing the Runtime.

---

## 3. Multipart Upload

**Decision:** Use `multipart/form-data` (`file`, `runtimeId`, optional `versionId`). Do not Base64-encode files in JSON.

**Why:** Multipart is the standard way to send binary files and avoids large Base64 payloads.

**Tradeoffs:** Slightly more API/DTO handling than a JSON body; clearer and cheaper for binary transfer.

---

## 4. Dual Validation

**Decision:** Validate on both frontend and backend.

**Why:** Frontend gives immediate UX feedback; backend is the trust boundary because client checks can be bypassed.

Frontend covers type, size, emptiness, and single-file selection. Backend re-checks MIME/extension, PDF magic bytes, size, emptiness, corruption signals, and password-protected PDFs.

**Tradeoffs:** Some duplicated rules; accepted for security and UX.

---

## 5. 2 MB Upload Limit

**Decision:** Reject PDFs larger than 2 MB.

**Why:** Keeps token usage, latency, OCR cost, and Railway resource usage predictable for small business documents.

**Tradeoffs:** Larger valid PDFs are rejected.

**Future evolution:** Configurable limits plus chunking if large documents become a requirement.

---

## 6. Temporary Local Storage Instead of Object Storage

**Decision:** Store uploaded PDFs only on local disk for the duration of parsing. No S3 or persistent document store.

**Why:** The Runtime needs extracted text, not the original file. Object storage would add infra, retention, and cleanup without proving the Runtime thesis.

**Tradeoffs:** Simpler deploy; original PDFs cannot be re-fetched after successful parse.

**Future evolution:** Add object storage only if retention or reprocessing becomes a product need.

---

## 7. Persist Extracted Text Instead of Documents

**Decision:** Persist normalized extracted text on the execution record; delete the temp PDF after successful parse.

**Why:** Downstream AI steps already operate on text. Storing binaries would expand lifecycle and storage concerns without changing Runtime behaviour.

**Tradeoffs:** Reprocessing requires a new upload.

---

## 8. Parser Strategy Abstraction

**Decision:** Introduce `ParserStrategy` / `PdfParserStrategy` even though only PDF ships today.

**Why:** Execution must not know how text was obtained. The abstraction isolates ingestion so formats can grow without touching the orchestrator.

**Tradeoffs:** Slight upfront abstraction; much cheaper extensibility later.

---

## 9. Embedded Text Before OCR

**Decision:** Extract embedded PDF text first; OCR only if that text is not meaningful.

**Why:** Most business PDFs already contain text. OCR is slower and heavier.

**Tradeoffs:** An extra decision branch; large win on latency and CPU for text PDFs.

---

## 10. Tesseract OCR

**Decision:** Use system Tesseract (with Poppler for page render) inside Docker/Alpine.

**Why:** Open source, lightweight enough for Railway, no external SaaS dependency.

**Tradeoffs:** Lower accuracy than commercial document AI; capped page count for demo latency.

---

## 11. OCR as Fallback Only

**Decision:** Never OCR every PDF.

**Why:** Blind OCR would waste CPU and inflate execution time for documents that already have text.

**Tradeoffs:** Mixed text/image PDFs may be imperfectly extracted.

---

## 12. English-Only OCR

**Decision:** Install English tessdata only.

**Why:** Demo scope is English business docs; extra language packs grow the image and test matrix.

**Tradeoffs:** Non-English scans are unsupported.

**Future evolution:** Add language packs when needed.

---

## 13. Normalize Text Before Execution

**Decision:** Normalize extracted text (unicode, whitespace, blank lines) before it enters the AI pipeline.

**Why:** Embedded extract and OCR produce inconsistent formatting. Normalization stabilizes prompts and makes retries more deterministic.

**Tradeoffs:** Small preprocessing cost; accepted for predictability.

---

## 14. Reuse the Existing Execution Pipeline

**Decision:** Parsing is a stage before the existing async orchestrator, not a separate document-processing product.

**Why:** Avoid two pipelines, two pollers, and duplicated pause/resume semantics.

**Tradeoffs:** Execution lifecycle is longer; overall system stays smaller and coherent.

---

## 15. Backward Compatibility

**Decision:** Keep existing execution status/step model; add `ParsingDocument`, `temp_file_path`, and `parser_error` without breaking historical rows. Timeline hides parsing for pre-PDF executions. GET/resume stay compatible; create switches to multipart PDF.

**Why:** Prior jobs and UI history must remain valid after the feature lands.

**Tradeoffs:** Create API shape changes for new runs; history and polling stay stable.

---

## 16. Retryable and Idempotent Parsing

**Decision:** Parse failures pause the same execution; Resume retries parsing (or OCR) without creating a duplicate job. Successful parse writes a checkpoint so retries skip completed work. Same PDF + same normalize path should yield the same text.

**Why:** Users should not re-upload after transient OCR/parser failures.

**Tradeoffs:** Temp files must survive until parse succeeds or cleanup TTL expires.

---

## 17. Temporary File Lifecycle and Cleanup

**Decision:** Create temp file on upload → keep through parse retries → delete after successful extract. Abandoned files are cleaned on a TTL (hourly sweep).

**Why:** Needed for retry without S3; must not accumulate disk forever on a single Railway instance.

**Tradeoffs:** Requires cleanup logic; multi-instance sticky temp paths remain a known ceiling of in-process design.

---

## 18. Observability of Stages and Failures

**Decision:** Map upload/parse/AI onto the existing status + `currentStep` model (including `ParsingDocument`) and keep frontend polling. AI pause audits carry Langfuse `traceId` even when JSON parse fails after a traced call.

**Why:** Users need stage visibility and trace links without inventing a second state machine or poller.

**Tradeoffs:** Conceptual stages (upload/parse/AI) are mapped onto existing enums rather than replacing them wholesale.

---

## 19. Known Limitations

Intentionally supported: text PDFs, simple English scanned PDFs via OCR fallback, normalization, async execute + resume.

Intentionally unsupported: DOCX/images/Excel/CSV, handwriting, charts/diagrams, advanced tables, vision models, password-protected PDFs, multi-language OCR, long-term document retention, S3, cloud document intelligence.

These limits keep the feature focused on Runtime demonstration rather than becoming a full document platform.

---

## 20. Future Roadmap for Ingestion

Because ingestion is isolated behind `ParserStrategy` and the Runtime only consumes normalized text, future work can add DOCX/image/CSV/Excel parsers, multi-language OCR, multimodal/vision parsing, cloud document intelligence, configurable limits, object storage, chunking, PII redaction, layout-aware tables, and extraction confidence scoring — without redesigning the core execution engine.
