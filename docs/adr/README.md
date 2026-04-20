# Architecture Decision Records

Small, append-only notes capturing the _why_ behind significant architectural choices in IronPulse. Each ADR is a frozen snapshot of the context and trade-offs at the time of the decision — if the decision later changes, write a new ADR that supersedes the old one rather than editing the old one.

## Index

| # | Title | Status |
|---|---|---|
| [0001](0001-powersync-for-offline.md) | PowerSync for offline-first mobile sync | Accepted |
| [0002](0002-trpc-over-rest.md) | tRPC over REST for the internal API | Accepted |
| [0003](0003-offline-first-mobile.md) | Offline-first mobile architecture | Accepted |
| [0004](0004-auth-strategy.md) | NextAuth + mobile Bearer tokens for auth | Accepted |

## Writing a new ADR

1. Copy `template.md` to `NNNN-short-title.md` where `NNNN` is the next sequential number zero-padded to 4 digits.
2. Fill in the sections. Keep it short — one page is the target.
3. Add a row to the index above.
4. Open a PR; the ADR becomes `Accepted` once merged.

## Status values

- **Proposed** — open for discussion, not yet in effect.
- **Accepted** — merged; this is the current approach.
- **Superseded by NNNN** — replaced by a newer ADR.
- **Deprecated** — no longer in effect but kept for historical context.
