# thirty — Meditation App

## What This Is
A premium 30-second meditation app built with React Native / Expo. Dark, minimal aesthetic with Instrument Serif font. Users breathe for 30 seconds daily and build a streak.

## Tech Stack
- **Framework:** React Native + Expo SDK 55
- **Language:** TypeScript
- **State:** AsyncStorage (local, no backend)
- **Payments:** react-native-iap v14 (raw StoreKit, $4.99 lifetime unlock)
- **Notifications:** expo-notifications (streak protection)
- **Audio:** expo-audio (ambient crossfade audio)
- **Haptics:** expo-haptics (milestone celebrations, breath feedback)

## Architecture
```
App.tsx              — Root navigator, screen routing
src/
  screens/
    OnboardingScreen — First launch flow
    StartScreen      — Main screen, streak display, duration/pattern picker
    BreathScreen     — Active breathing session with BreathCircle animation
    AfterglowScreen  — Post-session reflection
    DoneScreen       — Completion screen with stats
    HistoryScreen    — Calendar/streak history
    UnlockScreen     — IAP paywall
    ReminderScreen   — Notification scheduling
  components/
    BreathCircle     — Animated breathing circle (inhale/hold/exhale phases)
    DurationPicker   — Time selection (30s free, 1m premium)
    OptionPill       — Reusable pill-style selector
    BackgroundOrbs   — Ambient floating orb animations
  hooks/
    useAudio         — Ambient audio management
    usePurchase      — react-native-iap purchase flow
    useStreakProtection — Notification scheduling for streak reminders
  utils/
    quotes.ts        — Milestone messages ("sixty days — this is who you are now")
    storage.ts       — AsyncStorage helpers
    widget.ts        — iOS widget data bridge
  data/
    breathingPatterns.ts — Box breathing, 4-7-8, coherence patterns
  theme.ts           — Colors, spacing, typography (Instrument Serif)
```

## Key Design Decisions
- Dark theme only (#0a0a12 background)
- Instrument Serif font for luxury feel
- Two durations: 30s (free) and 1m (premium)
- Breathing patterns (box, 4-7-8, coherence) available on the 1m premium session
- Haptic feedback on milestones and breath phase transitions
- Crossfade ambient audio during sessions
- No accounts, no backend — purely local

## iOS Details
- Bundle ID: com.thirty.app
- Team ID: B2MV35NY53
- App Groups: group.com.thirty.app (for widget data sharing)
- HealthKit has been **removed entirely** (rejected under Guideline 2.5.1 three times). Do not re-add without a UI-prominent integration plan.
- Currently in App Store review/approval

## Common Tasks
- Price changes: update in StartScreen, DoneScreen, and UnlockScreen
- New breathing pattern: add to src/data/breathingPatterns.ts
- New duration: update DurationPicker component (note: only 30s/1m are currently supported — adding more requires re-evaluating the free/premium split)
- Widget updates: modify src/utils/widget.ts

## ⚠️ BUILD NUMBER — CRITICAL (read this before EVERY build)
Build numbers exist in THREE places and ALL THREE must match:
1. `app.json` → `expo.ios.buildNumber`
2. `ios/thirty/Info.plist` → `CFBundleVersion`
3. `ios/thirty.xcodeproj/project.pbxproj` → `CURRENT_PROJECT_VERSION` (appears twice: Debug + Release)

**Before every EAS build, run:** `./scripts/sync-build-number.sh`

This syncs from app.json to the native files. If you skip this, EAS uses the NATIVE values
and Apple will reject the upload as a duplicate build number. This has happened 3+ times already.

**When bumping build number:** Change it in `app.json` THEN run the sync script. Never edit native files manually.

## Don't
- Don't add a backend or user accounts
- Don't change the dark theme
- Don't modify the font choice
- Don't break the 30-second free tier
- Don't re-add HealthKit without a prominent-UI integration plan (prior rejections under Guideline 2.5.1)
- Don't declare `UIBackgroundModes: audio` in Info.plist (rejected under Guideline 2.5.4 — app doesn't play audio in background)
