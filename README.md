# Daymark PWA

A lightweight habit streak calendar. It supports multiple tasks, a target duration (1–366 days), a chosen start date, daily check-offs, undo, progress, current streak, and offline use. Data is stored locally in the browser on this device.

## Install on Android
1. Publish the contents of this folder to an HTTPS host (GitHub Pages, Netlify, or Cloudflare Pages).
2. Open the published URL in Chrome on your Android phone.
3. Open Chrome's ⋮ menu and choose **Install app** or **Add to Home screen**.
4. Launch Daymark from your home screen.

A PWA cannot be installed directly from a ZIP file; it needs to be served from HTTPS (or localhost during development).

## Deploy with GitHub Pages
1. Create a new GitHub repository and upload all files/folders in this directory (keep `manifest.webmanifest`, `sw.js`, and `icons/` at the root).
2. In repository Settings → Pages, choose **Deploy from a branch**, select `main` and `/ (root)`, then Save.
3. Wait for the Pages URL, open it on Android Chrome, and install.

## Privacy
No account or server is used. Tasks and completion marks are stored in this browser's local storage. Clearing browser site data will erase them.
