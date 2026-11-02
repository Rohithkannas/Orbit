# Orbit v3.0.0 — Combined P1–P4 Feature Matrix

This matrix accounts for every item in the combined roadmap and distinguishes shipped behavior from items that still require production infrastructure or a later iteration.

| # | Roadmap feature | v3.0.0 status | Notes |
|---:|---|---|---|
| 1 | Native Windows app tracking | Implemented, best-effort | 15-second foreground-process sampling; process names only; idle over 60 seconds and Orbit excluded; user can pause tracking. |
| 2 | Unified activity timeline | Implemented | One hub view for Windows process time and Chromium domain time; data sources remain separate and approximate. |
| 3 | Workspace snapshots | Implemented, bounded | Saves selected project folder, allowed app launches, and HTTPS links; does not capture unsaved state or all browser tabs. |
| 4 | Contextual commands | Existing capabilities retained; partial | Launcher search, selected project context, clipboard and workspace actions exist. Active-window-aware command suggestions are not implemented yet. |
| 5 | AI assistant with local LLM | Existing | Ollama/OpenAI-compatible configuration and existing streaming/mode logic retained. Provider/model setup remains user-configured. |
| 6 | Intent-to-outcome engine | Existing, bounded | Existing plan/review/approved-action runner retained; no arbitrary shell execution or source edits. |
| 7 | File intelligence | Existing, bounded | Project file search/retrieval and excerpts retained; keyword-based, not semantic vector RAG. |
| 8 | Developer workspace | Existing | Project selection, Git status/diff/log and approved build checks retained. |
| 9 | Safe action approval | Implemented/existing | Workflow run confirmation, fixed action types, outcome log; project actions remain allowlisted. |
| 10 | Clipboard history | Existing | Manual capture, local history, delete controls and clipboard copy retained. |
| 11 | Snippets/templates | Implemented | Local snippets with optional shortcut label and one-click copy. Automatic global text expansion is not implemented. |
| 12 | Workflow automation | Implemented, bounded | Save/run URL, allowed app and copy-text steps with explicit confirmation and audit; no arbitrary scripts or scheduler-triggered workflows. |
| 13 | Extension SDK | Documentation included; runtime partial | Guide exports and is included in source. Dynamic third-party loading, plugin permissions and sandbox are deferred. |
| 14 | Persistent activity/settings | Implemented/existing | New hub data stored locally; existing preferences, AI history and focus records retained. |
| 15 | Scheduling/reminders | Implemented, foreground-only | One-time reminders notify while Orbit is running; no Windows background service after exit. |
| 16 | Installer/auto-update | Installer config + updater scaffold | NSIS build script and update-feed check exist. Signing, hosted feed, release pipeline and end-to-end update test require maintainer setup. |
| 17 | Performance benchmarks | Smoke diagnostics included; partial | Local storage round-trip and JSON serialization timing; no formal startup/memory benchmark suite. |
| 18 | Security review | Safety controls retained; not a formal audit | Fixed allowlists, HTTPS validation, project-scope controls and explicit confirmations. A professional threat-model/code audit remains necessary before public distribution. |
| 19 | Search/retrieval evaluation | Smoke test included; partial | Hub diagnostics can run a project retrieval smoke test. No labeled evaluation dataset or precision/recall benchmark yet. |
| 20 | UI polish | Implemented for new hub | Responsive control center, status/error states, empty states, data export and clear navigation. Existing app styling retained. |

## Release discipline

Do not describe the partial items above as production-complete. They are included as usable bounded capabilities or documented scaffolding; the remaining limitations are explicit so the next release can finish them without losing scope.
