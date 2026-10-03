import {
  buildDefaultReminders,
  expandReminderToSchedule,
  computeQuickCaptureTime,
  computeSnoozeTime,
  isInQuietHours,
} from '../../src/engine/reminder-rules';
import type { Reminder, UserProfile } from '../../src/types';

describe('Reminder Rules Engine', () => {
  const mockProfile: UserProfile = {
    id: 'test-user',
    name: 'Arpit',
    age: 24,
    sex: 'male',
    heightCm: 175,
    weightKg: 72,
    waistCm: 80,
    bmi: 23.5,
    bmiBand: 'overweight',
    level: 'beginner',
    hasHeartOrJointCondition: false,
    equipment: [0],
    wakeTime: '06:30',
    workoutTime: '07:30',
    sleepGoalHours: 8,
    startDate: '2026-10-03',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  describe('buildDefaultReminders', () => {
    it('creates full set of default reminders from profile', () => {
      const reminders = buildDefaultReminders(mockProfile);
      expect(reminders.length).toBeGreaterThanOrEqual(7);

      const kinds = reminders.map((r) => r.kind);
      expect(kinds).toContain('workout');
      expect(kinds).toContain('pre_workout');
      expect(kinds).toContain('hydration');
      expect(kinds).toContain('sleep_winddown');
      expect(kinds).toContain('sleep_bedtime');
      expect(kinds).toContain('sleep_wake');
      expect(kinds).toContain('readiness');
      expect(kinds).toContain('streak_protection');
    });

    it('sets wake and bedtime alarms with alarm priority', () => {
      const reminders = buildDefaultReminders(mockProfile);
      const wake = reminders.find((r) => r.kind === 'sleep_wake');
      const bedtime = reminders.find((r) => r.kind === 'sleep_bedtime');

      expect(wake?.priority).toBe('alarm');
      expect(bedtime?.priority).toBe('alarm');
    });
  });

  describe('computeQuickCaptureTime', () => {
    it('computes relative offsets accurately', () => {
      const before = Date.now();
      const in10 = computeQuickCaptureTime('in10', '06:30').getTime();
      const after = Date.now();

      expect(in10).toBeGreaterThanOrEqual(before + 10 * 60 * 1000 - 1000);
      expect(in10).toBeLessThanOrEqual(after + 10 * 60 * 1000 + 1000);
    });

    it('computes 30m and 1hr offsets', () => {
      const now = Date.now();
      const in30 = computeQuickCaptureTime('in30', '06:30').getTime();
      const in1hr = computeQuickCaptureTime('in1hr', '06:30').getTime();

      expect(in30 - now).toBeCloseTo(30 * 60 * 1000, -3);
      expect(in1hr - now).toBeCloseTo(60 * 60 * 1000, -3);
    });

    it('computes tomorrow morning wake time', () => {
      const tomorrow = computeQuickCaptureTime('tomorrow', '06:30');
      expect(tomorrow.getHours()).toBe(6);
      expect(tomorrow.getMinutes()).toBe(30);
      expect(tomorrow.getTime()).toBeGreaterThan(Date.now());
    });
  });

  describe('computeSnoozeTime', () => {
    it('snoozes for requested minutes', () => {
      const now = Date.now();
      const snoozed = computeSnoozeTime(10).getTime();
      expect(snoozed - now).toBeCloseTo(10 * 60 * 1000, -3);
    });
  });

  describe('expandReminderToSchedule (rolling window)', () => {
    it('expands once reminder in the future', () => {
      const future = new Date(Date.now() + 3600 * 1000).toISOString();
      const reminder: Reminder = {
        id: 'r1',
        kind: 'custom',
        title: 'Water',
        body: 'Drink',
        fireTime: future,
        repeatRule: { type: 'once' },
        priority: 'gentle',
        sound: 'gentle',
        vibration: true,
        snoozeMins: 10,
        linkedEntity: null,
        enabled: true,
        createdAt: new Date().toISOString(),
        lastFiredAt: null,
        status: 'pending',
      };

      const scheduled = expandReminderToSchedule(reminder, 7);
      expect(scheduled.length).toBe(1);
      expect(scheduled[0].reminderId).toBe('r1');
    });

    it('returns empty for disabled reminder', () => {
      const reminder: Reminder = {
        id: 'r1',
        kind: 'custom',
        title: 'Water',
        body: 'Drink',
        fireTime: new Date(Date.now() + 3600 * 1000).toISOString(),
        repeatRule: { type: 'once' },
        priority: 'gentle',
        sound: 'gentle',
        vibration: true,
        snoozeMins: 10,
        linkedEntity: null,
        enabled: false,
        createdAt: new Date().toISOString(),
        lastFiredAt: null,
        status: 'pending',
      };

      expect(expandReminderToSchedule(reminder, 7)).toEqual([]);
    });

    it('caps scheduled events under platform limit of 50', () => {
      const reminder: Reminder = {
        id: 'r-interval',
        kind: 'hydration',
        title: 'Water',
        body: 'Drink',
        fireTime: null,
        repeatRule: { type: 'interval', everyHours: 1, startTime: '06:00', endTime: '22:00' },
        priority: 'gentle',
        sound: 'gentle',
        vibration: true,
        snoozeMins: 10,
        linkedEntity: null,
        enabled: true,
        createdAt: new Date().toISOString(),
        lastFiredAt: null,
        status: 'pending',
      };

      const scheduled = expandReminderToSchedule(reminder, 7);
      expect(scheduled.length).toBeLessThanOrEqual(50);
    });
  });

  describe('isInQuietHours', () => {
    it('returns false when quiet hours not set', () => {
      expect(isInQuietHours(new Date(), null, null)).toBe(false);
    });

    it('correctly handles overnight quiet hours (22:00 to 07:00)', () => {
      const night = new Date();
      night.setHours(23, 0, 0, 0);
      expect(isInQuietHours(night, '22:00', '07:00')).toBe(true);

      const earlyMorning = new Date();
      earlyMorning.setHours(5, 30, 0, 0);
      expect(isInQuietHours(earlyMorning, '22:00', '07:00')).toBe(true);

      const afternoon = new Date();
      afternoon.setHours(14, 0, 0, 0);
      expect(isInQuietHours(afternoon, '22:00', '07:00')).toBe(false);
    });
  });
});
