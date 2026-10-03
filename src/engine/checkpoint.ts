import type { CheckpointOutcome } from '@/src/types';
import type { PhaseName } from '@/src/theme/colors';

export interface CheckpointMetric {
  name: string;
  target: number;
  actual: number;
  weight: number; // 0–1, all weights should sum to 1
}

export interface CheckpointResult {
  percentHit: number;
  outcome: CheckpointOutcome;
  explanation: string;
  metrics: Record<string, { target: number; actual: number; hit: boolean }>;
}

/**
 * Evaluate phase checkpoint from measured metrics.
 * ≥90% → advance, 70–89% → continue, <70% → repeat.
 */
export function evaluateCheckpoint(metrics: CheckpointMetric[]): CheckpointResult {
  let totalWeight = 0;
  let weightedScore = 0;
  const metricsResult: CheckpointResult['metrics'] = {};

  for (const m of metrics) {
    totalWeight += m.weight;
    const ratio = m.target > 0 ? Math.min(m.actual / m.target, 1.5) : 1; // cap at 150%
    const score = Math.min(ratio, 1); // only count up to 100% per metric
    weightedScore += score * m.weight;
    metricsResult[m.name] = {
      target: m.target,
      actual: m.actual,
      hit: ratio >= 0.9,
    };
  }

  const percentHit = totalWeight > 0 ? Math.round((weightedScore / totalWeight) * 100) : 0;

  let outcome: CheckpointOutcome;
  let explanation: string;

  if (percentHit >= 90) {
    outcome = 'advance';
    explanation =
      'Outstanding! You hit 90%+ of your targets. Moving to the next phase with harder variations unlocked.';
  } else if (percentHit >= 70) {
    outcome = 'continue';
    explanation =
      "Good work — you're on track. Continuing as planned. Keep pushing the top of your rep ranges.";
  } else {
    outcome = 'repeat';
    explanation =
      "Let's spend more time building this foundation. Repeating the phase with easier variations. Check your sleep, soreness and any missed sessions.";
  }

  return { percentHit, outcome, explanation, metrics: metricsResult };
}

/** Check if weekly missed sessions trigger a volume drop (≥3 missed → drop_volume). */
export function checkMissedSessions(missedInWeek: number): CheckpointOutcome | null {
  return missedInWeek >= 3 ? 'drop_volume' : null;
}

// ─── Performance targets ──────────────────────────────────────────────────────

/** Beginner performance targets by test day (normal BMI baseline). */
export const BEGINNER_TARGETS: Record<string, Record<15 | 30 | 60, number>> = {
  twoKmTimeSecs:   { 15: 15 * 60, 30: 13.5 * 60, 60: 11.5 * 60 },
  maxPushUps:      { 15: 12,       30: 6,          60: 15 },
  squatsIn60s:     { 15: 30,       30: 38,         60: 45 },
  plankSeconds:    { 15: 40,       30: 60,         60: 90 },
  wallSitSeconds:  { 15: 35,       30: 45,         60: 60 },
  deadHangSeconds: { 15: 15,       30: 25,         60: 40 },
  invertedRows:    { 15: 6,        30: 8,          60: 12 },
};

export const INTERMEDIATE_TARGETS: Record<string, Record<15 | 30 | 60, number>> = {
  twoKmTimeSecs:   { 15: 11.5 * 60, 30: 11 * 60,   60: 10.5 * 60 },
  maxPushUps:      { 15: 22,        30: 28,         60: 40 },
  diamondPushUps:  { 15: 8,         30: 10,         60: 15 },
  pullUps:         { 15: 3,         30: 5,          60: 9 },
  squatsIn60s:     { 15: 45,        30: 50,         60: 58 },
  plankSeconds:    { 15: 90,        30: 120,        60: 180 },
};

/** Interpolate a target to an arbitrary day (for Day 45 checkpoint estimate). */
export function interpolateTarget(
  dayNumber: number,
  targets: Record<15 | 30 | 60, number>,
): number {
  if (dayNumber <= 15) {
    return targets[15] * (dayNumber / 15);
  } else if (dayNumber <= 30) {
    const t = (dayNumber - 15) / 15;
    return targets[15] + (targets[30] - targets[15]) * t;
  } else {
    const t = (dayNumber - 30) / 30;
    return targets[30] + (targets[60] - targets[30]) * t;
  }
}
