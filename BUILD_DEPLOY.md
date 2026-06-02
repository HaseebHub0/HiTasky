# HiTasky — Build & Deploy guide

Build is done with **EAS Build** (Expo's cloud). You don't need Android Studio.
The keystore (signing) is generated and stored by EAS automatically.

- **APK** → install directly on a phone (testing).
- **AAB** (Android App Bundle) → upload to Play Store (Play requires AAB, not APK).

---

## 0. One-time prerequisites

1. **Expo account** (free): create at <https://expo.dev/signup>.
2. **EAS CLI**:
   ```
   npm install -g eas-cli
   eas login
   ```
3. **Google Play Developer account** for the store: **$25 one-time fee**, sign up at
   <https://play.google.com/console>. (Not needed for the APK step.)

Run all `eas` commands from the `mobile/` folder.

---

## 1. Link the project (first time only)
```
cd mobile
eas init
```
- Say **yes** to create the project. This writes `extra.eas.projectId` into `app.json`.

> Note: `com.hitasky.app` is the permanent package name. Change it in `app.json`
> **before** the first Play upload if you want something else — it can't change later.

---

## 2. APK for your phone (testing)
```
eas build -p android --profile preview
```
- First run asks to **generate a new Android Keystore** → say **yes** (EAS keeps it safe).
- Build runs in the cloud (~10–20 min). When done you get a **link + QR code**.
- On your phone: open the link → **Download** the `.apk` → tap to install.
  - Allow "Install unknown apps" for your browser/files app if prompted.
- This is the build where the **new icon, splash, and the Android widget** all work
  (they do NOT show in Expo Go).

To add the widget: long-press home screen → **Widgets** → find **HiTasky · Today**.

---

## 3. AAB for the Play Store
```
eas build -p android --profile production
```
- Produces an **`.aab`**. Download it from the build page (or use `eas submit`, step 5).
- `versionCode` auto-increments on every production build (handled by EAS).

---

## 4. Create the app in Play Console
1. <https://play.google.com/console> → **Create app**.
2. Name: **HiTasky**, language, **App** (not game), **Free**.
3. Accept declarations.
4. Left menu → **Test and release** → start with **Internal testing** (fastest, share
   with up to 100 testers by email) before **Production**.
5. **Create new release** → upload the `.aab` → fill release notes → **Review** → **Roll out**.

### Required before production goes live
- **Store listing**: short + full description, app icon (512×512), feature graphic
  (1024×500), at least **2 phone screenshots**.
- **Privacy Policy URL** — **required**. (You can host a simple page free on
  GitHub Pages / Notion / Google Sites.)
- **Data safety form** — be honest:
  - Tasks/lists: stored **on device only**, not collected/shared.
  - **Feedback** (Settings → Share your feedback): the text you type **is sent** to the
    developer (Google Sheet). Declare it as *"App activity / Other user-generated content"*,
    **optional**, user-initiated, **not shared** with third parties, **not** used for tracking.
- **Content rating** questionnaire.
- **Target audience** + **Ads** (you have none → declare "No ads").

---

## 5. (Optional) Submit straight from EAS
Instead of uploading the `.aab` by hand:
```
eas submit -p android --profile production
```
- Needs a Google Play **service-account JSON** key (Play Console → Setup → API access).
  Follow the prompts; EAS docs: <https://docs.expo.dev/submit/android/>.

---

## Quick reference

| Goal | Command |
|------|---------|
| Login | `eas login` |
| Link project | `eas init` |
| APK (phone) | `eas build -p android --profile preview` |
| AAB (Play) | `eas build -p android --profile production` |
| Upload to Play | `eas submit -p android --profile production` |
| See builds | `eas build:list` |

## Notes
- **Keystore**: EAS manages it. Don't lose access to your Expo account — that key signs
  every future update. (`eas credentials` to view/back up.)
- **New arch + widget**: the app uses `newArchEnabled: true` with
  `react-native-android-widget`. If a production build ever fails on the widget, set
  `newArchEnabled: false` in `app.json` and rebuild.
- **OTA updates** (the "Check for updates" button) are currently disabled. To enable later:
  `eas update:configure`, then re-add a `runtimeVersion` to `app.json`.
- After changing JS only (no native/icon/permission changes), you can ship updates without
  a new store review **if** you set up EAS Update — otherwise each change needs a new build.
