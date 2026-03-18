# Android App Setup with Capacitor

## Prerequisites
- Android Studio (download from https://developer.android.com/studio)
- Java Development Kit (JDK) 11+
- Android SDK

## Building the Android App

### 1. Build Web Assets
```bash
npm run build
```
This generates the `build/` folder with optimized web assets.

### 2. Sync to Android Project
```bash
npx cap sync
```
Copies web assets to the Android native project.

### 3. Open in Android Studio
```bash
npx cap open android
```
This opens the Android project in Android Studio.

### 4. Build APK
In Android Studio:
1. Go to **Build** → **Build Bundle(s)/APK(s)** → **Build APK(s)**
2. Wait for the build to complete
3. The APK will be in: `android/app/build/outputs/apk/debug/app-debug.apk`

### 5. Install on Device/Emulator
```bash
adb install android/app/build/outputs/apk/debug/app-debug.apk
```

## Development Workflow

When you make changes to the web app:
1. Run `npm run build` to rebuild web assets
2. Run `npx cap sync` to copy changes to Android
3. Rebuild and redeploy the APK

## Useful Commands
- `npx cap sync` - Sync web assets to native projects
- `npx cap open android` - Open Android Studio
- `npx cap build android` - Build APK from command line (requires gradle)
- `npx cap run android` - Build and deploy to connected device

## Release Build
For production release:
```bash
npm run build
npx cap sync
# In Android Studio: Build → Generate Signed Bundle/APK
```

## Troubleshooting
- If sync fails, ensure `build/` folder exists with `index.html`
- Clear `android/.gradle` if you encounter build issues
- Check that Android SDK is properly configured in Android Studio

## Configuration
Edit `capacitor.config.json` to customize:
- `appId`: Unique identifier (com.attendancemanagement.system)
- `appName`: Display name
- `webDir`: Web assets directory (build/)
