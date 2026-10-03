# FAWA Winter Arc App

A complete, production-quality, offline-first mobile app designed for students and builders in India training at home through winter. Built with Expo, React Native, TypeScript, and SQLite.

---

## ⚡ Core Features

- **60-Day Adaptive Program:** Tailored to level (Beginner or Intermediate) and Asian-Indian BMI bands. Linear dose interpolation with built-in Deload (Weeks 4 & 8) and Taper (Days 57–59).
- **The Signature "Charge Button":** Custom Reanimated button with 0.96 press spring, yellow spark ripple, 3-second breathing glow, and checkmark morph.
- **Hold-to-Confirm ("Hold Button"):** Prevents accidental dismissals with a 600ms yellow sweep fill and soft shake on premature release.
- **Precision Reminders & Alarms:** High-importance Android notification channel for wake and bedtime alarms, interactive actions, and rolling 7-day schedules capped under the iOS 64-notification limit.
- **Quick Capture Hub:** 2-tap capture for notes, cues, and time presets (`In 10m`, `In 30m`, `In 1h`, `Tonight`, `Tomorrow`). Live timers and checklist items with undo deletion.
- **Workout Player:** Full-screen player with `expo-keep-awake`, section tabs (Warm-up, Main, Core, Cool-down), set steppers, rest countdown with audio/haptics, exercise swaps, and a safety "Something hurts" button.
- **Morning Readiness Check-In:** Daily 3-tap check (sleep, soreness, mood). Switches poor-readiness days to Active Recovery with an override option.
- **Test Battery Checkpoints:** Identical battery on Days 1, 15, 30, and 60 (2km run, push-ups, squats in 60s, plank, wall sit, dead hang, resting HR, weight, waist, front/side/back photos).
- **Offline-First Data Sovereignty:** Zero cloud tracking, no logins. All data stored locally in SQLite (`fawa.db` with WAL mode) with full JSON backup export and restore.
- **Green & Yellow Design System:** Forest greens ground the UI, electric green `#2BE36B` drives primary action, and warm yellow `#FFD60A` signals attention and alarms. Phase color temperatures shift across the 60 days.

---

## 🛠 Tech Stack

- **Framework:** Expo SDK 53, React Native, TypeScript (strict mode)
- **Routing:** Expo Router (File-based navigation)
- **Local Storage:** `expo-sqlite` (versioned WAL migrations) & `@react-native-async-storage/async-storage` (UI flags)
- **State Management:** Zustand
- **Animations & Gestures:** `react-native-reanimated`, `react-native-gesture-handler`
- **Charts & UI:** `react-native-svg` (custom Progress Ring and Line Charts)
- **Notifications & Alarms:** `expo-notifications`, `expo-keep-awake`, `expo-audio`, `expo-haptics`
- **Files & Media:** `expo-file-system`, `expo-sharing`, `expo-image-picker`, `expo-location`

---

## 🚀 Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Run Pure Logic Unit Tests
```bash
npm test
```
All 6 pure engine test suites verify BMI formulas, level tests, dose math, safety checks, checkpoints, and reminder rules.

### 3. Start Expo Development Server
```bash
npm start
```
Run on Android or iOS via development build:
```bash
npm run android
npm run ios
```

---

## 📂 Project Structure

```
fawa-app/
├── app/                      # Expo Router screens
│   ├── _layout.tsx           # Root layout (fonts, SQLite init, stores)
│   ├── index.tsx             # Initial redirection (onboarding vs tabs)
│   ├── (tabs)/               # Bottom tab navigation
│   │   ├── _layout.tsx       # Tab bar with center + Quick Capture button
│   │   ├── today.tsx         # Today screen (Progress ring, readiness, cards)
│   │   ├── plan.tsx          # 60-day calendar grid & exercise library
│   │   ├── capture.tsx       # Notes & reminder smart sections
│   │   └── progress.tsx      # Trend charts, streak flame, test history
│   ├── onboarding/           # 7-step onboarding flow
│   ├── player/[dayId].tsx    # Full-screen workout player
│   ├── alarm/[reminderId].tsx# Full-screen alarm with Hold Button
│   ├── test/[dayNumber].tsx  # Test battery logger & stopwatch
│   └── settings/             # Settings, notification health, backup/restore
├── src/
│   ├── data/                 # Complete exercise library (40+ exercises)
│   ├── db/                   # SQLite database singleton & migrations
│   ├── engine/               # Pure logic: BMI, level, dose, safety, plan
│   ├── services/             # Notifications, alarms, backup, AQI
│   ├── store/                # Zustand stores (UI, profile, plan, workout, reminder)
│   ├── theme/                # Color tokens, typography, spacing
│   ├── types/                # Complete TypeScript domain interfaces
│   └── ui/                   # ChargeButton, HoldButton, ProgressRing, etc.
├── __tests__/engine/         # Pure logic Jest test suites
├── DECISIONS.md              # Technical and design decisions log
└── TESTING.md                # Test execution and acceptance checklist
```

---

## 📄 License
Private and offline. Built for personal discipline during the Winter Arc.
