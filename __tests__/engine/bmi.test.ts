import {
  calculateBMI,
  getBMIBand,
  requiresMedicalClearance,
  canUseIntermediateProgram,
  canUseLoadedVariations,
  shouldShowBMIBand,
  getCardioStrengthRatio,
  getRunProgressionMultiplier,
  getHighImpactUnlockDay,
  isHighImpactAllowed,
  getWeightTarget,
  getWaistTarget,
} from '../../src/engine/bmi';

// ─── calculateBMI ─────────────────────────────────────────────────────────────

describe('calculateBMI', () => {
  it('calculates BMI correctly for a standard example (70 kg, 175 cm)', () => {
    // 70 / (1.75^2) = 70 / 3.0625 ≈ 22.9
    expect(calculateBMI(70, 175)).toBe(22.9);
  });

  it('calculates BMI correctly for an overweight example (90 kg, 175 cm)', () => {
    // 90 / (1.75^2) = 29.4
    expect(calculateBMI(90, 175)).toBe(29.4);
  });

  it('returns result rounded to exactly 1 decimal place', () => {
    const result = calculateBMI(68, 172);
    // 68 / (1.72^2) = 68 / 2.9584 ≈ 22.987... → 23.0
    expect(result).toBe(23.0);
  });

  it('calculates BMI for a underweight person (45 kg, 170 cm)', () => {
    // 45 / (1.70^2) = 45 / 2.89 ≈ 15.6
    expect(calculateBMI(45, 170)).toBe(15.6);
  });

  it('calculates BMI for an obese person (100 kg, 170 cm)', () => {
    // 100 / (1.70^2) = 100 / 2.89 ≈ 34.6
    expect(calculateBMI(100, 170)).toBe(34.6);
  });
});

// ─── getBMIBand ───────────────────────────────────────────────────────────────

describe('getBMIBand', () => {
  it('returns null for age < 18 (minor)', () => {
    expect(getBMIBand(22, 17)).toBeNull();
  });

  it('returns null for age 15 (minor)', () => {
    expect(getBMIBand(30, 15)).toBeNull();
  });

  it('returns "underweight" for BMI < 18.5 (Asian-Indian cut-off)', () => {
    expect(getBMIBand(18.4, 18)).toBe('underweight');
    expect(getBMIBand(15.0, 22)).toBe('underweight');
  });

  it('returns "normal" for BMI 18.5 (boundary — lower)', () => {
    expect(getBMIBand(18.5, 20)).toBe('normal');
  });

  it('returns "normal" for BMI 22.9 (inside normal range)', () => {
    expect(getBMIBand(22.9, 25)).toBe('normal');
  });

  it('returns "normal" for BMI 22.99 (just below overweight cut-off)', () => {
    expect(getBMIBand(22.99, 30)).toBe('normal');
  });

  it('returns "overweight" for BMI 23.0 (boundary — lower)', () => {
    expect(getBMIBand(23.0, 20)).toBe('overweight');
  });

  it('returns "overweight" for BMI 24.9', () => {
    expect(getBMIBand(24.9, 20)).toBe('overweight');
  });

  it('returns "obese" for BMI 25.0 (boundary)', () => {
    expect(getBMIBand(25.0, 18)).toBe('obese');
  });

  it('returns "obese" for BMI 32', () => {
    expect(getBMIBand(32, 30)).toBe('obese');
  });
});

// ─── requiresMedicalClearance ─────────────────────────────────────────────────

describe('requiresMedicalClearance', () => {
  it('returns false for healthy adult with normal BMI and no condition', () => {
    expect(requiresMedicalClearance(22, false, 25)).toBe(false);
  });

  it('returns true when hasCondition is true (regardless of BMI)', () => {
    expect(requiresMedicalClearance(20, true, 25)).toBe(true);
  });

  it('returns true when BMI >= 30 (obese threshold)', () => {
    expect(requiresMedicalClearance(30, false, 25)).toBe(true);
  });

  it('returns true when BMI is exactly 30 (boundary)', () => {
    expect(requiresMedicalClearance(30, false, 18)).toBe(true);
  });

  it('returns false when BMI is 29.9 (just below threshold)', () => {
    expect(requiresMedicalClearance(29.9, false, 25)).toBe(false);
  });

  it('returns false for age < 18 even with high BMI', () => {
    expect(requiresMedicalClearance(32, false, 17)).toBe(false);
  });

  it('returns false for age < 18 even with condition', () => {
    expect(requiresMedicalClearance(32, true, 15)).toBe(false);
  });
});

// ─── canUseIntermediateProgram ────────────────────────────────────────────────

describe('canUseIntermediateProgram', () => {
  it('returns false for age 15', () => {
    expect(canUseIntermediateProgram(15)).toBe(false);
  });

  it('returns true for age 16 (boundary)', () => {
    expect(canUseIntermediateProgram(16)).toBe(true);
  });

  it('returns true for age 25', () => {
    expect(canUseIntermediateProgram(25)).toBe(true);
  });
});

// ─── canUseLoadedVariations ───────────────────────────────────────────────────

describe('canUseLoadedVariations', () => {
  it('returns false for age 17', () => {
    expect(canUseLoadedVariations(17)).toBe(false);
  });

  it('returns true for age 18 (boundary)', () => {
    expect(canUseLoadedVariations(18)).toBe(true);
  });

  it('returns true for age 30', () => {
    expect(canUseLoadedVariations(30)).toBe(true);
  });
});

// ─── shouldShowBMIBand ────────────────────────────────────────────────────────

describe('shouldShowBMIBand', () => {
  it('returns false for age 17', () => {
    expect(shouldShowBMIBand(17)).toBe(false);
  });

  it('returns true for age 18 (boundary)', () => {
    expect(shouldShowBMIBand(18)).toBe(true);
  });

  it('returns true for age 40', () => {
    expect(shouldShowBMIBand(40)).toBe(true);
  });
});

// ─── getCardioStrengthRatio ───────────────────────────────────────────────────

describe('getCardioStrengthRatio', () => {
  it('returns [25, 75] for underweight', () => {
    expect(getCardioStrengthRatio('underweight')).toEqual([25, 75]);
  });

  it('returns [40, 60] for normal', () => {
    expect(getCardioStrengthRatio('normal')).toEqual([40, 60]);
  });

  it('returns [50, 50] for overweight', () => {
    expect(getCardioStrengthRatio('overweight')).toEqual([50, 50]);
  });

  it('returns [50, 50] for obese', () => {
    expect(getCardioStrengthRatio('obese')).toEqual([50, 50]);
  });

  it('returns ratios that sum to 100 for every band', () => {
    const bands = ['underweight', 'normal', 'overweight', 'obese'] as const;
    for (const band of bands) {
      const [c, s] = getCardioStrengthRatio(band);
      expect(c + s).toBe(100);
    }
  });
});

// ─── getRunProgressionMultiplier ──────────────────────────────────────────────

describe('getRunProgressionMultiplier', () => {
  it('returns 1.0 for underweight', () => {
    expect(getRunProgressionMultiplier('underweight')).toBe(1.0);
  });

  it('returns 1.0 for normal', () => {
    expect(getRunProgressionMultiplier('normal')).toBe(1.0);
  });

  it('returns approximately 0.909 for overweight (1/1.1)', () => {
    const multiplier = getRunProgressionMultiplier('overweight');
    expect(multiplier).toBeCloseTo(1 / 1.1, 3);
  });

  it('returns approximately 0.833 for obese (1/1.2)', () => {
    const multiplier = getRunProgressionMultiplier('obese');
    expect(multiplier).toBeCloseTo(1 / 1.2, 3);
  });

  it('overweight multiplier is less than 1', () => {
    expect(getRunProgressionMultiplier('overweight')).toBeLessThan(1);
  });

  it('obese multiplier is less than overweight multiplier', () => {
    expect(getRunProgressionMultiplier('obese')).toBeLessThan(
      getRunProgressionMultiplier('overweight'),
    );
  });
});

// ─── getHighImpactUnlockDay ───────────────────────────────────────────────────

describe('getHighImpactUnlockDay', () => {
  it('returns 30 for obese band (regardless of level)', () => {
    expect(getHighImpactUnlockDay('obese', 'beginner')).toBe(30);
    expect(getHighImpactUnlockDay('obese', 'intermediate')).toBe(30);
  });

  it('returns 15 for overweight band (regardless of level)', () => {
    expect(getHighImpactUnlockDay('overweight', 'beginner')).toBe(15);
    expect(getHighImpactUnlockDay('overweight', 'intermediate')).toBe(15);
  });

  it('returns 15 for beginner level on normal BMI band', () => {
    expect(getHighImpactUnlockDay('normal', 'beginner')).toBe(15);
  });

  it('returns 15 for beginner level on underweight BMI band', () => {
    expect(getHighImpactUnlockDay('underweight', 'beginner')).toBe(15);
  });

  it('returns 0 for intermediate level on normal BMI band', () => {
    expect(getHighImpactUnlockDay('normal', 'intermediate')).toBe(0);
  });

  it('returns 0 for intermediate level on underweight BMI band', () => {
    expect(getHighImpactUnlockDay('underweight', 'intermediate')).toBe(0);
  });
});

// ─── isHighImpactAllowed ──────────────────────────────────────────────────────

describe('isHighImpactAllowed', () => {
  it('allows high impact for obese on day 31 (unlock day = 30)', () => {
    expect(isHighImpactAllowed('obese', 'beginner', 31)).toBe(true);
  });

  it('blocks high impact for obese on day 30 (still locked)', () => {
    expect(isHighImpactAllowed('obese', 'beginner', 30)).toBe(false);
  });

  it('allows high impact for overweight on day 16 (unlock day = 15)', () => {
    expect(isHighImpactAllowed('overweight', 'beginner', 16)).toBe(true);
  });

  it('blocks high impact for overweight on day 15', () => {
    expect(isHighImpactAllowed('overweight', 'beginner', 15)).toBe(false);
  });

  it('allows high impact for intermediate normal on day 1', () => {
    expect(isHighImpactAllowed('normal', 'intermediate', 1)).toBe(true);
  });

  it('blocks high impact for beginner normal on day 15', () => {
    expect(isHighImpactAllowed('normal', 'beginner', 15)).toBe(false);
  });

  it('allows high impact for beginner normal on day 16', () => {
    expect(isHighImpactAllowed('normal', 'beginner', 16)).toBe(true);
  });
});

// ─── getWeightTarget ──────────────────────────────────────────────────────────

describe('getWeightTarget', () => {
  it('underweight by day 15 has direction "gain"', () => {
    expect(getWeightTarget('underweight', 15).direction).toBe('gain');
  });

  it('underweight by day 60 has positive min and max', () => {
    const t = getWeightTarget('underweight', 60);
    expect(t.min).toBeGreaterThan(0);
    expect(t.max).toBeGreaterThan(t.min);
  });

  it('normal by day 30 has direction "stable"', () => {
    expect(getWeightTarget('normal', 30).direction).toBe('stable');
  });

  it('overweight by day 15 has direction "lose"', () => {
    expect(getWeightTarget('overweight', 15).direction).toBe('lose');
  });

  it('overweight by day 60 has negative min and max (weight loss)', () => {
    const t = getWeightTarget('overweight', 60);
    expect(t.min).toBeLessThan(0);
    expect(t.max).toBeLessThan(0);
  });

  it('obese by day 60 loses more weight than overweight by day 60', () => {
    const obese = getWeightTarget('obese', 60);
    const overweight = getWeightTarget('overweight', 60);
    // Both negative — obese min should be more negative
    expect(obese.min).toBeLessThan(overweight.min);
  });

  it('obese by day 15 has direction "lose"', () => {
    expect(getWeightTarget('obese', 15).direction).toBe('lose');
  });

  it('weight target min is always <= max', () => {
    const days = [15, 30, 60] as const;
    const bands = ['underweight', 'normal', 'overweight', 'obese'] as const;
    for (const band of bands) {
      for (const day of days) {
        const t = getWeightTarget(band, day);
        expect(t.min).toBeLessThanOrEqual(t.max);
      }
    }
  });
});

// ─── getWaistTarget ───────────────────────────────────────────────────────────

describe('getWaistTarget', () => {
  it('returns null for underweight (no waist target)', () => {
    expect(getWaistTarget('underweight', 15)).toBeNull();
    expect(getWaistTarget('underweight', 30)).toBeNull();
    expect(getWaistTarget('underweight', 60)).toBeNull();
  });

  it('returns a range for normal band', () => {
    const t = getWaistTarget('normal', 15);
    expect(t).not.toBeNull();
    expect(t!.min).toBeLessThan(0);
    expect(t!.max).toBeLessThan(0);
  });

  it('returns a range for overweight band', () => {
    const t = getWaistTarget('overweight', 30);
    expect(t).not.toBeNull();
    expect(t!.min).toBeLessThan(0);
    expect(t!.max).toBeLessThan(0);
  });

  it('returns a range for obese band', () => {
    const t = getWaistTarget('obese', 60);
    expect(t).not.toBeNull();
    expect(t!.min).toBeLessThan(0);
    expect(t!.max).toBeLessThan(0);
  });

  it('obese waist reduction is greater than normal at day 60', () => {
    const obese = getWaistTarget('obese', 60)!;
    const normal = getWaistTarget('normal', 60)!;
    expect(obese.min).toBeLessThan(normal.min);
  });

  it('waist target min is always <= max for non-null results', () => {
    const days = [15, 30, 60] as const;
    const bands = ['normal', 'overweight', 'obese'] as const;
    for (const band of bands) {
      for (const day of days) {
        const t = getWaistTarget(band, day);
        expect(t).not.toBeNull();
        expect(t!.min).toBeLessThanOrEqual(t!.max);
      }
    }
  });
});
