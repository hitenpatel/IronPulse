---
id: TASK-15
title: >-
  infra: set up macOS Forgejo runner so Apple Watch / iOS native work can be
  agent-implemented
status: To Do
assignee: []
created_date: '2026-07-24 05:58'
updated_date: '2026-07-24 06:07'
labels:
  - infrastructure
  - manual-work
dependencies: []
references:
  - 'https://git.hiten-patel.co.uk/hiten/IronPulse/issues/394'
priority: medium
type: chore
ordinal: 15000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Imported from Forgejo issue #394: https://git.hiten-patel.co.uk/hiten/IronPulse/issues/394

## Why
The IronPulse Apple Watch sub-issues (#384, #385, #386) and parent #368 cannot be implemented by the autonomous Feature Implementer because they require Xcode, which only runs on macOS. The current Forgejo `arm64` runner is a Linux container on the Oracle VM. Without a macOS runner, all Watch/iOS-native work blocks indefinitely.

## What needs to happen (manual)
- [ ] Acquire a macOS host (Apple Silicon Mac mini or hosted macOS like MacStadium / GitHub-style runner)
- [ ] Install Xcode + command-line tools + watchOS simulator
- [ ] Install Forgejo `act_runner` and register it with the IronPulse repo with label `macos-arm64`
- [ ] Update relevant CI jobs to use `runs-on: macos-arm64` for any iOS/watchOS work
- [ ] Document in BookStack (Iron Pulse shelf) the runner registration token rotation procedure
- [ ] Once runner is live, remove the "needs Xcode" blocker note from Feature Implementer skill so it picks up #384/#385/#386 again

## Out of scope
- Migrating the existing Linux jobs to macOS — Linux remains primary
- Setting up a CI farm with multiple Macs
- Apple Developer Program enrolment (tracked separately in #211)

## Suggested type
infrastructure

## Confidence
high — without macOS, none of the Watch issues can be implemented by an autonomous agent.
<!-- SECTION:DESCRIPTION:END -->
