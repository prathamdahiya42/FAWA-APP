import { addDays, format } from 'date-fns';
import type { PlanDay, Level, BMIBand, DayType, PlanExerciseSlot } from '@/src/types';
import type { PhaseName } from '@/src/theme/colors';

function uid(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

// ─── Phase and day classification ────────────────────────────────────────────

export const PHASE_RANGES: Record<PhaseName, [number, number]> = {
  Foundation: [1, 15],
  Build:      [16, 30],
  Intensify:  [31, 45],
  Peak:       [46, 60],
};

export const DELOAD_RANGES: [number, number][] = [[22, 28], [50, 56]];
export const TAPER_DAYS = [57, 58, 59] as const;
export const TEST_DAYS = [15, 30, 60] as const;
export const EASY_BEFORE_TEST = [14, 29, 59] as const; // day before each test

export function getDayPhase(dayNumber: number): PhaseName {
  for (const [phase, [start, end]] of Object.entries(PHASE_RANGES) as [PhaseName, [number, number]][]) {
    if (dayNumber >= start && dayNumber <= end) return phase;
  }
  return 'Peak';
}

export function isDeloadDay(dayNumber: number): boolean {
  return DELOAD_RANGES.some(([start, end]) => dayNumber >= start && dayNumber <= end);
}

export function isTaperDay(dayNumber: number): boolean {
  return (TAPER_DAYS as readonly number[]).includes(dayNumber);
}

export function isTestDay(dayNumber: number): boolean {
  return (TEST_DAYS as readonly number[]).includes(dayNumber);
}

export function isEasyDay(dayNumber: number): boolean {
  return (EASY_BEFORE_TEST as readonly number[]).includes(dayNumber);
}

/** 0-indexed cycle day: ((dayNumber - 1) % 7) */
export function getCycleDay(dayNumber: number): number {
  return ((dayNumber - 1) % 7);
}

export function getDayType(dayNumber: number, level: Level): DayType {
  if (isTestDay(dayNumber))   return 'test';
  if (isTaperDay(dayNumber))  return 'taper';
  if (isDeloadDay(dayNumber)) return 'deload';
  if (isEasyDay(dayNumber))   return 'recovery';

  const c = getCycleDay(dayNumber);
  if (level === 'beginner') {
    // 0=FullBodyA, 1=Cardio, 2=FullBodyB, 3=Recovery, 4=FullBodyC, 5=Cardio, 6=Rest
    if (c === 6) return 'rest';
    if (c === 3) return 'recovery';
    if (c === 1 || c === 5) return 'cardio';
    return 'training';
  } else {
    // 0=Push+Core, 1=Intervals, 2=Legs, 3=Pull+Core, 4=SteadyRun, 5=Conditioning, 6=Rest
    if (c === 6) return 'rest';
    if (c === 1 || c === 4 || c === 5) return 'cardio';
    return 'training';
  }
}

export function getSessionLabel(dayNumber: number, level: Level): string {
  if (isTestDay(dayNumber))   return `Test Day ${dayNumber}`;
  if (isDeloadDay(dayNumber)) return 'Deload Week';
  if (isTaperDay(dayNumber))  return 'Taper';
  if (isEasyDay(dayNumber))   return 'Easy Day';

  const c = getCycleDay(dayNumber);
  if (level === 'beginner') {
    return ['Full Body A', 'Cardio: Walk-Run', 'Full Body B', 'Active Recovery', 'Full Body C', 'Cardio: Jog', 'Rest'][c];
  } else {
    return ['Push & Core', 'Interval Run', 'Legs & Glutes', 'Pull & Core', 'Steady Run', 'Conditioning Circuit', 'Rest'][c];
  }
}

// ─── Exercise slot definitions per session type ───────────────────────────────
// These map session labels to ordered exercise IDs from the library seed data.
// The player builds the full session from these slots + the dose engine.

const WARMUP_SLOTS: PlanExerciseSlot[] = [
  { exerciseId: 'W1', section: 'warmup', plannedDose: { sets: 1, reps: 15 }, orderIndex: 0 },
  { exerciseId: 'W2', section: 'warmup', plannedDose: { sets: 1, reps: 10 }, orderIndex: 1 },
  { exerciseId: 'W3', section: 'warmup', plannedDose: { sets: 1, reps: 10 }, orderIndex: 2 },
  { exerciseId: 'W4', section: 'warmup', plannedDose: { sets: 1, reps: 10 }, orderIndex: 3 },
  { exerciseId: 'W6', section: 'warmup', plannedDose: { sets: 1, reps: 6 },  orderIndex: 4 },
  { exerciseId: 'W7', section: 'warmup', plannedDose: { sets: 1, reps: 10 }, orderIndex: 5 },
];

const COOLDOWN_SLOTS: PlanExerciseSlot[] = [
  { exerciseId: 'COOLDOWN', section: 'cooldown', plannedDose: { sets: 1, seconds: 300 }, orderIndex: 0 },
];

const BEGINNER_SESSIONS: Record<string, PlanExerciseSlot[]> = {
  'Full Body A': [
    { exerciseId: 'L1', section: 'main', plannedDose: { sets: 3, reps: 10 }, orderIndex: 0 },
    { exerciseId: 'P2', section: 'main', plannedDose: { sets: 3, reps: 8  }, orderIndex: 1 },
    { exerciseId: 'L3', section: 'main', plannedDose: { sets: 3, reps: 12 }, orderIndex: 2 },
    { exerciseId: 'B1', section: 'main', plannedDose: { sets: 3, reps: 10 }, orderIndex: 3 },
    { exerciseId: 'K1', section: 'core', plannedDose: { sets: 3, seconds: 20 }, orderIndex: 4 },
    { exerciseId: 'K3', section: 'core', plannedDose: { sets: 3, reps: 8 },  orderIndex: 5 },
  ],
  'Cardio: Walk-Run': [
    { exerciseId: 'C2', section: 'main', plannedDose: { sets: 1, minutes: 25 }, orderIndex: 0 },
  ],
  'Full Body B': [
    { exerciseId: 'L2', section: 'main', plannedDose: { sets: 2, reps: 8 },  orderIndex: 0 },
    { exerciseId: 'P3', section: 'main', plannedDose: { sets: 3, reps: 5 },  orderIndex: 1 },
    { exerciseId: 'B2', section: 'main', plannedDose: { sets: 3, reps: 6 },  orderIndex: 2 },
    { exerciseId: 'L8', section: 'main', plannedDose: { sets: 3, reps: 12 }, orderIndex: 3 },
    { exerciseId: 'K2', section: 'core', plannedDose: { sets: 2, seconds: 15 }, orderIndex: 4 },
    { exerciseId: 'K4', section: 'core', plannedDose: { sets: 3, reps: 8 },  orderIndex: 5 },
  ],
  'Active Recovery': [
    { exerciseId: 'C1', section: 'main', plannedDose: { sets: 1, minutes: 30 }, orderIndex: 0 },
  ],
  'Full Body C': [
    { exerciseId: 'C11', section: 'main', plannedDose: { sets: 3, reps: 10 }, orderIndex: 0 },
    { exerciseId: 'P3',  section: 'main', plannedDose: { sets: 3, reps: 5  }, orderIndex: 1 },
    { exerciseId: 'L5',  section: 'main', plannedDose: { sets: 3, seconds: 20 }, orderIndex: 2 },
    { exerciseId: 'P7',  section: 'main', plannedDose: { sets: 3, reps: 6  }, orderIndex: 3 },
    { exerciseId: 'L4',  section: 'main', plannedDose: { sets: 3, reps: 15 }, orderIndex: 4 },
    { exerciseId: 'K5',  section: 'core', plannedDose: { sets: 3, reps: 12 }, orderIndex: 5 },
    { exerciseId: 'K7',  section: 'core', plannedDose: { sets: 3, reps: 8 },  orderIndex: 6 },
  ],
  'Cardio: Jog': [
    { exerciseId: 'C3', section: 'main', plannedDose: { sets: 1, minutes: 25 }, orderIndex: 0 },
  ],
  'Rest': [],
};

const INTERMEDIATE_SESSIONS: Record<string, PlanExerciseSlot[]> = {
  'Push & Core': [
    { exerciseId: 'P3', section: 'main', plannedDose: { sets: 4, reps: 12 }, orderIndex: 0 },
    { exerciseId: 'P5', section: 'main', plannedDose: { sets: 3, reps: 6  }, orderIndex: 1 },
    { exerciseId: 'P6', section: 'main', plannedDose: { sets: 3, reps: 8  }, orderIndex: 2 },
    { exerciseId: 'P4', section: 'main', plannedDose: { sets: 3, reps: 6  }, orderIndex: 3 },
    { exerciseId: 'P7', section: 'main', plannedDose: { sets: 3, reps: 10 }, orderIndex: 4 },
    { exerciseId: 'K1', section: 'core', plannedDose: { sets: 3, seconds: 45 }, orderIndex: 5 },
    { exerciseId: 'K8', section: 'core', plannedDose: { sets: 3, seconds: 15 }, orderIndex: 6 },
  ],
  'Interval Run': [
    { exerciseId: 'C5', section: 'main', plannedDose: { sets: 1, minutes: 35 }, orderIndex: 0 },
  ],
  'Legs & Glutes': [
    { exerciseId: 'L7', section: 'main', plannedDose: { sets: 3, reps: 8  }, orderIndex: 0 },
    { exerciseId: 'L8', section: 'main', plannedDose: { sets: 3, reps: 8  }, orderIndex: 1 },
    { exerciseId: 'L6', section: 'main', plannedDose: { sets: 3, reps: 12 }, orderIndex: 2 },
    { exerciseId: 'L2', section: 'main', plannedDose: { sets: 3, reps: 12 }, orderIndex: 3 },
    { exerciseId: 'L3', section: 'main', plannedDose: { sets: 3, reps: 10 }, orderIndex: 4 },
    { exerciseId: 'L4', section: 'main', plannedDose: { sets: 3, reps: 12 }, orderIndex: 5 },
    { exerciseId: 'L5', section: 'main', plannedDose: { sets: 3, seconds: 45 }, orderIndex: 6 },
  ],
  'Pull & Core': [
    { exerciseId: 'B4', section: 'main', plannedDose: { sets: 3, reps: 3  }, orderIndex: 0 },
    { exerciseId: 'B2', section: 'main', plannedDose: { sets: 4, reps: 8  }, orderIndex: 1 },
    { exerciseId: 'B3', section: 'main', plannedDose: { sets: 3, seconds: 30 }, orderIndex: 2 },
    { exerciseId: 'B1', section: 'main', plannedDose: { sets: 3, reps: 12 }, orderIndex: 3 },
    { exerciseId: 'B5', section: 'main', plannedDose: { sets: 3, reps: 10 }, orderIndex: 4 },
    { exerciseId: 'K7', section: 'core', plannedDose: { sets: 3, reps: 10 }, orderIndex: 5 },
    { exerciseId: 'K2', section: 'core', plannedDose: { sets: 3, seconds: 30 }, orderIndex: 6 },
    { exerciseId: 'K3', section: 'core', plannedDose: { sets: 3, reps: 12 }, orderIndex: 7 },
  ],
  'Steady Run': [
    { exerciseId: 'C4', section: 'main', plannedDose: { sets: 1, minutes: 35 }, orderIndex: 0 },
  ],
  'Conditioning Circuit': [
    { exerciseId: 'C10', section: 'main', plannedDose: { sets: 4, reps: 8  }, orderIndex: 0 },
    { exerciseId: 'C9',  section: 'main', plannedDose: { sets: 4, seconds: 40 }, orderIndex: 1 },
    { exerciseId: 'C6',  section: 'main', plannedDose: { sets: 4, minutes: 1  }, orderIndex: 2 },
    { exerciseId: 'C8',  section: 'main', plannedDose: { sets: 4, seconds: 30 }, orderIndex: 3 },
    { exerciseId: 'L6',  section: 'main', plannedDose: { sets: 4, reps: 12 }, orderIndex: 4 },
  ],
  'Rest': [],
};

const TEST_SLOTS: PlanExerciseSlot[] = [
  { exerciseId: 'TEST_PLANK',     section: 'main', plannedDose: { sets: 1 }, orderIndex: 0 },
  { exerciseId: 'TEST_WALLSIT',   section: 'main', plannedDose: { sets: 1 }, orderIndex: 1 },
  { exerciseId: 'TEST_PUSHUPS',   section: 'main', plannedDose: { sets: 1 }, orderIndex: 2 },
  { exerciseId: 'TEST_SQUATS60',  section: 'main', plannedDose: { sets: 1 }, orderIndex: 3 },
  { exerciseId: 'TEST_DEADHANG',  section: 'main', plannedDose: { sets: 1 }, orderIndex: 4 },
  { exerciseId: 'TEST_INVROW',    section: 'main', plannedDose: { sets: 1 }, orderIndex: 5 },
  { exerciseId: 'TEST_2KM',       section: 'main', plannedDose: { sets: 1 }, orderIndex: 6 },
];

function getSlotsForDay(dayNumber: number, level: Level, sessionLabel: string): PlanExerciseSlot[] {
  if (isTestDay(dayNumber)) return TEST_SLOTS;
  if (getDayType(dayNumber, level) === 'rest') return [];

  const sessionMap = level === 'beginner' ? BEGINNER_SESSIONS : INTERMEDIATE_SESSIONS;
  const mainSlots = sessionMap[sessionLabel] ?? [];
  const warmup = mainSlots.length > 0 ? WARMUP_SLOTS : [];
  const cooldown = mainSlots.length > 0 ? COOLDOWN_SLOTS : [];
  return [...warmup, ...mainSlots, ...cooldown];
}

// ─── 60-day plan generator ────────────────────────────────────────────────────

export function generate60DayPlan(
  startDate: Date,
  level: Level,
  _bmiBand: BMIBand | null,  // reserved for future BMI-band overrides
): PlanDay[] {
  const plan: PlanDay[] = [];

  for (let day = 1; day <= 60; day++) {
    const date = addDays(startDate, day - 1);
    const type = getDayType(day, level);
    const phase = getDayPhase(day);
    const sessionLabel = getSessionLabel(day, level);
    const exercises = getSlotsForDay(day, level, sessionLabel);

    plan.push({
      id: uid(),
      dayNumber: day,
      date: format(date, 'yyyy-MM-dd'),
      type,
      phase,
      sessionLabel,
      exercises,
      notes: [],
      isCompleted: false,
      completedAt: null,
    });
  }

  return plan;
}
