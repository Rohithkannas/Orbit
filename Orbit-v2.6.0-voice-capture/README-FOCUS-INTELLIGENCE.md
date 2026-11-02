# Focus Intelligence (v2.4.0)

Orbit's optional browser tracker measures active time by website domain and stores daily totals locally. It does not capture full URLs, page titles, page text, form contents, or keystrokes.

## Start Orbit
```powershell
npm install
npm run build
npm run desktop
```

## Enable browser tracking
1. Keep Orbit running.
2. Open `chrome://extensions` in Chrome or the corresponding extensions page in another Chromium-based browser.
3. Enable **Developer mode**.
4. Click **Load unpacked** and select `extensions/orbit-browser-tracker` from this project.
5. Browse normally. Open Orbit's **Focus** dashboard and click **Refresh** to see today's totals.

The local receiver binds only to `127.0.0.1:48761`. Data is stored in Electron's app user-data folder. Closing Orbit stops collection. Browser service-worker scheduling and minute-based checkpoints mean time values are approximate, not forensic records. Private/incognito windows are not tracked unless the extension is separately allowed in incognito (not recommended by default).

## Limitations
- This release tracks eligible website domains in Chromium-based browsers only; it does not yet track native desktop apps or provide a browser-specific history timeline.
- The dashboard starts with today's data; future releases may add date ranges, category rules, goals, and app usage.

## v2.5.0 analytics
The dashboard now includes a seven-day local activity chart, heuristic category breakdown, configurable daily browsing goal, a focus sprint timer, top-domain insights, and CSV export. Weekly history is limited to data actually recorded since the tracker was installed and running.
