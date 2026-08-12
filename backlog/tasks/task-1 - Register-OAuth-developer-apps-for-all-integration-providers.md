---
id: TASK-1
title: Register OAuth developer apps for all integration providers
status: To Do
assignee: []
created_date: '2026-07-24 05:58'
updated_date: '2026-08-12 15:48'
labels:
  - manual-work
  - 'priority:high'
  - oauth
  - integrations
milestone: m-0
dependencies: []
references:
  - 'https://git.hiten-patel.co.uk/hiten/IronPulse/issues/210'
priority: high
ordinal: 1000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Imported from Forgejo issue #210: https://git.hiten-patel.co.uk/hiten/IronPulse/issues/210

## Context

IronPulse has code for 5 fitness platform integrations (Strava, Garmin Connect, Polar, Withings, Oura) but production OAuth apps need to be registered with each provider to get client IDs and secrets.

## Acceptance Criteria

- [ ] **Strava**: Register app at developers.strava.com, configure webhook subscription
- [ ] **Garmin Connect**: Apply for Garmin Health API access, register OAuth consumer
- [ ] **Polar**: Register at admin.polaraccesslink.com
- [ ] **Withings**: Register at developer.withings.com, configure OAuth callback
- [ ] **Oura**: Register at cloud.ouraring.com/oauth/applications
- [ ] For each: set production callback URLs matching the route pattern in the codebase
- [ ] Store all client IDs and secrets in production `.env` (never in code)
- [ ] Test each OAuth flow end-to-end in staging before production
- [ ] Update the integration provider setup runbook with any gotchas discovered

## Notes

This is manual work requiring human accounts and potentially approval processes (Garmin Health API has an application review). Start early — some providers take days/weeks for approval.
<!-- SECTION:DESCRIPTION:END -->
