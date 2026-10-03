import type { BMIBand, Level } from '@/src/types';

// ─── Asian-Indian cut-offs ────────────────────────────────────────────────────

/**
 * Calculate BMI. Formula: weight(kg) / height(m)².
 * Rounded to 1 decimal place.
 */
export function calculateBMI(weightKg: number, heightCm: number): number {
  const heightM = heightCm / 100;
  return Math.round((weightKg / (heightM * heightM)) * 10) / 10;
}

/**
 * Asian-Indian BMI cut-offs (stricter than Western).
 * Returns null for under-18 — BMI bands are hidden for minors.
 */
export function getBMIBand(bmi: number, age: number): BMIBand | null {
  if (age < 18) return null;
  if (bmi < 18.5) return 'underweight';
  if (bmi < 23.0) return 'normal';
  if (bmi < 25.0) return 'overweight';
  return 'obese';
}

/**
 * True when the user must acknowledge medical clearance before starting.
 * Conditions: BMI ≥ 30, OR heart/joint condition flag.
 * Age gate is separate — under-18 are handled differently.
 */
export function requiresMedicalClearance(
  bmi: number,
  hasCondition: boolean,
  age: number,
): boolean {
  if (age < 18) return false;
  if (hasCondition) return true;
  if (bmi >= 30) return true;
  return false;
}

export function canUseIntermediateProgram(age: number): boolean {
  return age >= 16;
}

export function canUseLoadedVariations(age: number): boolean {
  return age >= 18;
}

export function shouldShowBMIBand(age: number): boolean {
  return age >= 18;
}

/** Cardio : strength ratio as [cardioPercent, strengthPercent] */
export function getCardioStrengthRatio(band: BMIBand): [number, number] {
  switch (band) {
    case 'underweight': return [25, 75];
    case 'normal':      return [40, 60];
    case 'overweight':  return [50, 50];
    case 'obese':       return [50, 50];
  }
}

/**
 * Multiplier applied to run pace/distance targets for a given band.
 * overweight → 10% slower, obese → 20% slower.
 */
export function getRunProgressionMultiplier(band: BMIBand): number {
  switch (band) {
    case 'underweight': return 1.0;
    case 'normal':      return 1.0;
    case 'overweight':  return 1 / 1.1;  // 10% slower ≈ 0.909
    case 'obese':       return 1 / 1.2;  // 20% slower ≈ 0.833
  }
}

/**
 * Returns the last day on which HIGH-impact exercises are blocked.
 * Exercises become available from the day AFTER this value.
 */
export function getHighImpactUnlockDay(band: BMIBand, level: Level): number {
  if (band === 'obese')       return 30;  // unlock Day 31
  if (band === 'overweight')  return 15;  // unlock Day 16
  if (level === 'beginner')   return 15;  // beginners: jump squats from Day 16
  return 0; // intermediate normal/underweight: allowed immediately
}

export function isHighImpactAllowed(
  band: BMIBand,
  level: Level,
  dayNumber: number,
): boolean {
  return dayNumber > getHighImpactUnlockDay(band, level);
}

// ─── Weight targets (ranges, never promises) ──────────────────────────────────

export type WeightTargetResult = {
  min: number;
  max: number;
  direction: 'gain' | 'lose' | 'stable';
};

export function getWeightTarget(
  band: BMIBand,
  byDay: 15 | 30 | 60,
): WeightTargetResult {
  const table: Record<BMIBand, Record<15 | 30 | 60, WeightTargetResult>> = {
    underweight: {
      15: { min: 0.3, max: 0.7, direction: 'gain' },
      30: { min: 0.8, max: 1.2, direction: 'gain' },
      60: { min: 1.5, max: 2.5, direction: 'gain' },
    },
    normal: {
      15: { min: -0.5, max: 0.5, direction: 'stable' },
      30: { min: -1.0, max: 1.0, direction: 'stable' },
      60: { min: -1.0, max: 1.0, direction: 'stable' },
    },
    overweight: {
      15: { min: -1.5, max: -0.5, direction: 'lose' },
      30: { min: -2.5, max: -1.5, direction: 'lose' },
      60: { min: -4.0, max: -3.0, direction: 'lose' },
    },
    obese: {
      15: { min: -2.0, max: -1.0, direction: 'lose' },
      30: { min: -4.0, max: -2.0, direction: 'lose' },
      60: { min: -6.0, max: -4.0, direction: 'lose' },
    },
  };
  return table[band][byDay];
}

export function getWaistTarget(
  band: BMIBand,
  byDay: 15 | 30 | 60,
): { min: number; max: number } | null {
  const table: Partial<Record<BMIBand, Record<15 | 30 | 60, { min: number; max: number }>>> = {
    normal:     { 15: { min: -1.5, max: -0.5 }, 30: { min: -2.5, max: -1.5 }, 60: { min: -3.5, max: -2.5 } },
    overweight: { 15: { min: -2.0, max: -1.0 }, 30: { min: -4.0, max: -2.0 }, 60: { min: -6.0, max: -4.0 } },
    obese:      { 15: { min: -2.5, max: -1.5 }, 30: { min: -5.0, max: -3.0 }, 60: { min: -8.0, max: -6.0 } },
  };
  return table[band]?.[byDay] ?? null;
}
