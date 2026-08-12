# Codex and Claude collaboration

By default, Codex does not implement application code, tests, migrations, deployment configuration, or runtime changes unless the user explicitly asks Codex to implement the specific task.

The user may ask Codex to analyze, design, plan, structure Backlog work, review, or implement. These are optional task assignments, not standing or exclusive ownership areas.

When the user designates Claude Code as implementer, use a dated document in `docs/handoffs/`. Claude executes the referenced Backlog task and implementation plan, records progress through the Backlog CLI, runs verification, and commits only files within that task's scope.

Codex reviews Claude's work only when the user asks for that review. When reviewing, Codex reports findings and does not implement corrections unless the user separately instructs Codex to do so.

Codex may edit planning and coordination artifacts when the user has requested that work, including `AGENTS.md`, `docs/superpowers/specs/`, `docs/superpowers/plans/`, `docs/handoffs/`, and Backlog records through the `backlog` CLI.
