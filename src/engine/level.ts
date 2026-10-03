import type { Level } from '@/src/types';

export interface PlacementTestInput {
  twoKmTimeSecs: number | null;   // null = not measured
  maxPushUps: number | null;
  plankSeconds: number | null;
  canRun20Min: boolean | null;
  age: number;
}

/**
 * Determine training level from placement test.
 *
 * Beginner if ANY condition is true.
 * Intermediate ONLY if ALL conditions are met AND age >= 16.
 * Missing data always defaults to Beginner (safest).
 */
export function determineLevelFromTest(input: PlacementTestInput): Level {
  const { twoKmTimeSecs, maxPushUps, plankSeconds, canRun20Min, age } = input;

  // Age gate
  if (age < 16) return 'beginner';

  // Any failure → beginner
  if (twoKmTimeSecs !== null && twoKmTimeSecs > 13 * 60) return 'beginner';
  if (maxPushUps !== null && maxPushUps < 15) return 'beginner';
  if (plankSeconds !== null && plankSeconds < 60) return 'beginner';
  if (canRun20Min === false) return 'beginner';

  // Missing data → beginner
  if (twoKmTimeSecs === null || maxPushUps === null || plankSeconds === null || canRun20Min === null) {
    return 'beginner';
  }

  return 'intermediate';
}

/**
 * Day 30 targets used for auto-promotion check.
 * All must be met to offer promotion.
 */
export const INTERMEDIATE_PROMO_TARGETS = {
  twoKmTimeSecs: 11 * 60,  // ≤ 11:00
  maxPushUps: 22,
  plankSeconds: 90,
  canRun20Min: true,
} as const;

/**
 * Returns true when a beginner qualifies for promotion to intermediate.
 * Promotion is NEVER silent — always show a confirmation sheet.
 */
export function qualifiesForPromotion(
  results: PlacementTestInput,
  currentLevel: Level,
): boolean {
  if (currentLevel !== 'beginner') return false;
  if (results.age < 16) return false;
  if (results.twoKmTimeSecs === null || results.twoKmTimeSecs > INTERMEDIATE_PROMO_TARGETS.twoKmTimeSecs) return false;
  if (results.maxPushUps === null || results.maxPushUps < INTERMEDIATE_PROMO_TARGETS.maxPushUps) return false;
  if (results.plankSeconds === null || results.plankSeconds < INTERMEDIATE_PROMO_TARGETS.plankSeconds) return false;
  if (!results.canRun20Min) return false;
  return true;
}

/** Rest interval in seconds by level */
export function getRestSeconds(level: Level): { min: number; max: number } {
  return level === 'beginner'
    ? { min: 45, max: 75 }
    : { min: 30, max: 60 };
}

/** Default rest for a given level (midpoint of range) */
export function getDefaultRestSeconds(level: Level): number {
  const { min, max } = getRestSeconds(level);
  return Math.round((min + max) / 2);
}
