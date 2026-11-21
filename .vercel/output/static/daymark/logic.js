export const STORAGE_KEY = "daymark-tasks-v2";
export const LEGACY_KEY = "daymark-tasks";
export const CORRUPT_KEY = "daymark-tasks-corrupt";
export const UNDO_KEY = "daymark-undo-v8";
export const THEME_KEY = "daymark-theme";
export const EXPORT_VERSION = 23;
export const PRESETS = [7, 21, 30, 60, 90, 365];
export const MAX_DAYS = 3660;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function dateObj(s) {
  const [y, m, d] = String(s).split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function iso(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function addDays(s, n) {
  const d = dateObj(s);
  d.setDate(d.getDate() + n);
  return iso(d);
}

export function todayISO(now = new Date()) {
  const d = new Date(now.getTime());
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
}

export function daysBetween(a, b) {
  return Math.round((dateObj(b) - dateObj(a)) / 86400000);
}

export function pauseCovers(pauses, day) {
  return (pauses || []).some((p) => p && p.from && p.to && day >= p.from && day < p.to);
}

export function calendarEnd(t) {
  if (!t?.start || !Number(t.days)) return "";
  const pauses = t.pauses || [];
  let remaining = Number(t.days);
  let cursor = t.start;
  let last = t.start;
  for (let i = 0; i < MAX_DAYS + 400 && remaining > 0; i++) {
    last = cursor;
    if (!pauseCovers(pauses, cursor)) remaining -= 1;
    cursor = addDays(cursor, 1);
  }
  return last;
}

export function inWindow(t, day) {
  if (!t?.start || !Number(t.days) || !day) return false;
  const end = calendarEnd(t);
  return day >= t.start && day <= end;
}

export function isCompleted(t, day) {
  if ((t.done || []).includes(day)) return true;
  return (t.history || []).some((h) => (h.done || []).includes(day));
}

export function completionPlacement(t, day) {
  if (!isCompleted(t, day)) return "empty";
  return inWindow(t, day) ? "active" : "history";
}

export function continuesActive(t, day) {
  if (!inWindow(t, day)) return false;
  let cursor = addDays(day, -1);
  while (cursor >= t.start && pauseCovers(t.pauses, cursor)) cursor = addDays(cursor, -1);
  if (cursor < t.start) return true;
  return isCompleted(t, cursor);
}

function cleanDates(list) {
  return [...new Set((list || []).filter((d) => typeof d === "string" && DATE_RE.test(d)))];
}

function normalizeHistoryEntry(h) {
  if (!h || typeof h.start !== "string" || !DATE_RE.test(h.start)) return null;
  const days = Math.round(Number(h.days));
  if (!Number.isFinite(days) || days < 1) return null;
  const pauses = Array.isArray(h.pauses)
    ? h.pauses.filter((p) => p && DATE_RE.test(p.from || "") && DATE_RE.test(p.to || "") && p.from < p.to)
    : [];
  const entry = {
    start: h.start,
    days: Math.min(MAX_DAYS, days),
    done: cleanDates(h.done),
    pauses,
    endedAt: typeof h.endedAt === "string" ? h.endedAt : "",
  };
  const end = calendarEnd(entry);
  entry.done = entry.done.filter((d) => d >= entry.start && d <= end);
  return entry;
}

function parkOrphans(t) {
  t.history = Array.isArray(t.history) ? t.history : [];
  if (!t.start || !Number(t.days)) return;
  const end = calendarEnd(t);
  const known = new Set(t.history.flatMap((h) => h.done));
  for (const d of t.done) {
    if ((d < t.start || d > end) && !known.has(d)) {
      t.history.push({ start: d, days: 1, done: [d], pauses: [], endedAt: d });
      known.add(d);
    }
  }
  t.done = t.done.filter((d) => d >= t.start && d <= end);
}

export function normalizeTask(raw, idFactory = () => crypto.randomUUID()) {
  const t = raw && typeof raw === "object" ? { ...raw } : {};
  t.id = typeof t.id === "string" && t.id ? t.id : idFactory();
  t.name = typeof t.name === "string" ? t.name : "Habit";
  t.start = typeof t.start === "string" ? t.start : "";
  const days = Math.round(Number(t.days));
  t.days = Number.isFinite(days) && days > 0 ? Math.min(MAX_DAYS, days) : 0;
  t.category = typeof t.category === "string" && t.category ? t.category : "Personal";
  t.color = typeof t.color === "string" ? t.color : "";
  t.done = cleanDates(t.done);
  t.notes = t.notes && typeof t.notes === "object" && !Array.isArray(t.notes) ? { ...t.notes } : {};
  t.history = Array.isArray(t.history) ? t.history.map(normalizeHistoryEntry).filter(Boolean) : [];
  t.pauses = Array.isArray(t.pauses)
    ? t.pauses.filter((p) => p && DATE_RE.test(p.from || "") && DATE_RE.test(p.to || "") && p.from < p.to)
    : [];
  t.pinned = !!t.pinned;
  t.paused = !!t.paused;
  t.archived = !!t.archived;
  if (t.archived) t.pinned = false;
  if (typeof t.order !== "number" || !Number.isFinite(t.order)) delete t.order;
  if (typeof t.pausedAt !== "string") delete t.pausedAt;
  parkOrphans(t);
  return t;
}

export function readStoredTasks(storage) {
  const raw = storage.getItem(STORAGE_KEY);
  if (raw != null) {
    try {
      const data = JSON.parse(raw);
      if (!Array.isArray(data)) throw new Error("shape");
      return { tasks: data, recoveredCorrupt: false };
    } catch {
      try {
        storage.setItem(CORRUPT_KEY, raw);
        storage.removeItem(STORAGE_KEY);
      } catch {
        /* ignore quota */
      }
      return { tasks: [], recoveredCorrupt: true };
    }
  }
  const legacy = storage.getItem(LEGACY_KEY);
  if (legacy != null) {
    try {
      const data = JSON.parse(legacy);
      if (Array.isArray(data)) return { tasks: data, recoveredCorrupt: false };
    } catch {
      /* ignore legacy junk */
    }
  }
  return { tasks: [], recoveredCorrupt: false };
}

export function readUndo(storage) {
  try {
    const data = JSON.parse(storage.getItem(UNDO_KEY) || "null");
    if (!data || typeof data !== "object") return null;
    return data;
  } catch {
    return null;
  }
}

export function orderedTasks(tasks) {
  return tasks
    .filter((t) => !t.archived)
    .sort(
      (a, b) =>
        Number(!!b.pinned) - Number(!!a.pinned) ||
        (a.order ?? tasks.indexOf(a)) - (b.order ?? tasks.indexOf(b)),
    );
}

export function moveHabit(tasks, visibleIds, id, direction) {
  const i = visibleIds.indexOf(id);
  const j = i + (direction === "up" ? -1 : 1);
  if (i < 0 || j < 0 || j >= visibleIds.length) return tasks;
  const byId = new Map(tasks.map((t) => [t.id, t]));
  const a = byId.get(visibleIds[i]);
  const b = byId.get(visibleIds[j]);
  if (!a || !b || !!a.pinned !== !!b.pinned || a.archived || b.archived) return tasks;
  const full = orderedTasks(tasks);
  const ia = full.findIndex((t) => t.id === a.id);
  const ib = full.findIndex((t) => t.id === b.id);
  if (ia < 0 || ib < 0) return tasks;
  const next = full.slice();
  [next[ia], next[ib]] = [next[ib], next[ia]];
  next.forEach((t, n) => {
    t.order = n;
  });
  return [...next, ...tasks.filter((t) => t.archived)];
}

export function checkedCount(t) {
  if (!t.start || !Number(t.days)) return 0;
  const end = calendarEnd(t);
  return new Set((t.done || []).filter((d) => d >= t.start && d <= end)).size;
}

export function goalLeft(t) {
  if (!t.start || !Number(t.days)) return 0;
  return Math.max(0, Number(t.days) - checkedCount(t));
}

export function allTimeCount(t) {
  return new Set([...(t.history || []).flatMap((h) => h.done || []), ...(t.done || [])]).size;
}

export function countActive(tasks) {
  return tasks.filter((t) => !t.archived && !t.paused).length;
}

export function averageProgress(tasks) {
  const planned = tasks.filter((t) => !t.archived && t.start && Number(t.days) > 0);
  if (!planned.length) return 0;
  const sum = planned.reduce((n, t) => n + Math.min(100, Math.round((checkedCount(t) / Number(t.days)) * 100)), 0);
  return Math.round(sum / planned.length);
}

export function tasksDueOn(tasks, day) {
  return tasks.filter((t) => !t.archived && !t.paused && inWindow(t, day));
}

export function tasksPendingOn(tasks, day) {
  return tasksDueOn(tasks, day).filter((t) => !(t.done || []).includes(day));
}

export function streak(t, today) {
  if (!t.start || !Number(t.days)) return 0;
  const end = calendarEnd(t);
  const done = new Set(t.done || []);
  let n = 0;
  let cursor = today;
  while (cursor >= t.start && cursor <= end) {
    if (pauseCovers(t.pauses, cursor) && !done.has(cursor)) {
      cursor = addDays(cursor, -1);
      continue;
    }
    if (!done.has(cursor)) break;
    n += 1;
    cursor = addDays(cursor, -1);
  }
  return n;
}

function runLength(entry) {
  if (!entry?.start || !Number(entry.days)) return 0;
  const end = calendarEnd(entry);
  const done = new Set(entry.done || []);
  let best = 0;
  let run = 0;
  let cursor = entry.start;
  const span = Math.max(1, daysBetween(entry.start, end) + 1);
  for (let i = 0; i < span; i++) {
    if (pauseCovers(entry.pauses, cursor) && !done.has(cursor)) {
      /* skipped day: does not break the run and does not add to it */
    } else if (done.has(cursor)) {
      run += 1;
      if (run > best) best = run;
    } else {
      run = 0;
    }
    cursor = addDays(cursor, 1);
  }
  return best;
}

export function longest(t) {
  const groups = [...(t.history || []), { start: t.start, days: t.days, done: t.done || [], pauses: t.pauses || [] }];
  return groups.reduce((best, g) => Math.max(best, runLength(g)), 0);
}

export function isFinalStreakDay(t, date) {
  if (!t?.start || !Number(t.days)) return false;
  if (date !== calendarEnd(t)) return false;
  return checkedCount(t) >= Number(t.days);
}

export function snapshotTask(t) {
  return {
    taskId: t.id,
    done: [...(t.done || [])],
    history: JSON.parse(JSON.stringify(t.history || [])),
    start: t.start,
    days: t.days,
    pauses: JSON.parse(JSON.stringify(t.pauses || [])),
    paused: !!t.paused,
    pausedAt: t.pausedAt || "",
  };
}

export function restoreSnapshot(tasks, snap) {
  const t = tasks.find((x) => x.id === snap.taskId);
  if (!t) return false;
  t.done = [...snap.done];
  t.history = JSON.parse(JSON.stringify(snap.history));
  t.start = snap.start;
  t.days = snap.days;
  t.pauses = JSON.parse(JSON.stringify(snap.pauses || []));
  t.paused = !!snap.paused;
  if (snap.pausedAt) t.pausedAt = snap.pausedAt;
  else delete t.pausedAt;
  return true;
}

export function archiveActiveStreak(t, endedAt) {
  t.history = Array.isArray(t.history) ? t.history : [];
  if (!t.start || !Number(t.days)) return;
  const end = calendarEnd(t);
  const done = [...new Set((t.done || []).filter((d) => d >= t.start && d <= end))];
  const pauses = (t.pauses || []).filter((p) => p.from <= end && p.to > t.start);
  if (done.length) {
    const existing = t.history.find((h) => h.start === t.start && Number(h.days) === Number(t.days));
    if (existing) {
      const limit = calendarEnd(existing);
      existing.done = [...new Set([...(existing.done || []), ...done])].filter((d) => d >= existing.start && d <= limit);
      existing.endedAt = endedAt;
      existing.pauses = pauses;
    } else {
      t.history.push({ start: t.start, days: Number(t.days), done, endedAt, pauses });
    }
  }
  t.pauses = [];
}

export function startStreak(t, date, days) {
  parkOrphans(t);
  archiveActiveStreak(t, date);
  t.done = [date];
  t.start = date;
  t.days = days;
  t.paused = false;
  delete t.pausedAt;
  t.pauses = [];
}

export function markDay(t, date) {
  t.done = [...new Set([...(t.done || []), date])];
}

export function unmarkDay(t, date) {
  t.done = (t.done || []).filter((d) => d !== date);
  for (const h of t.history || []) h.done = (h.done || []).filter((d) => d !== date);
}

export function pauseHabit(t, today) {
  t.paused = true;
  t.pausedAt = today;
}

export function resumeHabit(t, today) {
  const from = t.pausedAt || today;
  const gap = Math.max(0, daysBetween(from, today));
  if (gap > 0 && t.start && Number(t.days) > 0) {
    t.pauses = [...(t.pauses || []), { from, to: today }];
  }
  t.paused = false;
  delete t.pausedAt;
}

export function extendGoal(t, extra) {
  const next = Number(t.days) + extra;
  if (!Number.isInteger(extra) || extra < 1 || extra > MAX_DAYS || next > MAX_DAYS) return false;
  t.days = next;
  return true;
}

export function validLength(days) {
  return Number.isInteger(days) && days >= 1 && days <= MAX_DAYS;
}

export function parseBackup(data, idFactory = () => crypto.randomUUID()) {
  const incoming = Array.isArray(data) ? data : data && Array.isArray(data.tasks) ? data.tasks : null;
  if (!Array.isArray(incoming)) throw new Error("Invalid backup");
  for (const t of incoming) {
    if (!t || typeof t.name !== "string" || !t.name.trim()) throw new Error("Invalid backup");
    if (t.start != null && typeof t.start !== "string") throw new Error("Invalid backup");
    if (!Number.isFinite(Number(t.days))) throw new Error("Invalid backup");
  }
  return incoming.map((t) =>
    normalizeTask({ ...t, name: t.name.trim(), start: typeof t.start === "string" ? t.start : "" }, idFactory),
  );
}

export function safeColor(color) {
  return /^#[0-9a-fA-F]{6}$/.test(color || "") ? color : "";
}
