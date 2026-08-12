---
id: TASK-2
title: Configure Apple Developer account for passkeys and Sign in with Apple
status: To Do
assignee: []
created_date: '2026-07-24 05:58'
updated_date: '2026-08-12 15:48'
labels:
  - manual-work
  - 'priority:medium'
  - oauth
milestone: m-0
dependencies: []
references:
  - 'https://git.hiten-patel.co.uk/hiten/IronPulse/issues/211'
priority: medium
ordinal: 2000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Imported from Forgejo issue #211: https://git.hiten-patel.co.uk/hiten/IronPulse/issues/211

## Context

IronPulse supports:
- **Passkeys (WebAuthn)** via `@simplewebauthn/server` — requires a Relying Party (RP) ID matching the production domain
- **Sign in with Apple** via NextAuth — requires an Apple Services ID, key, and team ID

Both require Apple Developer Program membership and specific configuration.

## Acceptance Criteria

- [ ] Ensure Apple Developer Program membership is active
- [ ] **Passkeys**: Configure the RP ID to match the production domain (e.g., `ironpulse.app`)
  - Add the `.well-known/apple-app-site-association` file for iOS passkey support
  - Update `packages/api/src/lib/passkey.ts` RP ID configuration if needed
- [ ] **Sign in with Apple**: Create a Services ID in the Apple Developer portal
  - Configure the return URL for web OAuth
  - Generate and store the private key
  - Set `APPLE_ID` and `APPLE_SECRET` in production env
- [ ] **iOS App**: Configure Associated Domains entitlement for passkeys
- [ ] Test passkey registration and authentication on iOS Safari and the native app
- [ ] Update the integration provider setup runbook with Apple-specific steps

## Notes

This is manual work in the Apple Developer portal. The passkey RP ID must match across web and mobile — coordinate with the domain setup.
<!-- SECTION:DESCRIPTION:END -->
