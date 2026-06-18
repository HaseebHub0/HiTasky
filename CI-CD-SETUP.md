# HiTasky — Updates & CI/CD (read this once)

## 1. The AAB vs. OTA model — answering "will every update be in this file?"

**Short answer: No. The `.aab` is your base app; most updates fly over-the-air without a new AAB.**

When you ran `eas build --profile production --platform android`, you got an **`.aab` (Android App Bundle)**. That single file is **what you upload to the Play Console** — it's your installable app.

But updates come in **two kinds**, and only one needs a new AAB:

| Update type | Examples | How it ships | New AAB? |
|---|---|---|---|
| **JS / content (OTA)** | Text, screens, colors, logic, bug fixes, new JS features, flipping `FREE_FOR_ALL` | `eas update` → installed apps download it on next launch | ❌ No |
| **Native** | New native dependency, `app.json` android/ios native fields, new Expo plugin, Expo SDK upgrade, **version bump**, new Android permission | `eas build` → upload new `.aab` to Play | ✅ Yes |

So: **upload the AAB once.** After that, ~90% of your day-to-day changes (anything in JS/assets) reach users **instantly via OTA** — no re-upload, no Google review wait. Only native-level changes need a fresh AAB.

**Why this works:** `app.json` already has it wired —
```jsonc
"runtimeVersion": { "policy": "appVersion" },          // = "1.0.0"
"updates": { "url": "https://u.expo.dev/af11cea3-…", "checkAutomatically": "ON_LOAD" }
```
OTA updates only reach builds with the **same runtimeVersion**. Your current AAB is `1.0.0`, so every `eas update` you push to the `production` branch lands on it. When you bump the app version later, you must ship a new AAB first, then OTA updates flow to that new version.

> 💡 This is exactly why the free→paid switch is safe later: flipping `FREE_FOR_ALL = false` is a **JS change**, so it ships via OTA — no new build, no store review.

---

## 2. CI/CD — auto-update the app when you change code

Two GitHub Actions workflows are in `mobile/.github/workflows/`:

### `eas-update.yml` — OTA (the "I changed code → app updates" one)
- **Triggers automatically** on every push to `main` that touches `src/**`, `App.js`, `index.js`, `assets/**`, or `package.json`.
- Runs `eas update --branch production` → pushes an OTA update.
- Installed apps pick it up **on their next launch**. No Play upload, no review.
- Can also be run manually from the GitHub **Actions** tab.

### `eas-build.yml` — new AAB (manual)
- **Manual only** (Actions tab → "Run workflow"), because native builds cost EAS build minutes.
- Builds a fresh production `.aab`. Optional toggle to auto-submit it to Google Play.
- Use it for native changes or version bumps.

---

## 3. One-time setup (do this once)

1. **Push `mobile/` to GitHub** (it's its own git repo). The workflows live under `mobile/.github/`, so the repo root must be `mobile/`.
   ```bash
   cd mobile
   git add .github eas.json app.json src App.js
   git commit -m "ci: add EAS update + build workflows"
   git push origin main
   ```
2. **Create an Expo access token:** expo.dev → Account → **Settings → Access tokens → Create**. Copy it.
3. **Add it to GitHub:** repo → **Settings → Secrets and variables → Actions → New repository secret**
   - Name: `EXPO_TOKEN`
   - Value: *(the token)*
4. **(Optional) auto-submit to Play:** add a Google Play service-account JSON to EAS (`eas credentials` or `eas.json` `submit.production.serviceAccountKeyPath`) so `eas-build.yml`'s submit step works.

That's it. After this, **push JS code → app auto-updates OTA.** 🎉

---

## 4. Manual commands (if you skip CI)

```bash
cd mobile

# OTA update (JS/asset change) — instant, no rebuild
eas update --branch production --message "what changed"

# New store binary (native change / version bump)
eas build --platform android --profile production
eas submit --platform android --profile production --latest   # upload to Play
```

---

## 5. Landing page CI/CD (separate)

The landing page lives in `app/` (Vite + React) and is hosted on **Netlify** (`hitasky.netlify.app`). It is **not** part of the mobile repo.

- **Easiest:** connect the `app/` repo to Netlify → every `git push` auto-builds & deploys (build command `npm run build`, publish dir `dist`).
- **Or manual:** `cd app && npm run build && netlify deploy --prod --dir=dist`

> Note: `app/` is currently not under git. To get auto-deploy, init a repo for it (or a subfolder of a monorepo) and link it in Netlify.

---

## TL;DR
- The **AAB** = upload to Play **once**.
- **Code change in JS** → `eas update` (CI does this automatically) → **app updates over-the-air**, no re-upload.
- **Native change / version bump** → new AAB via `eas-build.yml` → upload to Play.
- The free→paid flip later is JS-only → ships via OTA.
