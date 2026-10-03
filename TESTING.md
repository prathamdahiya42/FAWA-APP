# FAWA Winter Arc App — Testing & Acceptance Guide

This document describes how to execute automated unit tests and perform manual verification against the product acceptance checklist.

---

## 1. Automated Pure Logic Unit Tests

All pure engine calculations (BMI, level placement, dose interpolation, deload/taper math, safety rules, reminder schedules, checkpoint evaluations) are covered by automated unit tests in `__tests__/engine/`.

### Run tests:
```bash
npm test
```

### Test Suites Included:
1. `__tests__/engine/bmi.test.ts` — Tests BMI calculation, Asian-Indian cutoffs, pediatric gates, cardio:strength ratios, run progression multipliers, weight & waist target ranges.
2. `__tests__/engine/level.test.ts` — Tests placement test scoring, beginner vs. intermediate boundaries, age 16 gate, auto-promotion criteria, rest interval bounds.
3. `__tests__/engine/dose.test.ts` — Tests linear dose interpolation, deload modifier (sets capped at 2, cardio × 0.7), taper modifier (75% sets, 85% reps), and double progression rule (+1 rep / +5s after 2 sessions).
4. `__tests__/engine/safety.test.ts` — Tests medical clearance rules, high-impact unlocks for overweight/obese bands, run condition checks (AQI > 150, foggy before sunrise, cold weather), pain severity classifications.
5. `__tests__/engine/checkpoint.test.ts` — Tests weighted checkpoint scoring (≥90% advance, 70-89% continue, <70% repeat), missed session volume reduction, performance targets interpolation.
6. `__tests__/engine/reminder-rules.test.ts` — Tests default reminder generation, rolling 7-day scheduler (capped under iOS 64 limit), quick capture offsets (`in10`, `in30`, `in1hr`, `tonight`, `tomorrow`), snooze calculation, quiet hours checking.

---

## 2. Acceptance Checklist (Section 17 Verification)

Before signing off, verify each of the following 13 items end-to-end:

| # | Acceptance Criterion | Verification Method |
|---|----------------------|---------------------|
| 1 | **Onboarding completes & generates 60 days** | Run onboarding from Welcome to Start. Check SQLite `plan_days` table has 60 records created. |
| 2 | **Level & BMI band match profile** | Input height 175cm, weight 75kg, age 24. Verify BMI is 24.5 and band is Overweight. |
| 3 | **Today screen shows correct day** | Launch app after onboarding. Confirm header displays Day 1 of 60, Foundation phase, streak flame, and today's session CTA. |
| 4 | **Workout player logs sets & rest** | Start workout. Tap through sets. Verify rep steppers increment, rest countdown triggers with haptics, and finish logs to SQLite. |
| 5 | **Pain button behavior** | During an active exercise, tap "⚠️ Hurts?". Confirm medical warning appears, session can be safely exited or swapped. |
| 6 | **Reminder engine & channels** | Visit Settings → Notification Health. Tap "Send Test Alarm". Confirm Android channel or iOS banner sounds. |
| 7 | **Full-screen alarm** | Open `/alarm/test`. Verify big time display, Hold Button dismisses with 600ms sweep, and Snooze adds 10 minutes. |
| 8 | **Quick capture in 2 taps** | Tap centre `+` button from any tab. Type note, tap `In 10m`, tap Save. Confirm toast appears with scheduled time. |
| 9 | **Capture hub smart sections** | Open Capture tab. Confirm notes are grouped into Now (Due), Next Hour, Later Today, Tomorrow, and Done. |
| 10 | **Sleep & Hydration logging** | On Today screen, tap `+1 Glass` (verifies count increments) and `I'm in bed` / `I'm up` (verifies sleep duration). |
| 11 | **Test battery checkpoints** | Open Progress tab → Tap Day 1 Test. Fill in stopwatch, push-ups, squats, and photos. Confirm saved to SQLite. |
| 12 | **Deload & Taper volume reduction** | Check Days 22–28 and Days 57–59 in Plan. Verify sets are capped at 2 and cardio duration is reduced. |
| 13 | **JSON backup & restore** | In Settings → Backup & Restore, tap "Export JSON Backup". Verify valid JSON export. Paste JSON to test restore. |
