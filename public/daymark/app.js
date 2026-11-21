import {
  EXPORT_VERSION,
  MAX_DAYS,
  PRESETS,
  STORAGE_KEY,
  THEME_KEY,
  UNDO_KEY,
  addDays,
  allTimeCount,
  averageProgress,
  calendarEnd,
  checkedCount,
  completionPlacement,
  continuesActive,
  countActive,
  dateObj,
  extendGoal,
  goalLeft,
  iso,
  isCompleted,
  isFinalStreakDay,
  longest,
  markDay,
  moveHabit,
  normalizeTask,
  orderedTasks,
  parseBackup,
  pauseHabit,
  readStoredTasks,
  readUndo,
  resumeHabit,
  restoreSnapshot,
  safeColor,
  snapshotTask,
  startStreak,
  streak,
  tasksDueOn,
  tasksPendingOn,
  todayISO,
  unmarkDay,
  validLength,
} from "./logic.js";

const $ = (s) => document.querySelector(s);
const THEME_COLORS = { dark: "#101114", light: "#f4f5ef", violet: "#101114", ocean: "#101114" };
const PIN_SVG = '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path fill="currentColor" d="M8 3h8v2l-1 5 3 2v2h-5v7l-1 1-1-1v-7H6v-2l3-2V5H8V3z"/></svg>';

const loaded = readStoredTasks(localStorage);
let tasks = loaded.tasks.map((t) => normalizeTask(t));
let undoAction = readUndo(localStorage);
let editing = null;
let archiveOpen = false;
let noteTaskId = null;
let focusTaskId = null;
let pendingStreak = { taskId: null, date: null };
let pendingHistory = { taskId: null, date: null };
let completedStreakTaskId = null;
let popDate = null;
const monthOffsets = {};
const recoveredCorrupt = loaded.recoveredCorrupt;

const stored = localStorage.getItem(STORAGE_KEY);
const normalized = JSON.stringify(tasks);
if (stored !== normalized) localStorage.setItem(STORAGE_KEY, normalized);

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  render();
}

function persistUndo() {
  localStorage.setItem(UNDO_KEY, JSON.stringify(undoAction));
}

function setUndo(snapshots, label) {
  if (!snapshots.length) return;
  undoAction = { v: 2, snapshots, label, at: Date.now() };
  persistUndo();
}

function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => {
    if (c === "&") return "&" + "amp;";
    if (c === "<") return "&" + "lt;";
    if (c === ">") return "&" + "gt;";
    if (c === '"') return "&" + "quot;";
    return "&" + "#39;";
  });
}

function toast(message) {
  let el = $("#toast");
  if (!el) {
    el = document.createElement("div");
    el.id = "toast";
    el.style.cssText = "position:fixed;left:50%;bottom:calc(22px + env(safe-area-inset-bottom));transform:translateX(-50%);background:var(--text);color:var(--bg);padding:10px 15px;border-radius:12px;font-size:12px;font-weight:700;z-index:10000;box-shadow:0 8px 30px #0005;max-width:calc(100% - 36px);text-align:center";
    document.body.appendChild(el);
  }
  el.textContent = message;
  el.style.display = "block";
  clearTimeout(window.__daymarkToast);
  window.__daymarkToast = setTimeout(() => { el.style.display = "none"; }, 2200);
}

function applyTheme(name) {
  const theme = THEME_COLORS[name] ? name : "dark";
  document.documentElement.dataset.theme = theme;
  const color = THEME_COLORS[theme];
  document.querySelectorAll('meta[name="theme-color"]').forEach((meta) => { meta.content = color; });
  localStorage.setItem(THEME_KEY, theme);
}

function setLength(hiddenId, presetClass, days) {
  const hidden = $(hiddenId);
  if (hidden) hidden.value = days || "";
  document.querySelectorAll(presetClass).forEach((b) => b.classList.toggle("selected", Number(b.dataset.days) === Number(days)));
}

function chosenLength(customId, hiddenId) {
  const customRaw = ($(customId)?.value || "").trim();
  if (customRaw !== "") {
    const n = Number(customRaw);
    return { days: n, custom: true, raw: customRaw };
  }
  return { days: Number($(hiddenId)?.value), custom: false, raw: "" };
}

function rejectLength(choice) {
  if (!validLength(choice.days)) {
    toast(`Enter a whole number between 1 and ${MAX_DAYS}.`);
    return true;
  }
  return false;
}

function heatmap(t) {
  const year = new Date().getFullYear();
  const jan1 = new Date(year, 0, 1);
  const lead = (jan1.getDay() + 6) % 7;
  const total = Math.round((new Date(year, 11, 31) - jan1) / 86400000) + 1;
  const all = new Set([...(t.history || []).flatMap((h) => h.done || []), ...(t.done || [])]);
  let cells = "";
  for (let i = 0; i < lead; i++) cells += '<div class="heatcell"></div>';
  for (let i = 0; i < total; i++) {
    const d = iso(new Date(year, 0, i + 1));
    cells += `<div class="heatcell ${all.has(d) ? "active" : ""}" title="${d}"></div>`;
  }
  const count = [...all].filter((d) => d.startsWith(String(year))).length;
  return `<div class="heatwrap"><div class="heatlabel"><b>${year} consistency heatmap</b> · ${count} completed days</div><div class="heat">${cells}</div></div>`;
}

function ensureOption(select, value) {
  if (!select || !value) return;
  if (![...select.options].some((o) => o.value === value)) {
    const opt = document.createElement("option");
    opt.value = value;
    opt.textContent = value;
    select.appendChild(opt);
  }
  select.value = value;
}

function taskCard(t, index, ordered, isArchived) {
  t.done = t.done || [];
  t.notes = t.notes || {};
  const today = todayISO();
  const hasPlan = !!(t.start && Number(t.days) > 0);
  const end = hasPlan ? calendarEnd(t) : "";
  const count = hasPlan ? checkedCount(t) : 0;
  const pct = hasPlan ? Math.min(100, Math.round((count / t.days) * 100)) : 0;
  const current = hasPlan ? streak(t, today) : 0;
  const best = longest(t);
  const left = hasPlan ? goalLeft(t) : 0;
  const off = monthOffsets[t.id] || 0;
  const base = hasPlan ? dateObj(t.start) : dateObj(today);
  const view = new Date(base.getFullYear(), base.getMonth() + off, 1);
  const y = view.getFullYear();
  const m = view.getMonth();
  const lead = (new Date(y, m, 1).getDay() + 6) % 7;
  const total = new Date(y, m + 1, 0).getDate();
  const accent = safeColor(t.color) || "var(--accent)";
  let cells = "";
  for (let i = 0; i < lead; i++) cells += '<div class="day blank"></div>';
  for (let n = 1; n <= total; n++) {
    const d = iso(new Date(y, m, n));
    const done = isCompleted(t, d);
    const future = d > today;
    const disabled = future || t.paused || t.archived ? "disabled" : "";
    const pop = popDate === `${t.id}:${d}` ? "pop" : "";
    cells += `<button type="button" class="day ${done ? "done" : ""} ${d === today ? "today" : ""} ${pop}" data-task="${t.id}" data-date="${d}" ${disabled} aria-label="${d}${done ? ", completed" : ""}">${done ? "✓" : n}</button>`;
  }
  const previous = ordered[index - 1];
  const next = ordered[index + 1];
  const pinned = !!t.pinned;
  const noteText = t.notes[today] || "";
  const checks = allTimeCount(t);
  const earned = [];
  if (count >= 7) earned.push("7 check-ins");
  if (count >= 30) earned.push("30 check-ins");
  if (best >= 7) earned.push("7-day streak");
  if (best >= 30) earned.push("30-day streak");
  if (hasPlan && pct === 100) earned.push("Goal achieved");
  const upDisabled = !previous || !!previous.pinned !== pinned ? "disabled" : "";
  const downDisabled = !next || !!next.pinned !== pinned ? "disabled" : "";
  const tools = isArchived
    ? ""
    : `<button type="button" class="iconbtn" data-move="${t.id}" data-direction="up" title="Move up" aria-label="Move up" ${upDisabled}>↑</button><button type="button" class="iconbtn" data-move="${t.id}" data-direction="down" title="Move down" aria-label="Move down" ${downDisabled}>↓</button><button type="button" class="iconbtn" data-pin="${t.id}" title="${pinned ? "Unpin" : "Pin"}" aria-label="${pinned ? "Unpin habit" : "Pin habit"}">${PIN_SVG}</button>`;
  const life = isArchived
    ? `<button type="button" class="ghost" data-restore="${t.id}">Restore habit</button>`
    : `<button type="button" class="ghost" data-pause="${t.id}">${t.paused ? "▶ Resume" : "Ⅱ Pause"}</button><button type="button" class="ghost" data-archive="${t.id}">Archive</button>`;
  const hint = t.paused
    ? "Paused. Those days are skipped, the deadline moves forward, and the streak stays intact."
    : isArchived
      ? "Archived history is preserved. Restore the habit to change it."
      : "The next day of this streak checks off directly. Any other past date starts a new streak. Future dates stay locked.";
  return `<article class="task ${pinned ? "pinned" : ""} ${t.paused ? "paused" : ""} ${t.archived ? "archived" : ""}" data-card="${t.id}" style="--task-accent:${accent}">
    <div class="tasktop"><div><div class="taskname">${esc(t.name)}${pinned ? '<span class="pinmark">PINNED</span>' : ""}${t.paused ? '<span class="taskbadge">PAUSED</span>' : ""}${t.archived ? '<span class="taskbadge">ARCHIVED</span>' : ""}</div>
      <div class="taskmeta">${hasPlan ? `${t.days} day goal · ${t.start} → ${end}` : "No streak started yet"}</div>
      <span class="taskbadge">${esc(t.category || "Other")}</span>${earned.map((x) => `<span class="achievement">${esc(x)}</span>`).join("")}${(t.history || []).length ? `<span class="taskbadge">${t.history.length} previous streak${t.history.length === 1 ? "" : "s"} saved</span>` : ""}</div>
      <div class="taskactions"><div class="tasktools">${tools}</div><button type="button" class="iconbtn" data-edit="${t.id}" aria-label="Edit task">✎</button><button type="button" class="iconbtn" data-delete="${t.id}" aria-label="Delete task">×</button></div></div>
    <div class="stats"><div class="stat"><b>${checks}</b><span>All-time check-ins</span></div><div class="stat"><b>${current}</b><span>Current streak</span></div><div class="stat"><b>${best}</b><span>Longest streak</span></div></div>
    <div class="stats" style="margin-top:-8px"><div class="stat" style="grid-column:span 2"><b>${!hasPlan ? "Not started" : left === 0 ? "Goal achieved" : `${left} days`}</b><span>${!hasPlan ? "Choose a calendar date" : left === 0 ? "Challenge completed" : "Days remaining"}</span></div><div class="stat"><b>${pct}%</b><span>Complete</span></div></div>
    <div class="progresshead"><span>Goal progress</span><b>${pct}%</b></div>
    <div class="bar"><i style="width:${pct}%;background:${accent}"></i></div>
    <div class="calhead"><strong>${view.toLocaleString(undefined, { month: "long", year: "numeric" })}</strong><div class="monthnav"><button type="button" class="ghost" data-month="${t.id}" data-step="-1" aria-label="Previous month">‹</button><button type="button" class="ghost" data-month="${t.id}" data-step="1" aria-label="Next month">›</button></div></div>
    <div class="week"><span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span><span>S</span></div>
    <div class="days">${cells}</div>
    <div class="legend"><span><i class="dot" style="background:${accent}"></i>Completed</span><span><i class="dot pending"></i>Not completed</span></div>
    ${heatmap(t)}
    <div class="v9actions">${life}<button type="button" class="ghost" data-focus="${t.id}">Focus</button><button type="button" class="ghost" data-note="${t.id}">Daily note</button></div>
    ${noteText ? `<div class="note-preview">Today: ${esc(noteText)}</div>` : ""}
    <div class="note">${hint}</div>
  </article>`;
}

function undoIsValid() {
  if (!undoAction) return false;
  const ids = undoAction.snapshots ? undoAction.snapshots.map((s) => s.taskId) : (undoAction.changes || []).map((c) => c.taskId);
  return ids.some((id) => tasks.some((t) => t.id === id));
}

function renderDashboard() {
  const today = todayISO();
  const due = tasksDueOn(tasks, today);
  const completed = due.filter((t) => (t.done || []).includes(today)).length;
  const pct = due.length ? Math.round((completed / due.length) * 100) : 0;
  $("#todayLabel").textContent = new Date().toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });
  $("#todayRing").style.setProperty("--progress", `${pct * 3.6}deg`);
  $("#todayPct").textContent = `${pct}%`;
  $("#todayCount").textContent = `${completed}/${due.length}`;
  const visible = tasks.filter((t) => !t.archived);
  $("#statChecks").textContent = String(visible.reduce((n, t) => n + allTimeCount(t), 0));
  $("#statActive").textContent = String(countActive(tasks));
  $("#statRate").textContent = `${averageProgress(tasks)}%`;
  const now = dateObj(today);
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  $("#weekRange").textContent = `${monday.toLocaleDateString(undefined, { month: "short", day: "numeric" })} – ${sunday.toLocaleDateString(undefined, { month: "short", day: "numeric" })}`;
  const labels = ["M", "T", "W", "T", "F", "S", "S"];
  let total = 0;
  let strip = "";
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const key = iso(d);
    const dayDue = tasksDueOn(tasks, key);
    const done = dayDue.filter((t) => (t.done || []).includes(key)).length;
    total += done;
    const ratio = dayDue.length ? Math.round((done / dayDue.length) * 100) : 0;
    strip += `<div class="weekday ${key === today ? "today" : ""}" title="${key}: ${done}/${dayDue.length} habits"><div class="wd">${labels[i]}</div><div class="wdnum">${d.getDate()}</div><div class="dashmuted">${done}/${dayDue.length}</div><div class="wdbar"><i style="width:${ratio}%"></i></div></div>`;
  }
  $("#weekStrip").innerHTML = strip;
  $("#weekTotal").textContent = `${total} check-in${total === 1 ? "" : "s"}`;
  const pending = tasksPendingOn(tasks, today);
  const active = tasks.filter((t) => !t.archived);
  $("#bulkBar").style.display = active.length ? "flex" : "none";
  $("#bulkInfo").textContent = pending.length
    ? `${pending.length} task${pending.length === 1 ? "" : "s"} still need today's check-off`
    : due.length
      ? "All habits due today are marked"
      : "No habit is due today yet";
  $("#bulkComplete").disabled = !pending.length;
  if (!undoIsValid()) undoAction = null;
  $("#undoBtn").disabled = !undoAction;
  $("#undoHint").textContent = undoAction ? `Latest action: ${undoAction.label}` : "No recent check-off to undo";
}

function visibleOrdered() {
  const search = ($("#habitSearch")?.value || "").trim().toLowerCase();
  const category = $("#categoryFilter")?.value || "all";
  return orderedTasks(tasks).filter((t) => (!search || t.name.toLowerCase().includes(search)) && (category === "all" || (t.category || "Other") === category));
}

function render() {
  if (!$("#taskList")) return;
  renderDashboard();
  const ordered = visibleOrdered();
  const active = tasks.filter((t) => !t.archived);
  $("#taskList").innerHTML = ordered.length
    ? ordered.map((t, i) => taskCard(t, i, ordered, false)).join("")
    : `<div class="empty"><b>${active.length ? "No matching habits." : "Your first streak starts here."}</b>${active.length ? "Try another search or category." : "Create a task, then tap a date to choose how long this streak runs."}</div>`;
  const archived = tasks.filter((t) => t.archived);
  $("#archiveCount").textContent = String(archived.length);
  $("#archiveHead").hidden = !archiveOpen;
  $("#archiveList").hidden = !archiveOpen;
  if (archiveOpen) {
    $("#archiveList").innerHTML = archived.length
      ? archived.map((t, i) => taskCard(t, i, archived, true)).join("")
      : '<div class="empty">No archived habits yet.</div>';
  }
  document.body.classList.toggle("focus-mode", !!focusTaskId);
  document.querySelectorAll(".task").forEach((el) => el.classList.toggle("focused", el.dataset.card === focusTaskId));
}

function openDialog(t) {
  editing = t?.id || null;
  $("#dialogTitle").textContent = t ? "Edit habit" : "Create a habit";
  $("#taskName").value = t?.name || "";
  const color = safeColor(t?.color);
  if (color) ensureOption($("#taskColor"), color);
  else $("#taskColor").value = "";
  $("#taskDialog").showModal();
}

function openStreakDialog(taskId, date) {
  pendingStreak = { taskId, date };
  $("#streakPromptDate").textContent = `Starting date: ${dateObj(date).toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}`;
  const t = tasks.find((x) => x.id === taskId);
  const initial = t?.days > 0 ? Number(t.days) : 30;
  $("#streakCustomLength").value = "";
  if (PRESETS.includes(initial)) setLength("#streakLength", ".streak-preset", initial);
  else {
    $("#streakCustomLength").value = String(initial);
    setLength("#streakLength", ".streak-preset", initial);
  }
  $("#streakDialog").showModal();
}

function openHistoryDialog(taskId, date) {
  pendingHistory = { taskId, date };
  $("#historyCopy").textContent = `${dateObj(date).toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" })} is saved on a previous streak. Uncheck it, or start a new streak from this date.`;
  $("#historyDialog").showModal();
}

function celebrate(t) {
  completedStreakTaskId = t.id;
  $("#streakCompleteTitle").textContent = "You did it!";
  $("#streakCompleteMessage").textContent = `You completed ${t.days} days of “${t.name}”. Add more days to this same streak, or stop here.`;
  $("#celebrationExtendPanel").hidden = true;
  $("#celebrationChoices").hidden = false;
  const initial = PRESETS.includes(Number(t.days)) ? Number(t.days) : 30;
  $("#extendCustom").value = PRESETS.includes(Number(t.days)) ? "" : String(t.days);
  setLength("#extendLength", ".extend-preset", initial);
  $("#streakCompleteDialog").showModal();
}

function afterMark(t, date) {
  popDate = `${t.id}:${date}`;
  save();
  toast("Day checked off!");
  if (isFinalStreakDay(t, date)) celebrate(t);
  setTimeout(() => { popDate = null; }, 400);
}

function findTask(id) {
  return tasks.find((t) => t.id === id) || null;
}

function onClick(event) {
  const button = event.target.closest("button");
  if (!button || button.disabled) return;
  if (button.id === "addBtn") return openDialog();
  if (button.id === "cancelBtn") return $("#taskDialog").close();
  if (button.id === "undoBtn") return undoLast();
  if (button.id === "exportBtn") return exportBackup();
  if (button.id === "importBtn") return $("#importFile").click();
  if (button.id === "archiveToggle") {
    archiveOpen = !archiveOpen;
    return render();
  }
  if (button.id === "exitFocus") {
    focusTaskId = null;
    return render();
  }
  if (button.id === "streakCancel") {
    pendingStreak = { taskId: null, date: null };
    return $("#streakDialog").close();
  }
  if (button.classList.contains("streak-preset")) {
    $("#streakCustomLength").value = "";
    return setLength("#streakLength", ".streak-preset", Number(button.dataset.days));
  }
  if (button.classList.contains("extend-preset")) {
    $("#extendCustom").value = "";
    return setLength("#extendLength", ".extend-preset", Number(button.dataset.days));
  }
  if (button.id === "celebrationDone") {
    completedStreakTaskId = null;
    return $("#streakCompleteDialog").close();
  }
  if (button.id === "celebrationExtend") {
    $("#celebrationChoices").hidden = true;
    $("#celebrationExtendPanel").hidden = false;
    return;
  }
  if (button.id === "extendBack") {
    $("#celebrationExtendPanel").hidden = true;
    $("#celebrationChoices").hidden = false;
    return;
  }
  if (button.id === "extendConfirm") return confirmExtend();
  if (button.id === "historyClose") return $("#historyDialog").close();
  if (button.id === "historyUncheck") return uncheckPendingHistory();
  if (button.id === "historyContinue") {
    const { taskId, date } = pendingHistory;
    $("#historyDialog").close();
    if (taskId && date) openStreakDialog(taskId, date);
    return;
  }
  if (button.id === "noteCancel") return $("#noteDialog").close();
  if (button.id === "bulkComplete") return markAllToday();

  if (button.dataset.pin) {
    const t = findTask(button.dataset.pin);
    if (!t) return;
    t.pinned = !t.pinned;
    return save();
  }
  if (button.dataset.move) {
    tasks = moveHabit(tasks, visibleOrdered().map((t) => t.id), button.dataset.move, button.dataset.direction);
    return save();
  }
  if (button.dataset.month) {
    monthOffsets[button.dataset.month] = (monthOffsets[button.dataset.month] || 0) + Number(button.dataset.step);
    return render();
  }
  if (button.dataset.edit) return openDialog(findTask(button.dataset.edit));
  if (button.dataset.delete) {
    const t = findTask(button.dataset.delete);
    if (t && confirm(`Delete “${t.name}” and its progress?`)) {
      tasks = tasks.filter((x) => x.id !== t.id);
      if (focusTaskId === t.id) focusTaskId = null;
      save();
    }
    return;
  }
  if (button.dataset.pause) {
    const t = findTask(button.dataset.pause);
    if (!t) return;
    if (!t.paused) pauseHabit(t, todayISO());
    else resumeHabit(t, todayISO());
    return save();
  }
  if (button.dataset.archive) {
    const t = findTask(button.dataset.archive);
    if (!t) return;
    t.archived = true;
    t.pinned = false;
    archiveOpen = true;
    if (focusTaskId === t.id) focusTaskId = null;
    return save();
  }
  if (button.dataset.restore) {
    const t = findTask(button.dataset.restore);
    if (!t) return;
    t.archived = false;
    return save();
  }
  if (button.dataset.focus) {
    focusTaskId = button.dataset.focus;
    render();
    window.scrollTo({ top: 0, behavior: "smooth" });
    return;
  }
  if (button.dataset.note) return openNote(findTask(button.dataset.note));
  if (button.dataset.date) return toggleDate(button.dataset.task, button.dataset.date);
}

function toggleDate(taskId, date) {
  const t = findTask(taskId);
  if (!t || t.paused || t.archived || date > todayISO()) return;
  const place = completionPlacement(t, date);
  if (place === "active") {
    const snap = snapshotTask(t);
    unmarkDay(t, date);
    setUndo([snap], "Unmark day");
    save();
    toast("Check-off removed.");
    return;
  }
  if (place === "history") return openHistoryDialog(t.id, date);
  if (continuesActive(t, date)) {
    const snap = snapshotTask(t);
    markDay(t, date);
    setUndo([snap], "Mark day");
    return afterMark(t, date);
  }
  openStreakDialog(t.id, date);
}

function uncheckPendingHistory() {
  const t = findTask(pendingHistory.taskId);
  const date = pendingHistory.date;
  $("#historyDialog").close();
  if (!t || !date) return;
  const snap = snapshotTask(t);
  unmarkDay(t, date);
  setUndo([snap], "Unmark day");
  save();
  toast("Check-off removed.");
}

function markAllToday() {
  const date = todayISO();
  const pending = tasksPendingOn(tasks, date);
  if (!pending.length) return;
  const snaps = pending.map(snapshotTask);
  pending.forEach((t) => markDay(t, date));
  setUndo(snaps, "Mark all today");
  save();
  toast(`Marked today complete for ${pending.length} task${pending.length === 1 ? "" : "s"}.`);
  const finished = pending.find((t) => isFinalStreakDay(t, date));
  if (finished) celebrate(finished);
}

function undoLast() {
  if (!undoIsValid()) return;
  let restored = 0;
  if (undoAction.snapshots) {
    for (const snap of undoAction.snapshots) if (restoreSnapshot(tasks, snap)) restored += 1;
  } else {
    for (const change of undoAction.changes || []) {
      const t = findTask(change.taskId);
      if (!t) continue;
      const exists = (t.done || []).includes(change.date);
      if (change.wasDone && !exists) { markDay(t, change.date); restored += 1; }
      else if (!change.wasDone && exists) { unmarkDay(t, change.date); restored += 1; }
    }
  }
  const label = undoAction.label;
  undoAction = null;
  persistUndo();
  save();
  if (restored) toast(`Undid ${label || "the last check-off"}.`);
}

function confirmExtend() {
  const t = findTask(completedStreakTaskId);
  const choice = chosenLength("#extendCustom", "#extendLength");
  if (!t) return $("#streakCompleteDialog").close();
  if (rejectLength(choice)) return;
  if (!extendGoal(t, choice.days)) {
    toast(`A streak can run up to ${MAX_DAYS} days.`);
    return;
  }
  const added = choice.days;
  completedStreakTaskId = null;
  $("#streakCompleteDialog").close();
  save();
  toast(`Streak extended by ${added} days.`);
}

function openNote(t) {
  if (!t) return;
  noteTaskId = t.id;
  $("#noteDate").value = todayISO();
  $("#noteText").value = (t.notes || {})[todayISO()] || "";
  $("#noteDialog").showModal();
}

function exportBackup() {
  const payload = { app: "daymark", version: EXPORT_VERSION, exportedAt: new Date().toISOString(), tasks };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `daymark-backup-${todayISO()}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast("Backup exported.");
}

function onSubmit(event) {
  const form = event.target;
  if (!(form instanceof HTMLFormElement)) return;
  if (form.id === "taskForm") {
    event.preventDefault();
    const name = $("#taskName").value.trim();
    if (!name) return;
    const category = $("#taskCategory").value;
    const color = safeColor($("#taskColor").value);
    if (editing) {
      const t = findTask(editing);
      if (t) { t.name = name; t.category = category; t.color = color; }
    } else {
      tasks.unshift(normalizeTask({ id: crypto.randomUUID(), name, category, color, days: 0, start: "", done: [], history: [], notes: {} }));
    }
    $("#taskDialog").close();
    save();
    return;
  }
  if (form.id === "streakForm") {
    event.preventDefault();
    const t = findTask(pendingStreak.taskId);
    const date = pendingStreak.date;
    const choice = chosenLength("#streakCustomLength", "#streakLength");
    if (!t || !date || date > todayISO()) return;
    if (rejectLength(choice)) return;
    const snap = snapshotTask(t);
    startStreak(t, date, choice.days);
    setUndo([snap], "Start streak");
    pendingStreak = { taskId: null, date: null };
    $("#streakDialog").close();
    save();
    toast("New streak started.");
    if (isFinalStreakDay(t, date)) celebrate(t);
    return;
  }
  if (form.id === "noteForm") {
    event.preventDefault();
    const t = findTask(noteTaskId);
    if (!t) return;
    t.notes = t.notes || {};
    const date = $("#noteDate").value;
    const text = $("#noteText").value.trim();
    if (date) {
      if (text) t.notes[date] = text;
      else delete t.notes[date];
    }
    $("#noteDialog").close();
    save();
    toast("Daily note saved.");
    return;
  }
  if (form.id === "historyForm") event.preventDefault();
}

function onInput(event) {
  if (event.target.id === "habitSearch") render();
  if (event.target.id === "streakCustomLength") {
    const n = Number(event.target.value);
    setLength("#streakLength", ".streak-preset", validLength(n) ? n : null);
  }
  if (event.target.id === "extendCustom") {
    const n = Number(event.target.value);
    setLength("#extendLength", ".extend-preset", validLength(n) ? n : null);
  }
}

async function onChange(event) {
  if (event.target.id === "categoryFilter" || event.target.id === "theme") {
    if (event.target.id === "theme") applyTheme(event.target.value);
    render();
    return;
  }
  if (event.target.id === "noteDate") {
    const t = findTask(noteTaskId);
    $("#noteText").value = (t?.notes || {})[event.target.value] || "";
  }
  if (event.target.id !== "importFile") return;
  const file = event.target.files?.[0];
  event.target.value = "";
  if (!file) return;
  try {
    const data = JSON.parse(await file.text());
    const incoming = parseBackup(data);
    if (!confirm("Import this backup and replace the habits currently on this device? Export a backup first if you want to keep the current data.")) return;
    tasks = incoming;
    undoAction = null;
    persistUndo();
    save();
    toast("Backup restored.");
  } catch {
    alert("Could not import this backup. Please choose a valid daymark JSON backup.");
  }
}

let bound = false;
function daymarkBoot() {
  applyTheme(localStorage.getItem(THEME_KEY) || "dark");
  const theme = $("#theme");
  if (theme) theme.value = document.documentElement.dataset.theme || "dark";
  if (!bound) {
    bound = true;
    document.addEventListener("click", onClick);
    document.addEventListener("submit", onSubmit);
    document.addEventListener("input", onInput);
    document.addEventListener("change", onChange);
  }
  render();
  setTimeout(() => $("#splash")?.classList.add("hide"), 650);
  if (recoveredCorrupt && !sessionStorage.getItem("daymark-corrupt-notified")) {
    sessionStorage.setItem("daymark-corrupt-notified", "1");
    toast("Saved habits could not be read. A copy was kept on this device, and daymark started fresh.");
  }
  if (document.body.dataset.daymark === "standalone" && "serviceWorker" in navigator && !window.__daymarkSW) {
    window.__daymarkSW = true;
    const register = () => navigator.serviceWorker.register("./sw.js").catch(() => {});
    if (document.readyState === "complete") register();
    else window.addEventListener("load", register, { once: true });
  }
}

window.daymarkBoot = daymarkBoot;
if (document.body?.dataset?.daymark === "standalone") daymarkBoot();
