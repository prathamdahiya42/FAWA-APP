# FAWA Winter Arc App — Architecture & Design Decisions

This document logs all domain defaults, system architecture decisions, and design trade-offs made during development.

---

## 1. Native Build vs. PWA Fallback
- **Decision:** Built as native Expo with custom native configuration (EAS Build / development build).
- **Rationale:** Native development build is required to configure Android Max-importance alarm channels (`android.permission.SCHEDULE_EXACT_ALARM`, `USE_EXACT_ALARM`, `RECEIVE_BOOT_COMPLETED`), looping audio, and full-screen alarm activities.
- **Alarm Feature Degradation Notes (iOS & Web):**
  - **iOS:** iOS has no system-level full-screen alarm API accessible to third-party apps. We implement time-sensitive notifications with audio and rolling 7-day schedules (capped under the 64-notification platform limit at 50).
  - **PWA (if run in browser):** Background alarms are limited by browser sleep policies; notifications require active web-push service worker registration.

## 2. Anthropometric & Health Engine
- **Asian-Indian BMI Cut-offs:**
  - Underweight: `< 18.5`
  - Normal: `18.5 – 22.9`
  - Overweight: `23.0 – 24.9`
  - Obese: `≥ 25.0`
- **Age Gating:**
  - Ages `< 16`: Always defaults to Beginner program; Intermediate program is locked.
  - Ages `< 18`: Loaded exercise variations and BMI bands are hidden to comply with pediatric fitness guidelines.
- **Medical Clearance Rule:**
  - Clearance notice displayed if `hasHeartOrJointCondition === true` OR `BMI ≥ 30` (for adults). User must explicitly acknowledge before training.

## 3. Training & Dose Engine
- **Cardio : Strength Time-Share Ratio:**
  - Underweight: 25% cardio / 75% strength
  - Normal: 40% cardio / 60% strength
  - Overweight: 50% cardio / 50% strength
  - Obese: 50% cardio / 50% strength
- **Dose Interpolation:**
  - Linear progression from Day 1 to Day 60 doses.
  - Reps rounded to nearest 1, timed holds rounded to 5 seconds, cardio rounded to 1 minute.
- **Deload & Taper Schedules:**
  - Deload: Days 22–28 and Days 50–56. Dose modifier: sets capped at 2, cardio minutes reduced by 30%.
  - Taper: Days 57–59. Dose modifier: 75% of sets, 85% of reps.
  - Test Days: Days 15, 30, and 60. Day before each test (14, 29, 59) is an Easy/Recovery session.
- **Double Progression:**
  - When the user hits the top of their rep range for 2 consecutive sessions on an exercise, reps increment by +1 or hold increments by +5s.
- **High-Impact Unlocks:**
  - Obese: Day 31+
  - Overweight: Day 16+
  - Beginner: Day 16+ (jump squats and high-impact cardio)

## 4. Database & Storage Architecture
- **expo-sqlite:**
  - Single database `fawa.db` running in WAL (`Write-Ahead Logging`) mode.
  - Fully versioned idempotent migrations table (`schema_version`).
  - Stores all persistent business entities: `user_profile`, `plan_days`, `exercises`, `workout_logs`, `test_results`, `body_metrics`, `reminders`, `notes`, `sleep_logs`, `hydration_logs`, `readiness_checks`.
- **AsyncStorage:**
  - Stores ephemeral UI states and flags: theme override (`'dark' | 'light' | null`), haptic toggle, reduce motion flag, onboarding completion flag (`@fawa_onboarding`).
- **Zustand:**
  - In-memory state management (`profile.store`, `plan.store`, `workout.store`, `reminder.store`, `ui.store`).

## 5. UI/UX & Design Tokens
- **Theme Palette:**
  - Dark Mode (Default): Background `#07110A`, Surface `#0D1C12`, Surface 2 `#14281A`, Line `#1F3A28`, Text `#EEF9E8`, Text Muted `#8DAE95`, Primary Action Green `#2BE36B`, Reward/Alarm Yellow `#FFD60A`, Safety/Stop `#FF6B5E`.
  - Light Mode: Background `#F5FAEC`, Surface `#FFFFFF`, Surface 2 `#EAF4DC`, Line `#D3E5C0`, Text `#0E2414`, Text Muted `#4F6B57`, Green `#14A84D`, Yellow `#F5C400`, Safety `#D93F32`.
- **Phase Accent Temperature Shift:**
  - Foundation: Green-dominant (`#2BE36B` to `#14A84D`)
  - Build: Green with Yellow accents (`#2BE36B` to `#FFD60A`)
  - Intensify: Balanced (`#1FF05A` to `#FFD60A`)
  - Peak: Yellow-dominant (`#FFD60A` to `#2BE36B`)
- **Charge Button & Hold Button:**
  - Primary CTA: Charge Button with touch scale spring to 0.96, light haptic feedback, yellow spark ripple, and 3-second idle breathing glow.
  - Destructive / Confirmations: Hold Button requiring a continuous 600ms press with yellow sweep fill and soft shake on premature release.
- **Touch Target Accessibility:**
  - Minimum 48dp on all interactive elements across every screen.

## 6. Offline-First Privacy & Community Flag
- **Zero Cloud / No Login:** No account creation or remote servers. All personal metrics and logs stay on the local device.
- **JSON Backup:** Full database export and import provided via `expo-file-system` and `expo-sharing`.
- **Community Feature Flag:**
  - `FEATURE_COMMUNITY = false` in v1.0.0. Fully hidden from navigation to maintain privacy and offline purity.
