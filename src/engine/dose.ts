import type { ExerciseDose, Level, BMIBand } from '@/src/types';

// ─── Linear interpolation helpers ─────────────────────────────────────────────

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function roundToStep(value: number, step: number): number {
  return Math.round(value / step) * step;
}

// ─── Dose interpolation ──────────────────────────────────────────────────────

/**
 * Linearly interpolate between Day 1 and Day 60 doses for a given day.
 * Reps → nearest 1, holds → nearest 5 s, minutes → nearest 1.
 */
export function interpolateDose(
  day1: ExerciseDose,
  day60: ExerciseDose,
  dayNumber: number,
): ExerciseDose {
  const t = clamp((dayNumber - 1) / 59, 0, 1);
  const result: ExerciseDose = {
    sets: Math.round(lerp(day1.sets, day60.sets, t)),
  };
  if (day1.reps !== undefined && day60.reps !== undefined) {
    result.reps = Math.max(1, roundToStep(lerp(day1.reps, day60.reps, t), 1));
  }
  if (day1.seconds !== undefined && day60.seconds !== undefined) {
    result.seconds = Math.max(5, roundToStep(lerp(day1.seconds, day60.seconds, t), 5));
  }
  if (day1.minutes !== undefined && day60.minutes !== undefined) {
    result.minutes = Math.max(1, roundToStep(lerp(day1.minutes, day60.minutes, t), 1));
  }
  return result;
}

// ─── Modifiers ───────────────────────────────────────────────────────────────

/** Deload: always 2 sets, cardio duration cut by ~30%. */
export function applyDeload(dose: ExerciseDose): ExerciseDose {
  return {
    ...dose,
    sets: 2,
    minutes: dose.minutes !== undefined ? Math.max(1, Math.round(dose.minutes * 0.7)) : undefined,
  };
}

/** Taper (Days 57–59): 75% of sets, 85% of reps. */
export function applyTaper(dose: ExerciseDose): ExerciseDose {
  return {
    ...dose,
    sets: Math.max(2, Math.floor(dose.sets * 0.75)),
    reps: dose.reps !== undefined ? Math.max(1, Math.floor(dose.reps * 0.85)) : undefined,
  };
}

/**
 * Double progression: after 2 sessions at top of rep range, move up.
 * For reps: +1 rep per set.  For holds: +5 s.
 * Returns the adjusted dose and whether progression occurred.
 */
export function applyDoubleProgression(
  dose: ExerciseDose,
  progressionHits: number,
): { dose: ExerciseDose; progressed: boolean } {
  if (progressionHits < 2) return { dose, progressed: false };
  const next: ExerciseDose = { ...dose };
  if (next.reps !== undefined) next.reps += 1;
  if (next.seconds !== undefined) next.seconds += 5;
  return { dose: next, progressed: true };
}

// ─── Rep range ───────────────────────────────────────────────────────────────

/** Returns a ±2 rep range around the target.  Null for timed exercises. */
export function getRepRange(dose: ExerciseDose): { min: number; max: number } | null {
  if (dose.reps === undefined) return null;
  return { min: Math.max(1, dose.reps - 2), max: dose.reps };
}

// ─── Full dose pipeline ──────────────────────────────────────────────────────

export interface DoseContext {
  level: Level;
  bmiBand: BMIBand | null;
  dayNumber: number;
  isDeload: boolean;
  isTaper: boolean;
  progressionHits: number;
}

/**
 * Compute the final planned dose for a given exercise and context.
 * Pipeline: interpolate → deload → taper → double progression.
 */
export function computeDose(
  day1: ExerciseDose,
  day60: ExerciseDose,
  ctx: DoseContext,
): { dose: ExerciseDose; progressed: boolean } {
  let dose = interpolateDose(day1, day60, ctx.dayNumber);
  if (ctx.isDeload) dose = applyDeload(dose);
  else if (ctx.isTaper) dose = applyTaper(dose);
  const { dose: final, progressed } = applyDoubleProgression(dose, ctx.progressionHits);
  return { dose: final, progressed };
}
