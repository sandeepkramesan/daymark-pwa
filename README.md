# Daymark PWA v3

Features: multiple streaks, calendar check-offs and undo, current/longest streaks, progress and countdown, yearly heatmap, four themes, completion animation, optional daily reminders, and fresh-streak prompts.

When a streak breaks because a day was missed, or the challenge is completed/its period ends, Daymark asks whether to start a fresh streak. Choose a new length in weeks (1–52) and a start date. The previous streak remains as a separate record.

## Install on Android
Host all files in this folder on an HTTPS site (GitHub Pages, Netlify or Cloudflare Pages). Open the URL in Chrome on Android, then use ⋮ → Install app / Add to Home screen. A PWA cannot be installed directly from a ZIP; it must be served over HTTPS.

## Reminder limitation
Reminders are checked while the app is open or returns to the foreground. Android may suspend a fully closed PWA, so notifications are not guaranteed when closed. Reliable background reminders require push infrastructure and server-side scheduling.

## Privacy
No account or server is used. Data is stored locally in browser storage. Clearing site data erases it.
