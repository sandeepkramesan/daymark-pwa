# Daymark

## Features
- Multiple habits with individual calendars, date check-offs and undo
- Create habits without choosing a start date or duration; select a calendar date to begin a streak and choose a duration from 7, 21, 30, 60, 90, or 365 days, or enter a custom number
- Start a new streak from another uncompleted calendar date while preserving previous streak history
- Consecutive dates within an active streak are checked off directly; the streak-length prompt appears only when starting a genuinely new streak
- Current and longest streaks, goal progress, days remaining, and yearly consistency heatmap (counts distinct completed calendar dates, including saved previous streaks)
- Daily progress dashboard with completion ring
- Weekly overview showing daily completed habits
- Habit statistics, including all-time check-ins, active habits, and average goal progress
- Undo the latest calendar check-off or bulk "Mark all today" action
- Reorder habits and pin important habits
- One-tap **Mark all today** for active habits
- Habit categories, category filtering, and search
- Archive and restore habits without losing completion history
- Pause and resume habits without deleting progress
- Milestone achievement badges
- Animated celebration when the final day of a fully completed streak is checked off, with an option to extend using the existing streak-duration presets or a custom duration
- Daily notes attached to a habit and date
- Focus mode for one habit at a time
- Export and import JSON backups of habits, notes, categories, and progress
- Four themes
- Offline app shell; habit data is stored locally in the browser
- App label set to **daymark**, with dedicated Android launcher and splash-screen icons

## Install/update on Android
Host all files in this folder on HTTPS. For an existing GitHub Pages deployment, replace the repository files with these files; the URL stays the same. Reload the PWA after deployment.

## Privacy
No account or server is used. Clearing browser site data erases local habit data.

Daily reminder scheduling is not included because browser-based reminders are not reliable when the app is closed. Existing habit data continues to use the `daymark-tasks-v2` local storage key.
