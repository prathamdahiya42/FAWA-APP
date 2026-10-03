import {
  evaluateCheckpoint,
  checkMissedSessions,
  interpolateTarget,
  BEGINNER_TARGETS,
  INTERMEDIATE_TARGETS,
  type CheckpointMetric,
} from '../../src/engine/checkpoint';

// ─── evaluateCheckpoint ───────────────────────────────────────────────────────

describe('evaluateCheckpoint', () => {
  function makeMetrics(
    targets: number[],
    actuals: number[],
    weights?: number[],
  ): CheckpointMetric[] {
    return targets.map((target, i) => ({
      name: `metric_${i}`,
      target,
      actual: actuals[i],
      weight: weights ? weights[i] : 1 / targets.length,
    }));
  }

  it('returns percentHit=100 and outcome="advance" when all metrics hit 100%', () => {
    const metrics = makeMetrics([10, 20, 30], [10, 20, 30]);
    const result = evaluateCheckpoint(metrics);
    expect(result.percentHit).toBe(100);
    expect(result.outcome).toBe('advance');
  });

  it('returns outcome="advance" for ~90% average (all equal weight)', () => {
    // Each metric: actual = 90% of target
    const metrics = makeMetrics([100, 100], [90, 90]);
    const result = evaluateCheckpoint(metrics);
    expect(result.percentHit).toBe(90);
    expect(result.outcome).toBe('advance');
  });

  it('returns outcome="continue" for 80% average', () => {
    const metrics = makeMetrics([100, 100], [80, 80]);
    const result = evaluateCheckpoint(metrics);
    expect(result.percentHit).toBe(80);
    expect(result.outcome).toBe('continue');
  });

  it('returns outcome="continue" for 70% average (lower boundary)', () => {
    const metrics = makeMetrics([100], [70]);
    const result = evaluateCheckpoint(metrics);
    expect(result.percentHit).toBe(70);
    expect(result.outcome).toBe('continue');
  });

  it('returns outcome="repeat" for 69% average', () => {
    const metrics = makeMetrics([100], [69]);
    const result = evaluateCheckpoint(metrics);
    expect(result.percentHit).toBe(69);
    expect(result.outcome).toBe('repeat');
  });

  it('returns outcome="repeat" for 0% (all zeros)', () => {
    const metrics = makeMetrics([100, 50], [0, 0]);
    const result = evaluateCheckpoint(metrics);
    expect(result.percentHit).toBe(0);
    expect(result.outcome).toBe('repeat');
  });

  it('computes correct weighted average with different weights', () => {
    // metric_0: 50% hit, weight 0.8 → contribution 0.4
    // metric_1: 100% hit, weight 0.2 → contribution 0.2
    // total weighted score = 0.6 → 60%
    const metrics: CheckpointMetric[] = [
      { name: 'm0', target: 100, actual: 50, weight: 0.8 },
      { name: 'm1', target: 100, actual: 100, weight: 0.2 },
    ];
    const result = evaluateCheckpoint(metrics);
    expect(result.percentHit).toBe(60);
    expect(result.outcome).toBe('repeat');
  });

  it('caps metric score at 100% even if actual exceeds target', () => {
    const metrics = makeMetrics([10], [200]); // 2000% actual
    const result = evaluateCheckpoint(metrics);
    expect(result.percentHit).toBe(100);
  });

  it('marks a metric as "hit" when ratio >= 0.9', () => {
    const metrics: CheckpointMetric[] = [
      { name: 'close', target: 100, actual: 90, weight: 0.5 },
      { name: 'miss', target: 100, actual: 89, weight: 0.5 },
    ];
    const result = evaluateCheckpoint(metrics);
    expect(result.metrics['close'].hit).toBe(true);
    expect(result.metrics['miss'].hit).toBe(false);
  });

  it('includes all metric names in result.metrics', () => {
    const metrics: CheckpointMetric[] = [
      { name: 'pushUps', target: 20, actual: 18, weight: 0.5 },
      { name: 'plank', target: 60, actual: 55, weight: 0.5 },
    ];
    const result = evaluateCheckpoint(metrics);
    expect(result.metrics).toHaveProperty('pushUps');
    expect(result.metrics).toHaveProperty('plank');
  });

  it('returns a non-empty explanation string for every outcome', () => {
    const advance = evaluateCheckpoint(makeMetrics([10], [10]));
    const cont = evaluateCheckpoint(makeMetrics([100], [75]));
    const repeat = evaluateCheckpoint(makeMetrics([100], [60]));
    expect(advance.explanation.length).toBeGreaterThan(5);
    expect(cont.explanation.length).toBeGreaterThan(5);
    expect(repeat.explanation.length).toBeGreaterThan(5);
  });
});

// ─── checkMissedSessions ──────────────────────────────────────────────────────

describe('checkMissedSessions', () => {
  it('returns null when 0 sessions missed', () => {
    expect(checkMissedSessions(0)).toBeNull();
  });

  it('returns null when 2 sessions missed', () => {
    expect(checkMissedSessions(2)).toBeNull();
  });

  it('returns "drop_volume" when exactly 3 sessions missed', () => {
    expect(checkMissedSessions(3)).toBe('drop_volume');
  });

  it('returns "drop_volume" when 4 sessions missed', () => {
    expect(checkMissedSessions(4)).toBe('drop_volume');
  });

  it('returns "drop_volume" when 5 sessions missed', () => {
    expect(checkMissedSessions(5)).toBe('drop_volume');
  });

  it('returns "drop_volume" when many sessions missed', () => {
    expect(checkMissedSessions(10)).toBe('drop_volume');
  });
});

// ─── interpolateTarget ────────────────────────────────────────────────────────

describe('interpolateTarget', () => {
  const targets: Record<15 | 30 | 60, number> = { 15: 30, 30: 50, 60: 80 };

  it('returns 0 at day 0 (before first anchor)', () => {
    // Day 0: targets[15] * (0/15) = 0
    expect(interpolateTarget(0, targets)).toBe(0);
  });

  it('returns exactly target[15] at day 15', () => {
    expect(interpolateTarget(15, targets)).toBe(30);
  });

  it('returns exactly target[30] at day 30', () => {
    expect(interpolateTarget(30, targets)).toBe(50);
  });

  it('returns exactly target[60] at day 60', () => {
    expect(interpolateTarget(60, targets)).toBe(80);
  });

  it('returns a value between target[15] and target[30] at day 22', () => {
    const val = interpolateTarget(22, targets);
    expect(val).toBeGreaterThan(30);
    expect(val).toBeLessThan(50);
  });

  it('returns a value between target[30] and target[60] at day 45', () => {
    const val = interpolateTarget(45, targets);
    expect(val).toBeGreaterThan(50);
    expect(val).toBeLessThan(80);
  });

  it('returns midpoint between target[30] and target[60] at day 45', () => {
    // t = (45-30)/30 = 0.5 → 50 + (80-50)*0.5 = 65
    expect(interpolateTarget(45, targets)).toBe(65);
  });

  it('interpolates linearly within 0–15 range (day 7 ≈ half of target[15])', () => {
    const val = interpolateTarget(7, { 15: 30, 30: 50, 60: 80 });
    // targets[15] * 7/15 = 30 * 0.467 = 14
    expect(val).toBeCloseTo(14, 0);
  });
});

// ─── BEGINNER_TARGETS ─────────────────────────────────────────────────────────

describe('BEGINNER_TARGETS', () => {
  it('is defined and has expected exercise keys', () => {
    expect(BEGINNER_TARGETS).toBeDefined();
    expect(BEGINNER_TARGETS).toHaveProperty('twoKmTimeSecs');
    expect(BEGINNER_TARGETS).toHaveProperty('maxPushUps');
    expect(BEGINNER_TARGETS).toHaveProperty('plankSeconds');
  });

  it('has values for all 3 checkpoints (day 15, 30, 60)', () => {
    for (const key of Object.keys(BEGINNER_TARGETS)) {
      const entry = BEGINNER_TARGETS[key];
      expect(entry[15]).toBeDefined();
      expect(entry[30]).toBeDefined();
      expect(entry[60]).toBeDefined();
    }
  });

  it('2 km time targets decrease over time (faster is better)', () => {
    const t = BEGINNER_TARGETS.twoKmTimeSecs;
    expect(t[60]).toBeLessThan(t[30]);
    expect(t[30]).toBeLessThan(t[15]);
  });

  it('push-up targets increase over time', () => {
    const p = BEGINNER_TARGETS.maxPushUps;
    expect(p[60]).toBeGreaterThan(p[15]);
  });
});

// ─── INTERMEDIATE_TARGETS ─────────────────────────────────────────────────────

describe('INTERMEDIATE_TARGETS', () => {
  it('is defined and has expected exercise keys', () => {
    expect(INTERMEDIATE_TARGETS).toBeDefined();
    expect(INTERMEDIATE_TARGETS).toHaveProperty('twoKmTimeSecs');
    expect(INTERMEDIATE_TARGETS).toHaveProperty('maxPushUps');
    expect(INTERMEDIATE_TARGETS).toHaveProperty('plankSeconds');
  });

  it('has higher push-up targets at day 60 than beginner', () => {
    expect(INTERMEDIATE_TARGETS.maxPushUps[60]).toBeGreaterThan(
      BEGINNER_TARGETS.maxPushUps[60],
    );
  });

  it('has lower (faster) 2 km time target than beginner at day 60', () => {
    expect(INTERMEDIATE_TARGETS.twoKmTimeSecs[60]).toBeLessThan(
      BEGINNER_TARGETS.twoKmTimeSecs[60],
    );
  });

  it('has values for all 3 checkpoints (day 15, 30, 60)', () => {
    for (const key of Object.keys(INTERMEDIATE_TARGETS)) {
      const entry = INTERMEDIATE_TARGETS[key];
      expect(entry[15]).toBeDefined();
      expect(entry[30]).toBeDefined();
      expect(entry[60]).toBeDefined();
    }
  });
});
