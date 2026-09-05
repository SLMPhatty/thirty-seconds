# thirty — Challenges Feature Design
## "breathe together"

---

## Overview

Challenges let users invite up to 10 friends to a shared daily meditation accountability group. Everyone sees who's meditated today via a minimal constellation UI. When someone completes a session, others get a gentle push notification. All synced via CloudKit — no custom backend, no accounts.

---

## User Flow

### Creating a Challenge
1. From StartScreen, tap the new **"challenge"** button (below streak)
2. ChallengeScreen opens → tap **"start a challenge"**
3. Auto-generates a fun challenge name (editable): *"the morning crew"*, *"stillness squad"*, *"breathing buddies"*
4. Share sheet opens with a CloudKit share link + custom message: *"breathe with me — 30 seconds a day. tap to join."*
5. Challenge is created, user sees their solo constellation (their dot, glowing)

### Joining a Challenge
1. Recipient taps the share link → opens thirty (or App Store if not installed)
2. App processes the CloudKit share URL → auto-joins the challenge
3. Brief welcome overlay: *"you've joined [challenge name]. breathe together, you will."*
4. Challenge appears on their ChallengeScreen

### Daily Loop
1. User opens app → StartScreen shows challenge indicator (e.g., "2/5 breathed today" below streak)
2. User taps "begin" → completes session as normal
3. On session complete, their dot lights up in the constellation for all members
4. Push notification sent to other members: *"seth just breathed. your turn?"*
5. As others complete, dots light up in real-time via CloudKit subscription

### Viewing Challenges
1. ChallengeScreen shows all active challenges (max 3 active at once)
2. Each challenge shows the constellation — a ring of dots, one per member
3. Tapping a challenge shows detail: member names, group streak, mute toggle

---

## Screen Designs

### ChallengeScreen (new screen)

```
┌─────────────────────────────┐
│                             │
│       breathe together      │  ← Instrument Serif, 36px
│                             │
│     ┌───────────────────┐   │
│     │                   │   │
│     │    ◉   ○   ◉     │   │  ← constellation ring
│     │  ○    name    ◉   │   │     ◉ = breathed today (purple glow)
│     │    ◉   ○   ○     │   │     ○ = not yet (dim)
│     │                   │   │     center = challenge name
│     └───────────────────┘   │
│                             │
│      4 of 6 breathed today  │  ← DM Sans, textDim
│      group streak: 12 days  │  ← warm gold
│                             │
│   ┌───────────────────────┐ │
│   │  the morning crew  ›  │ │  ← challenge card (tappable)
│   └───────────────────────┘ │
│   ┌───────────────────────┐ │
│   │  stillness squad  ›   │ │  ← second challenge
│   └───────────────────────┘ │
│                             │
│    ┌─────────────────────┐  │
│    │  start a challenge  │  │  ← accent border, pill button
│    └─────────────────────┘  │
│                             │
│           back              │  ← underline link
│                             │
└─────────────────────────────┘
```

### Challenge Detail (overlay/modal)

```
┌─────────────────────────────┐
│                             │
│      the morning crew       │  ← Instrument Serif, editable
│      started 14 days ago    │
│                             │
│         ◉  Seth ✓           │  ← member list with status
│         ◉  Maya ✓           │
│         ○  Jordan           │
│         ○  Alex             │
│         ◉  Sam ✓            │
│                             │
│      group streak: 12       │  ← only counts days ALL completed
│      your streak: 14        │
│                             │
│   ┌─────────────────────┐   │
│   │   invite someone    │   │  ← share button (if < 10 members)
│   └─────────────────────┘   │
│                             │
│   notifications: on    ○──  │  ← mute toggle
│                             │
│   leave challenge            │  ← subtle, destructive
│                             │
│           back              │
│                             │
└─────────────────────────────┘
```

### StartScreen Addition

Below the existing streak row, add a challenge summary:

```
  14 day streak ›
  the morning crew — 4/6 breathed today    ← new line, tappable
```

---

## Data Model (CloudKit)

### Record Types

**CKChallenge** (shared via CKShare)
| Field | Type | Description |
|-------|------|-------------|
| name | String | Challenge display name |
| createdAt | Date | When challenge was created |
| creatorName | String | Display name of creator |
| maxMembers | Int | Always 10 |

**CKChallengeEntry** (one per member per day)
| Field | Type | Description |
|-------|------|-------------|
| challengeRef | CKReference | → CKChallenge |
| date | String | ISO date "2026-05-12" |
| completedAt | Date | When session was completed |
| memberName | String | Display name |

### CloudKit Zones & Sharing

- Each challenge lives in a **shared zone** owned by the creator
- Creator invites others via `CKShare` → generates a shareable URL
- Participants accept the share → get read/write access to the zone
- `CKChallengeEntry` records are created by each participant in the shared zone
- `CKSubscription` on `CKChallengeEntry` sends silent pushes when new entries appear

### Privacy

- Only the member's chosen display name is shared (prompted once on first challenge)
- Only daily completion status is visible (not session duration, pattern, or time)
- No location, no device info, no usage analytics
- Data stays in iCloud — Anthropic/thirty never sees it

---

## CloudKit Implementation

### New Files

```
src/
  services/
    cloudkit.ts           — CloudKit init, zone management, sharing
    challengeSync.ts      — Read/write challenge data, subscriptions
  screens/
    ChallengeScreen.tsx   — Challenge list + constellation view
    ChallengeDetail.tsx   — Single challenge detail/settings
  components/
    Constellation.tsx     — Animated ring of member dots
    ChallengeCard.tsx     — Challenge list item
  utils/
    challengeNames.ts     — Fun auto-generated challenge names
```

### Native Bridge Required

CloudKit requires a native Swift module bridged to React Native:

```swift
// ios/ThirtyCloudKit/ThirtyCloudKitModule.swift
// Exposes to RN:
//   - createChallenge(name) → shareURL
//   - acceptShare(url) → challengeID
//   - getChallengMembers(challengeID) → [Member]
//   - getTodayCompletions(challengeID) → [Completion]
//   - recordCompletion(challengeID)
//   - subscribeToChallenge(challengeID) → push on new entries
//   - leaveChallenge(challengeID)
```

### Push Notifications

CloudKit silent pushes trigger when a new `CKChallengeEntry` is saved by any member. The app receives this via `CKSubscription` and:

1. Updates the constellation UI in real-time (if app is open)
2. Fires a local notification with the member's name: *"maya just breathed. your turn?"*
3. User can mute per-challenge (stored locally in AsyncStorage)

---

## Constellation Animation

The constellation is the visual centerpiece — a ring of circles representing group members.

### Layout
- Circles arranged in an even ring (like a clock face)
- Size: 40px per dot, ring radius scales with member count (3-10 members)
- Your dot is slightly larger (48px) and positioned at 12 o'clock

### States
| State | Visual |
|-------|--------|
| Not yet practiced | Dim outline circle, `borderFaint` color |
| Practiced today | Filled purple (`accent`), subtle glow shadow |
| Your dot (not practiced) | Warm gold outline, slightly larger |
| Your dot (practiced) | Filled warm gold, glow, gentle pulse animation |
| All members complete | All dots pulse once together, brief celebratory haptic |

### Animation
- When a new completion comes in, that dot animates: scale 0→1.1→1.0 with opacity fade-in (400ms)
- Use RN Animated API (not reanimated) — consistent with BreathCircle decision
- Idle state: dots have a very subtle "breathing" scale (0.97→1.03, 6s cycle)

---

## Challenge Names Generator

Auto-generated fun names for challenges. Users can edit.

```typescript
const prefixes = [
  'the', 'team', 'club', 'squad', 'crew',
];

const adjectives = [
  'morning', 'midnight', 'silent', 'still', 'calm',
  'gentle', 'cosmic', 'tiny', 'peaceful', 'brave',
];

const nouns = [
  'crew', 'circle', 'squad', 'breathers', 'collective',
  'monks', 'seekers', 'stillness', 'pause', 'calm',
];

// Examples: "the morning crew", "club calm", "team stillness"
```

---

## Notification Copy

Playful, low-pressure, fits the Yoda-style voice:

**When someone completes:**
- *"seth just breathed. your turn?"*
- *"maya found 30 seconds. can you?"*
- *"breathed, jordan has. behind, are you?"*

**Group milestones (Yoda voice):**
- Day 1: *"begun together, you have"*
- Day 7: *"one week. stronger together, you are"*
- Day 30: *"thirty days. a collective, you've become"*

**Gentle nudge (6 PM, if others completed but you haven't):**
- *"4 of 5 breathed today. 30 seconds away, you are"*

---

## Access Model

- **Challenges are free for everyone** — no paywall on creating or joining
- Free-tier users can participate fully (create, join, see constellation, get notifications)
- This is a retention/virality feature, not a monetization one
- Premium features (longer durations, patterns, sounds) remain behind the $4.99 unlock independently

---

## Display Name Prompt

Triggered **once**, the first time a user enters a social context:
- Tapping "start a challenge", OR
- Accepting a share link to join a challenge

### Overlay Design
```
┌─────────────────────────────┐
│                             │
│     what should we          │  ← Instrument Serif, 32px
│     call you?               │
│                             │
│   ┌───────────────────────┐ │
│   │ Seth Miller           │ │  ← pre-filled from device name
│   └───────────────────────┘ │
│                             │
│   this is what your         │  ← DM Sans, textDim, 13px
│   challenge group will see  │
│                             │
│   ┌───────────────────────┐ │
│   │       continue        │ │  ← accent pill button
│   └───────────────────────┘ │
│                             │
└─────────────────────────────┘
```

- Pre-fill with device owner name via `UIDevice.current.name` (native bridge)
- Stored in iCloud key-value store (`NSUbiquitousKeyValueStore`) so it syncs across devices
- Editable later from ChallengeDetail screen (settings gear or name tap)
- Two-letter initials derived from display name (first letter of first + last word)
- Validation: 2-30 characters, no empty strings

---

## Share Links & Universal Links

### When app IS installed
- Share link is a CloudKit share URL (`https://www.icloud.com/share/...`)
- iOS intercepts and opens thirty directly via Universal Links
- App processes the share via `CKAcceptSharesOperation` → auto-joins the challenge
- User sees welcome overlay: *"you've joined [name]. breathe together, you will."*

### When app is NOT installed
- Configure Associated Domains + `apple-app-site-association` file
- CloudKit share URL falls back to a lightweight web page
- Web page shows thirty branding + "Get thirty on the App Store" button
- Button links to `https://apps.apple.com/app/id6760586218`
- After install, iOS will re-trigger the share link on first open (deferred deep link via CloudKit)

### Implementation
- Add `com.apple.developer.associated-domains` entitlement: `applinks:thirty.app` (or whatever domain)
- Host `apple-app-site-association` at `https://thirty.app/.well-known/apple-app-site-association`
- Alternatively, CloudKit share URLs handle fallback natively — the icloud.com page shows a "download the app" prompt when the app isn't installed. This may be sufficient without a custom domain.

---

## Limits & Rules

- Max **3 active challenges** per user (prevents notification fatigue)
- Max **10 members** per challenge
- Challenge creator can remove members
- Any member can leave at any time
- If creator leaves, ownership transfers to longest-active member
- Challenges with 1 member for 30+ days auto-archive
- Group streak only counts days where ALL members completed
- Display names are required (prompted once, stored in iCloud key-value store)
- **Challenges are free** — no purchase required to create or join

---

## Integration Points

### Session Completion (BreathScreen → DoneScreen)
After `recordSession()` in App.tsx `handleFinish`:
```typescript
// Existing
await recordSession(prefs.duration);
await updateWidget(streak);

// New
await recordChallengeCompletions(); // writes CKChallengeEntry for all active challenges
```

### StartScreen
- Add challenge summary row below streak
- Tapping navigates to ChallengeScreen

### App.tsx
- Add 'challenge' and 'challengeDetail' to Screen type
- Add ChallengeScreen + ChallengeDetail to navigator
- Register for CloudKit push notifications on launch

---

## Implementation Order

1. **Native CloudKit bridge** — Swift module with create/join/read/write/subscribe
2. **Constellation component** — animated ring of dots
3. **ChallengeScreen** — list view with create flow
4. **ChallengeDetail** — member list, settings, share
5. **Session integration** — write completions on session end
6. **Push notifications** — CloudKit subscriptions → local notifications
7. **StartScreen integration** — challenge summary row
8. **Fun polish** — name generator, Yoda notifications, group milestones, haptics

---

## CloudKit Entitlements

Already in place:
- App Groups: `group.com.thirty.app` ✓

Need to add:
- CloudKit container: `iCloud.com.thirty.app`
- Push Notifications entitlement (for CKSubscription)
- Add `com.apple.developer.icloud-services` to entitlements
- Add CloudKit to app.json plugins or native entitlements

---

## Risk Notes

- **CloudKit has no Android support** — this is fine since thirty is iOS-only
- **Share links require iOS 15+** — thirty already requires iOS 15+ via Expo SDK 55
- **CloudKit quota** — free tier is generous (100MB asset storage, 40MB database per user). Daily completions are tiny records, well within limits
- **Offline handling** — CloudKit has built-in offline queue. Completions sync when connectivity returns
- **Apple Review** — CloudKit is an Apple-native framework, unlikely to cause review issues. No new privacy declarations needed beyond existing notification permission
