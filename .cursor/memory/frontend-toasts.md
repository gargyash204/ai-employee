# Frontend API toasts

## Purpose

Show global success/error toasts for API responses so users get feedback without per-page wiring.

## Key paths

- `apps/frontend/src/lib/api.ts` — Axios interceptors
- `apps/frontend/src/lib/api-message.ts` — message extraction + success-toast gating
- `apps/frontend/src/hooks/use-toast.ts` — imperative `toast` / `toastSuccess` / `toastError`
- `apps/frontend/src/components/ui/toast.tsx`, `toaster.tsx` — Radix Toast UI
- `apps/frontend/src/App.tsx` — mounts `<Toaster />`

## Behavior

- **Errors:** toast on every failed `api` request (uses `response.data.message`, then Axios message).
- **Success:** toast only for mutating methods (`POST`/`PUT`/`PATCH`/`DELETE`) when body has a non-empty `message`.
- **Opt-out:** `skipErrorToast` / `skipSuccessToast` on Axios config.
- **Silent auth probe:** `getMe` and login errors use `skipErrorToast` (login keeps inline form error; session check must not toast on cold load).

## Invariants

- No new toast libraries (uses existing `radix-ui` Toast).
- Components may still show inline errors; toasts are additive.
- GET list/detail fetches do not toast on success (avoids noise).

## Out of scope

- Replacing all inline `setError` banners
- Per-endpoint custom toast copy beyond backend `message`

## Check

`node --experimental-strip-types apps/frontend/src/lib/api-toast.check.ts`

## Last updated

2026-07-26
