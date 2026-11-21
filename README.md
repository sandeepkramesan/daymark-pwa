# Daymark PWA v7

Features:
- Multiple streak tasks, calendar check-offs and undo
- Reorder tasks with up/down arrows
- Pin important tasks; pinned tasks stay above unpinned tasks
- One-tap **Mark all today** completes today's date across every active task calendar
- Current/longest streaks, progress and countdown, yearly heatmap, four themes, logo-only splash
- Offline app shell; data stored locally in browser storage

## Install/update on Android
Host all files in this folder on HTTPS. For an existing GitHub Pages deployment, replace the repository files with these files; the URL stays the same. Reload the PWA after deployment.


## Privacy
No account or server is used. Clearing browser site data erases local task data.


Daily reminder scheduling has been removed because browser-based reminders are not reliable when the app is closed.


## Daymark v8 updates
- Daily progress dashboard with completion ring.
- Weekly overview showing daily completed habits.
- Global habit statistics: total check-ins, active habits, and average goal progress.
- Undo the latest calendar check-off or bulk "Mark all today" action.
- Existing task data continues to use the `daymark-tasks-v2` local storage key.


## Daymark v9 updates
- Habit categories and category filtering, plus habit search.
- Archive and restore habits without losing their completion history.
- Pause and resume habits without deleting progress.
- Per-habit colour accents.
- Milestone achievement badges.
- Daily notes attached to a habit and date.
- Focus mode for one habit at a time.
- Export and import a JSON backup of all habits, notes, categories, and progress.
- Existing local storage key is preserved (`daymark-tasks-v2`).


## Daymark v10 layout refinement
- Aligned dashboard tiles to a consistent grid and minimum height.
- Improved statistics tile spacing and labels to prevent awkward word wrapping.
- Made backup actions equal-width and consistently aligned.
- Fixed hidden archive sections appearing when the archive is collapsed.
- Existing task data continues to use `daymark-tasks-v2`.


## Daymark v11 splash label
- Set the PWA manifest name and short name to `daymark`, so Android uses the requested app label instead of the old habit-streak tagline.


## Daymark v12 — date-based streak starts
- Removed the required starting date and duration from habit creation.
- Selecting an uncompleted calendar date opens a streak-length prompt.
- The selected date becomes day one of a new streak.
- Selecting another uncompleted date later starts a new streak and archives the previous streak's dates and duration.
- Previous streak check-ins remain included in all-time check-ins, yearly heatmap and longest-streak calculations.
- Existing local storage key `daymark-tasks-v2` is preserved; legacy habits remain readable.
