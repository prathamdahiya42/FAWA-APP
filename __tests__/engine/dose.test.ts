import {
  interpolateDose,
  applyDeload,
  applyTaper,
  applyDoubleProgression,
  getRepRange,
  computeDose,
  type DoseContext,
} from '../../src/engine/dose';
import type { ExerciseDose } from '../../src/types';

// ─── interpolateDose ──────────────────────────────────────────────────────────

describe('interpolateDose', () => {
  const repDay1: ExerciseDose = { sets: 3, reps: 8 };
  const repDay60: ExerciseDose = { sets: 4, reps: 15 };

  it('returns day1 dose exactly on day 1', () => {
    const result = interpolateDose(repDay1, repDay60, 1);
    expect(result.sets).toBe(3);
    expect(result.reps).toBe(8);
  });

  it('returns day60 dose exactly on day 60', () => {
    const result = interpolateDose(repDay1, repDay60, 60);
    expect(result.sets).toBe(4);
    expect(result.reps).toBe(15);
  });

  it('returns midpoint (±1) on day 30 for reps', () => {
    const result = interpolateDose(repDay1, repDay60, 30);
    // t ≈ 0.491, reps ≈ 8 + 7*0.491 ≈ 11.4 → 11
    expect(result.reps).toBeGreaterThanOrEqual(10);
    expect(result.reps).toBeLessThanOrEqual(13);
  });

  it('interpolates seconds, rounding to nearest 5', () => {
    const d1: ExerciseDose = { sets: 2, seconds: 20 };
    const d60: ExerciseDose = { sets: 4, seconds: 60 };
    const mid = interpolateDose(d1, d60, 30);
    // seconds at t=0.491 ≈ 20 + 40*0.491 ≈ 39.6 → rounded to nearest 5 = 40
    expect(mid.seconds! % 5).toBe(0);
    expect(mid.seconds).toBeGreaterThan(20);
    expect(mid.seconds).toBeLessThan(60);
  });

  it('interpolates minutes, rounding to nearest 1', () => {
    const d1: ExerciseDose = { sets: 1, minutes: 10 };
    const d60: ExerciseDose = { sets: 1, minutes: 30 };
    const mid = interpolateDose(d1, d60, 30);
    expect(mid.minutes).toBeGreaterThan(10);
    expect(mid.minutes).toBeLessThan(30);
  });

  it('does not include reps when neither dose has reps', () => {
    const d1: ExerciseDose = { sets: 2, seconds: 30 };
    const d60: ExerciseDose = { sets: 4, seconds: 60 };
    const result = interpolateDose(d1, d60, 30);
    expect(result.reps).toBeUndefined();
  });

  it('does not include seconds when neither dose has seconds', () => {
    const result = interpolateDose(repDay1, repDay60, 30);
    expect(result.seconds).toBeUndefined();
  });

  it('clamps day number beyond 60 to day 60 result', () => {
    const result = interpolateDose(repDay1, repDay60, 70);
    expect(result.reps).toBe(15);
    expect(result.sets).toBe(4);
  });

  it('clamps day number below 1 to day 1 result', () => {
    const result = interpolateDose(repDay1, repDay60, 0);
    expect(result.reps).toBe(8);
    expect(result.sets).toBe(3);
  });
});

// ─── applyDeload ──────────────────────────────────────────────────────────────

describe('applyDeload', () => {
  it('sets sets to exactly 2', () => {
    const dose: ExerciseDose = { sets: 4, reps: 10 };
    expect(applyDeload(dose).sets).toBe(2);
  });

  it('reduces minutes by 30% (rounded)', () => {
    const dose: ExerciseDose = { sets: 3, minutes: 20 };
    const result = applyDeload(dose);
    expect(result.minutes).toBe(Math.round(20 * 0.7)); // 14
  });

  it('rounds minutes to nearest integer', () => {
    // 15 * 0.7 = 10.5 → rounds to 11
    const dose: ExerciseDose = { sets: 3, minutes: 15 };
    expect(applyDeload(dose).minutes).toBe(11);
  });

  it('preserves reps unchanged', () => {
    const dose: ExerciseDose = { sets: 4, reps: 12 };
    expect(applyDeload(dose).reps).toBe(12);
  });

  it('preserves seconds unchanged', () => {
    const dose: ExerciseDose = { sets: 4, reps: 10, seconds: 45 };
    expect(applyDeload(dose).seconds).toBe(45);
  });

  it('keeps minutes at minimum 1 even for very small values', () => {
    const dose: ExerciseDose = { sets: 3, minutes: 1 };
    expect(applyDeload(dose).minutes).toBeGreaterThanOrEqual(1);
  });

  it('leaves minutes undefined if original had no minutes', () => {
    const dose: ExerciseDose = { sets: 3, reps: 10 };
    expect(applyDeload(dose).minutes).toBeUndefined();
  });
});

// ─── applyTaper ───────────────────────────────────────────────────────────────

describe('applyTaper', () => {
  it('reduces sets to floor(sets * 0.75), min 2', () => {
    const dose: ExerciseDose = { sets: 4, reps: 10 };
    expect(applyTaper(dose).sets).toBe(Math.max(2, Math.floor(4 * 0.75))); // 3
  });

  it('ensures sets never goes below 2 even for low set counts', () => {
    const dose: ExerciseDose = { sets: 2, reps: 10 };
    expect(applyTaper(dose).sets).toBe(2);
  });

  it('reduces reps to floor(reps * 0.85), min 1', () => {
    const dose: ExerciseDose = { sets: 4, reps: 12 };
    expect(applyTaper(dose).reps).toBe(Math.max(1, Math.floor(12 * 0.85))); // 10
  });

  it('ensures reps never goes below 1', () => {
    const dose: ExerciseDose = { sets: 3, reps: 1 };
    expect(applyTaper(dose).reps).toBe(1);
  });

  it('leaves reps undefined if original had no reps', () => {
    const dose: ExerciseDose = { sets: 3, seconds: 30 };
    expect(applyTaper(dose).reps).toBeUndefined();
  });

  it('does not modify seconds', () => {
    const dose: ExerciseDose = { sets: 4, seconds: 30 };
    expect(applyTaper(dose).seconds).toBe(30);
  });
});

// ─── applyDoubleProgression ───────────────────────────────────────────────────

describe('applyDoubleProgression', () => {
  it('does not progress when hits = 0', () => {
    const dose: ExerciseDose = { sets: 3, reps: 10 };
    const { dose: result, progressed } = applyDoubleProgression(dose, 0);
    expect(result.reps).toBe(10);
    expect(progressed).toBe(false);
  });

  it('does not progress when hits = 1', () => {
    const dose: ExerciseDose = { sets: 3, reps: 10 };
    const { dose: result, progressed } = applyDoubleProgression(dose, 1);
    expect(result.reps).toBe(10);
    expect(progressed).toBe(false);
  });

  it('progresses reps by +1 when hits = 2', () => {
    const dose: ExerciseDose = { sets: 3, reps: 10 };
    const { dose: result, progressed } = applyDoubleProgression(dose, 2);
    expect(result.reps).toBe(11);
    expect(progressed).toBe(true);
  });

  it('progresses reps by +1 when hits > 2', () => {
    const dose: ExerciseDose = { sets: 3, reps: 10 };
    const { dose: result, progressed } = applyDoubleProgression(dose, 5);
    expect(result.reps).toBe(11);
    expect(progressed).toBe(true);
  });

  it('progresses seconds by +5 when hits >= 2', () => {
    const dose: ExerciseDose = { sets: 3, seconds: 30 };
    const { dose: result, progressed } = applyDoubleProgression(dose, 2);
    expect(result.seconds).toBe(35);
    expect(progressed).toBe(true);
  });

  it('does not change seconds when hits < 2', () => {
    const dose: ExerciseDose = { sets: 3, seconds: 30 };
    const { dose: result } = applyDoubleProgression(dose, 1);
    expect(result.seconds).toBe(30);
  });

  it('preserves sets on progression', () => {
    const dose: ExerciseDose = { sets: 4, reps: 10 };
    const { dose: result } = applyDoubleProgression(dose, 2);
    expect(result.sets).toBe(4);
  });
});

// ─── getRepRange ─────────────────────────────────────────────────────────────

describe('getRepRange', () => {
  it('returns { min: reps-2, max: reps } for a reps-based dose', () => {
    const dose: ExerciseDose = { sets: 3, reps: 12 };
    expect(getRepRange(dose)).toEqual({ min: 10, max: 12 });
  });

  it('ensures min never goes below 1', () => {
    const dose: ExerciseDose = { sets: 3, reps: 2 };
    expect(getRepRange(dose)).toEqual({ min: 1, max: 2 });
  });

  it('ensures min is 1 when reps = 1', () => {
    const dose: ExerciseDose = { sets: 3, reps: 1 };
    expect(getRepRange(dose)).toEqual({ min: 1, max: 1 });
  });

  it('returns null for timed (seconds) exercise', () => {
    const dose: ExerciseDose = { sets: 3, seconds: 30 };
    expect(getRepRange(dose)).toBeNull();
  });

  it('returns null when dose has no reps property', () => {
    const dose: ExerciseDose = { sets: 2, minutes: 10 };
    expect(getRepRange(dose)).toBeNull();
  });
});

// ─── computeDose ─────────────────────────────────────────────────────────────

describe('computeDose', () => {
  const day1: ExerciseDose = { sets: 3, reps: 8 };
  const day60: ExerciseDose = { sets: 5, reps: 16 };

  const baseCtx: DoseContext = {
    level: 'beginner',
    bmiBand: 'normal',
    dayNumber: 30,
    isDeload: false,
    isTaper: false,
    progressionHits: 0,
  };

  it('computes a base interpolated dose without modifiers', () => {
    const { dose, progressed } = computeDose(day1, day60, baseCtx);
    expect(dose.sets).toBeGreaterThanOrEqual(3);
    expect(dose.sets).toBeLessThanOrEqual(5);
    expect(progressed).toBe(false);
  });

  it('applies deload: sets = 2, overriding interpolation', () => {
    const { dose } = computeDose(day1, day60, { ...baseCtx, isDeload: true });
    expect(dose.sets).toBe(2);
  });

  it('deload overrides taper when both flags are true', () => {
    const { dose } = computeDose(day1, day60, {
      ...baseCtx,
      isDeload: true,
      isTaper: true,
    });
    expect(dose.sets).toBe(2); // deload wins
  });

  it('applies taper: reduces sets and reps when isDeload=false', () => {
    const ctx = { ...baseCtx, isTaper: true };
    const interpolated = interpolateDose(day1, day60, ctx.dayNumber);
    const { dose } = computeDose(day1, day60, ctx);
    expect(dose.sets).toBeLessThanOrEqual(interpolated.sets);
    expect(dose.sets).toBeGreaterThanOrEqual(2);
  });

  it('applies double progression last: reps +1 when hits >= 2', () => {
    const ctx = { ...baseCtx, progressionHits: 2 };
    const { dose: base } = computeDose(day1, day60, baseCtx);
    const { dose: progressed, progressed: didProgress } = computeDose(day1, day60, ctx);
    expect(didProgress).toBe(true);
    expect(progressed.reps).toBe((base.reps ?? 0) + 1);
  });

  it('does not progress when hits < 2', () => {
    const { progressed } = computeDose(day1, day60, { ...baseCtx, progressionHits: 1 });
    expect(progressed).toBe(false);
  });
});
