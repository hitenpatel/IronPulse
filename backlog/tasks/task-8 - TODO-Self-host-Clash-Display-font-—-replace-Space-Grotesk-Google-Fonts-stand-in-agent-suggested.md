---
id: TASK-8
title: >-
  TODO: Self-host Clash Display font — replace Space Grotesk Google Fonts
  stand-in (agent-suggested)
status: To Do
assignee: []
created_date: '2026-07-24 05:58'
updated_date: '2026-07-24 06:07'
labels:
  - agent-suggested
  - gdpr
  - performance
dependencies: []
references:
  - 'https://git.hiten-patel.co.uk/hiten/IronPulse/issues/342'
priority: low
ordinal: 8000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Imported from Forgejo issue #342: https://git.hiten-patel.co.uk/hiten/IronPulse/issues/342

## Why this surfaced

Inline TODO scan: `apps/web/src/app/layout.tsx` line 13 contains a `// TODO: Replace with local Clash Display font files when available` comment aged **37+ days** (committed 2026-03-20). The current implementation uses Space Grotesk from Google Fonts as a stand-in for Clash Display.

## Observable evidence

```typescript
// apps/web/src/app/layout.tsx:13
// Space Grotesk as display font (closest Google Fonts match to Clash Display)
// TODO: Replace with local Clash Display font files when available
const displayFont = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-clash-display",
  weight: ["500", "600", "700"],
});
```

`git blame` output:
```
b97dc749 (Hiten Patel 2026-03-20 08:26:45 +0000 13) // TODO: Replace with local Clash Display font files when available
```

The current Google Fonts load causes: (1) an external DNS lookup on every page visit (GDPR/privacy — user IP sent to Google), (2) a render-blocking request that increases LCP, (3) visual inconsistency with the Clash Display branding used in design files and the mobile redesign (`packages/shared/src/theme.ts`).

## Acceptance criteria

*Skipped — Backlog Groomer drafts these on next run.*

## Suggested type

feature

## Confidence

high — directly evidenced by a 37-day-old actionable TODO with a clear owner (the font variable is already wired up; only the source needs to change from Google Fonts to local files).

---
*Filed by IronPulse Product Owner · agent-suggested · weekly Sunday sweep*
<!-- SECTION:DESCRIPTION:END -->
