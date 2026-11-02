# Orbit v3.1.0 — Context & Extension Runtime

## Added

- **Context-aware workspace panel:** reads the current Windows foreground process name through a narrowly scoped Electron IPC handler and surfaces relevant Hub navigation shortcuts. It does not collect window titles, document content, or keystrokes.
- **Declarative extension runtime:** import JSON command packs from Hub → Extensions. Packs are data-only and cannot execute JavaScript or arbitrary shell commands.
- **Action validation:** extension manifests are bounded by file size, pack/command counts, field lengths, unique command IDs, HTTPS-only URLs, a fixed app allowlist (Notepad/Calculator), and bounded clipboard text.
- **Explicit execution review:** each imported command prompts for confirmation before performing its one declared action.
- **Example manifest download:** generate a sample pack for testing and extension author onboarding.
- **Extension data portability:** installed packs are persisted locally and included in Hub JSON exports; the Hub's clear-data control removes them.
- **Updated version metadata** to 3.1.0.

## Preserved

Existing launcher, AI provider configuration, streaming, project retrieval and allowlisted project actions, voice input, focus tracking and analytics, notes, clipboard capture, workspaces, reminders, snippets, bounded workflows, audit log, update-check scaffold and Windows installer configuration.

## Verification status

- `node --check electron/main.cjs`: passed.
- `node --check electron/preload.cjs`: passed.
- TypeScript/Vite production build: not verified. Dependency installation timed out in the build environment, and the TypeScript build cannot resolve `vite/client` or Vite packages without installed dependencies.
- Live Windows foreground-context behavior, extension import/execution, installer packaging, and end-to-end regression tests require testing on a Windows machine with dependencies installed.

## Known boundaries

- Extension packs are intentionally declarative. Executable third-party plugins, arbitrary shell commands, and a third-party code sandbox are not provided.
- Foreground app context is Windows-only and returns the process name only.
- Windows code signing, a published update feed, and an end-to-end auto-update release pipeline require maintainer credentials and hosting.
- Reminders still require Orbit to be running; global OS-level snippet expansion and background scheduling are not implemented.
