import { useCallback, useEffect, useMemo, useState } from "react";
import "./ProductivityHub.css";

type HubTab = "overview" | "activity" | "workspaces" | "automations" | "snippets" | "reminders" | "extensions" | "system";
type Snippet = { id: string; title: string; body: string; shortcut: string; updatedAt: number };
type Reminder = { id: string; title: string; dueAt: number; firedAt?: number };
type Workspace = { id: string; name: string; projectPath: string; urls: string[]; apps: string[]; createdAt: number };
type WorkflowStep = { id: string; type: "url" | "app" | "copy"; value: string };
type Workflow = { id: string; name: string; steps: WorkflowStep[]; updatedAt: number };
type AuditEntry = { id: string; at: number; workflow: string; status: "success" | "partial" | "failed"; details: string };
type ExtensionCommand = { id: string; name: string; description: string; action: { type: "url" | "app" | "copy"; value: string } };
type ExtensionPack = { id: string; name: string; version: string; description: string; commands: ExtensionCommand[]; importedAt: number };
type ForegroundContext = { success: boolean; app?: string; observedAt?: number; error?: string };
type ActivityData = { success: boolean; enabled?: boolean; entries: Array<{ app: string; seconds: number }>; totalSeconds: number; date: string; error?: string };
type WebsiteActivityData = { success: boolean; entries: Array<{ domain: string; seconds: number }>; totalSeconds: number; date: string; error?: string };

const keys = { extensions: "orbit.hub.extensions.v1", snippets: "orbit.hub.snippets.v1", reminders: "orbit.hub.reminders.v1", workspaces: "orbit.hub.workspaces.v1", workflows: "orbit.hub.workflows.v1", audit: "orbit.hub.audit.v1" };
function readList<T>(key: string): T[] { try { const value: unknown = JSON.parse(localStorage.getItem(key) ?? "[]"); return Array.isArray(value) ? value : []; } catch { return []; } }
function persist<T>(key: string, value: T[]): void { try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* Keep the UI responsive if storage is full or unavailable. */ } }
function makeId(): string { return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`; }
function safeHttps(value: string): boolean { try { const url = new URL(value); return url.protocol === "https:" && !!url.hostname && !url.username && !url.password; } catch { return false; } }
function validateExtensionPack(input: unknown): Omit<ExtensionPack, "importedAt"> | null {
  if (!input || typeof input !== "object") return null;
  const pack = input as Record<string, unknown>;
  if (typeof pack.id !== "string" || !/^[a-z0-9][a-z0-9._-]{1,63}$/i.test(pack.id)) return null;
  if (typeof pack.name !== "string" || !pack.name.trim() || pack.name.length > 80) return null;
  if (typeof pack.version !== "string" || pack.version.length > 30) return null;
  if (typeof pack.description !== "string" || pack.description.length > 300) return null;
  if (!Array.isArray(pack.commands) || pack.commands.length > 50) return null;
  const commands: ExtensionCommand[] = [];
  const seen = new Set<string>();
  for (const raw of pack.commands) {
    if (!raw || typeof raw !== "object") return null;
    const command = raw as Record<string, unknown>;
    const action = command.action as Record<string, unknown> | undefined;
    if (typeof command.id !== "string" || !/^[a-z0-9][a-z0-9._-]{1,63}$/i.test(command.id) || seen.has(command.id)) return null;
    if (typeof command.name !== "string" || !command.name.trim() || command.name.length > 80) return null;
    if (typeof command.description !== "string" || command.description.length > 200) return null;
    if (!action || !["url", "app", "copy"].includes(String(action.type)) || typeof action.value !== "string" || !action.value.trim() || action.value.length > 2048) return null;
    if (action.type === "url" && !safeHttps(action.value)) return null;
    if (action.type === "app" && !["notepad", "calculator"].includes(action.value.toLowerCase())) return null;
    if (action.type === "copy" && action.value.length > 12000) return null;
    seen.add(command.id);
    commands.push({ id: command.id, name: command.name.trim(), description: command.description.trim(), action: { type: action.type as ExtensionCommand["action"]["type"], value: action.value } });
  }
  return { id: pack.id, name: pack.name.trim(), version: pack.version, description: pack.description, commands };
}
function duration(seconds: number): string { const n = Math.max(0, Math.floor(seconds)); const h = Math.floor(n / 3600); const m = Math.floor((n % 3600) / 60); return h ? `${h}h ${m}m` : m ? `${m}m` : `${n}s`; }

interface Props { projectRoot: string; setProjectRoot: (path: string) => void; onClose: () => void; }
export default function ProductivityHub({ projectRoot, setProjectRoot, onClose }: Props) {
  const [tab, setTab] = useState<HubTab>("overview");
  const [snippets, setSnippets] = useState<Snippet[]>(() => readList(keys.snippets));
  const [reminders, setReminders] = useState<Reminder[]>(() => readList(keys.reminders));
  const [workspaces, setWorkspaces] = useState<Workspace[]>(() => readList(keys.workspaces));
  const [workflows, setWorkflows] = useState<Workflow[]>(() => readList(keys.workflows));
  const [audit, setAudit] = useState<AuditEntry[]>(() => readList(keys.audit));
  const [extensions, setExtensions] = useState<ExtensionPack[]>(() => readList(keys.extensions));
  const [foreground, setForeground] = useState<ForegroundContext | null>(null);
  const [activity, setActivity] = useState<ActivityData | null>(null);
  const [websiteActivity, setWebsiteActivity] = useState<WebsiteActivityData | null>(null);
  const [activityBusy, setActivityBusy] = useState(false);
  const [snippetTitle, setSnippetTitle] = useState(""); const [snippetShortcut, setSnippetShortcut] = useState(""); const [snippetBody, setSnippetBody] = useState("");
  const [reminderTitle, setReminderTitle] = useState(""); const [reminderDate, setReminderDate] = useState(() => { const d = new Date(Date.now() + 3600000); d.setSeconds(0, 0); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}T${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`; });
  const [workspaceName, setWorkspaceName] = useState(""); const [workspaceUrls, setWorkspaceUrls] = useState("https://github.com"); const [workspaceApps, setWorkspaceApps] = useState<string[]>(["notepad"]);
  const [workflowName, setWorkflowName] = useState(""); const [stepType, setStepType] = useState<WorkflowStep["type"]>("url"); const [stepValue, setStepValue] = useState(""); const [draftSteps, setDraftSteps] = useState<WorkflowStep[]>([]);
  const [notice, setNotice] = useState("");
  const [diagnostics, setDiagnostics] = useState<string[]>([]);
  const [diagnosticsBusy, setDiagnosticsBusy] = useState(false);

  const refreshActivity = useCallback(async () => {
    setActivityBusy(true);
    try {
      if (window.orbit?.getDesktopActivity) setActivity(await window.orbit.getDesktopActivity());
      else setActivity({ success: false, entries: [], totalSeconds: 0, date: new Date().toISOString().slice(0, 10), error: "Native app tracking is available in the desktop build." });
    } catch { setActivity({ success: false, entries: [], totalSeconds: 0, date: new Date().toISOString().slice(0, 10), error: "Could not read local app activity." }); }
    try {
      if (window.orbit?.getFocusTimeStats) { const result = await window.orbit.getFocusTimeStats(); setWebsiteActivity({ success: result.success, entries: result.entries, totalSeconds: result.totalSeconds, date: result.date, error: result.error }); }
      else setWebsiteActivity(null);
    } catch { setWebsiteActivity(null); }
    try { if (window.orbit?.getForegroundApplication) setForeground(await window.orbit.getForegroundApplication()); } catch { setForeground({ success: false, error: "Could not read active application context." }); }
    setActivityBusy(false);
  }, []);
  useEffect(() => { void refreshActivity(); const id = window.setInterval(() => { if (tab === "activity" || tab === "overview") void refreshActivity(); }, 20000); return () => window.clearInterval(id); }, [refreshActivity, tab]);
  useEffect(() => {
    const checkDue = () => {
      const now = Date.now(); let changed = false;
      const next = reminders.map((item) => {
        if (!item.firedAt && item.dueAt <= now) {
          changed = true;
          try { if ("Notification" in window && Notification.permission === "granted") new Notification(`Orbit reminder: ${item.title}`, { body: new Date(item.dueAt).toLocaleString() }); } catch { /* Native notification may be unavailable. */ }
          return { ...item, firedAt: now };
        }
        return item;
      });
      if (changed) { setReminders(next); persist(keys.reminders, next); }
    };
    checkDue(); const id = window.setInterval(checkDue, 10000); return () => window.clearInterval(id);
  }, [reminders]);

  const totalTracked = (activity?.totalSeconds ?? 0) + (websiteActivity?.totalSeconds ?? 0);
  const saveSnippet = () => {
    if (!snippetTitle.trim() || !snippetBody.trim()) { setNotice("Enter both a snippet name and its content."); return; }
    const next = [{ id: makeId(), title: snippetTitle.trim(), body: snippetBody.trim(), shortcut: snippetShortcut.trim(), updatedAt: Date.now() }, ...snippets].slice(0, 100);
    setSnippets(next); persist(keys.snippets, next); setSnippetTitle(""); setSnippetShortcut(""); setSnippetBody(""); setNotice("Snippet saved locally.");
  };
  const addReminder = async () => {
    const dueAt = new Date(reminderDate).getTime();
    if (!reminderTitle.trim() || !Number.isFinite(dueAt) || dueAt <= Date.now()) { setNotice("Enter a reminder and a future date/time."); return; }
    try { if ("Notification" in window && Notification.permission === "default") await Notification.requestPermission(); } catch { /* In-app reminders still work. */ }
    const next = [{ id: makeId(), title: reminderTitle.trim(), dueAt }, ...reminders].slice(0, 100); setReminders(next); persist(keys.reminders, next); setReminderTitle(""); setNotice("Reminder scheduled. Orbit must be running to notify you at the due time.");
  };
  const saveWorkspace = () => {
    const urls = workspaceUrls.split(/[\n, ]+/).map((x) => x.trim()).filter(Boolean);
    if (!workspaceName.trim()) { setNotice("Give this workspace a name."); return; }
    if (urls.some((url) => !safeHttps(url))) { setNotice("Workspace links must all be valid HTTPS URLs."); return; }
    const next = [{ id: makeId(), name: workspaceName.trim(), projectPath: projectRoot, urls, apps: workspaceApps, createdAt: Date.now() }, ...workspaces].slice(0, 30);
    setWorkspaces(next); persist(keys.workspaces, next); setWorkspaceName(""); setNotice("Workspace snapshot saved on this device.");
  };
  const restoreWorkspace = async (item: Workspace) => {
    const tasks: string[] = [];
    if (item.projectPath && window.orbit?.restoreProjectFolder) {
      const result = await window.orbit.restoreProjectFolder(item.projectPath);
      if (result.success && result.path) { setProjectRoot(result.path); try { localStorage.setItem("orbit.projectRoot.v1", result.path); } catch {} tasks.push("project folder restored"); }
      else tasks.push(`project folder not restored: ${result.error ?? "unavailable"}`);
    }
    if (item.apps.length || item.urls.length) {
      if (window.confirm(`Restore workspace “${item.name}”? This will open ${item.apps.length} app(s) and ${item.urls.length} website(s).`)) {
        for (const appId of item.apps) { const result = await window.orbit?.launchApp(appId); tasks.push(result?.success ? `${appId} opened` : `${appId} failed to open`); }
        for (const url of item.urls) { const result = await window.orbit?.openExternal(url); tasks.push(result?.success ? `${new URL(url).hostname} opened` : `${url} failed to open`); }
      }
    }
    setNotice(tasks.length ? tasks.join(" · ") : "Workspace has no project folder, apps or links to restore.");
  };
  const addWorkflowStep = () => {
    const value = stepValue.trim(); if (!value) { setNotice("Enter a value for the workflow step."); return; }
    if (stepType === "url" && !safeHttps(value)) { setNotice("URL steps only support valid HTTPS URLs."); return; }
    if (stepType === "app" && !["notepad", "calculator"].includes(value)) { setNotice("App steps currently support Notepad or Calculator."); return; }
    setDraftSteps((steps) => [...steps, { id: makeId(), type: stepType, value }]); setStepValue(""); setNotice("");
  };
  const saveWorkflow = () => {
    if (!workflowName.trim() || draftSteps.length === 0) { setNotice("Name the workflow and add at least one step."); return; }
    const next = [{ id: makeId(), name: workflowName.trim(), steps: draftSteps, updatedAt: Date.now() }, ...workflows].slice(0, 50); setWorkflows(next); persist(keys.workflows, next); setWorkflowName(""); setDraftSteps([]); setNotice("Workflow saved. It will ask before running its steps.");
  };
  const runWorkflow = async (item: Workflow) => {
    if (!window.confirm(`Run “${item.name}”? This will execute ${item.steps.length} reviewed action(s).`)) return;
    const details: string[] = []; let failures = 0;
    for (const step of item.steps) {
      try {
        let result: { success: boolean; error?: string } | undefined;
        if (step.type === "url") result = await window.orbit?.openExternal(step.value);
        else if (step.type === "app") result = await window.orbit?.launchApp(step.value);
        else result = await window.orbit?.copyText(step.value);
        if (result?.success) details.push(`✓ ${step.type}: ${step.type === "url" ? new URL(step.value).hostname : step.type === "copy" ? "text copied" : step.value}`);
        else { failures++; details.push(`✕ ${step.type}: ${result?.error ?? "action unavailable"}`); }
      } catch { failures++; details.push(`✕ ${step.type}: unexpected error`); }
    }
    const entry: AuditEntry = { id: makeId(), at: Date.now(), workflow: item.name, status: failures === 0 ? "success" : failures === item.steps.length ? "failed" : "partial", details: details.join("\n") };
    const next = [entry, ...audit].slice(0, 100); setAudit(next); persist(keys.audit, next); setNotice(`Workflow finished: ${item.steps.length - failures}/${item.steps.length} steps succeeded. See System → audit log.`);
  };
  const importExtension = async (file?: File) => {
    if (!file) return;
    try {
      if (file.size > 256 * 1024) { setNotice("Extension manifest exceeds the 256 KB import limit."); return; }
      const parsed: unknown = JSON.parse(await file.text());
      const pack = validateExtensionPack(parsed);
      if (!pack) { setNotice("Invalid extension manifest. Use the Orbit declarative JSON format; only HTTPS links, Notepad/Calculator and copy-text actions are supported."); return; }
      const nextPack: ExtensionPack = { ...pack, importedAt: Date.now() };
      const next = [nextPack, ...extensions.filter((item) => item.id !== pack.id)].slice(0, 50);
      setExtensions(next); persist(keys.extensions, next); setNotice(`Extension “${pack.name}” imported. Its commands are declarative and require confirmation before execution.`);
    } catch { setNotice("Could not import extension. Check that the selected file is valid JSON."); }
  };
  const runExtensionCommand = async (pack: ExtensionPack, command: ExtensionCommand) => {
    if (!window.confirm(`Run extension command “${command.name}” from “${pack.name}”?\n\nAction: ${command.action.type}\nValue: ${command.action.type === "copy" ? `${command.action.value.slice(0, 120)}${command.action.value.length > 120 ? "…" : ""}` : command.action.value}\n\nOrbit will run only this declared action.`)) return;
    try {
      const result = command.action.type === "url" ? await window.orbit?.openExternal(command.action.value) : command.action.type === "app" ? await window.orbit?.launchApp(command.action.value) : await window.orbit?.copyText(command.action.value);
      setNotice(result?.success ? `Extension command completed: ${command.name}` : `Extension command failed: ${result?.error ?? "desktop action unavailable"}`);
    } catch { setNotice(`Extension command failed unexpectedly: ${command.name}`); }
  };

  const runDiagnostics = async () => {
    setDiagnosticsBusy(true); setDiagnostics([]);
    const results: string[] = [];
    try {
      const key = "orbit.hub.diagnostic.probe"; const payload = { at: Date.now(), value: "orbit-local-storage-probe" };
      const t0 = performance.now(); localStorage.setItem(key, JSON.stringify(payload)); const readBack = JSON.parse(localStorage.getItem(key) ?? "null"); localStorage.removeItem(key);
      results.push(readBack?.value === payload.value ? `Local storage round-trip: PASS (${(performance.now() - t0).toFixed(2)} ms)` : "Local storage round-trip: FAIL");
    } catch (error) { results.push(`Local storage round-trip: FAIL (${error instanceof Error ? error.message : "storage unavailable"})`); }
    try {
      const data = Array.from({ length: 5000 }, (_, index) => ({ id: index, label: `diagnostic-${index}`, value: "orbit".repeat(8) }));
      const t0 = performance.now(); const encoded = JSON.stringify(data); const decoded = JSON.parse(encoded); const elapsed = performance.now() - t0;
      results.push(decoded.length === data.length ? `JSON serialization smoke benchmark: PASS (${elapsed.toFixed(2)} ms for 5,000 records)` : "JSON serialization smoke benchmark: FAIL");
    } catch { results.push("JSON serialization smoke benchmark: FAIL"); }
    results.push(window.orbit ? `Electron bridge: PASS (${window.orbit.platform}, v${window.orbit.version})` : "Electron bridge: UNAVAILABLE (browser preview)");
    if (projectRoot && window.orbit?.searchProject) {
      try { const t0 = performance.now(); const search = await window.orbit.searchProject(projectRoot, "README"); results.push(search.error ? `Project retrieval smoke test: BLOCKED (${search.error})` : `Project retrieval smoke test: PASS (${search.results.length} result(s), ${(performance.now() - t0).toFixed(1)} ms, ${search.scannedFiles ?? 0} file(s) scanned)`); } catch { results.push("Project retrieval smoke test: FAIL"); }
    } else results.push("Project retrieval smoke test: SKIPPED (select a project folder in Orbit AI first)");
    setDiagnostics(results); setDiagnosticsBusy(false);
  };

  const exportData = () => {
    const data = { exportedAt: new Date().toISOString(), extensions, snippets, reminders, workspaces, workflows, audit };
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" })); const a = document.createElement("a"); a.href = url; a.download = `orbit-productivity-export-${new Date().toISOString().slice(0, 10)}.json`; a.click(); URL.revokeObjectURL(url); setNotice("Local productivity data exported as JSON.");
  };
  const tabs: Array<{ id: HubTab; label: string; icon: string }> = [{ id: "overview", label: "Overview", icon: "◈" }, { id: "activity", label: "Activity", icon: "◷" }, { id: "workspaces", label: "Workspaces", icon: "▦" }, { id: "automations", label: "Automations", icon: "⚡" }, { id: "snippets", label: "Snippets", icon: "⌘" }, { id: "reminders", label: "Reminders", icon: "◴" }, { id: "extensions", label: "Extensions", icon: "⌘" }, { id: "system", label: "System & audit", icon: "⚙" }];
  const upcomingReminders = useMemo(() => reminders.filter((r) => !r.firedAt).sort((a, b) => a.dueAt - b.dueAt), [reminders]);

  return <div className="productivity-hub">
    <div className="hub-header"><div><span className="hub-eyebrow">ORBIT · PRODUCTIVITY SUITE 3.1</span><h1>Control Center</h1><p>Workflows, context, personal tools and local activity in one place.</p></div><button className="hub-close" onClick={onClose}>← Back to launcher</button></div>
    <div className="hub-layout"><nav className="hub-nav" aria-label="Productivity tools">{tabs.map((item) => <button key={item.id} className={tab === item.id ? "active" : ""} onClick={() => setTab(item.id)}><span>{item.icon}</span>{item.label}</button>)}</nav>
      <div className="hub-content">
        {tab === "overview" && <>
          <div className="hub-welcome"><div><span className="hub-eyebrow">YOUR DESKTOP, ORGANIZED</span><h2>One workspace. Fewer context switches.</h2><p>Build reusable work sessions, keep important text close, automate safe actions and review local activity.</p></div><div className="hub-local-badge"><span/> LOCAL-FIRST DATA</div></div>
          <div className="hub-metrics"><button onClick={() => setTab("workspaces")}><small>WORKSPACES</small><strong>{workspaces.length}</strong><span>Saved sessions →</span></button><button onClick={() => setTab("automations")}><small>WORKFLOWS</small><strong>{workflows.length}</strong><span>Approved action chains →</span></button><button onClick={() => setTab("snippets")}><small>SNIPPETS</small><strong>{snippets.length}</strong><span>Reusable text →</span></button><button onClick={() => setTab("reminders")}><small>UPCOMING</small><strong>{upcomingReminders.length}</strong><span>Pending reminders →</span></button></div>
          <section className="hub-card hub-context-card"><div className="hub-card-title"><div><h3>Context-aware workspace</h3><p>Current foreground process context; process name only, no window title or document content.</p></div><button onClick={() => void refreshActivity()} disabled={activityBusy}>Refresh context</button></div><div className="hub-context-value"><span className="hub-app-dot"/><strong>{foreground?.success ? foreground.app : "Context unavailable"}</strong><small>{foreground?.success ? `Observed ${new Date(foreground.observedAt ?? Date.now()).toLocaleTimeString()}` : (foreground?.error ?? "Available in the Windows desktop build.")}</small></div><div className="hub-context-actions">{foreground?.success && /code|studio|idea|pycharm|terminal|powershell|cmd/i.test(foreground.app ?? "") ? <><button onClick={() => { setTab("automations"); setNotice("Developer workflow: review or create a safe project workflow."); }}>Developer workflows</button><button onClick={() => { setTab("activity"); }}>Review activity</button></> : foreground?.success && /chrome|msedge|firefox|brave/i.test(foreground.app ?? "") ? <><button onClick={() => setTab("activity")}>Review browser activity</button><button onClick={() => setTab("workspaces")}>Restore a workspace</button></> : <><button onClick={() => setTab("workspaces")}>Open workspaces</button><button onClick={() => setTab("snippets")}>Open snippets</button></>}</div></section>
          <div className="hub-two-col"><section className="hub-card"><div className="hub-card-title"><div><h3>Activity snapshot</h3><p>Foreground app names only; no window titles.</p></div><button onClick={() => { setTab("activity"); void refreshActivity(); }}>Details ↗</button></div><div className="hub-activity-total">{duration(totalTracked)} <small>tracked today</small></div>{activity?.entries.slice(0, 4).map((entry) => <div className="hub-bar-row" key={entry.app}><span>{entry.app}</span><div><i style={{ width: `${Math.max(2, entry.seconds / Math.max(1, ...((activity?.entries ?? []).map((x) => x.seconds))) * 100)}%` }}/></div><b>{duration(entry.seconds)}</b></div>)}{!activity?.entries.length && <div className="hub-empty">Activity appears after the desktop tracker observes foreground apps.</div>}</section>
          <section className="hub-card"><div className="hub-card-title"><div><h3>Quick actions</h3><p>Jump straight into a tool.</p></div></div><div className="hub-quick-grid"><button onClick={() => setTab("workspaces")}>＋ Save workspace</button><button onClick={() => setTab("automations")}>⚡ Build workflow</button><button onClick={() => setTab("snippets")}>⌘ Add snippet</button><button onClick={() => setTab("reminders")}>◴ Schedule reminder</button></div></section></div>
          <div className="hub-footnote">Orbit retains data on this Windows user profile. Native activity collection can be disabled in settings in future builds; this release records process names and approximate durations only.</div>
        </>}
        {tab === "activity" && <section className="hub-card"><div className="hub-page-title"><div><span className="hub-eyebrow">LOCAL TELEMETRY</span><h2>Desktop activity</h2><p>Combined view of foreground application process names and Chromium domain durations. Window titles and document contents are not collected.</p></div><button onClick={() => void refreshActivity()} disabled={activityBusy}>{activityBusy ? "Refreshing…" : "Refresh"}</button></div><div className="hub-activity-total">{duration(totalTracked)} <small>combined tracked time today</small></div>{activity?.error && <div className="hub-notice">{activity.error}</div>}<div className="hub-tracking-toggle"><div><strong>Native app tracking</strong><small>{activity?.enabled === false ? "Paused — no new desktop activity is being recorded." : "Enabled — process names and approximate durations only."}</small></div><button onClick={async () => { const result = await window.orbit?.setDesktopActivityEnabled?.(activity?.enabled === false); if (result?.success) { setActivity((current) => current ? { ...current, enabled: result.enabled } : current); setNotice(result.enabled ? "Native app tracking enabled." : "Native app tracking paused."); } else setNotice(result?.error ?? "Tracking preference requires the desktop app."); }}>{activity?.enabled === false ? "Enable tracking" : "Pause tracking"}</button></div><h3 className="hub-subsection-title">Windows applications</h3>{activity?.entries.length ? <div className="hub-table">{activity.entries.map((entry) => <div className="hub-table-row" key={`app-${entry.app}`}><span className="hub-app-dot"/><strong>{entry.app}</strong><div className="hub-progress"><i style={{ width: `${Math.max(1, entry.seconds / Math.max(1, ...activity.entries.map((x) => x.seconds)) * 100)}%` }}/></div><b>{duration(entry.seconds)}</b></div>)}</div> : <div className="hub-empty">No native app activity recorded yet. Keep Orbit open and use other desktop apps, then refresh.</div>}<h3 className="hub-subsection-title">Chromium websites</h3>{websiteActivity?.entries.length ? <div className="hub-table">{websiteActivity.entries.map((entry) => <div className="hub-table-row" key={`site-${entry.domain}`}><span className="hub-app-dot"/><strong>{entry.domain}</strong><div className="hub-progress"><i style={{ width: `${Math.max(1, entry.seconds / Math.max(1, ...websiteActivity.entries.map((x) => x.seconds)) * 100)}%` }}/></div><b>{duration(entry.seconds)}</b></div>)}</div> : <div className="hub-empty">No website time available. Install the optional Orbit Browser Tracker extension to collect domain-only time.</div>}<div className="hub-footnote">Sampling is approximate. App process names and browser domains stay on this device; Orbit does not collect window titles, page paths or page content.</div></section>}
        {tab === "workspaces" && <><section className="hub-card"><div className="hub-page-title"><div><span className="hub-eyebrow">SESSION RESTORE</span><h2>Workspace snapshots</h2><p>Save your project folder, selected apps and trusted HTTPS links for a repeatable setup.</p></div></div><div className="hub-form"><label>Workspace name<input value={workspaceName} onChange={(e) => setWorkspaceName(e.target.value)} placeholder="e.g. AI Engineering" maxLength={60}/></label><label>Project folder<input value={projectRoot} readOnly placeholder="Choose a project in Orbit AI first"/></label><label>Website URLs (comma or newline separated)<textarea value={workspaceUrls} onChange={(e) => setWorkspaceUrls(e.target.value)} rows={3} placeholder="https://github.com&#10;https://docs.example.com"/></label><div className="hub-field-label">Apps to launch</div><div className="hub-checks">{[{id:"notepad",label:"Notepad"},{id:"calculator",label:"Calculator"}].map((app) => <label key={app.id}><input type="checkbox" checked={workspaceApps.includes(app.id)} onChange={(e) => setWorkspaceApps((current) => e.target.checked ? [...current, app.id] : current.filter((id) => id !== app.id))}/>{app.label}</label>)}</div><button className="hub-primary" onClick={saveWorkspace}>Save workspace snapshot</button></div></section><section className="hub-card"><div className="hub-card-title"><div><h3>Saved workspaces</h3><p>{workspaces.length} stored locally</p></div></div>{workspaces.length ? workspaces.map((item) => <div className="hub-list-item" key={item.id}><div className="hub-list-main"><strong>{item.name}</strong><small>{item.projectPath || "No project folder"} · {item.apps.length} app(s) · {item.urls.length} link(s)</small><small>Saved {new Date(item.createdAt).toLocaleString()}</small></div><button onClick={() => void restoreWorkspace(item)}>Restore</button><button className="hub-danger" onClick={() => { const next = workspaces.filter((x) => x.id !== item.id); setWorkspaces(next); persist(keys.workspaces, next); }}>Delete</button></div>) : <div className="hub-empty">No workspace snapshots yet.</div>}</section></>}
        {tab === "automations" && <><section className="hub-card"><div className="hub-page-title"><div><span className="hub-eyebrow">SAFE AUTOMATION</span><h2>Workflow builder</h2><p>Compose simple action chains. Orbit asks for confirmation before each run and records the outcome.</p></div></div><div className="hub-form"><label>Workflow name<input value={workflowName} onChange={(e) => setWorkflowName(e.target.value)} placeholder="e.g. Start coding session" maxLength={60}/></label><div className="hub-step-editor"><label>Step type<select value={stepType} onChange={(e) => setStepType(e.target.value as WorkflowStep["type"])}><option value="url">Open HTTPS URL</option><option value="app">Launch allowed app</option><option value="copy">Copy text</option></select></label><label>Value<input value={stepValue} onChange={(e) => setStepValue(e.target.value)} placeholder={stepType === "url" ? "https://github.com" : stepType === "app" ? "notepad or calculator" : "Text to copy"}/></label><button onClick={addWorkflowStep}>＋ Add step</button></div>{draftSteps.length > 0 && <div className="hub-steps-list">{draftSteps.map((step, i) => <div key={step.id}><span>{String(i + 1).padStart(2, "0")}</span><strong>{step.type === "url" ? "Open URL" : step.type === "app" ? "Launch app" : "Copy text"}</strong><code>{step.value}</code><button className="hub-danger" onClick={() => setDraftSteps((all) => all.filter((x) => x.id !== step.id))}>Remove</button></div>)}</div>}<button className="hub-primary" onClick={saveWorkflow}>Save workflow</button></div></section><section className="hub-card"><div className="hub-card-title"><div><h3>Saved workflows</h3><p>{workflows.length} reusable action chain(s)</p></div></div>{workflows.length ? workflows.map((item) => <div className="hub-list-item" key={item.id}><div className="hub-list-main"><strong>{item.name}</strong><small>{item.steps.length} step(s) · {item.steps.map((s) => s.type).join(" → ")}</small></div><button onClick={() => void runWorkflow(item)}>Review & run</button><button className="hub-danger" onClick={() => { const next = workflows.filter((x) => x.id !== item.id); setWorkflows(next); persist(keys.workflows, next); }}>Delete</button></div>) : <div className="hub-empty">Create a workflow above. Arbitrary shell commands are intentionally not supported.</div>}</section></>}
        {tab === "snippets" && <><section className="hub-card"><div className="hub-page-title"><div><span className="hub-eyebrow">TEXT PRODUCTIVITY</span><h2>Snippets library</h2><p>Store reusable responses, prompts, code fragments and templates. Copy with one click.</p></div></div><div className="hub-form"><label>Snippet name<input value={snippetTitle} onChange={(e) => setSnippetTitle(e.target.value)} placeholder="e.g. Professional introduction" maxLength={80}/></label><label>Optional shortcut label<input value={snippetShortcut} onChange={(e) => setSnippetShortcut(e.target.value)} placeholder="e.g. /intro" maxLength={30}/></label><label>Content<textarea value={snippetBody} onChange={(e) => setSnippetBody(e.target.value)} rows={4} maxLength={12000} placeholder="Reusable text…"/></label><button className="hub-primary" onClick={saveSnippet}>Save snippet</button></div></section><section className="hub-card"><div className="hub-card-title"><div><h3>Saved snippets</h3><p>{snippets.length} stored locally</p></div></div>{snippets.length ? snippets.map((item) => <div className="hub-snippet" key={item.id}><div className="hub-list-main"><strong>{item.title} {item.shortcut && <code>{item.shortcut}</code>}</strong><p>{item.body}</p><small>Updated {new Date(item.updatedAt).toLocaleString()}</small></div><button onClick={async () => { const result = await window.orbit?.copyText(item.body); setNotice(result?.success ? `Copied “${item.title}” to clipboard.` : "Clipboard copy requires the Orbit desktop app."); }}>Copy</button><button className="hub-danger" onClick={() => { const next = snippets.filter((x) => x.id !== item.id); setSnippets(next); persist(keys.snippets, next); }}>Delete</button></div>) : <div className="hub-empty">No snippets yet. Save a reusable piece of text above.</div>}</section></>}
        {tab === "reminders" && <><section className="hub-card"><div className="hub-page-title"><div><span className="hub-eyebrow">TIME & FOLLOW-THROUGH</span><h2>Reminders</h2><p>Schedule one-time reminders. Orbit must be running at the due time for notification delivery.</p></div></div><div className="hub-form hub-reminder-form"><label>Reminder<input value={reminderTitle} onChange={(e) => setReminderTitle(e.target.value)} placeholder="e.g. Submit assignment" maxLength={160}/></label><label>Date & time<input type="datetime-local" value={reminderDate} min={new Date(Date.now() + 60000).toISOString().slice(0,16)} onChange={(e) => setReminderDate(e.target.value)}/></label><button className="hub-primary" onClick={() => void addReminder()}>Schedule reminder</button></div></section><section className="hub-card"><div className="hub-card-title"><div><h3>Upcoming</h3><p>{upcomingReminders.length} pending reminder(s)</p></div></div>{reminders.length ? [...reminders].sort((a,b) => a.dueAt-b.dueAt).map((item) => <div className="hub-list-item" key={item.id}><div className="hub-list-main"><strong>{item.title}</strong><small>{new Date(item.dueAt).toLocaleString()} · {item.firedAt ? "Notified" : item.dueAt <= Date.now() ? "Due" : "Scheduled"}</small></div>{item.firedAt && <span className="hub-status">Done</span>}<button className="hub-danger" onClick={() => { const next = reminders.filter((x) => x.id !== item.id); setReminders(next); persist(keys.reminders, next); }}>Delete</button></div>) : <div className="hub-empty">No reminders scheduled.</div>}</section></>}
        {tab === "extensions" && <><section className="hub-card"><div className="hub-page-title"><div><span className="hub-eyebrow">DECLARATIVE EXTENSIONS</span><h2>Extension manager</h2><p>Import JSON command packs. Orbit never executes JavaScript from an extension; every command is restricted to HTTPS navigation, Notepad/Calculator or copying text, and each run requires confirmation.</p></div></div><div className="hub-extension-import"><label>Import an Orbit extension manifest (.json)<input type="file" accept="application/json,.json" onChange={(event) => { const file = event.currentTarget.files?.[0]; void importExtension(file); event.currentTarget.value = ""; }}/></label><button onClick={() => { const example = { id: "example.productivity", name: "Productivity Example", version: "1.0.0", description: "Example safe command pack", commands: [{ id: "open.github", name: "Open GitHub", description: "Open the GitHub website", action: { type: "url", value: "https://github.com" } }, { id: "copy.greeting", name: "Copy greeting", description: "Copy a sample greeting", action: { type: "copy", value: "Hello from Orbit" } }] }; const url = URL.createObjectURL(new Blob([JSON.stringify(example, null, 2)], { type: "application/json" })); const a = document.createElement("a"); a.href = url; a.download = "orbit-extension-example.json"; a.click(); URL.revokeObjectURL(url); setNotice("Example extension manifest downloaded."); }}>Download example manifest</button></div></section><section className="hub-card"><div className="hub-card-title"><div><h3>Installed command packs</h3><p>{extensions.length} local extension(s) · maximum 50 commands per pack</p></div></div>{extensions.length ? extensions.map((pack) => <div className="hub-extension-pack" key={pack.id}><div className="hub-list-main"><strong>{pack.name} <code>{pack.version}</code></strong><small>{pack.id} · imported {new Date(pack.importedAt).toLocaleString()}</small><p>{pack.description}</p></div><div className="hub-extension-commands">{pack.commands.map((command) => <div className="hub-extension-command" key={command.id}><div><strong>{command.name}</strong><small>{command.description} · {command.action.type}</small></div><button onClick={() => void runExtensionCommand(pack, command)}>Review & run</button></div>)}</div><button className="hub-danger" onClick={() => { const next = extensions.filter((item) => item.id !== pack.id); setExtensions(next); persist(keys.extensions, next); setNotice(`Removed extension “${pack.name}”.`); }}>Remove pack</button></div>) : <div className="hub-empty">No extensions installed. Download the example manifest, inspect its JSON, and import it to test the extension runtime.</div>}</section></>}
        {tab === "system" && <><section className="hub-card"><div className="hub-page-title"><div><span className="hub-eyebrow">OPERATIONS & SECURITY</span><h2>System health & data controls</h2><p>Inspect the current runtime and export or remove this hub’s local data.</p></div></div><div className="hub-system-grid"><div><small>APP VERSION</small><strong>{window.orbit?.version ?? "Browser preview"}</strong></div><div><small>PLATFORM</small><strong>{window.orbit?.platform ?? "Web preview"}</strong></div><div><small>LOCAL STORAGE</small><strong>{extensions.length + snippets.length + reminders.length + workspaces.length + workflows.length} items</strong></div><div><small>ACTIVITY TRACKING</small><strong>{activity?.success ? "Available" : "Unavailable / preview"}</strong></div><div><small>AI PROVIDER</small><strong>Configure in Orbit Settings</strong></div><div><small>UPDATE CHANNEL</small><strong>Optional · not configured by default</strong></div></div><div className="hub-actions"><button onClick={runDiagnostics} disabled={diagnosticsBusy}>{diagnosticsBusy ? "Running diagnostics…" : "Run local diagnostics"}</button><button onClick={exportData}>Export hub data (JSON)</button><button onClick={async () => { const result = await window.orbit?.checkForUpdates?.(); setNotice(result?.message ?? result?.error ?? "Update checks are available only in a packaged desktop build."); }}>Check for updates</button><button onClick={() => { const docs = `# Orbit Extension SDK (v1)\n\nAn extension is a declarative command pack. Keep handlers explicit and avoid arbitrary shell execution.\n\n\`\`\`ts\nexport type OrbitCommand = {\n  id: string;\n  name: string;\n  aliases: string[];\n  category: string;\n  description: string;\n  keywords?: string[];\n};\n\nexport type OrbitCommandPack = {\n  id: string;\n  name: string;\n  version: string;\n  description: string;\n  commands: OrbitCommand[];\n};\n\`\`\`\n\nRuntime support: import JSON manifests in Hub → Extensions. Only declarative HTTPS, Notepad/Calculator, and copy-text actions are accepted; every run requires explicit confirmation. Executable JavaScript extensions are not supported.\n`; const url = URL.createObjectURL(new Blob([docs], { type: "text/markdown" })); const a = document.createElement("a"); a.href = url; a.download = "ORBIT-EXTENSION-SDK.md"; a.click(); URL.revokeObjectURL(url); }}>Export extension SDK guide</button><button className="hub-danger" onClick={() => { if (!window.confirm("Delete all snippets, reminders, workspace snapshots, workflows and audit history stored by this hub? This cannot be undone.")) return; Object.values(keys).forEach((key) => localStorage.removeItem(key)); setExtensions([]); setSnippets([]); setReminders([]); setWorkspaces([]); setWorkflows([]); setAudit([]); setNotice("Hub data cleared."); }}>Delete all hub data</button></div>{diagnostics.length > 0 && <div className="hub-diagnostics">{diagnostics.map((line, index) => <div key={index}>{line}</div>)}</div>}</section><section className="hub-card"><div className="hub-card-title"><div><h3>Workflow execution audit</h3><p>Last 100 runs · actual step outcomes</p></div></div>{audit.length ? audit.map((entry) => <div className="hub-audit-item" key={entry.id}><div><strong>{entry.workflow}</strong><small>{new Date(entry.at).toLocaleString()}</small></div><span className={`hub-audit-status ${entry.status}`}>{entry.status.toUpperCase()}</span><pre>{entry.details}</pre></div>) : <div className="hub-empty">Workflow runs will be recorded here.</div>}</section><section className="hub-card"><div className="hub-card-title"><div><h3>Release readiness</h3><p>Build and packaging checks for maintainers</p></div></div><div className="hub-release-check"><span>✓</span><div><strong>TypeScript + Vite build</strong><small>Run <code>npm run build</code> locally to verify this checkout.</small></div></div><div className="hub-release-check"><span>!</span><div><strong>Windows installer / auto-update</strong><small>Packaging configuration is provided, but a signed release and update feed must be configured before automatic updates can work. See README.</small></div></div><div className="hub-release-check"><span>✓</span><div><strong>Bounded actions</strong><small>Workflow actions are restricted to HTTPS links, Notepad, Calculator and clipboard text.</small></div></div></section></>}
        {notice && <div className="hub-notice" role="status">{notice}<button onClick={() => setNotice("")}>Dismiss</button></div>}
      </div>
    </div>
  </div>;
}
