# Orbit v2.2.0 — Interface System Refresh

## Visual direction: Field Notes

Orbit now uses a restrained graphite-and-lime identity inspired by technical instruments and field-work interfaces. The lime accent is reserved for primary actions, selected navigation, focus, and key state cues. Neutral surfaces, fine separators, compact typography, and near-square geometry create hierarchy without decorative cards or gradients.

## Design system

- Centralized CSS custom properties for semantic colors, surfaces, borders, spacing, geometry, focus, and elevation.
- Shared control styling for buttons, fields, selects, text areas, and keyboard focus.
- Consistent type roles for labels, metadata, body copy, code, and operational statuses.
- Compact, aligned command rows and consistent selected/hover states.
- Distinct operational styling for AI workspace tools, task review, execution output, and settings.
- Light theme maps the same semantic tokens rather than using a separate ad hoc palette.
- Responsive rules for narrower windows and `prefers-reduced-motion` support.
- Command icons use typographic initials rather than emoji glyphs.

## Preserved behavior

This release changes presentation and semantic icon display only. Existing command registry, file search, calculator, settings, AI providers and streaming, prompt history, named conversations, clipboard history, project retrieval, approved actions, task planning, task history, and export/copy behavior remain in the existing application code.

## Validation

- Source-level JSX edits and CSS token definitions inspected.
- Build and runtime checks are not claimed as passed unless run in the target environment. See delivery notes for the actual verification performed.
