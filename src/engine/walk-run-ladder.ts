/** Walk-run ladder for beginners.
 * Advancement rule: 2 consecutive sessions at RPE ≤ 6 on the current rung.
 */

export interface WalkRunRung {
  rungIndex: number;
  jogMinutes: number;
  walkMinutes: number;
  repeats: number;
  totalMinutes: number;
  label: string;
}

export const WALK_RUN_LADDER: WalkRunRung[] = [
  { rungIndex: 0, jogMinutes: 1,  walkMinutes: 2, repeats: 6, totalMinutes: 18, label: '1 min jog / 2 min walk × 6' },
  { rungIndex: 1, jogMinutes: 2,  walkMinutes: 2, repeats: 5, totalMinutes: 20, label: '2 min jog / 2 min walk × 5' },
  { rungIndex: 2, jogMinutes: 3,  walkMinutes: 2, repeats: 4, totalMinutes: 20, label: '3 min jog / 2 min walk × 4' },
  { rungIndex: 3, jogMinutes: 5,  walkMinutes: 2, repeats: 3, totalMinutes: 21, label: '5 min jog / 2 min walk × 3' },
  { rungIndex: 4, jogMinutes: 8,  walkMinutes: 2, repeats: 2, totalMinutes: 20, label: '8 min jog / 2 min walk × 2' },
  { rungIndex: 5, jogMinutes: 20, walkMinutes: 0, repeats: 1, totalMinutes: 20, label: '20 min continuous jog' },
];

export function getWalkRunRung(rungIndex: number): WalkRunRung {
  return WALK_RUN_LADDER[Math.min(rungIndex, WALK_RUN_LADDER.length - 1)];
}

/** Returns true when the user should be offered an advancement prompt. */
export function shouldAdvanceRung(consecutiveLowRpeCount: number, currentRungIndex: number): boolean {
  if (currentRungIndex >= WALK_RUN_LADDER.length - 1) return false;
  return consecutiveLowRpeCount >= 2;
}

/** Expand a rung into a list of timed intervals for the player. */
export function buildWalkRunIntervals(
  rung: WalkRunRung,
): Array<{ phase: 'jog' | 'walk'; seconds: number }> {
  const intervals: Array<{ phase: 'jog' | 'walk'; seconds: number }> = [];
  if (rung.walkMinutes === 0) {
    intervals.push({ phase: 'jog', seconds: rung.jogMinutes * 60 });
    return intervals;
  }
  for (let i = 0; i < rung.repeats; i++) {
    intervals.push({ phase: 'jog', seconds: rung.jogMinutes * 60 });
    intervals.push({ phase: 'walk', seconds: rung.walkMinutes * 60 });
  }
  return intervals;
}
