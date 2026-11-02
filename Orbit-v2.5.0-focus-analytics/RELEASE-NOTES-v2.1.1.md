# Orbit v2.1.1 — Task Planning Reliability Fix

## Fix: task plan generation
- Task planning now preserves the exact provider error when AI planning fails.
- If the provider errors, times out, or returns an empty response, Orbit generates a clearly labeled deterministic local fallback plan instead of leaving the panel blank.
- The fallback plan is explicitly marked as a local template, not AI-generated analysis.
- Fallback plans are saved to task history and remain review-only; generating a plan does not execute commands.

## Two additional features
1. **Copy plan:** copy the displayed plan to the system clipboard.
2. **Export task report:** save a Markdown report, including the goal, plan source, selected project, plan and current execution output, to `Documents\Orbit AI Drafts`.

## Safety
- Existing allowlisted action execution and confirmation prompts are unchanged.
- No arbitrary AI-generated shell commands or automatic source edits are enabled.

## Verification
- Electron main/preload JavaScript syntax checks: passed.
- TypeScript/JSX syntax transpilation: passed.
- ZIP integrity and root-level archive structure: checked.
- Full dependency-backed TypeScript/Vite build and live Electron runtime: not verified in this environment because dependency installation timed out.
