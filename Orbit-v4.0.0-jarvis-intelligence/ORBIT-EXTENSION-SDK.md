# Orbit Declarative Extension SDK — v1

Orbit v3.1 supports importing data-only JSON command packs from **Hub → Extensions**. Extensions cannot run JavaScript, access Node/Electron APIs, or execute shell commands.

## Manifest format

```json
{
  "id": "example.productivity",
  "name": "Productivity Example",
  "version": "1.0.0",
  "description": "Example safe command pack",
  "commands": [
    {
      "id": "open.github",
      "name": "Open GitHub",
      "description": "Open the GitHub website",
      "action": { "type": "url", "value": "https://github.com" }
    },
    {
      "id": "copy.greeting",
      "name": "Copy greeting",
      "description": "Copy a sample greeting",
      "action": { "type": "copy", "value": "Hello from Orbit" }
    }
  ]
}
```

## Supported actions

- `url`: valid HTTPS URLs only; credentials embedded in the URL are rejected.
- `app`: `notepad` or `calculator` only.
- `copy`: text up to 12,000 characters.

## Validation limits

- Manifest file size: 256 KB maximum.
- Pack ID and command IDs: 2–64 characters, alphanumeric plus `.`, `_`, and `-`.
- Pack name: 80 characters maximum; description: 300 characters maximum.
- Maximum 50 commands per pack and 50 stored packs.
- Command name: 80 characters; command description: 200 characters.
- Duplicate command IDs within one pack are rejected.
- Every action requires an explicit confirmation before it executes.
- Imported packs are stored in the user's local app storage and included in the Hub JSON export.

## Security boundary

This is a **declarative action pack**, not an executable plugin system. Do not add `eval`, dynamic imports, arbitrary shell execution, or extension-provided JavaScript. A future executable plugin architecture would require a separate threat model, process isolation, explicit permission grants, lifecycle controls, and security testing.
