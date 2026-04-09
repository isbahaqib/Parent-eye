# ParentEye Child App (Android)

This is the Android-native “child device” companion for the existing **Parent Eye** backend.

## What it does
- Pair using a 6-digit code: `POST /api/child/link/confirm`
- Periodically fetches parent rules: `GET /api/child/config`
- Enforces rules using an **Accessibility Service**:
  - blocks apps listed in `blockedApps`
  - enforces total screen-time limit (`screenTimeLimitMinutes`)
- Sends app switch telemetry: `POST /api/child/telemetry`

## Setup
1. Open this folder in **Android Studio**.
2. Build and run on your child Android device.
3. In the app, enter:
   - Backend URL (same API server as Parent Eye, usually `http://<your-ip>:3001`)
   - 6-digit link code shown in Parent Eye
4. Tap **Enable Accessibility** and turn on:
   - `ParentEye Child` accessibility service

## Build from terminal (Windows)
1. Install Android SDK (via Android Studio SDK Manager).
2. Create `local.properties` in the project root:
   - `sdk.dir=C\:\\Users\\<your-user>\\AppData\\Local\\Android\\Sdk`
3. Build debug APK:
   - `.\gradlew.bat assembleDebug`

## Notes
- System-wide app blocking on Android requires Accessibility-based enforcement (showing an overlay and navigating home).
- If rules don’t apply immediately, use **Refresh now** on the dashboard (and ensure networking is available).

