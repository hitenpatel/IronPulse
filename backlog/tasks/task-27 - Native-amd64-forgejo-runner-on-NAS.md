---
id: TASK-27
title: Native amd64 forgejo runner on NAS
status: To Do
assignee: []
created_date: '2026-08-09 15:13'
labels:
  - ci
  - infra
dependencies: []
priority: medium
ordinal: 38000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
QEMU amd64 emulation on the arm64 Oracle runner hits 3h timeout for multi-arch mettlelift image builds. Register a second forgejo-runner container on the NAS (x86_64) with an amd64 label. Then re-add linux/amd64,linux/arm64 to build-image workflow platforms; amd64 will land on the native NAS runner while arm64 stays on Oracle. Reference config: /home/ubuntu/forgejo-runner/config.yml.
<!-- SECTION:DESCRIPTION:END -->
