# IronPulse Critical Test Paths

This file is read by the **IronPulse QA** agent (Paperclip skill `ironpulse-qa`)
on its weekly Sunday 06:00 UTC sweep against `https://staging.ironpulse.hiten-patel.co.uk`.

The agent does **not** invent flows. It runs only the Playwright specs listed below,
in this order, and files Forgejo issues with `regression` + `agent-suggested` labels
for any failure that reproduces twice in a row.

## How the agent runs

```bash
git clone https://claude-agent:$FORGEJO_CLAUDE_AGENT_TOKEN@git.hiten-patel.co.uk/hiten/IronPulse.git ./repo
cd repo && pnpm install --frozen-lockfile
BASE_URL=https://staging.ironpulse.hiten-patel.co.uk \
  pnpm --filter @ironpulse/web exec playwright test \
  apps/web/e2e/{auth,auth-login,auth-signup,onboarding,navigation,sidebar-nav,workouts,exercise-detail,cardio,goals,settings,csrf,trpc-fallback}.spec.ts \
  --reporter=line,json --output=/tmp/playwright-results
```

Test accounts (pre-seeded into staging DB via `db:seed:dev`):
- `athlete@test.com` / `password123` — primary regression account
- `coach@test.com` / `password123` — coach-tier flows
- `free@test.com` / `password123` — free-tier flows
- `new@test.com` / `password123` — pre-onboarding state

## Tier-1: must-pass (blocks Release Manager autonomous cut)

| # | Spec | Why critical |
|---|------|--------------|
| 1 | `e2e/auth.spec.ts` | Sessions, passkeys, OAuth callbacks — gate to everything |
| 2 | `e2e/auth-login.spec.ts` | Returning-user login flow |
| 3 | `e2e/auth-signup.spec.ts` | New-user signup happy path |
| 4 | `e2e/onboarding.spec.ts` | First-time user gets to dashboard |
| 5 | `e2e/navigation.spec.ts` | App-shell loads, all nav links resolve |
| 6 | `e2e/sidebar-nav.spec.ts` | Sidebar present + accurate per route |
| 7 | `e2e/workouts.spec.ts` | Log a strength workout — core IronPulse use case |
| 8 | `e2e/exercise-detail.spec.ts` | Exercise library renders + selectable |
| 9 | `e2e/cardio.spec.ts` | GPS cardio track view loads |
| 10 | `e2e/goals.spec.ts` | Set + view a goal |
| 11 | `e2e/settings.spec.ts` | Settings page loads, integrations panel renders |
| 12 | `e2e/csrf.spec.ts` | CSRF protection still works (security regression gate) |
| 13 | `e2e/trpc-fallback.spec.ts` | tRPC error states render gracefully |

## Tier-2: monitored, non-blocking

These run weekly but failures **don't** block a release cut — they file issues for the board to triage.

| # | Spec | Notes |
|---|------|-------|
| 14 | `e2e/calendar.spec.ts` | Calendar view of workouts |
| 15 | `e2e/program-view.spec.ts` | Coaching program page |
| 16 | `e2e/coaches.spec.ts` | Browse coaches |
| 17 | `e2e/messages.spec.ts` | Coach DMs (depends on a coach test account) |
| 18 | `e2e/feed-reactions.spec.ts` | Social feed reactions |
| 19 | `e2e/notifications.spec.ts` | Notification panel |
| 20 | `e2e/progress-photos.spec.ts` | Progress photos upload + gallery |
| 21 | `e2e/stats.spec.ts` | Stats dashboard |
| 22 | `e2e/user-profile.spec.ts` | View other user's profile |
| 23 | `e2e/user-follow.spec.ts` | Follow / unfollow flow |
| 24 | `e2e/password-change.spec.ts` | In-app password change |
| 25 | `e2e/confirm-dialog.spec.ts` | Confirm-dialog component contracts |

## Tier-3: skip in QA agent runs

These are intentionally **not** run in the weekly QA sweep.

| Spec | Why skip |
|------|----------|
| `e2e/a11y.spec.ts` | Axe-core scans — too slow for weekly cadence; run pre-release manually |
| `e2e/visual-regression.spec.ts` | Snapshot tests — flaky against a shared staging URL with concurrent traffic |
| `e2e/pricing.spec.ts` | Touches Stripe — staging Stripe keys not configured by default |
| `e2e/weekly-summary-settings.spec.ts` | Time-windowed feature; needs date manipulation outside the agent's scope |
| `e2e/workout-detail.spec.ts` | Depends on a specific seeded workout; brittle |

## What the agent does on failure

1. **Retry once.** Real-network flake is real; one retry filters most noise.
2. **If it still fails:** capture the Playwright screenshot + console log + last network request + the seed account used.
3. **File a Forgejo issue** in `hiten/IronPulse` with:
   - Title: `regression: <spec> failing on staging — <one-line cause>`
   - Labels: `regression`, `agent-suggested`, plus `tier-1` or `tier-2`
   - Body: failing test name, Playwright error, screenshot URL (uploaded to Paperclip ticket), suspected since-commit (last commit on staging branch before failure first observed)
3. **If the failing spec is Tier-1:** also set the `qa-status: red` flag in the QA agent's Paperclip ticket footer. Release Manager reads this on Mondays — if `red`, it files a proposal instead of cutting.
4. **Posts a Paperclip ticket** with the full run summary: pass/fail per tier, total runtime, failure clusters, screenshots-of-record.

## When this file changes

Edit this file in a normal PR; the QA agent reads the latest committed version on `main` at the start of each run. Removing a Tier-1 entry should require a PR comment justifying it (so the board doesn't accidentally erode regression coverage).

If a new feature ships and warrants Tier-1 coverage, **add the spec here in the same PR** that adds the feature — keeps the safety net honest.

## Mobile testing

Mobile (iOS + Android via Maestro) is **not** in this agent's scope. Mobile QA is a separate workflow that has to run on real device farms or simulators. If/when Maestro-on-CI is wired up, a sibling QA agent could be added — but that's a separate project.
