# Daymark

A single-file, offline-capable habit tracker PWA. No account or server; data stays in the browser (`daymark-tasks-v2` local storage key).

## Features
- Multiple habits with individual calendars; tap a date to check it off, tap again to undo
- Create a habit without a start date; tap a calendar date to begin a streak and pick 7, 21, 30, 60, 90, 365 days or a custom 1–3,660
- Consecutive days in an active streak are checked directly; the length prompt appears only for a new streak
- Previous streaks stay visible and editable in the calendar; an earlier completed date can be unchecked or used to continue a streak
- Current/longest streak, goal progress, days remaining, yearly heatmap
- Dashboard: today's ring, weekly overview, all-time stats
- Undo the latest check-off or "Mark all today" (bulk marks habits whose streak continues from yesterday)
- Reorder, pin, pause/resume, archive/restore, categories, search, colours, four themes
- Milestone badges, completion celebration with "extend streak"
- Daily notes, focus mode
- JSON export/import (imports are validated and sanitised)

## Deploying
Host all files on HTTPS (e.g. GitHub Pages) and replace the old files. Pages load network-first, so a normal reopen picks up the new version. **Bump `CACHE` in `sw.js` on every release.**

## v27 changes
App icons regenerated from the header logo under new file names (`daymark-any-*`, `daymark-maskable-*`, `apple-touch-180`) so Android/iOS refresh the installed icon. Maskable icon keeps the logo inside the launcher safe zone.

## v26 changes
Logo unified: the header tick is now a vector shape used identically in the header, in-app splash and the PWA/launcher/Android splash icons.

## v25 changes
Fixed: undo now persists (and restores into the right streak); weekly overview counts check-ins from earlier streaks; pausing a habit no longer breaks its streak on resume.

## v24 changes
Fixed: "Mark all today" corrupting habits with no streak; permanent splash when saved data is unreadable (a copy is kept under `daymark-corrupt-backup`); calendar opening on the streak's start month; current streak showing 0 until today is checked; unable to uncheck the last day of an older streak; unsafe backup import; focus-mode blank screens; midnight rollover; light theme colours; stale service worker caching. Past check-ins are no longer duplicated into every history entry. Removed dead restart-dialog code and unused icons. Larger tap targets; "task" wording now "habit".

Daily reminders are not included: browser reminders are unreliable when the app is closed.
