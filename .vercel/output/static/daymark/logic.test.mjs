import test from "node:test";
import assert from "node:assert/strict";
import {
  addDays,
  archiveActiveStreak,
  averageProgress,
  calendarEnd,
  continuesActive,
  countActive,
  extendGoal,
  inWindow,
  isFinalStreakDay,
  longest,
  moveHabit,
  normalizeTask,
  parseBackup,
  readStoredTasks,
  resumeHabit,
  safeColor,
  startStreak,
  streak,
  tasksPendingOn,
  unmarkDay,
} from "./logic.js";

test("calendar end ignores paused days without growing the goal", () => {
  const end = calendarEnd({ start: "2026-11-01", days: 7, pauses: [{ from: "2026-11-03", to: "2026-11-05" }] });
  assert.equal(end, "2026-11-09");
  assert.equal(calendarEnd({ start: "2026-11-01", days: 7, pauses: [] }), "2026-11-07");
});

test("bulk pending list skips habits with no streak", () => {
  const tasks = [
    normalizeTask({ id: "a", name: "New", start: "", days: 0, done: [] }),
    normalizeTask({ id: "b", name: "Live", start: "2026-11-01", days: 7, done: ["2026-11-01"] }),
  ];
  const pending = tasksPendingOn(tasks, "2026-11-02").map((t) => t.id);
  assert.deepEqual(pending, ["b"]);
  assert.equal(inWindow(tasks[0], "2026-11-02"), false);
});

test("reordering keeps archived habits", () => {
  const tasks = [
    normalizeTask({ id: "a", name: "A", order: 0 }),
    normalizeTask({ id: "b", name: "B", order: 1 }),
    normalizeTask({ id: "c", name: "C", archived: true }),
  ];
  const next = moveHabit(tasks, ["a", "b"], "b", "up");
  assert.deepEqual(next.map((t) => t.id), ["b", "a", "c"]);
  assert.equal(next.find((t) => t.id === "c").archived, true);
});

test("filtered move swaps the visible neighbor and still keeps hidden habits", () => {
  const tasks = [
    normalizeTask({ id: "a", name: "A", order: 0 }),
    normalizeTask({ id: "x", name: "Hidden", order: 1 }),
    normalizeTask({ id: "b", name: "B", order: 2 }),
    normalizeTask({ id: "z", name: "Old", archived: true }),
  ];
  const next = moveHabit(tasks, ["a", "b"], "b", "up");
  assert.deepEqual(next.map((t) => t.id), ["b", "x", "a", "z"]);
});

test("new streak archives only the current window", () => {
  const t = normalizeTask({
    id: "a",
    name: "Read",
    start: "2026-11-01",
    days: 7,
    done: ["2026-11-01", "2026-11-02", "2026-10-01"],
    history: [{ start: "2026-10-01", days: 3, done: ["2026-10-01", "2026-11-01", "2026-11-02"] }],
  });
  assert.deepEqual(t.history[0].done, ["2026-10-01"]);
  assert.ok(t.history.some((h) => h.done.includes("2026-10-02") || h.start === "2026-10-01") || t.done.includes("2026-10-01") || t.history.some((h) => h.done.includes("2026-10-01")));
  startStreak(t, "2026-11-20", 21);
  assert.equal(t.start, "2026-11-20");
  assert.deepEqual(t.done, ["2026-11-20"]);
  const saved = t.history.find((h) => h.start === "2026-11-01");
  assert.deepEqual(saved.done, ["2026-11-01", "2026-11-02"]);
  assert.equal(saved.days, 7);
});

test("historical dates can be removed", () => {
  const t = normalizeTask({
    id: "a",
    name: "Read",
    start: "2026-11-10",
    days: 5,
    done: ["2026-11-10"],
    history: [{ start: "2026-11-01", days: 3, done: ["2026-11-01", "2026-11-02", "2026-11-03"] }],
  });
  unmarkDay(t, "2026-11-03");
  assert.equal(t.history[0].done.includes("2026-11-03"), false);
  assert.equal(t.history[0].done.includes("2026-11-02"), true);
});

test("pause does not break the streak or add required days", () => {
  const t = normalizeTask({
    id: "a",
    name: "Read",
    start: "2026-11-01",
    days: 7,
    done: ["2026-11-01", "2026-11-02", "2026-11-05"],
  });
  t.paused = true;
  t.pausedAt = "2026-11-03";
  resumeHabit(t, "2026-11-05");
  assert.equal(t.days, 7);
  assert.equal(calendarEnd(t), "2026-11-09");
  assert.equal(streak(t, "2026-11-05"), 3);
  assert.equal(longest(t), 3);
});

test("active count ignores paused and archived habits", () => {
  const tasks = [
    normalizeTask({ id: "a", name: "A", paused: true }),
    normalizeTask({ id: "b", name: "B", archived: true }),
    normalizeTask({ id: "c", name: "C", start: "", days: 0 }),
  ];
  assert.equal(countActive(tasks), 1);
});

test("average progress ignores habits that have not started", () => {
  const tasks = [
    normalizeTask({ id: "a", name: "A", start: "", days: 0, done: [] }),
    normalizeTask({ id: "b", name: "B", start: "2026-11-01", days: 4, done: ["2026-11-01", "2026-11-02"] }),
  ];
  assert.equal(averageProgress(tasks), 50);
});

test("backup without ids is accepted and normalized", () => {
  const tasks = parseBackup({ tasks: [{ name: "Walk", start: "", days: 0 }] }, () => "generated");
  assert.equal(tasks[0].id, "generated");
  assert.equal(tasks[0].category, "Personal");
  assert.throws(() => parseBackup({ tasks: [{ name: "", days: 2 }] }));
});

test("corrupt storage is preserved and does not crash", () => {
  const mem = new Map();
  const storage = {
    getItem: (k) => (mem.has(k) ? mem.get(k) : null),
    setItem: (k, v) => mem.set(k, v),
    removeItem: (k) => mem.delete(k),
  };
  storage.setItem("daymark-tasks-v2", "{nope");
  const result = readStoredTasks(storage);
  assert.equal(result.recoveredCorrupt, true);
  assert.deepEqual(result.tasks, []);
  assert.equal(storage.getItem("daymark-tasks-corrupt"), "{nope");
  assert.equal(storage.getItem("daymark-tasks-v2"), null);
});

test("final day and extend cap", () => {
  const t = normalizeTask({ id: "a", name: "A", start: "2026-11-01", days: 2, done: ["2026-11-01", "2026-11-02"] });
  assert.equal(isFinalStreakDay(t, "2026-11-02"), true);
  assert.equal(isFinalStreakDay(t, "2026-11-01"), false);
  assert.equal(extendGoal(t, 5), true);
  assert.equal(t.days, 7);
  assert.equal(extendGoal(t, 4000), false);
  assert.equal(safeColor("red;background:url()"), "");
  assert.equal(safeColor("#c6f36a"), "#c6f36a");
});

test("a gap inside the window is not treated as a continuation", () => {
  const t = normalizeTask({ id: "a", name: "A", start: "2026-11-01", days: 7, done: ["2026-11-01"] });
  assert.equal(continuesActive(t, "2026-11-02"), true);
  assert.equal(continuesActive(t, "2026-11-03"), false);
  assert.equal(continuesActive(t, "2026-11-01"), true);
});

test("monday offset helper via addDays stays stable across months", () => {
  assert.equal(addDays("2026-11-30", 1), "2026-12-01");
});
