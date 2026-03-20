# iOS Widget Support — Native Steps

## Overview
Lock screen widget showing current streak count, and home screen widget with streak + quick "breathe" tap to open app.

## Current Status
This Expo SDK 55 app does not have a first-party Expo widget workflow wired into the repo yet. A starter Swift widget lives in `src/widgets/StreakWidget.swift`, but it still needs a native widget target.

Recommended path:

### Option A: expo-apple-targets (Recommended)
1. Install: `npx expo install expo-apple-targets`
2. Create `targets/streak-widget/` with the code from `src/widgets/StreakWidget.swift`
3. Use App Groups to share streak data between main app and widget extension
4. Widget reads from shared UserDefaults (App Group container)

### Option B: react-native-widget-extension
1. Install: `npm install react-native-widget-extension`
2. Requires custom dev client (not compatible with Expo Go)
3. Create widget extension in Xcode

## Implementation Steps

### 1. Shared Data Layer
- Configure App Group: `group.com.thirty.app`
- After each session, write streak data to shared UserDefaults:
```typescript
import { NativeModules } from 'react-native';
// Keys: "streak" (number), "lastDate" (string)
```

### 2. Widget Target
- Add a new iOS Widget Extension target in Xcode or via `expo-apple-targets`
- Copy `src/widgets/StreakWidget.swift` into that target
- Ensure the widget target shares the `group.com.thirty.app` App Group entitlement

### 4. Deep Link Handling
- Register URL scheme `thirty://` in app.json
- Handle `thirty://breathe` to navigate directly to BreathScreen

### 5. Widget Timeline
- Reload widget timeline after each session via `WidgetCenter.shared.reloadAllTimelines()`
- Use `TimelineProvider` with `.atEnd` refresh policy

## Already Present In This Repo
- `app.json` already includes the `group.com.thirty.app` App Group entitlement
- `src/utils/widget.ts` now writes streak data if a native `SharedUserDefaults` bridge is added
- The app currently falls back safely when the native widget bridge is not present
