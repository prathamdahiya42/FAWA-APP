import type { BMIBand, ImpactLevel, Level } from '@/src/types';
import { isHighImpactAllowed, requiresMedicalClearance } from './bmi';

export interface SafetyCheckInput {
  age: number;
  bmi: number;
  bmiBand: BMIBand | null;
  level: Level;
  hasCondition: boolean;
  dayNumber: number;
}

export type AgeGate = 'none' | 'no_intermediate' | 'no_loaded';

export interface SafetyCheckResult {
  requiresClearance: boolean;
  clearanceReason: 'health_condition' | 'bmi_above_30' | null;
  ageGate: AgeGate;
  showBMIBand: boolean;
}

export function runSafetyChecks(input: SafetyCheckInput): SafetyCheckResult {
  const { age, bmi, hasCondition } = input;

  const needsClearance = requiresMedicalClearance(bmi, hasCondition, age);
  let clearanceReason: SafetyCheckResult['clearanceReason'] = null;
  if (needsClearance) {
    clearanceReason = hasCondition ? 'health_condition' : 'bmi_above_30';
  }

  let ageGate: AgeGate = 'none';
  if (age < 16) ageGate = 'no_intermediate';
  else if (age < 18) ageGate = 'no_loaded';

  return {
    requiresClearance: needsClearance,
    clearanceReason,
    ageGate,
    showBMIBand: age >= 18,
  };
}

export interface ExercisePermission {
  allowed: boolean;
  reason: string | null;
  swapToId?: string;
}

/**
 * Check whether an exercise can be performed given current profile state.
 * Returns allowed=false with a user-facing reason when blocked.
 */
export function checkExercisePermission(
  impact: ImpactLevel,
  bmiBand: BMIBand | null,
  level: Level,
  dayNumber: number,
  age: number,
): ExercisePermission {
  if (impact === 'high' && bmiBand !== null) {
    const allowed = isHighImpactAllowed(bmiBand, level, dayNumber);
    if (!allowed) {
      const unlockDay =
        bmiBand === 'obese' ? 31 :
        bmiBand === 'overweight' ? 16 : 16;
      return {
        allowed: false,
        reason: `High-impact exercises are available from Day ${unlockDay} for your profile. Using the low-impact version instead.`,
      };
    }
  }
  return { allowed: true, reason: null };
}

export interface RunConditionResult {
  warning: string | null;
  swapToIndoor: boolean;
  addWarmupMinutes: number; // extra warm-up minutes (cold weather rule)
}

export function checkRunConditions(options: {
  aqiLevel: number | null;
  isFoggy: boolean;
  isBeforeSunrise: boolean;
  coldWeather: boolean;
}): RunConditionResult {
  const { aqiLevel, isFoggy, isBeforeSunrise, coldWeather } = options;

  if (aqiLevel !== null && aqiLevel > 150) {
    return {
      warning: `AQI is ${aqiLevel} — moving cardio indoors today.`,
      swapToIndoor: true,
      addWarmupMinutes: 0,
    };
  }

  if (isFoggy && isBeforeSunrise) {
    return {
      warning: 'Poor visibility outside before sunrise. Using the indoor alternative.',
      swapToIndoor: true,
      addWarmupMinutes: 0,
    };
  }

  if (coldWeather) {
    return {
      warning: 'Cold weather: do 10 min of indoor warm-up before going out. Wear layers, cover ears and hands.',
      swapToIndoor: false,
      addWarmupMinutes: 4, // extend warm-up to 10 min total
    };
  }

  return { warning: null, swapToIndoor: false, addWarmupMinutes: 0 };
}

/** Classify a pain report */
export type PainSeverity = 'soreness' | 'sharp' | 'joint' | 'chest';

export function isPainSeriousEnoughToStop(severity: PainSeverity): boolean {
  return severity === 'sharp' || severity === 'joint' || severity === 'chest';
}

export const PAIN_DOCTOR_ADVICE =
  'Sharp, joint or chest pain means stop immediately. ' +
  'Seek medical advice if pain persists. ' +
  'Do not continue training on that area today.';

export const SORENESS_ADVICE =
  'Muscle soreness 24–48 hours after exercise is normal. ' +
  'Keep the same session or switch to active recovery.';
