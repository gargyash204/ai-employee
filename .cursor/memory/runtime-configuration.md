# Memory: Runtime Configuration (superseded)

Last updated: 2026-07-23

## Status

**Superseded by [runtime-versioning.md](./runtime-versioning.md).**

The `runtime_configurations` table, configuration APIs, and configuration UI (including Questions) were removed when Runtime Versioning shipped. Instructions now live on immutable `runtime_versions`. Migration `1721742000000` moves prior instructions into Version 1 Draft and drops the configurations table.

Do not reintroduce a parallel non-versioned configuration store.
