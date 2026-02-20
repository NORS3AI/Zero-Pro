// config.js — Zero Pro app configuration
//
// ─── Google OAuth ─────────────────────────────────────────────────────────────
//
// To enable Google Drive backup:
// 1. Go to https://console.cloud.google.com/
// 2. Create a project → APIs & Services → Credentials
// 3. Create an OAuth 2.0 Client ID  (type: Web Application)
// 4. Add your GitHub Pages origin (e.g. https://NORS3AI.github.io) as an
//    Authorised JavaScript Origin
// 5. Paste your Client ID below.
//
// Leave blank to disable the Google Drive backup button.

export const GOOGLE_CLIENT_ID = '';
