import type { PhaseName } from '@/src/theme/colors';

// ─── User & Profile ─────────────────────────────────────────────────────────
export interface UserProfile {
  id: string;
  name: string;
  age: number;
  sex: 'male' | 'female' | 'prefer_not_to_say' | null;
  heightCm: number;
  weightKg: number;
  waistCm: number;
  bmi: number;
  bmiBand: BMIBand | null;
  level: Level;
  hasHeartOrJointCondition: boolean;
  equipment: EquipmentTier[];
  wakeTime: string;       // HH:MM
  workoutTime: string;    // HH:MM
  sleepGoalHours: number;
  startDate: string;      // ISO date
  createdAt: string;
  updatedAt: string;
}

export type Level = 'beginner' | 'intermediate';
export type BMIBand = 'underweight' | 'normal' | 'overweight' | 'obese';
export type EquipmentTier = 0 | 1;

// ─── Settings ───────────────────────────────────────────────────────────────
export interface Settings {
  themeOverride: 'dark' | 'light' | null;
  units: 'metric' | 'imperial';
  language: string;
  soundEnabled: boolean;
  hapticsEnabled: boolean;
  reduceMotion: boolean;
  defaultSnoozeMins: number;
  quickCapturePresets: QuickCapturePreset[];
  aqiSource: 'auto' | 'manual';
  manualAqi: number | null;
  coldWeatherMode: boolean;
  quietHoursStart: string | null; // HH:MM
  quietHoursEnd: string | null;   // HH:MM
  featureCommunity: false;        // Always false in v1
}

export interface QuickCapturePreset {
  id: string;
  label: string;
  offsetMinutes: number | null; // null = pick time
  timeOfDay: string | null;     // HH:MM for fixed-time presets
}

// ─── Exercise ────────────────────────────────────────────────────────────────
export type ExerciseType = 'reps' | 'timed' | 'duration' | 'reps_with_load';
export type ImpactLevel = 'none' | 'low' | 'high';
export type MuscleGroup =
  | 'warmup' | 'cardio' | 'lower_body' | 'push' | 'pull' | 'core' | 'mobility' | 'custom';

export interface ExerciseDose {
  sets: number;
  reps?: number;
  seconds?: number;
  minutes?: number;
}

export interface BMIRestriction {
  blockedUntilDay?: number;
  swapToId?: string;
  reason?: string;
}

export interface Exercise {
  id: string;
  name: string;
  muscleGroup: MuscleGroup;
  equipmentTier: EquipmentTier;
  impact: ImpactLevel;
  type: ExerciseType;
  beginnerDay1: ExerciseDose;
  beginnerDay60: ExerciseDose;
  intermediateDay1: ExerciseDose;
  intermediateDay60: ExerciseDose;
  easierId: string | null;
  harderId: string | null;
  substitutions: Record<string, string>; // equipmentTier key -> exerciseId
  bmiBandRestrictions: Partial<Record<BMIBand, BMIRestriction>>;
  cues: [string, string, string];
  commonMistake: string;
  imageRef: string | null;
  isCustom: boolean;
  createdAt: string;
}

// ─── Plan ────────────────────────────────────────────────────────────────────
export type DayType = 'training' | 'cardio' | 'recovery' | 'rest' | 'test' | 'deload' | 'taper';
export type SessionSection = 'warmup' | 'main' | 'core' | 'cooldown';

export interface PlanExerciseSlot {
  exerciseId: string;
  section: SessionSection;
  plannedDose: ExerciseDose;
  orderIndex: number;
  note?: string;
}

export interface PlanDay {
  id: string;
  dayNumber: number;      // 1–60
  date: string;           // ISO date
  type: DayType;
  phase: PhaseName;
  sessionLabel: string;   // e.g. "Full Body A"
  exercises: PlanExerciseSlot[];
  notes: string[];
  isCompleted: boolean;
  completedAt: string | null;
}

// ─── Workout Log ─────────────────────────────────────────────────────────────
export interface SetLog {
  setNumber: number;
  reps?: number;
  seconds?: number;
  weightKg?: number;
  rpe?: number;     // 1–10
  hasPain: boolean;
}

export interface ExerciseLog {
  id: string;
  workoutLogId: string;
  exerciseId: string;
  sets: SetLog[];
  skipped: boolean;
  skipReason?: string;
  note?: string;
  createdAt: string;
}

export interface WorkoutLog {
  id: string;
  planDayId: string;
  dayNumber: number;
  startedAt: string;
  completedAt: string | null;
  durationSeconds: number;
  exerciseLogs: ExerciseLog[];
  sessionRPE?: number;
  notes?: string;
  painEventLogged: boolean;
  isPartial: boolean;
}

// ─── Test Results ────────────────────────────────────────────────────────────
export interface TestResult {
  id: string;
  dayNumber: 1 | 15 | 30 | 60;
  date: string;
  twoKmTimeSeconds: number | null;
  maxPushUps: number | null;
  pushUpVariation: string | null;
  squatsIn60s: number | null;
  plankSeconds: number | null;
  wallSitSeconds: number | null;
  deadHangSeconds: number | null;
  invertedRows: number | null;
  pullUps: number | null;
  restingHeartRate: number | null;
  weightKg: number | null;
  waistCm: number | null;
  photoFront: string | null;
  photoSide: string | null;
  photoBack: string | null;
  notes?: string;
  createdAt: string;
}

// ─── Body Metrics ─────────────────────────────────────────────────────────────
export interface BodyMetric {
  id: string;
  date: string;
  weightKg: number | null;
  waistCm: number | null;
  restingHeartRate: number | null;
  createdAt: string;
}

// ─── Reminders ───────────────────────────────────────────────────────────────
export type ReminderKind =
  | 'workout' | 'pre_workout' | 'hydration'
  | 'sleep_winddown' | 'sleep_bedtime' | 'sleep_wake'
  | 'readiness' | 'test_day_eve' | 'test_day_morning'
  | 'measurement' | 'phase_change' | 'streak_protection'
  | 'missed_session' | 'rest_day' | 'weekly_review'
  | 'aqi_nudge' | 'custom' | 'note';

export type RepeatRule =
  | { type: 'once' }
  | { type: 'daily' }
  | { type: 'weekdays'; days: number[] }  // 0 = Sun
  | { type: 'interval'; everyHours: number; startTime: string; endTime: string };

export type Priority = 'gentle' | 'alarm';

export interface Reminder {
  id: string;
  kind: ReminderKind;
  title: string;
  body: string;
  fireTime: string | null;   // ISO datetime for 'once' / base time for repeating
  repeatRule: RepeatRule;
  priority: Priority;
  sound: 'alarm' | 'gentle' | 'none';
  vibration: boolean;
  snoozeMins: number;
  linkedEntity: { type: string; id: string } | null;
  enabled: boolean;
  createdAt: string;
  lastFiredAt: string | null;
  status: 'pending' | 'fired' | 'done' | 'snoozed' | 'skipped';
}

export interface ReminderEvent {
  id: string;
  reminderId: string;
  firedAt: string;
  action: 'fired' | 'done' | 'snoozed' | 'skipped';
  snoozeUntil?: string;
  createdAt: string;
}

// ─── Notes ───────────────────────────────────────────────────────────────────
export type NoteType = 'text' | 'checklist' | 'timer';

export interface ChecklistItem {
  id: string;
  text: string;
  done: boolean;
}

export interface Note {
  id: string;
  type: NoteType;
  text: string;
  checklistItems: ChecklistItem[];
  remindAt: string | null;
  priority: Priority;
  attachedTo: { type: 'day' | 'workout' | 'exercise' | 'test'; id: string } | null;
  done: boolean;
  pinned: boolean;
  timerSeconds: number | null;
  timerStartedAt: string | null;
  countdownReminderId: string | null;
  createdAt: string;
  updatedAt: string;
}

// ─── Sleep ───────────────────────────────────────────────────────────────────
export interface SleepLog {
  id: string;
  date: string;
  inBedAt: string | null;
  wokeAt: string | null;
  durationHours: number | null;
  quality: 1 | 2 | 3 | 4 | 5 | null;
  createdAt: string;
}

// ─── Hydration ───────────────────────────────────────────────────────────────
export interface HydrationLog {
  id: string;
  date: string;
  glassesLogged: number;
  createdAt: string;
}

// ─── Readiness Check ─────────────────────────────────────────────────────────
export type ReadinessScore = 1 | 2 | 3; // 1=poor, 2=ok, 3=good

export interface ReadinessCheck {
  id: string;
  date: string;
  sleepQuality: ReadinessScore;
  soreness: ReadinessScore;
  mood: ReadinessScore;
  overrideAndTrain: boolean;
  outcome: 'train' | 'recovery';
  createdAt: string;
}

// ─── Streak ──────────────────────────────────────────────────────────────────
export interface Streak {
  current: number;
  longest: number;
  lastCompletedDate: string | null;
  completionRate: number; // 0–1
}

// ─── Checkpoint ──────────────────────────────────────────────────────────────
export type CheckpointOutcome = 'advance' | 'continue' | 'repeat' | 'drop_volume';

export interface CheckpointMetricResult {
  target: number;
  actual: number;
  hit: boolean;
}

export interface Checkpoint {
  id: string;
  afterPhase: PhaseName;
  dayNumber: number;
  outcome: CheckpointOutcome;
  percentHit: number;
  metrics: Record<string, CheckpointMetricResult>;
  explanation: string;
  appliedAt: string;
  createdAt: string;
}

// ─── Photo ───────────────────────────────────────────────────────────────────
export interface PhotoRef {
  id: string;
  path: string;
  angle: 'front' | 'side' | 'back';
  date: string;
  testDayNumber?: number;
  createdAt: string;
}

// ─── Walk-Run Ladder ──────────────────────────────────────────────────────────
export interface WalkRunState {
  currentRung: number;
  consecutiveLowRpe: number;
  lastUpdated: string;
}

// ─── Backup ───────────────────────────────────────────────────────────────────
export interface BackupData {
  schemaVersion: number;
  exportedAt: string;
  profile: UserProfile | null;
  planDays: PlanDay[];
  workoutLogs: WorkoutLog[];
  testResults: TestResult[];
  bodyMetrics: BodyMetric[];
  reminders: Reminder[];
  reminderEvents: ReminderEvent[];
  notes: Note[];
  sleepLogs: SleepLog[];
  hydrationLogs: HydrationLog[];
  readinessChecks: ReadinessCheck[];
  checkpoints: Checkpoint[];
  photoRefs: PhotoRef[];
  exercises: Exercise[];  // custom only
  walkRunState: WalkRunState | null;
}
