# Claude Handoff — Mobile Workout Focus Mode

**Prepared:** 2026-08-09
**Prepared by:** Codex
**Implementation assignee for this initiative:** Claude Code
**Parent backlog:** TASK-23

## Outcome

Implement the approved mobile focus-mode workout logger and its reliability prerequisites. The athlete should see one expanded current exercise, one next set, and one contextual primary action while retaining full-workout editing, supersets, warm-ups, RPE, offline behavior, rest, templates, and reordering.

For this initiative, the user asked Codex to prepare the product design, architecture plans, Backlog decomposition, and cross-model review, then hand implementation to Claude. This is a task-specific assignment, not exclusive ownership of planning or review. Codex does not implement unless the user separately asks it to; use Codex as a reviewer only when the user requests that review.

## Read first

1. `AGENTS.md`
2. `CLAUDE.md`, then `backlog instructions overview` and the matching execution guide
3. `docs/superpowers/specs/2026-08-09-mobile-workout-focus-mode-design.md`
4. `docs/superpowers/plans/2026-08-09-workout-completion-finalization.md`
5. `docs/superpowers/plans/2026-08-09-mobile-workout-focus-mode.md`
6. The active Backlog task before each slice

Use `superpowers:using-git-worktrees` before implementation and `superpowers:test-driven-development` for every feature/bug slice. The primary checkout already contains unrelated rebrand assets, screenshots, local settings, and worktrees. Never stage, modify, delete, or “clean up” those unrelated files.

## Non-negotiable architecture

- Mobile and PowerSync-backed web completion is local-only. Do not call `workout.complete` after a local completion write.
- Only true non-PowerSync flows call the direct completion RPC.
- One PowerSync CRUD transaction uploads through one ordered, atomic server mutation.
- The server registers finalization inside the same database transaction that accepts the first completion timestamp, after the full CRUD batch is applied.
- Intercept client `completedAt`/`durationSeconds`; the generic updater must not overwrite the first timestamp. Duration is derived server-side.
- Durable finalization/outbox workers use fenced UUID claims, explicit retry timing, idempotent logical keys, and a server-owned scheduled sweep.
- Push delivery is at-least-once. Never describe provider delivery as exactly once.
- Untouched previous-performance suggestions stay in controlled UI state and are never written merely because they were displayed.
- Complete explicitly accepts the currently displayed suggestion; Finish never persists an untouched suggestion for an incomplete set.
- Complete reads the synchronous latest draft, cancels debounces, and writes fields plus `completed = 1` in one local transaction.
- The dock is the sole Complete Set control. Historical editing gets Return to Next Set, not a completion action for a hidden set.
- Lime is `colors.blue`; cobalt is `colors.green`; `colors.purple` is cream in the current theme.

## Execution sequence

Implement and finalize one Backlog item at a time:

1. TASK-23.1 — remove unsafe mobile completion side call.
2. TASK-23.7 — restore mobile unit/component test gates.
3. TASK-23.2 — durable/idempotent server finalization, atomic sync batch, web PowerSync fix, outbox, cron, and deployment runbook.
4. TASK-18 — behavior-preserving active-screen controller extraction.
5. TASK-23.3 — focus-mode session domain, mutations, UI, rest, finish, and finalization-status display.
6. TASK-23.4 — exercise multi-picker and empty-workout shortcuts.
7. TASK-23.5 — unified Home/FAB start/resume state.
8. TASK-23.8 — deterministic Maestro/nightly pipeline repair.
9. TASK-23.6 — release-level verification and evidence.

TASK-24 is optional post-release measurement and does not block TASK-23.

For each item:

1. Read it with `backlog task view`.
2. Mark it In Progress and assign `@claude`.
3. Record the relevant plan section through `backlog task edit --plan` before coding.
4. Follow red/green/refactor steps and commit only the task's files.
5. Append exact test/device evidence.
6. Read `backlog instructions task-finalization`, verify each criterion objectively, then finalize it.
7. For high-risk slices (TASK-23.2, TASK-23.3, and TASK-23.8), surface the diff and verification evidence before continuing and use the reviewer the user designates. Codex is not automatically the reviewer.

## Known starting conditions

- `apps/mobile/app/workout/active.tsx` owns queries, focus, finish, keyboard, timer, and rendering.
- `set-row.tsx` has independent 500ms weight/reps writes; Complete writes only the flag.
- `rest-timer.tsx` is component-local and overlay-based.
- `add-exercise.tsx` is single-select, non-transactional, uses `COUNT + 1`, and has stale visual tokens.
- Home and FAB always create/start instead of resuming the newest incomplete workout.
- The full mobile Vitest baseline currently fails with three notification assertions plus Google Fit/HealthKit collection errors.
- Mobile TypeScript currently fails TS5095 from `commonjs` plus `bundler` resolution.
- No React Native component-test runner exists yet.
- Several Maestro selectors are stale; template/offline flows do not exercise their claimed behavior.
- `nightly-e2e.sh` has obsolete checkout/artifact assumptions and does not propagate suite failure.
- The connected Pixel is about 448dp wide; the release gate requires a verified 360–412dp configuration.
- This ARM Linux host cannot claim iOS automation. Use macOS/EAS or leave the explicit manual gate open.

## Verification gates

Do not infer success from a green focused test alone. The plans define slice-specific commands; before parent completion, obtain fresh evidence for:

- Mobile Vitest and React Native component suites.
- Mobile and sync TypeScript checks.
- Sync, API finalization, web PowerSync-mode, and cron tests.
- Fresh disposable-database migration deployment/status.
- Server scheduler ownership and a staging invocation.
- Fresh Android artifact, checksum, commit, device/API/dp size, and all nine workout flows.
- TalkBack, font scale, reduced motion, keyboard/dock, safe areas, and touch targets.
- iOS macOS/EAS evidence or an explicitly open manual release gate.

If implementation research invalidates a material design/architecture decision, stop, document the evidence in the Backlog task, and ask the user for direction. Codex may revise the plan if the user requests it. Do not silently substitute a different completion, sync, privacy, or offline model.
