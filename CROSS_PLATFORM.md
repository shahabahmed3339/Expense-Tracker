# Cross-Platform App Plan

This project is a Next.js app with server-side API routes, NextAuth, Prisma, and email integrations. The practical cross-platform strategy is:

1. Ship the current app as an installable PWA.
2. Add native mobile shells with Capacitor when App Store or Play Store packaging is required.
3. Add desktop shells with Tauri or Electron when native installers are required.

## Current Status

The project already includes the core PWA pieces:

- Web app manifest at `/manifest.webmanifest`
- Service worker at `/sw.js`
- Offline page at `/offline`
- Install prompt button in the main app shell
- Mobile viewport and iOS web app metadata
- Production build verified with `npm run build`

This means the deployed app can be installed from supported browsers on:

- Windows
- macOS
- Linux
- Android
- iPhone and iPad

## Important Architecture Note

The app cannot be exported as a fully static bundle without changing the architecture, because it depends on:

- `/api/*` routes
- NextAuth sessions
- Prisma database access
- SMTP/email flows
- tRPC server procedures

For native wrappers, the cleanest setup is to keep the Next.js backend deployed on a server and have the mobile/desktop shell load that deployed app URL.

## PWA Release Path

Build and run locally:

```bash
npm run build
npm run start
```

Deploy the app to a Node-capable host, then open it in the target browser:

- Android: Chrome menu -> Add to Home screen / Install app
- iPhone/iPad: Safari share sheet -> Add to Home Screen
- Windows/macOS/Linux: Chrome or Edge address bar install icon, or browser menu -> Install app

Use HTTPS in production. Service workers and install prompts require a secure origin, except on `localhost`.

## Native Mobile Path

Use Capacitor if you want App Store / Play Store packages while keeping the Next.js backend hosted remotely.

Suggested flow:

```bash
npm install @capacitor/core @capacitor/cli @capacitor/android @capacitor/ios
npx cap init "Expense Tracker" "com.example.expensetracker" --web-dir=public
npx cap add android
npx cap add ios
```

Then configure Capacitor to load the deployed app URL:

```ts
// capacitor.config.ts
import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.example.expensetracker",
  appName: "Expense Tracker",
  webDir: "public",
  server: {
    url: "https://your-production-domain.com",
    cleartext: false,
  },
};

export default config;
```

After that:

```bash
npx cap sync
npx cap open android
npx cap open ios
```

Android builds can be created on Windows, macOS, or Linux. iOS builds require macOS with Xcode.

## Native Desktop Path

Use Tauri for smaller desktop installers, or Electron if you prefer the larger but more common Chromium-based packaging path.

Recommended first desktop approach:

- Deploy the Next.js app normally.
- Create a Tauri shell that loads the production URL.
- Keep auth, database, and email on the hosted backend.

This avoids bundling a local Node server, Prisma engine, database, and environment secrets inside each desktop app.

## When To Go Fully Offline Native

A true offline-first native app is a separate product track. It would require:

- A local database on device
- Sync conflict handling
- Offline auth/session behavior
- API changes for bidirectional sync
- Secure storage for local credentials and tokens

That is doable, but it is larger than packaging the current web app.
