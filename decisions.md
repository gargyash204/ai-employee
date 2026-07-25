# AI Runtime - Design Decisions & Architecture

## Overview

This document captures the evolution of the project, the rationale behind major product and engineering decisions, and the tradeoffs made during implementation.

Rather than documenting only *what* was built, this document explains *why* it was built this way, what alternatives were considered, and which production concerns were intentionally left out because this project focuses on demonstrating the core philosophy behind an AI Runtime.

For current system shape and user flow, see [docs/architecture.md](./docs/architecture.md). For feature-level APIs and invariants, see [`.cursor/memory/`](./.cursor/memory/).

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
| **Production Executions** | Published-only jobs; checkpoints; pause / resume / cancel | Testing ≠ production |
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

All executions currently happen within one backend process (in-request / in-process). There is no Redis/BullMQ/worker fleet.

### Why

The objective is demonstrating runtime lifecycle rather than distributed execution.

Queues and worker orchestration would significantly increase infrastructure complexity without contributing to the project's central idea.

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

**Cons**

- Limited throughput
- No horizontal scaling
- Long HTTP timeouts for Studio / Executions

---

## Synchronous AI Calls

Every AI request is executed synchronously (awaited to completion). Studio returns extraction results before optional background regression finishes; regression itself still runs in-process without a queue.

### Why

The project emphasizes governance and observability.

Streaming responses and asynchronous orchestration would add complexity without improving the demonstration.

### Production Alternative

- Streaming responses
- Background workers
- Async execution

### Tradeoff

**Pros**

- Simpler implementation
- Easier debugging

**Cons**

- Higher latency
- Request timeout pressure on long runs

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
