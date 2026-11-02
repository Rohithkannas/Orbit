const API = "http://127.0.0.1:48761/v1/site-time";
const STATE_KEY = "orbitFocusState";
const ALARM = "orbit-focus-minute";
let state = { domain: "", lastTickAt: Date.now(), browserFocused: true, idleState: "active" };

function domainFromUrl(url) {
  try {
    const parsed = new URL(url || "");
    if (!(["http:", "https:"].includes(parsed.protocol))) return "";
    const domain = parsed.hostname.toLowerCase();
    if (!domain.includes(".") || domain === "localhost") return "";
    return domain;
  } catch { return ""; }
}
async function loadState() {
  const saved = await chrome.storage.local.get(STATE_KEY);
  if (saved[STATE_KEY] && typeof saved[STATE_KEY] === "object") state = { ...state, ...saved[STATE_KEY] };
  if (!Number.isFinite(state.lastTickAt) || Date.now() - state.lastTickAt > 180000) state.lastTickAt = Date.now();
}
async function saveState() { await chrome.storage.local.set({ [STATE_KEY]: state }); }
async function flush() {
  const now = Date.now();
  const elapsed = Math.floor(Math.max(0, Math.min(180, (now - state.lastTickAt) / 1000)));
  state.lastTickAt = now;
  if (elapsed > 0 && state.domain && state.browserFocused && state.idleState === "active") {
    const localDate = new Date(now);
    const date = `${localDate.getFullYear()}-${String(localDate.getMonth() + 1).padStart(2, "0")}-${String(localDate.getDate()).padStart(2, "0")}`;
    try {
      await fetch(API, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ date, domain: state.domain, seconds: elapsed }) });
    } catch { /* Orbit may be closed; the extension resumes when it is available. */ }
  }
  await saveState();
}
async function refreshActiveTab() {
  try {
    const windows = await chrome.windows.getLastFocused({ populate: true });
    state.browserFocused = windows.focused === true;
    const active = windows.tabs?.find((tab) => tab.active);
    state.domain = state.browserFocused && active ? domainFromUrl(active.url) : "";
  } catch { state.browserFocused = false; state.domain = ""; }
  state.lastTickAt = Date.now();
  await saveState();
}
async function updateContext() {
  await flush();
  try { state.idleState = await chrome.idle.queryState(60); } catch { state.idleState = "active"; }
  await refreshActiveTab();
}
chrome.runtime.onInstalled.addListener(async () => {
  chrome.idle.setDetectionInterval(60);
  chrome.alarms.create(ALARM, { periodInMinutes: 1 });
  await loadState(); await refreshActiveTab();
});
chrome.runtime.onStartup.addListener(async () => { await loadState(); await refreshActiveTab(); });
chrome.alarms.onAlarm.addListener((alarm) => { if (alarm.name === ALARM) void updateContext(); });
chrome.tabs.onActivated.addListener(() => void updateContext());
chrome.tabs.onUpdated.addListener((_tabId, changeInfo, tab) => { if (tab.active && (changeInfo.url || changeInfo.status === "complete")) void updateContext(); });
chrome.windows.onFocusChanged.addListener(() => void updateContext());
chrome.idle.onStateChanged.addListener((newState) => { void (async () => { await flush(); state.idleState = newState; await refreshActiveTab(); })(); });
chrome.runtime.onSuspend.addListener(() => { void flush(); });
void (async () => { await loadState(); chrome.idle.setDetectionInterval(60); chrome.alarms.create(ALARM, { periodInMinutes: 1 }); await refreshActiveTab(); })();
