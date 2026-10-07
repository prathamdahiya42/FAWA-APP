import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { getDatabase } from '@/src/db/database';
import { CURRENT_SCHEMA_VERSION } from '@/src/db/migrations';
import type { BackupData } from '@/src/types';

export async function exportDatabaseBackup(): Promise<string> {
  const db = await getDatabase();

  const [
    profileRow,
    planDays,
    workoutLogs,
    testResults,
    bodyMetrics,
    reminders,
    reminderEvents,
    notes,
    sleepLogs,
    hydrationLogs,
    readinessChecks,
    checkpoints,
    photoRefs,
    exercises,
    walkRunState,
  ] = await Promise.all([
    db.getFirstAsync<any>('SELECT * FROM user_profile LIMIT 1'),
    db.getAllAsync<any>('SELECT * FROM plan_days'),
    db.getAllAsync<any>('SELECT * FROM workout_logs'),
    db.getAllAsync<any>('SELECT * FROM test_results'),
    db.getAllAsync<any>('SELECT * FROM body_metrics'),
    db.getAllAsync<any>('SELECT * FROM reminders'),
    db.getAllAsync<any>('SELECT * FROM reminder_events'),
    db.getAllAsync<any>('SELECT * FROM notes'),
    db.getAllAsync<any>('SELECT * FROM sleep_logs'),
    db.getAllAsync<any>('SELECT * FROM hydration_logs'),
    db.getAllAsync<any>('SELECT * FROM readiness_checks'),
    db.getAllAsync<any>('SELECT * FROM checkpoints'),
    db.getAllAsync<any>('SELECT * FROM photo_refs'),
    db.getAllAsync<any>('SELECT * FROM exercises WHERE is_custom = 1'),
    db.getFirstAsync<any>('SELECT * FROM walk_run_state LIMIT 1'),
  ]);

  const backup: BackupData = {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    profile: profileRow
      ? {
          ...profileRow,
          equipment: JSON.parse(profileRow.equipment || '[]'),
          hasHeartOrJointCondition: profileRow.has_condition === 1,
          heightCm: profileRow.height_cm,
          weightKg: profileRow.weight_kg,
          waistCm: profileRow.waist_cm,
          bmiBand: profileRow.bmi_band,
          wakeTime: profileRow.wake_time,
          workoutTime: profileRow.workout_time,
          sleepGoalHours: profileRow.sleep_goal_hours,
          startDate: profileRow.start_date,
          createdAt: profileRow.created_at,
          updatedAt: profileRow.updated_at,
        }
      : null,
    planDays: planDays.map((p) => ({
      ...p,
      dayNumber: p.day_number,
      sessionLabel: p.session_label,
      notes: JSON.parse(p.notes || '[]'),
      exercises: JSON.parse(p.exercises || '[]'),
      isCompleted: p.is_completed === 1,
      completedAt: p.completed_at,
    })),
    workoutLogs: workoutLogs.map((w) => ({
      ...w,
      planDayId: w.plan_day_id,
      dayNumber: w.day_number,
      startedAt: w.started_at,
      completedAt: w.completed_at,
      durationSeconds: w.duration_seconds,
      exerciseLogs: JSON.parse(w.exercise_logs || '[]'),
      sessionRPE: w.session_rpe,
      painEventLogged: w.pain_event_logged === 1,
      isPartial: w.is_partial === 1,
    })),
    testResults: testResults.map((t) => ({
      ...t,
      dayNumber: t.day_number,
      twoKmTimeSeconds: t.two_km_time_seconds,
      maxPushUps: t.max_push_ups,
      pushUpVariation: t.push_up_variation,
      squatsIn60s: t.squats_in_60s,
      plankSeconds: t.plank_seconds,
      wallSitSeconds: t.wall_sit_seconds,
      deadHangSeconds: t.dead_hang_seconds,
      invertedRows: t.inverted_rows,
      pullUps: t.pull_ups,
      restingHeartRate: t.resting_heart_rate,
      weightKg: t.weight_kg,
      waistCm: t.waist_cm,
      photoFront: t.photo_front,
      photoSide: t.photo_side,
      photoBack: t.photo_back,
      createdAt: t.created_at,
    })),
    bodyMetrics: bodyMetrics.map((b) => ({
      id: b.id,
      date: b.date,
      weightKg: b.weight_kg,
      waistCm: b.waist_cm,
      restingHeartRate: b.resting_heart_rate,
      createdAt: b.created_at,
    })),
    reminders: reminders.map((r) => ({
      ...r,
      fireTime: r.fire_time,
      repeatRule: JSON.parse(r.repeat_rule || '{"type":"once"}'),
      vibration: r.vibration === 1,
      snoozeMins: r.snooze_mins,
      linkedEntity: r.linked_entity ? JSON.parse(r.linked_entity) : null,
      enabled: r.enabled === 1,
      createdAt: r.created_at,
      lastFiredAt: r.last_fired_at,
    })),
    reminderEvents: reminderEvents.map((re) => ({
      id: re.id,
      reminderId: re.reminder_id,
      firedAt: re.fired_at,
      action: re.action,
      snoozeUntil: re.snooze_until,
      createdAt: re.created_at,
    })),
    notes: notes.map((n) => ({
      ...n,
      checklistItems: JSON.parse(n.checklist_items || '[]'),
      remindAt: n.remind_at,
      attachedTo: n.attached_to ? JSON.parse(n.attached_to) : null,
      done: n.done === 1,
      pinned: n.pinned === 1,
      timerSeconds: n.timer_seconds,
      timerStartedAt: n.timer_started_at,
      countdownReminderId: n.countdown_reminder_id,
      createdAt: n.created_at,
      updatedAt: n.updated_at,
    })),
    sleepLogs: sleepLogs.map((s) => ({
      id: s.id,
      date: s.date,
      inBedAt: s.in_bed_at,
      wokeAt: s.woke_at,
      durationHours: s.duration_hours,
      quality: s.quality,
      createdAt: s.created_at,
    })),
    hydrationLogs: hydrationLogs.map((h) => ({
      id: h.id,
      date: h.date,
      glassesLogged: h.glasses_logged,
      createdAt: h.created_at,
    })),
    readinessChecks: readinessChecks.map((rc) => ({
      id: rc.id,
      date: rc.date,
      sleepQuality: rc.sleep_quality,
      soreness: rc.soreness,
      mood: rc.mood,
      overrideAndTrain: rc.override_and_train === 1,
      outcome: rc.outcome,
      createdAt: rc.created_at,
    })),
    checkpoints: checkpoints.map((c) => ({
      id: c.id,
      afterPhase: c.after_phase,
      dayNumber: c.day_number,
      outcome: c.outcome,
      percentHit: c.percent_hit,
      metrics: JSON.parse(c.metrics || '{}'),
      explanation: c.explanation,
      appliedAt: c.applied_at,
      createdAt: c.created_at,
    })),
    photoRefs: photoRefs.map((pr) => ({
      id: pr.id,
      path: pr.path,
      angle: pr.angle,
      date: pr.date,
      testDayNumber: pr.test_day_number,
      createdAt: pr.created_at,
    })),
    exercises: [],
    walkRunState: walkRunState
      ? {
          currentRung: walkRunState.current_rung,
          consecutiveLowRpe: walkRunState.consecutive_low_rpe,
          lastUpdated: walkRunState.last_updated,
        }
      : null,
  };

  const jsonString = JSON.stringify(backup, null, 2);
  const fileName = `fawa-backup-${new Date().toISOString().slice(0, 10)}.json`;
  const fileUri = `${FileSystem.documentDirectory}${fileName}`;

  await FileSystem.writeAsStringAsync(fileUri, jsonString, {
    encoding: FileSystem.EncodingType.UTF8,
  });

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(fileUri, {
      mimeType: 'application/json',
      dialogTitle: 'Export FAWA Backup',
      UTI: 'public.json',
    });
  }

  return fileUri;
}

export async function importDatabaseBackup(jsonString: string): Promise<boolean> {
  const data: BackupData = JSON.parse(jsonString);

  if (!data.schemaVersion || !data.exportedAt) {
    throw new Error('Invalid FAWA backup format.');
  }

  const db = await getDatabase();

  // Restore Profile
  if (data.profile) {
    const p = data.profile;
    await db.runAsync(
      `INSERT OR REPLACE INTO user_profile (
        id, name, age, sex, height_cm, weight_kg, waist_cm, bmi, bmi_band,
        level, has_condition, equipment, wake_time, workout_time, sleep_goal_hours,
        start_date, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        p.id,
        p.name,
        p.age,
        p.sex,
        p.heightCm,
        p.weightKg,
        p.waistCm,
        p.bmi,
        p.bmiBand,
        p.level,
        p.hasHeartOrJointCondition ? 1 : 0,
        JSON.stringify(p.equipment),
        p.wakeTime,
        p.workoutTime,
        p.sleepGoalHours,
        p.startDate,
        p.createdAt,
        p.updatedAt,
      ],
    );
  }

  // Restore Plan Days
  for (const day of data.planDays || []) {
    await db.runAsync(
      `INSERT OR REPLACE INTO plan_days (
        id, day_number, date, type, phase, session_label, notes, exercises, is_completed, completed_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        day.id,
        day.dayNumber,
        day.date,
        day.type,
        day.phase,
        day.sessionLabel,
        JSON.stringify(day.notes || []),
        JSON.stringify(day.exercises || []),
        day.isCompleted ? 1 : 0,
        day.completedAt,
      ],
    );
  }

  // Restore Reminders
  for (const r of data.reminders || []) {
    await db.runAsync(
      `INSERT OR REPLACE INTO reminders (
        id, kind, title, body, fire_time, repeat_rule, priority, sound,
        vibration, snooze_mins, linked_entity, enabled, created_at, last_fired_at, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        r.id,
        r.kind,
        r.title,
        r.body,
        r.fireTime,
        JSON.stringify(r.repeatRule),
        r.priority,
        r.sound,
        r.vibration ? 1 : 0,
        r.snoozeMins,
        r.linkedEntity ? JSON.stringify(r.linkedEntity) : null,
        r.enabled ? 1 : 0,
        r.createdAt,
        r.lastFiredAt,
        r.status,
      ],
    );
  }

  // Restore Notes
  for (const n of data.notes || []) {
    await db.runAsync(
      `INSERT OR REPLACE INTO notes (
        id, type, text, checklist_items, remind_at, priority, attached_to,
        done, pinned, timer_seconds, timer_started_at, countdown_reminder_id, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        n.id,
        n.type,
        n.text,
        JSON.stringify(n.checklistItems || []),
        n.remindAt,
        n.priority,
        n.attachedTo ? JSON.stringify(n.attachedTo) : null,
        n.done ? 1 : 0,
        n.pinned ? 1 : 0,
        n.timerSeconds,
        n.timerStartedAt,
        n.countdownReminderId,
        n.createdAt,
        n.updatedAt,
      ],
    );
  }

  return true;
}
