# IronPulse — Design Brief for Claude Design

**Use this brief at claude.ai/design.** Paste the text below as the initial prompt, point its web-capture tool at the URLs listed, and upload `designs/IronPulse-logo.png`.

---

## Product

IronPulse is a fitness tracker for strength athletes and their coaches. Think Strong + Hevy for strength logging, Strava for cardio + social, plus a coaching tier that lets trainers manage up to 25 clients with structured programs.

- **Who**: two user types
  - **Athletes** (default tier, £15/mo) — log workouts + cardio, track PRs, follow friends, chase goals
  - **Coaches** (£30/mo) — manage up to 25 clients, build programs, message athletes, see client progress
- **Core flows**:
  1. Start an empty workout or from a template → log sets → finish → get PR celebration
  2. Start a cardio GPS session (run/bike/hike) → live stats → finish → map + stats detail
  3. Browse exercises → see detail with PR history + recent sets
  4. View dashboard with streak, recent activity, and quick-start CTAs
  5. Coach dashboard: client list with status dots, click into client's programs and progress

## Brand

- **Name**: IronPulse (one word, capitalised I and P)
- **Logo**: `designs/IronPulse-logo.png` — dumbbell with a blue/green pulse wave on pure black. Upload this.
- **Primary colour**: `#0077FF` (strong blue)
- **Accent green** (used in the pulse wave): roughly `#22C55E`
- **Background**: `#060B14` (near-black navy) for dark mode — we ship dark-first
- **Display typeface**: Clash Display (headings/display), Space Grotesk as a free fallback
- **Body**: Inter
- **Vibe**: dark, high-contrast, technical, motivating. NOT "friendly health coach" — more like a performance tool for athletes who already train.

## Live URLs to capture

Point Claude Design's web-capture tool at these. All require login first with `athlete@test.com` / `password123` on `https://ironpulse.hiten-patel.co.uk`, then navigate to:

| Screen | URL | Why it matters |
|---|---|---|
| Landing | `/` | First impression — conversion page |
| Login | `/login` | High-traffic auth screen |
| Dashboard | `/dashboard` | Most-visited authenticated page |
| Workouts list | `/workouts` | Core activity history |
| Active workout builder | `/workouts/new` | Highest-friction screen; users spend 30-60 min here |
| Exercises list | `/exercises` | Search-heavy; needs to be fast |
| Exercise detail | `/exercises/{id}` | PR history + recent sets |
| Stats | `/stats` | Data viz — heaviest redesign candidate |
| Profile | `/profile` | Bio + follower counts |
| Connected apps | `/settings/integrations` | Multi-provider cards, could be cleaner |
| Goals | `/goals` | Progress bars |
| Coach dashboard | `/coach` | Second-tier audience, needs its own visual language |

## Codebase pointers

If Claude Design accepts a codebase upload, point it at `apps/web/` — specifically:

- `src/components/ui/` — current primitives (card, button, input, etc.)
- `src/components/workout/` — the most complex UI surface
- `src/components/layout/sidebar.tsx` — current nav
- `src/styles/globals.css` — design tokens

Tech stack it should produce code for: Next.js 15 App Router, React 19, Tailwind CSS, Radix UI primitives, Lucide icons, TanStack Query via tRPC.

## What to keep

- Blue + black palette, the dumbbell/pulse logo
- Dark-mode first (light mode is a future add)
- "Pulse" naming — our internal design system is called that
- Dense, data-first layouts — users want to see numbers, not empty space
- The superset UI (linked exercises with a purple left border) on the active workout

## What could be better

Prioritised from most to least likely to pay off:

1. **Active workout screen** — currently a vertical list of cards. Users spend most time here, could use clearer "next set" affordance, rest timer prominence, and better superset visual grouping
2. **Stats page** — currently basic cards; would benefit from proper time-series charts and trend sparklines
3. **Dashboard** — currently a greeting + streak + recent activity list. Could be more opinionated about what to show (e.g. "next scheduled workout" card)
4. **Integrations page** — a stack of nearly-identical cards. Could be a grid or tab-per-category (strength / cardio / recovery)
5. **Onboarding** — doesn't exist as a proper flow; signup → dropped into dashboard with nothing. Opportunity for a first-run experience

## What NOT to redesign (yet)

- The mobile app (React Native) — keep it for a follow-up session
- Coach dashboard deep screens (client detail, program builder) — lower priority
- Auth flows (signup, password reset) — functional, low visual priority

## Desired deliverables

For whatever screens it redesigns:

1. High-fidelity desktop mockups (we're desktop-first for the web)
2. Tablet/mobile breakpoints for the top 3 screens (dashboard, active workout, stats)
3. If it can produce code-powered prototypes — great, even better
4. Updated design tokens if it proposes palette/type tweaks

## Tone/style references

- Linear, Vercel, and Superhuman for interaction density and restraint
- Strava for activity-feed credibility
- Whoop / Oura for data-density without feeling cluttered
- Strong / Hevy for the workout-logger density (but aim for less "spreadsheet" than them)

## Prompt to paste

> Redesign the web app of IronPulse, a dark-mode fitness tracker for strength athletes and coaches. Keep the blue (#0077FF) + black (#060B14) palette, the dumbbell+pulse logo, and the dark-first dense-data aesthetic. Prioritise the active workout screen, stats page, and dashboard — they're where users spend most time. Produce high-fidelity desktop mockups plus mobile breakpoints for those three, in the style of Linear/Vercel/Strava. Tech stack is Next.js 15 + Tailwind + Radix + Lucide; code-powered prototypes preferred.
