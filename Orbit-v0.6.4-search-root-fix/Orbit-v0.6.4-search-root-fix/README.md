# Orbit v0.6.4 — Search Root Fix

This version addresses file search and multiple extracted project folders. The file search now searches the project directory that was launched first, then `C:\Users\<you>\Orbit`, Desktop, Documents, and Downloads. It uses breadth-first traversal so shallow project files are checked before large nested trees. It skips dependency and OS folders.

## Run

1. Close every Orbit window and stop old Orbit terminals.
2. Extract this ZIP to a fresh folder. Do not extract it inside another Orbit version folder.
3. Open PowerShell in the folder that directly contains `package.json`. Verify with `Get-Location` and `Test-Path .\package.json`.
4. Run:

```powershell
npm install
npm run build
if ($LASTEXITCODE -eq 0) { npm run desktop }
```

The header should say `v0.6.4`. In Files mode, try `package`, `main.cjs`, or `orbit`.

## Multiple folders

Having multiple extracted copies is not inherently a problem. The problem occurs when a terminal starts the parent folder or an old Vite/Electron process continues serving a different copy. This version uses Vite port 5174 and prioritizes the actual current project root for file search.
