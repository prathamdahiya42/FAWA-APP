import {
  determineLevelFromTest,
  qualifiesForPromotion,
  getRestSeconds,
  getDefaultRestSeconds,
  INTERMEDIATE_PROMO_TARGETS,
  type PlacementTestInput,
} from '../../src/engine/level';

// Shared passing input for an adult (age >= 16)
const allPassInput: PlacementTestInput = {
  twoKmTimeSecs: 12 * 60,   // 12:00 — well under 13:00
  maxPushUps: 20,             // >= 15
  plankSeconds: 90,           // >= 60
  canRun20Min: true,
  age: 20,
};

// ─── determineLevelFromTest ────────────────────────────────────────────────────

describe('determineLevelFromTest', () => {
  it('returns "intermediate" when all tests pass and age >= 16', () => {
    expect(determineLevelFromTest(allPassInput)).toBe('intermediate');
  });

  it('returns "beginner" when age < 16 regardless of test results', () => {
    expect(determineLevelFromTest({ ...allPassInput, age: 15 })).toBe('beginner');
    expect(determineLevelFromTest({ ...allPassInput, age: 10 })).toBe('beginner');
  });

  it('returns "beginner" when 2 km time > 13:00 (780 seconds)', () => {
    expect(determineLevelFromTest({ ...allPassInput, twoKmTimeSecs: 13 * 60 + 1 })).toBe('beginner');
    expect(determineLevelFromTest({ ...allPassInput, twoKmTimeSecs: 15 * 60 })).toBe('beginner');
  });

  it('returns "intermediate" when 2 km time is exactly 13:00 (780 seconds — boundary pass)', () => {
    expect(determineLevelFromTest({ ...allPassInput, twoKmTimeSecs: 13 * 60 })).toBe('intermediate');
  });

  it('returns "beginner" when maxPushUps < 15', () => {
    expect(determineLevelFromTest({ ...allPassInput, maxPushUps: 14 })).toBe('beginner');
    expect(determineLevelFromTest({ ...allPassInput, maxPushUps: 0 })).toBe('beginner');
  });

  it('returns "intermediate" when maxPushUps is exactly 15 (boundary pass)', () => {
    expect(determineLevelFromTest({ ...allPassInput, maxPushUps: 15 })).toBe('intermediate');
  });

  it('returns "beginner" when plankSeconds < 60', () => {
    expect(determineLevelFromTest({ ...allPassInput, plankSeconds: 59 })).toBe('beginner');
    expect(determineLevelFromTest({ ...allPassInput, plankSeconds: 0 })).toBe('beginner');
  });

  it('returns "intermediate" when plankSeconds is exactly 60 (boundary pass)', () => {
    expect(determineLevelFromTest({ ...allPassInput, plankSeconds: 60 })).toBe('intermediate');
  });

  it('returns "beginner" when canRun20Min is false', () => {
    expect(determineLevelFromTest({ ...allPassInput, canRun20Min: false })).toBe('beginner');
  });

  it('returns "beginner" when twoKmTimeSecs is null (missing data)', () => {
    expect(determineLevelFromTest({ ...allPassInput, twoKmTimeSecs: null })).toBe('beginner');
  });

  it('returns "beginner" when maxPushUps is null (missing data)', () => {
    expect(determineLevelFromTest({ ...allPassInput, maxPushUps: null })).toBe('beginner');
  });

  it('returns "beginner" when plankSeconds is null (missing data)', () => {
    expect(determineLevelFromTest({ ...allPassInput, plankSeconds: null })).toBe('beginner');
  });

  it('returns "beginner" when canRun20Min is null (missing data)', () => {
    expect(determineLevelFromTest({ ...allPassInput, canRun20Min: null })).toBe('beginner');
  });

  it('returns "beginner" when all data is null', () => {
    expect(
      determineLevelFromTest({
        twoKmTimeSecs: null,
        maxPushUps: null,
        plankSeconds: null,
        canRun20Min: null,
        age: 20,
      }),
    ).toBe('beginner');
  });
});

// ─── qualifiesForPromotion ────────────────────────────────────────────────────

describe('qualifiesForPromotion', () => {
  const promoInput: PlacementTestInput = {
    twoKmTimeSecs: INTERMEDIATE_PROMO_TARGETS.twoKmTimeSecs, // 11:00
    maxPushUps: INTERMEDIATE_PROMO_TARGETS.maxPushUps,        // 22
    plankSeconds: INTERMEDIATE_PROMO_TARGETS.plankSeconds,    // 90
    canRun20Min: true,
    age: 20,
  };

  it('returns true when all promotion criteria are exactly met', () => {
    expect(qualifiesForPromotion(promoInput, 'beginner')).toBe(true);
  });

  it('returns false when currentLevel is already "intermediate"', () => {
    expect(qualifiesForPromotion(promoInput, 'intermediate')).toBe(false);
  });

  it('returns false when age < 16', () => {
    expect(qualifiesForPromotion({ ...promoInput, age: 15 }, 'beginner')).toBe(false);
  });

  it('returns false when 2 km time exceeds target', () => {
    expect(
      qualifiesForPromotion(
        { ...promoInput, twoKmTimeSecs: INTERMEDIATE_PROMO_TARGETS.twoKmTimeSecs + 1 },
        'beginner',
      ),
    ).toBe(false);
  });

  it('returns true when 2 km time exactly meets target (≤ 11:00)', () => {
    expect(qualifiesForPromotion(promoInput, 'beginner')).toBe(true);
  });

  it('returns false when pushUps are below target', () => {
    expect(
      qualifiesForPromotion(
        { ...promoInput, maxPushUps: INTERMEDIATE_PROMO_TARGETS.maxPushUps - 1 },
        'beginner',
      ),
    ).toBe(false);
  });

  it('returns false when plankSeconds are below target', () => {
    expect(
      qualifiesForPromotion(
        { ...promoInput, plankSeconds: INTERMEDIATE_PROMO_TARGETS.plankSeconds - 1 },
        'beginner',
      ),
    ).toBe(false);
  });

  it('returns false when canRun20Min is false', () => {
    expect(qualifiesForPromotion({ ...promoInput, canRun20Min: false }, 'beginner')).toBe(false);
  });

  it('returns false when canRun20Min is null', () => {
    expect(qualifiesForPromotion({ ...promoInput, canRun20Min: null }, 'beginner')).toBe(false);
  });

  it('returns false when any metric is null', () => {
    expect(qualifiesForPromotion({ ...promoInput, twoKmTimeSecs: null }, 'beginner')).toBe(false);
    expect(qualifiesForPromotion({ ...promoInput, maxPushUps: null }, 'beginner')).toBe(false);
    expect(qualifiesForPromotion({ ...promoInput, plankSeconds: null }, 'beginner')).toBe(false);
  });
});

// ─── getRestSeconds ────────────────────────────────────────────────────────────

describe('getRestSeconds', () => {
  it('returns { min: 45, max: 75 } for beginner', () => {
    expect(getRestSeconds('beginner')).toEqual({ min: 45, max: 75 });
  });

  it('returns { min: 30, max: 60 } for intermediate', () => {
    expect(getRestSeconds('intermediate')).toEqual({ min: 30, max: 60 });
  });

  it('beginner rest range is wider than intermediate', () => {
    const beg = getRestSeconds('beginner');
    const int = getRestSeconds('intermediate');
    expect(beg.max - beg.min).toBeGreaterThanOrEqual(int.max - int.min);
  });
});

// ─── getDefaultRestSeconds ────────────────────────────────────────────────────

describe('getDefaultRestSeconds', () => {
  it('returns 60 for beginner (midpoint of 45–75)', () => {
    expect(getDefaultRestSeconds('beginner')).toBe(60);
  });

  it('returns 45 for intermediate (midpoint of 30–60)', () => {
    expect(getDefaultRestSeconds('intermediate')).toBe(45);
  });

  it('returns a value within the rest range for beginner', () => {
    const { min, max } = getRestSeconds('beginner');
    const def = getDefaultRestSeconds('beginner');
    expect(def).toBeGreaterThanOrEqual(min);
    expect(def).toBeLessThanOrEqual(max);
  });

  it('returns a value within the rest range for intermediate', () => {
    const { min, max } = getRestSeconds('intermediate');
    const def = getDefaultRestSeconds('intermediate');
    expect(def).toBeGreaterThanOrEqual(min);
    expect(def).toBeLessThanOrEqual(max);
  });
});
