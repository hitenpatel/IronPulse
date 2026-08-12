---
id: TASK-13
title: >-
  parity: injury prevention & recovery logging — Strava added structured injury
  tracking April 2026 (agent-suggested)
status: To Do
assignee: []
created_date: '2026-07-24 05:58'
updated_date: '2026-08-12 15:48'
labels:
  - agent-ready
  - agent-suggested
  - feature
  - integrations
  - product
milestone: m-2
dependencies: []
references:
  - 'https://git.hiten-patel.co.uk/hiten/IronPulse/issues/391'
priority: medium
type: feature
ordinal: 13000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Imported from Forgejo issue #391: https://git.hiten-patel.co.uk/hiten/IronPulse/issues/391

## Why this surfaced

Web search for "Strava update new features May 2026" found: Strava added injury prevention and recovery features in late April 2026, providing a structured way to log, track, and share these activities. IronPulse's codebase (pack scan of `packages/api/src/routers/`) has no injury or recovery tracking router. The closest features are `body-metric`, `sleep`, and `cardio`, none of which expose an injury/recovery logging path.

## Observable evidence

From web search (https://endurance.biz/2026/industry-news/strava-targets-leaderboard-accuracy-and-rolls-out-navigation-and-club-event-updates/):
> "In late April 2026, Strava added injury prevention and recovery features, providing a structured way to log, track, and share these activities."

Router list in `packages/api/src/routers/`: achievement, analytics, auth, body-metric, cardio, challenge, coach, exercise, export, goal, import, integration, message, notification, nutrition, passkey, program, progress-photo, search, sleep, social, stripe, sync, telemetry, template, user, workout. No injury or recovery router exists.

## Acceptance criteria

- [ ] New `injury` router endpoint allows logging injury event with date, injury type (strain, fracture, soreness, etc.), severity (1–10), and affected body parts
- [ ] Injury history endpoint returns list of past injuries with filtering by body part and date range
- [ ] User can log recovery activities against injuries (physical therapy, rest day, treatment modality)
- [ ] Workout creation/modification shows past injuries and allows marking exercises as "restricted" (e.g., "no squats for 2 weeks post-injury")
- [ ] Mobile and web UI expose injury logging, history view, and recovery timeline in a new "Recovery" section

## Out of scope

- Automatic injury detection from sensor data or ML analysis
- Integration with external health services (Apple Health, Strava, Oura)
- Medical advice, diagnosis, or treatment recommendations
- Coach-to-athlete injury visibility or recovery plan assignment
<!-- SECTION:DESCRIPTION:END -->
