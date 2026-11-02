# Orbit v2.4.0 — Focus Intelligence

## New
- Focus dashboard for daily website-time totals.
- Optional Chromium browser extension tracks active website domain durations while the browser window is focused and the user is not idle.
- Local-only HTTP receiver bound to `127.0.0.1:48761`; totals are stored in the Electron app's user-data directory.
- Refresh and clear-today controls.
- Domain-only collection: no URL paths, page titles, page content, browsing history export, or cloud transmission.

## Install the browser tracker
1. Start Orbit and leave it running.
2. Open `chrome://extensions` (or the equivalent Chromium-based browser extensions page).
3. Enable Developer mode and select **Load unpacked**.
4. Select the `extensions/orbit-browser-tracker` folder from this release.
5. Click **Focus** in Orbit and refresh after browsing for a few minutes.

The extension is optional. It tracks time only while an eligible HTTP/HTTPS tab is active, the browser window is focused, and the browser reports the user as active. Browser APIs and service-worker scheduling can make totals approximate. It does not track other desktop applications in this release.

## Validation
- TypeScript/Vite production build should be run on the target Windows machine with `npm install` and `npm run build`.
- The extension must be loaded manually; it is not automatically installed.
