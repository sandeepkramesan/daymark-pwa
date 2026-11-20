# Daymark PWA v2

Includes multiple habit goals, day check-offs/undo, current and longest streaks, countdown, yearly consistency heatmap, four themes, completion animation, and optional daily reminders.

## Install on Android
Host all files in this folder on an HTTPS site (GitHub Pages, Netlify, Cloudflare Pages). Open the URL in Chrome on Android, then use ⋮ → Install app / Add to Home screen. A PWA cannot be installed directly from a ZIP; it must be served over HTTPS.

## Reminder limitation
Reminders are checked while the app is open or returns to the foreground. Android may suspend a fully closed PWA, so notifications are not guaranteed when closed. Reliable background reminders require push infrastructure and server-side scheduling.

## Privacy
No account or server is used. Data is stored locally in browser storage. Clearing site data erases it.
