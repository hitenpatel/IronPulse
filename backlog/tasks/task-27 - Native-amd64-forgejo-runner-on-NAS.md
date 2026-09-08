---
id: TASK-27
title: Native amd64 forgejo runner on NAS
status: Done
assignee: []
created_date: '2026-08-09 15:13'
updated_date: '2026-09-08 04:27'
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

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Runner: NAS /volume2/docker/forgejo-runner-amd64 (label amd64-dind, docker socket automount, network home-server_frontend).

Dead ends: QEMU on Oracle (3h timeout); buildx docker-container builder on the NAS — kernel 4.4 has no overlayfs so buildkit uses the native snapshotter (full copy per layer, FROM node:22-slim took 47 min, on /volume2 and /volume1 alike); docker push to git.hiten-patel.co.uk from the NAS (router NAT hairpin drops large uploads, HTTP 499); concurrent image + cache export to Forgejo registry (blob race, HTTP 500 "offset mismatch").

Working design (ci.yml): build-image-amd64 runs `DOCKER_BUILDKIT=1 docker build` through the NAS daemon (aufs graphdriver, fast), pushes to 127.0.0.1:3000 via a persistent socat container `forgejo-registry-proxy` (-p 127.0.0.1:3000:3000 -> forgejo:3000; 127.0.0.0/8 is an insecure registry by default so no daemon.json/root needed). build-image-arm64 on Oracle pushes sha-<sha>-arm64; "Publish Multi-arch Image" merges both with `docker buildx imagetools create` into staging-<sha> (+ prod-<sha> on main). Cold build measured 44 min + 5.5 min push on the NAS; warm builds hit the daemon cache and buildcache-amd64 inline cache.

CI 574 (main c63b2b8) results: Build Image (amd64) SUCCESS on the NAS runner (daemon BuildKit + loopback registry proxy, ~44m cold). Build Image (arm64) FAILURE on the Oracle runner — image push succeeded, but the separate cache-export step raced Forgejo's registry (HTTP 500 'offset mismatch between file and model' on parallel blob PUTs). Fixed in 6e25d0c by marking the cache-export step continue-on-error so cache export stays best-effort and job status reflects the image publish only. Manually merged c63b2b8's per-arch tags into staging-<sha>/prod-<sha> with docker buildx imagetools create so main deploys were not blocked.

CI 577 (main 0d66e31 with continue-on-error fix) closes the story: NAS amd64 job success, Publish Multi-arch success. Note: Oracle arm64 push separately hit a transient HTTP 499 (Client Closed Request) on the final blob PUT after ~101 s of layer upload; a rerun of the arm64 job on the same SHA succeeded. Continue-on-error on cache-export only protects against the cache-to race, not the image-push flakiness — treat re-run as the mitigation for that.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Native amd64 build path landed via NAS daemon BuildKit + loopback registry proxy on the amd64-dind runner; arm64 remains on Oracle. Cold amd64 build ~44 min, warm hits the daemon cache. CI 577 (main 0d66e31) green end to end after (a) marking the arm64 cache-export step continue-on-error to survive Forgejo's parallel-blob-PUT race, and (b) rerunning arm64 once when its image push hit a transient 499. Manifest lists for staging-<sha>/prod-<sha> now published by CI. Documented in BookStack page 136 and shared-memory nas-no-overlayfs-buildkit.
<!-- SECTION:FINAL_SUMMARY:END -->
