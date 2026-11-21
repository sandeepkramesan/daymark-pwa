# daymark

Build habits, one day at a time. No account and no server. Habits stay in this browser under `daymark-tasks-v2`.

## What it does

- Several habits, each with its own calendar, colour, and category
- Create a habit without a start date. Tap a past or current day to start, then pick 7, 21, 30, 60, 90, 365, or any whole number from 1 to 3,660
- The next day of an active streak checks off directly. Any other date starts a new streak and keeps the previous one on the calendar
- Previous streak days stay visible. Tap one to uncheck it, or to continue a new streak from that date
- Current streak, longest streak, goal progress, days remaining, and a Monday-aligned year heatmap
- Today ring, all-time check-ins, active habits (not paused or archived), and average progress of habits that have a goal
- Week strip starts Monday, matching the calendars
- Undo the latest check-off, including “Mark all today”
- Mark all today only includes habits whose current streak window covers today
- Reorder and pin habits. Reordering never deletes archived habits, including while a search or category filter is on
- Categories, search, archive, restore, and delete
- Pause skips those days, moves the deadline forward, and does not break the current streak or add extra days to the goal
- Milestone badges
- A celebration on the check-off that completes a streak, with the same duration presets or a custom extension
- Daily notes, focus mode (including from the archive), JSON export and import
- Midnight, Light, Violet, and Ocean. Light uses light calendar cells, and the status-bar colour follows the theme
- Offline shell. The service worker is `daymark-v23` and checks the network first, so an update is picked up the next time the app is opened online

## Install on Android

Host this folder on HTTPS. For an existing GitHub Pages site, replace the repository files and reload the installed app. The home-screen icon is `icons/daymark-512.png`. Maskable icons are separate, so the launcher can crop them without cutting off the mark.

## Backup

Export writes a JSON file (`version` 23). Import replaces habits on this device. Habits without an id get one. If saved data cannot be read, Daymark keeps a copy under `daymark-tasks-corrupt` and starts fresh instead of showing a blank page.

Clearing site data erases habits. Browser reminders are not included; they are not reliable once the app is closed.
