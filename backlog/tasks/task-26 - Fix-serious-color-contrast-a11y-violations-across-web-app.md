---
id: TASK-26
title: Fix serious color-contrast a11y violations across web app
status: Done
assignee: []
created_date: '2026-08-09 06:07'
updated_date: '2026-08-11 07:19'
labels:
  - a11y
  - web
dependencies: []
priority: medium
ordinal: 37000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Axe (wcag2aa) reports [serious] color-contrast violations on authenticated pages: dashboard ~20 nodes, workouts ~21, one page with ~120 nodes (first surfaced when signIn started working in the e2e suite, 2026-08-09). The a11y.spec.ts gate temporarily disables the color-contrast rule via ALWAYS_DISABLED_RULES; remove that entry once the design-system colors are fixed. QA against designs/claude-design-handoff, not the old app.
<!-- SECTION:DESCRIPTION:END -->
