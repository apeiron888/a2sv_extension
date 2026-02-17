# A2SV Companion Extension

Sync LeetCode, Codeforces, and other supported platforms to GitHub and the A2SV tracking sheet.

## Screenshots
- Popup login/config: [/screenshots/popup.png](screenshots/popup.png)
- LeetCode sync UI: [/screenshots/leetcode.png](screenshots/leetcode.png)
- Codeforces sync UI: [/screenshots/codeforces.png](screenshots/codeforces.png)
- Fallback panel: [/screenshots/fallback.png](screenshots/fallback.png)

## Features
- One‑click sync to GitHub and Google Sheets
- Trial/time tracking per submission
- LeetCode and Codeforces enhanced UI
- Fallback panel for other platforms

## Install (Developer Mode)
1. Build the extension: `npx webpack --config webpack.config.js`
2. Open Chrome → Extensions → Enable Developer Mode.
3. Load Unpacked → select the `dist` folder.

## Setup
1. Open the extension popup.
2. Enter email, name, GitHub handle, group name, and optional repo name.
3. Click Connect GitHub.
4. Click Save settings.

## Usage
- LeetCode: open a problem, set Trial/Time, click Sync.
- Codeforces: open “My Submissions”, click Sync on accepted rows.
- Other platforms: use the fallback button.

## Notes
- Ensure the backend is running and you’ve connected GitHub successfully.
- If you update the extension, reload the unpacked extension and refresh the tab.