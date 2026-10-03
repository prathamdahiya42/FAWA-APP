import { addMinutes, format, setHours, setMinutes, addDays } from 'date-fns';
import type { Reminder, ReminderKind, RepeatRule, Priority, UserProfile } from '@/src/types';

function uid(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function parseTime(timeStr: string, baseDate?: Date): Date {
  const [h, m] = timeStr.split(':').map(Number);
  const d = baseDate ? new Date(baseDate) : new Date();
  d.setHours(h, m, 0, 0);
  return d;
}

function makeReminder(
  kind: ReminderKind,
  title: string,
  body: string,
  repeatRule: RepeatRule,
  priority: Priority = 'gentle',
  fireTime?: Date,
): Reminder {
  const now = new Date().toISOString();
  return {
    id: uid(),
    kind,
    title,
    body,
    fireTime: fireTime?.toISOString() ?? null,
    repeatRule,
    priority,
    sound: priority === 'alarm' ? 'alarm' : 'gentle',
    vibration: true,
    snoozeMins: 10,
    linkedEntity: null,
    enabled: true,
    createdAt: now,
    lastFiredAt: null,
    status: 'pending',
  };
}

// ─── Default reminders from user profile ─────────────────────────────────────

export function buildDefaultReminders(profile: UserProfile): Reminder[] {
  const reminders: Reminder[] = [];

  // Workout reminder at workout time
  const workoutTime = parseTime(profile.workoutTime);
  reminders.push(makeReminder(
    'workout',
    'Time to train!',
    "It's workout time. Let's go.",
    { type: 'daily' },
    'gentle',
    workoutTime,
  ));

  // Pre-workout: 10 min before
  const preWorkout = addMinutes(parseTime(profile.workoutTime), -10);
  reminders.push(makeReminder(
    'pre_workout',
    'Warm up in 10 minutes',
    'Start your indoor warm-up now.',
    { type: 'daily' },
    'gentle',
    preWorkout,
  ));

  // Hydration: every 2h, 08:00–20:00
  reminders.push(makeReminder(
    'hydration',
    'Hydration check',
    'Drink a glass of water. You drink less in winter — stay ahead of it.',
    { type: 'interval', everyHours: 2, startTime: '08:00', endTime: '20:00' },
    'gentle',
  ));

  // Compute bedtime from wake time and sleep goal
  const [wakeH, wakeM] = profile.wakeTime.split(':').map(Number);
  const bedtimeDate = new Date();
  bedtimeDate.setHours(wakeH, wakeM, 0, 0);
  bedtimeDate.setTime(bedtimeDate.getTime() - profile.sleepGoalHours * 60 * 60 * 1000);

  // Wind-down: 45 min before bedtime
  const winddown = addMinutes(bedtimeDate, -45);
  reminders.push(makeReminder(
    'sleep_winddown',
    'Wind down',
    'Screens down. Lights low. Water by the bed. Bed in 45 minutes.',
    { type: 'daily' },
    'gentle',
    winddown,
  ));

  // Bedtime alarm
  reminders.push(makeReminder(
    'sleep_bedtime',
    'Time for bed',
    'Get 7–9 hours. Your body recovers during sleep.',
    { type: 'daily' },
    'alarm',
    bedtimeDate,
  ));

  // Wake alarm
  const wakeDate = parseTime(profile.wakeTime);
  reminders.push(makeReminder(
    'sleep_wake',
    'Rise and shine',
    'Good morning! Your workout plan is ready.',
    { type: 'daily' },
    'alarm',
    wakeDate,
  ));

  // Readiness check: 15 min after wake
  const readiness = addMinutes(parseTime(profile.wakeTime), 15);
  reminders.push(makeReminder(
    'readiness',
    'Morning check-in',
    'How are you feeling today?',
    { type: 'daily' },
    'gentle',
    readiness,
  ));

  // Streak protection: 20:00
  const streakTime = parseTime('20:00');
  reminders.push(makeReminder(
    'streak_protection',
    "Keep your streak alive",
    "You haven't trained today. Don't break the chain.",
    { type: 'daily' },
    'gentle',
    streakTime,
  ));

  return reminders;
}

// ─── Reminder expansion (rolling window) ─────────────────────────────────────

export interface ScheduledFiring {
  fireAt: Date;
  reminderId: string;
}

/**
 * Expand a reminder rule into concrete scheduled firings.
 * Respects iOS 64-notification limit: cap at 50 items per window.
 * windowDays: how many days to look ahead (default 7).
 */
export function expandReminderToSchedule(
  reminder: Reminder,
  windowDays = 7,
): ScheduledFiring[] {
  if (!reminder.enabled) return [];
  const events: ScheduledFiring[] = [];
  const now = new Date();
  const MAX = 50;

  const { repeatRule, fireTime } = reminder;

  if (repeatRule.type === 'once') {
    if (fireTime) {
      const fireAt = new Date(fireTime);
      if (fireAt > now) events.push({ fireAt, reminderId: reminder.id });
    }
    return events;
  }

  if ((repeatRule.type === 'daily' || repeatRule.type === 'weekdays') && fireTime) {
    const base = new Date(fireTime);
    for (let d = 0; d < windowDays && events.length < MAX; d++) {
      const fireAt = new Date(base);
      fireAt.setDate(now.getDate() + d);
      if (repeatRule.type === 'weekdays') {
        if (!repeatRule.days.includes(fireAt.getDay())) continue;
      }
      if (fireAt > now) events.push({ fireAt, reminderId: reminder.id });
    }
  }

  if (repeatRule.type === 'interval') {
    const { everyHours, startTime, endTime } = repeatRule;
    for (let d = 0; d < windowDays && events.length < MAX; d++) {
      const day = addDays(now, d);
      const [sh, sm] = startTime.split(':').map(Number);
      const [eh, em] = endTime.split(':').map(Number);
      let cur = setMinutes(setHours(new Date(day), sh), sm);
      cur.setSeconds(0, 0);
      const end = setMinutes(setHours(new Date(day), eh), em);
      while (cur <= end && events.length < MAX) {
        if (cur > now) events.push({ fireAt: new Date(cur), reminderId: reminder.id });
        cur = addMinutes(cur, everyHours * 60);
      }
    }
  }

  return events;
}

// ─── Quick capture time presets ───────────────────────────────────────────────

export type QuickCapturePresetKey = 'in10' | 'in30' | 'in1hr' | 'tonight' | 'tomorrow';

export function computeQuickCaptureTime(
  presetKey: QuickCapturePresetKey,
  wakeTime: string,
): Date {
  const now = new Date();
  switch (presetKey) {
    case 'in10':  return addMinutes(now, 10);
    case 'in30':  return addMinutes(now, 30);
    case 'in1hr': return addMinutes(now, 60);
    case 'tonight': {
      const tonight = new Date(now);
      tonight.setHours(21, 0, 0, 0);
      return tonight > now ? tonight : addMinutes(now, 60);
    }
    case 'tomorrow': {
      const tomorrow = addDays(now, 1);
      const [h, m] = wakeTime.split(':').map(Number);
      tomorrow.setHours(h, m, 0, 0);
      return tomorrow;
    }
  }
}

export function computeSnoozeTime(snoozeMins: number): Date {
  return addMinutes(new Date(), snoozeMins);
}

// ─── Quiet hours check ────────────────────────────────────────────────────────

export function isInQuietHours(
  fireTime: Date,
  quietStart: string | null,
  quietEnd: string | null,
): boolean {
  if (!quietStart || !quietEnd) return false;
  const [sh, sm] = quietStart.split(':').map(Number);
  const [eh, em] = quietEnd.split(':').map(Number);
  const minutes = fireTime.getHours() * 60 + fireTime.getMinutes();
  const startMin = sh * 60 + sm;
  const endMin = eh * 60 + em;
  if (startMin <= endMin) {
    return minutes >= startMin && minutes < endMin;
  }
  // Overnight quiet hours (e.g. 22:00 – 07:00)
  return minutes >= startMin || minutes < endMin;
}
