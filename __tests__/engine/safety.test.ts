import {
  runSafetyChecks,
  checkExercisePermission,
  isPainSeriousEnoughToStop,
  type SafetyCheckInput,
  type PainSeverity,
} from '../../src/engine/safety';

// ─── runSafetyChecks ──────────────────────────────────────────────────────────

describe('runSafetyChecks', () => {
  const baseInput: SafetyCheckInput = {
    age: 20,
    bmi: 22,
    bmiBand: 'normal',
    level: 'beginner',
    hasCondition: false,
    dayNumber: 1,
  };

  it('healthy adult (age 20, bmi 22, no condition) — no clearance, no age gate, shows BMI', () => {
    const result = runSafetyChecks(baseInput);
    expect(result.requiresClearance).toBe(false);
    expect(result.clearanceReason).toBeNull();
    expect(result.ageGate).toBe('none');
    expect(result.showBMIBand).toBe(true);
  });

  it('requires clearance for BMI >= 30 with reason "bmi_above_30"', () => {
    const result = runSafetyChecks({ ...baseInput, bmi: 32, bmiBand: 'obese' });
    expect(result.requiresClearance).toBe(true);
    expect(result.clearanceReason).toBe('bmi_above_30');
  });

  it('requires clearance at exactly BMI = 30 (boundary)', () => {
    const result = runSafetyChecks({ ...baseInput, bmi: 30, bmiBand: 'obese' });
    expect(result.requiresClearance).toBe(true);
    expect(result.clearanceReason).toBe('bmi_above_30');
  });

  it('does NOT require clearance at BMI = 29.9 (just below threshold)', () => {
    const result = runSafetyChecks({ ...baseInput, bmi: 29.9, bmiBand: 'obese' });
    expect(result.requiresClearance).toBe(false);
  });

  it('requires clearance with reason "health_condition" when hasCondition=true', () => {
    const result = runSafetyChecks({ ...baseInput, hasCondition: true });
    expect(result.requiresClearance).toBe(true);
    expect(result.clearanceReason).toBe('health_condition');
  });

  it('"health_condition" reason takes priority over BMI when both apply', () => {
    const result = runSafetyChecks({ ...baseInput, bmi: 35, bmiBand: 'obese', hasCondition: true });
    expect(result.requiresClearance).toBe(true);
    expect(result.clearanceReason).toBe('health_condition');
  });

  it('age 14 → ageGate="no_intermediate", showBMIBand=false', () => {
    const result = runSafetyChecks({ ...baseInput, age: 14 });
    expect(result.ageGate).toBe('no_intermediate');
    expect(result.showBMIBand).toBe(false);
  });

  it('age 15 → ageGate="no_intermediate", showBMIBand=false', () => {
    const result = runSafetyChecks({ ...baseInput, age: 15 });
    expect(result.ageGate).toBe('no_intermediate');
    expect(result.showBMIBand).toBe(false);
  });

  it('age 16 → ageGate="no_loaded", showBMIBand=false', () => {
    const result = runSafetyChecks({ ...baseInput, age: 16 });
    expect(result.ageGate).toBe('no_loaded');
    expect(result.showBMIBand).toBe(false);
  });

  it('age 17 → ageGate="no_loaded", showBMIBand=false', () => {
    const result = runSafetyChecks({ ...baseInput, age: 17 });
    expect(result.ageGate).toBe('no_loaded');
    expect(result.showBMIBand).toBe(false);
  });

  it('age 18 → ageGate="none", showBMIBand=true (boundary)', () => {
    const result = runSafetyChecks({ ...baseInput, age: 18 });
    expect(result.ageGate).toBe('none');
    expect(result.showBMIBand).toBe(true);
  });

  it('age 30 → ageGate="none", showBMIBand=true', () => {
    const result = runSafetyChecks({ ...baseInput, age: 30 });
    expect(result.ageGate).toBe('none');
    expect(result.showBMIBand).toBe(true);
  });
});

// ─── checkExercisePermission ──────────────────────────────────────────────────

describe('checkExercisePermission', () => {
  it('high impact, obese band, day 15 → NOT allowed (unlock is day 31)', () => {
    const result = checkExercisePermission('high', 'obese', 'beginner', 15, 20);
    expect(result.allowed).toBe(false);
    expect(result.reason).not.toBeNull();
  });

  it('high impact, obese band, day 30 → NOT allowed (still locked)', () => {
    const result = checkExercisePermission('high', 'obese', 'beginner', 30, 20);
    expect(result.allowed).toBe(false);
  });

  it('high impact, obese band, day 31 → allowed (just unlocked)', () => {
    const result = checkExercisePermission('high', 'obese', 'beginner', 31, 20);
    expect(result.allowed).toBe(true);
    expect(result.reason).toBeNull();
  });

  it('high impact, obese band, day 60 → allowed', () => {
    const result = checkExercisePermission('high', 'obese', 'beginner', 60, 20);
    expect(result.allowed).toBe(true);
  });

  it('high impact, overweight band, day 15 → NOT allowed', () => {
    const result = checkExercisePermission('high', 'overweight', 'beginner', 15, 20);
    expect(result.allowed).toBe(false);
  });

  it('high impact, overweight band, day 16 → allowed', () => {
    const result = checkExercisePermission('high', 'overweight', 'beginner', 16, 20);
    expect(result.allowed).toBe(true);
  });

  it('high impact, normal band, beginner, day 15 → NOT allowed', () => {
    const result = checkExercisePermission('high', 'normal', 'beginner', 15, 20);
    expect(result.allowed).toBe(false);
  });

  it('high impact, normal band, beginner, day 16 → allowed', () => {
    const result = checkExercisePermission('high', 'normal', 'beginner', 16, 20);
    expect(result.allowed).toBe(true);
  });

  it('high impact, normal band, intermediate, day 1 → allowed immediately', () => {
    const result = checkExercisePermission('high', 'normal', 'intermediate', 1, 20);
    expect(result.allowed).toBe(true);
  });

  it('low impact → always allowed regardless of day or band', () => {
    expect(checkExercisePermission('low', 'obese', 'beginner', 1, 20).allowed).toBe(true);
    expect(checkExercisePermission('low', 'overweight', 'beginner', 1, 20).allowed).toBe(true);
  });

  it('none impact → always allowed', () => {
    expect(checkExercisePermission('none', 'obese', 'beginner', 1, 20).allowed).toBe(true);
  });

  it('high impact with null bmiBand → allowed (no restriction without band info)', () => {
    const result = checkExercisePermission('high', null, 'beginner', 1, 20);
    expect(result.allowed).toBe(true);
  });
});

// ─── isPainSeriousEnoughToStop ────────────────────────────────────────────────

describe('isPainSeriousEnoughToStop', () => {
  it('returns false for "soreness" (normal DOMS)', () => {
    expect(isPainSeriousEnoughToStop('soreness')).toBe(false);
  });

  it('returns true for "sharp" pain', () => {
    expect(isPainSeriousEnoughToStop('sharp')).toBe(true);
  });

  it('returns true for "joint" pain', () => {
    expect(isPainSeriousEnoughToStop('joint')).toBe(true);
  });

  it('returns true for "chest" pain', () => {
    expect(isPainSeriousEnoughToStop('chest')).toBe(true);
  });

  it('non-soreness pain types all return true', () => {
    const serious: PainSeverity[] = ['sharp', 'joint', 'chest'];
    for (const s of serious) {
      expect(isPainSeriousEnoughToStop(s)).toBe(true);
    }
  });
});
