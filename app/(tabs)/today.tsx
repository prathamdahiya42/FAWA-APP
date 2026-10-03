import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  RefreshControl,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { format, differenceInCalendarDays, parseISO } from 'date-fns';
import { useThemeColors } from '@/src/theme';
import { FontFamilies, TypeScale } from '@/src/theme/typography';
import { Spacing, Radius, TouchTarget } from '@/src/theme/spacing';
import { ChargeButton } from '@/src/ui/ChargeButton';
import { ProgressRing } from '@/src/ui/ProgressRing';
import { StreakFlame } from '@/src/ui/StreakFlame';
import { Toast } from '@/src/ui/Toast';
import { QuickCaptureSheet } from '@/src/ui/QuickCaptureSheet';
import { useProfileStore } from '@/src/store/profile.store';
import { usePlanStore } from '@/src/store/plan.store';
import { useWorkoutStore } from '@/src/store/workout.store';
import { useReminderStore } from '@/src/store/reminder.store';
import { useUIStore } from '@/src/store/ui.store';
import { getDatabase } from '@/src/db/database';
import type { PlanDay, Reminder, Note, ReadinessScore } from '@/src/types';

export default function TodayScreen() {
  const colors = useThemeColors();
  const router = useRouter();

  const profile = useProfileStore((s) => s.profile);
  const setProfile = useProfileStore((s) => s.setProfile);
  const planDays = usePlanStore((s) => s.planDays);
  const setPlan = usePlanStore((s) => s.setPlan);
  const activeWorkout = useWorkoutStore((s) => s.activeWorkout);
  const reminders = useReminderStore((s) => s.reminders);
  const setReminders = useReminderStore((s) => s.setReminders);
  const notes = useReminderStore((s) => s.notes);
  const setNotes = useReminderStore((s) => s.setNotes);
  const updateNote = useReminderStore((s) => s.updateNote);
  const showToast = useUIStore((s) => s.showToast);

  const [refreshing, setRefreshing] = useState(false);
  const [quickCaptureVisible, setQuickCaptureVisible] = useState(false);

  // Daily mini-card states (persisted to SQLite)
  const [waterGlasses, setWaterGlasses] = useState(0);
  const [sleepHours, setSleepHours] = useState<number | null>(null);
  const [isSleeping, setIsSleeping] = useState(false);
  const [readinessDone, setReadinessDone] = useState(false);
  const [readinessOverride, setReadinessOverride] = useState(false);
  const [readinessSleep, setReadinessSleep] = useState<ReadinessScore>(2);
  const [readinessSoreness, setReadinessSoreness] = useState<ReadinessScore>(2);
  const [readinessMood, setReadinessMood] = useState<ReadinessScore>(2);
  const [streakCount, setStreakCount] = useState(0);

  // Current day index calculation (1–60)
  const todayDateStr = format(new Date(), 'yyyy-MM-dd');
  const dayNumber = useMemo(() => {
    if (!profile?.startDate) return 1;
    const start = parseISO(profile.startDate);
    const diff = differenceInCalendarDays(new Date(), start) + 1;
    return Math.max(1, Math.min(diff, 60));
  }, [profile?.startDate]);

  const currentPlanDay = useMemo(() => {
    return planDays.find((d) => d.dayNumber === dayNumber) || planDays[0];
  }, [planDays, dayNumber]);

  // Load from database
  const loadData = useCallback(async () => {
    try {
      const db = await getDatabase();

      // Load Profile if empty
      if (!profile) {
        const row = await db.getFirstAsync<any>('SELECT * FROM user_profile LIMIT 1');
        if (row) {
          setProfile({
            ...row,
            equipment: JSON.parse(row.equipment || '[]'),
            hasHeartOrJointCondition: row.has_condition === 1,
            heightCm: row.height_cm,
            weightKg: row.weight_kg,
            waistCm: row.waist_cm,
            bmiBand: row.bmi_band,
            wakeTime: row.wake_time,
            workoutTime: row.workout_time,
            sleepGoalHours: row.sleep_goal_hours,
            startDate: row.start_date,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
          });
        }
      }

      // Load Plan Days
      if (planDays.length === 0) {
        const rows = await db.getAllAsync<any>('SELECT * FROM plan_days ORDER BY day_number ASC');
        if (rows.length > 0) {
          setPlan(
            rows.map((r) => ({
              id: r.id,
              dayNumber: r.day_number,
              date: r.date,
              type: r.type,
              phase: r.phase,
              sessionLabel: r.session_label,
              notes: JSON.parse(r.notes || '[]'),
              exercises: JSON.parse(r.exercises || '[]'),
              isCompleted: r.is_completed === 1,
              completedAt: r.completed_at,
            })),
          );
        }
      }

      // Load Reminders
      const remRows = await db.getAllAsync<any>('SELECT * FROM reminders WHERE enabled = 1');
      if (remRows.length > 0) {
        setReminders(
          remRows.map((r) => ({
            id: r.id,
            kind: r.kind,
            title: r.title,
            body: r.body,
            fireTime: r.fire_time,
            repeatRule: JSON.parse(r.repeat_rule || '{"type":"once"}'),
            priority: r.priority,
            sound: r.sound,
            vibration: r.vibration === 1,
            snoozeMins: r.snooze_mins,
            linkedEntity: r.linked_entity ? JSON.parse(r.linked_entity) : null,
            enabled: r.enabled === 1,
            createdAt: r.created_at,
            lastFiredAt: r.last_fired_at,
            status: r.status,
          })),
        );
      }

      // Load Notes
      const noteRows = await db.getAllAsync<any>('SELECT * FROM notes WHERE done = 0 ORDER BY pinned DESC, created_at DESC');
      setNotes(
        noteRows.map((n) => ({
          id: n.id,
          type: n.type,
          text: n.text,
          checklistItems: JSON.parse(n.checklist_items || '[]'),
          remindAt: n.remind_at,
          priority: n.priority,
          attachedTo: n.attached_to ? JSON.parse(n.attached_to) : null,
          done: n.done === 1,
          pinned: n.pinned === 1,
          timerSeconds: n.timer_seconds,
          timerStartedAt: n.timer_started_at,
          countdownReminderId: n.countdown_reminder_id,
          createdAt: n.created_at,
          updatedAt: n.updated_at,
        })),
      );

      // Hydration for today
      const hyd = await db.getFirstAsync<any>('SELECT glasses_logged FROM hydration_logs WHERE date = ?', [todayDateStr]);
      if (hyd) setWaterGlasses(hyd.glasses_logged);

      // Sleep for today
      const sleep = await db.getFirstAsync<any>('SELECT * FROM sleep_logs WHERE date = ?', [todayDateStr]);
      if (sleep) {
        setSleepHours(sleep.duration_hours);
        setIsSleeping(!!sleep.in_bed_at && !sleep.woke_at);
      }

      // Readiness for today
      const ready = await db.getFirstAsync<any>('SELECT * FROM readiness_checks WHERE date = ?', [todayDateStr]);
      if (ready) {
        setReadinessDone(true);
        setReadinessOverride(ready.override_and_train === 1);
      }

      // Calculate streak
      const completedDays = await db.getAllAsync<any>(
        'SELECT day_number FROM plan_days WHERE is_completed = 1 ORDER BY day_number DESC',
      );
      setStreakCount(completedDays.length);
    } catch (err) {
      console.warn('Failed to load today screen data', err);
    }
  }, [profile, planDays.length, setProfile, setPlan, setReminders, setNotes, todayDateStr]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  // Greeting
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  }, []);

  // Log water glass
  const handleAddWater = async () => {
    const next = waterGlasses + 1;
    setWaterGlasses(next);
    try {
      const db = await getDatabase();
      await db.runAsync(
        'INSERT OR REPLACE INTO hydration_logs (id, date, glasses_logged, created_at) VALUES (?, ?, ?, ?)',
        [`hyd-${todayDateStr}`, todayDateStr, next, new Date().toISOString()],
      );
      showToast(`+1 glass logged (${next} total today)`);
    } catch (e) {
      console.warn('Failed to save water log', e);
    }
  };

  // Sleep toggle
  const handleSleepToggle = async () => {
    const nowIso = new Date().toISOString();
    const db = await getDatabase();

    if (!isSleeping) {
      // In bed
      setIsSleeping(true);
      await db.runAsync(
        'INSERT OR REPLACE INTO sleep_logs (id, date, in_bed_at, woke_at, duration_hours, quality, created_at) VALUES (?, ?, ?, null, null, null, ?)',
        [`sleep-${todayDateStr}`, todayDateStr, nowIso, nowIso],
      );
      showToast("Logged: You're in bed. Sleep well!");
    } else {
      // Woke up
      setIsSleeping(false);
      const sleepRecord = await db.getFirstAsync<any>('SELECT in_bed_at FROM sleep_logs WHERE date = ?', [todayDateStr]);
      let duration = 8;
      if (sleepRecord?.in_bed_at) {
        const diffMs = new Date().getTime() - new Date(sleepRecord.in_bed_at).getTime();
        duration = Math.round((diffMs / (1000 * 60 * 60)) * 10) / 10;
      }
      setSleepHours(duration);
      await db.runAsync(
        'UPDATE sleep_logs SET woke_at = ?, duration_hours = ? WHERE date = ?',
        [nowIso, duration, todayDateStr],
      );
      showToast(`Good morning! ${duration}h of sleep logged.`);
    }
  };

  // Readiness submit
  const handleReadinessSubmit = async (override = false) => {
    const allPoor = readinessSleep === 1 && readinessSoreness === 1 && readinessMood === 1;
    const outcome = allPoor && !override ? 'recovery' : 'train';

    try {
      const db = await getDatabase();
      await db.runAsync(
        `INSERT OR REPLACE INTO readiness_checks (
          id, date, sleep_quality, soreness, mood, override_and_train, outcome, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          `ready-${todayDateStr}`,
          todayDateStr,
          readinessSleep,
          readinessSoreness,
          readinessMood,
          override ? 1 : 0,
          outcome,
          new Date().toISOString(),
        ],
      );

      setReadinessDone(true);
      setReadinessOverride(override);

      if (allPoor && !override) {
        showToast('Switching today to Active Recovery based on readiness.');
      } else {
        showToast('Readiness check-in saved!');
      }
    } catch (e) {
      console.warn('Failed to save readiness check', e);
    }
  };

  // Readiness prompt: all 3 are poor?
  const isReadinessPoor = readinessSleep === 1 && readinessSoreness === 1 && readinessMood === 1;

  // Next up strip: up to 3 reminders/notes
  const nextUpItems = useMemo(() => {
    const list: Array<{ id: string; title: string; subtitle: string; isNote: boolean }> = [];
    for (const n of notes.slice(0, 3)) {
      list.push({
        id: n.id,
        title: n.text,
        subtitle: n.remindAt ? format(parseISO(n.remindAt), 'h:mm a') : 'Note',
        isNote: true,
      });
    }
    for (const r of reminders.slice(0, 3 - list.length)) {
      list.push({
        id: r.id,
        title: r.title,
        subtitle: r.body,
        isNote: false,
      });
    }
    return list;
  }, [notes, reminders]);

  // Tomorrow notes (surfaced after 6 PM or before 10 AM)
  const showTomorrowNotes = useMemo(() => {
    const h = new Date().getHours();
    return h >= 18 || h < 10;
  }, []);

  // Workout CTA logic
  const isRestDay = currentPlanDay?.type === 'rest';
  const isTestDay = currentPlanDay?.type === 'test';
  const isCompleted = currentPlanDay?.isCompleted || false;

  const handleStartWorkout = () => {
    if (isTestDay) {
      router.push(`/test/${dayNumber}` as any);
    } else {
      router.push(`/player/${currentPlanDay?.id || 'today'}` as any);
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]}>
      <StatusBar barStyle="light-content" backgroundColor={colors.bg} />
      <Toast />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.green} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.greeting, { color: colors.textMuted, fontFamily: FontFamilies.bodyRegular }]}>
              {greeting}, {profile?.name || 'Athlete'}
            </Text>
            <Text style={[styles.dayTitle, { color: colors.text, fontFamily: FontFamilies.displayBold }]}>
              Day {dayNumber} of 60
            </Text>
            <Text style={[styles.phaseSubtitle, { color: colors.green, fontFamily: FontFamilies.bodyMedium }]}>
              Phase: {currentPlanDay?.phase || 'Foundation'} · {currentPlanDay?.sessionLabel || 'Session'}
            </Text>
          </View>

          <View style={styles.headerRight}>
            <StreakFlame count={streakCount} />
            <TouchableOpacity
              onPress={() => router.push('/settings')}
              style={[styles.avatarBtn, { backgroundColor: colors.surface2, borderColor: colors.line }]}
              accessibilityLabel="Open settings"
              accessibilityRole="button"
            >
              <Text style={{ color: colors.text, fontFamily: FontFamilies.bodyBold, fontSize: 13 }}>
                {(profile?.name || 'A')[0].toUpperCase()}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Hero: Progress Ring & Primary Action */}
        <View style={[styles.heroCard, { backgroundColor: colors.surface, borderColor: colors.line }]}>
          <ProgressRing
            size={200}
            strokeWidth={14}
            progress={isCompleted ? 1 : activeWorkout ? 0.5 : 0}
            phase={currentPlanDay?.phase || 'Foundation'}
            isComplete={isCompleted}
          >
            <View style={styles.ringCenter}>
              {isCompleted ? (
                <>
                  <Text style={[styles.ringBigText, { color: colors.yellow, fontFamily: FontFamilies.displayBold }]}>
                    Done
                  </Text>
                  <Text style={[styles.ringSmallText, { color: colors.textMuted, fontFamily: FontFamilies.bodyRegular }]}>
                    Day {dayNumber} complete
                  </Text>
                </>
              ) : isRestDay ? (
                <>
                  <Text style={[styles.ringBigText, { color: colors.green, fontFamily: FontFamilies.displayBold }]}>
                    Rest
                  </Text>
                  <Text style={[styles.ringSmallText, { color: colors.textMuted, fontFamily: FontFamilies.bodyRegular }]}>
                    Recover & recharge
                  </Text>
                </>
              ) : (
                <>
                  <Text style={[styles.ringBigText, { color: colors.text, fontFamily: FontFamilies.mono }]}>
                    {activeWorkout ? '50%' : '0%'}
                  </Text>
                  <Text style={[styles.ringSmallText, { color: colors.textMuted, fontFamily: FontFamilies.bodyRegular }]}>
                    {currentPlanDay?.sessionLabel || 'Today'}
                  </Text>
                </>
              )}
            </View>
          </ProgressRing>

          {/* Action button */}
          <View style={styles.heroActionContainer}>
            {isCompleted ? (
              <ChargeButton
                label="Session Complete ✓"
                onPress={() => {}}
                disabled={true}
                success={true}
              />
            ) : isRestDay ? (
              <ChargeButton
                label="Try Mobility Session"
                onPress={() => router.push(`/player/${currentPlanDay?.id || 'rest'}` as any)}
                isOutlined={true}
              />
            ) : activeWorkout ? (
              <ChargeButton
                label="Resume Workout"
                onPress={handleStartWorkout}
                isPrimary={true}
              />
            ) : isTestDay ? (
              <ChargeButton
                label="Log Day Test"
                onPress={handleStartWorkout}
                isPrimary={true}
              />
            ) : (
              <ChargeButton
                label="Start Workout"
                onPress={handleStartWorkout}
                isPrimary={true}
              />
            )}
          </View>
        </View>

        {/* Morning Readiness Check Card */}
        {!readinessDone && (
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.line }]}>
            <Text style={[styles.cardTitle, { color: colors.text, fontFamily: FontFamilies.displayBold }]}>
              Morning Check-In
            </Text>
            <Text style={[styles.cardSubtitle, { color: colors.textMuted, fontFamily: FontFamilies.bodyRegular }]}>
              Three quick taps to shape today's training.
            </Text>

            {/* Sleep quality */}
            <View style={styles.readinessMetricRow}>
              <Text style={[styles.metricLabel, { color: colors.text, fontFamily: FontFamilies.bodyMedium }]}>
                Sleep Quality
              </Text>
              <View style={styles.metricChips}>
                {([1, 2, 3] as ReadinessScore[]).map((score) => (
                  <TouchableOpacity
                    key={`sleep-${score}`}
                    onPress={() => setReadinessSleep(score)}
                    style={[
                      styles.scoreChip,
                      {
                        backgroundColor: readinessSleep === score ? colors.green : colors.surface2,
                        borderColor: readinessSleep === score ? colors.green : colors.line,
                      },
                    ]}
                  >
                    <Text
                      style={{
                        color: readinessSleep === score ? colors.inkOnGreen : colors.textMuted,
                        fontFamily: FontFamilies.bodyBold,
                        fontSize: 12,
                      }}
                    >
                      {score === 1 ? 'Poor' : score === 2 ? 'OK' : 'Good'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Soreness */}
            <View style={styles.readinessMetricRow}>
              <Text style={[styles.metricLabel, { color: colors.text, fontFamily: FontFamilies.bodyMedium }]}>
                Soreness
              </Text>
              <View style={styles.metricChips}>
                {([1, 2, 3] as ReadinessScore[]).map((score) => (
                  <TouchableOpacity
                    key={`sore-${score}`}
                    onPress={() => setReadinessSoreness(score)}
                    style={[
                      styles.scoreChip,
                      {
                        backgroundColor: readinessSoreness === score ? colors.green : colors.surface2,
                        borderColor: readinessSoreness === score ? colors.green : colors.line,
                      },
                    ]}
                  >
                    <Text
                      style={{
                        color: readinessSoreness === score ? colors.inkOnGreen : colors.textMuted,
                        fontFamily: FontFamilies.bodyBold,
                        fontSize: 12,
                      }}
                    >
                      {score === 1 ? 'High' : score === 2 ? 'Normal' : 'None'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Mood */}
            <View style={styles.readinessMetricRow}>
              <Text style={[styles.metricLabel, { color: colors.text, fontFamily: FontFamilies.bodyMedium }]}>
                Energy & Mood
              </Text>
              <View style={styles.metricChips}>
                {([1, 2, 3] as ReadinessScore[]).map((score) => (
                  <TouchableOpacity
                    key={`mood-${score}`}
                    onPress={() => setReadinessMood(score)}
                    style={[
                      styles.scoreChip,
                      {
                        backgroundColor: readinessMood === score ? colors.green : colors.surface2,
                        borderColor: readinessMood === score ? colors.green : colors.line,
                      },
                    ]}
                  >
                    <Text
                      style={{
                        color: readinessMood === score ? colors.inkOnGreen : colors.textMuted,
                        fontFamily: FontFamilies.bodyBold,
                        fontSize: 12,
                      }}
                    >
                      {score === 1 ? 'Low' : score === 2 ? 'Steady' : 'High'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {isReadinessPoor && (
              <View style={[styles.warningBox, { backgroundColor: colors.surface2, borderColor: colors.yellow }]}>
                <Text style={[styles.warningText, { color: colors.yellow, fontFamily: FontFamilies.bodyMedium }]}>
                  All signals are low. The app recommends Active Recovery today to protect your joints and prevent injury.
                </Text>
                <TouchableOpacity
                  onPress={() => handleReadinessSubmit(true)}
                  style={styles.overrideBtn}
                >
                  <Text style={{ color: colors.textMuted, fontFamily: FontFamilies.bodyRegular, fontSize: 12 }}>
                    Override and train anyway
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            <ChargeButton
              label={isReadinessPoor ? 'Switch to Active Recovery' : 'Save Check-In'}
              onPress={() => handleReadinessSubmit(false)}
              style={{ marginTop: Spacing.sm }}
            />
          </View>
        )}

        {/* Next Up Strip */}
        {nextUpItems.length > 0 && (
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.line }]}>
            <View style={styles.cardHeaderRow}>
              <Text style={[styles.cardTitle, { color: colors.text, fontFamily: FontFamilies.displayBold }]}>
                Next Up
              </Text>
              <TouchableOpacity onPress={() => router.push('/capture')}>
                <Text style={{ color: colors.green, fontFamily: FontFamilies.bodyMedium, fontSize: 13 }}>
                  See all
                </Text>
              </TouchableOpacity>
            </View>

            {nextUpItems.map((item) => (
              <View
                key={item.id}
                style={[styles.nextUpRow, { borderBottomColor: colors.line }]}
              >
                <View style={{ flex: 1 }}>
                  <Text
                    style={[styles.nextUpTitle, { color: colors.text, fontFamily: FontFamilies.bodyMedium }]}
                    numberOfLines={1}
                  >
                    {item.title}
                  </Text>
                  <Text
                    style={[styles.nextUpSub, { color: colors.textMuted, fontFamily: FontFamilies.mono }]}
                  >
                    {item.subtitle}
                  </Text>
                </View>
                {item.isNote && (
                  <TouchableOpacity
                    onPress={() => {
                      updateNote(item.id, { done: true });
                      showToast('Note marked done');
                    }}
                    style={[styles.doneSmallBtn, { backgroundColor: colors.surface2 }]}
                  >
                    <Text style={{ color: colors.green, fontSize: 12 }}>✓ Done</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </View>
        )}

        {/* Mini-Cards Row: Hydration & Sleep */}
        <View style={styles.miniCardsRow}>
          {/* Water card */}
          <View style={[styles.miniCard, { backgroundColor: colors.surface, borderColor: colors.line }]}>
            <Text style={[styles.miniLabel, { color: colors.textMuted, fontFamily: FontFamilies.bodyMedium }]}>
              Hydration
            </Text>
            <Text style={[styles.miniValue, { color: colors.text, fontFamily: FontFamilies.mono }]}>
              {waterGlasses} <Text style={{ fontSize: 13, color: colors.textMuted }}>glasses</Text>
            </Text>
            <TouchableOpacity
              onPress={handleAddWater}
              style={[styles.miniActionBtn, { backgroundColor: colors.surface2, borderColor: colors.green }]}
            >
              <Text style={{ color: colors.green, fontFamily: FontFamilies.bodyBold, fontSize: 12 }}>
                +1 Glass
              </Text>
            </TouchableOpacity>
          </View>

          {/* Sleep card */}
          <View style={[styles.miniCard, { backgroundColor: colors.surface, borderColor: colors.line }]}>
            <Text style={[styles.miniLabel, { color: colors.textMuted, fontFamily: FontFamilies.bodyMedium }]}>
              Sleep
            </Text>
            <Text style={[styles.miniValue, { color: colors.text, fontFamily: FontFamilies.mono }]}>
              {sleepHours ? `${sleepHours}h` : isSleeping ? 'In bed' : '—'}
            </Text>
            <TouchableOpacity
              onPress={handleSleepToggle}
              style={[styles.miniActionBtn, { backgroundColor: colors.surface2, borderColor: colors.yellow }]}
            >
              <Text style={{ color: colors.yellow, fontFamily: FontFamilies.bodyBold, fontSize: 12 }}>
                {isSleeping ? "I'm up" : "I'm in bed"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Tomorrow Notes Card */}
        {showTomorrowNotes && (
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.line }]}>
            <Text style={[styles.cardTitle, { color: colors.yellow, fontFamily: FontFamilies.displayBold }]}>
              For Tomorrow
            </Text>
            <Text style={[styles.cardSubtitle, { color: colors.textMuted, fontFamily: FontFamilies.bodyRegular }]}>
              Rest well tonight. Keep your shoes and water ready for Day {Math.min(dayNumber + 1, 60)}.
            </Text>
            <TouchableOpacity
              onPress={() => setQuickCaptureVisible(true)}
              style={[styles.tomorrowAddBtn, { backgroundColor: colors.surface2 }]}
            >
              <Text style={{ color: colors.green, fontFamily: FontFamilies.bodyMedium, fontSize: 13 }}>
                + Add a note for tomorrow morning
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Quick capture modal */}
      <QuickCaptureSheet
        visible={quickCaptureVisible}
        onClose={() => setQuickCaptureVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  scroll: {
    padding: Spacing.md,
    paddingBottom: Spacing.xxxl,
    gap: Spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.xs,
  },
  greeting: {
    fontSize: TypeScale.sm,
  },
  dayTitle: {
    fontSize: TypeScale.xl,
    letterSpacing: -0.5,
  },
  phaseSubtitle: {
    fontSize: TypeScale.xs,
    marginTop: 2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  avatarBtn: {
    width: TouchTarget,
    height: TouchTarget,
    borderRadius: Radius.pill,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroCard: {
    borderRadius: Radius.xl,
    borderWidth: 1,
    padding: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.lg,
  },
  ringCenter: {
    alignItems: 'center',
  },
  ringBigText: {
    fontSize: TypeScale.xl,
  },
  ringSmallText: {
    fontSize: TypeScale.xs,
    marginTop: 4,
  },
  heroActionContainer: {
    width: '100%',
  },
  card: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: TypeScale.md,
  },
  cardSubtitle: {
    fontSize: TypeScale.xs,
    lineHeight: 18,
  },
  readinessMetricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.xxs,
  },
  metricLabel: {
    fontSize: TypeScale.sm,
  },
  metricChips: {
    flexDirection: 'row',
    gap: 6,
  },
  scoreChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.pill,
    borderWidth: 1,
  },
  warningBox: {
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.sm,
    gap: Spacing.xs,
  },
  warningText: {
    fontSize: TypeScale.xs,
    lineHeight: 18,
  },
  overrideBtn: {
    alignSelf: 'flex-start',
    paddingVertical: 2,
  },
  nextUpRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  nextUpTitle: {
    fontSize: TypeScale.sm,
  },
  nextUpSub: {
    fontSize: TypeScale.xs,
  },
  doneSmallBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.pill,
  },
  miniCardsRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  miniCard: {
    flex: 1,
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing.md,
    gap: Spacing.xs,
  },
  miniLabel: {
    fontSize: TypeScale.xs,
  },
  miniValue: {
    fontSize: TypeScale.lg,
  },
  miniActionBtn: {
    borderRadius: Radius.pill,
    borderWidth: 1,
    paddingVertical: 6,
    alignItems: 'center',
    marginTop: Spacing.xxs,
  },
  tomorrowAddBtn: {
    padding: Spacing.sm,
    borderRadius: Radius.md,
    alignItems: 'center',
  },
});
