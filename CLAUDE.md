# thirty — Meditation App

## What This Is
A premium 30-second meditation app built with React Native / Expo. Dark, minimal aesthetic with Instrument Serif font. Users breathe for 30 seconds daily and build a streak.

## Tech Stack
- **Framework:** React Native + Expo SDK 55
- **Language:** TypeScript
- **State:** AsyncStorage (local, no backend)
- **Payments:** RevenueCat (in-app purchase, $4.99 lifetime unlock)
- **Health:** HealthKit integration (mindful minutes)
- **Notifications:** expo-notifications (streak protection)
- **Audio:** expo-av (ambient crossfade audio)
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
    DurationPicker   — Time selection (30s, 1m, 3m, 5m, 10m, 15m)
    OptionPill       — Reusable pill-style selector
    BackgroundOrbs   — Ambient floating orb animations
  hooks/
    useAudio         — Ambient audio management
    usePurchase      — RevenueCat purchase flow
    useStreakProtection — Notification scheduling for streak reminders
    useHealthKit     — HealthKit mindful minutes logging
  utils/
    quotes.ts        — Milestone messages ("sixty days — this is who you are now")
    storage.ts       — AsyncStorage helpers
    healthkit.ts     — HealthKit bridge
    widget.ts        — iOS widget data bridge
  data/
    breathingPatterns.ts — Box breathing, 4-7-8, coherence patterns
  theme.ts           — Colors, spacing, typography (Instrument Serif)
```

## Key Design Decisions
- Dark theme only (#0a0a12 background)
- Instrument Serif font for luxury feel
- 30-second default, longer durations are premium
- Breathing patterns (box, 4-7-8, coherence) for 1min+ only
- Haptic feedback on milestones and breath phase transitions
- Crossfade ambient audio during sessions
- No accounts, no backend — purely local

## iOS Details
- Bundle ID: com.thirty.app
- Team ID: B2MV35NY53
- App Groups: group.com.thirty.app (for widget data sharing)
- Currently in App Store review/approval

## Common Tasks
- Price changes: update in StartScreen, DoneScreen, and UnlockScreen
- New breathing pattern: add to src/data/breathingPatterns.ts
- New duration: update DurationPicker component
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
