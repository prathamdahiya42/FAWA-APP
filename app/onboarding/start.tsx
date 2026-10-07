import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { format, addDays } from 'date-fns';
import { useThemeColors } from '@/src/theme';
import { FontFamilies, TypeScale } from '@/src/theme/typography';
import { Spacing, Radius } from '@/src/theme/spacing';
import { ChargeButton } from '@/src/ui/ChargeButton';
import { calculateBMI, getBMIBand } from '@/src/engine/bmi';
import { generate60DayPlan } from '@/src/engine/plan-generator';
import { buildDefaultReminders } from '@/src/engine/reminder-rules';
import { getDatabase } from '@/src/db/database';
import { useProfileStore } from '@/src/store/profile.store';
import { usePlanStore } from '@/src/store/plan.store';
import { useReminderStore } from '@/src/store/reminder.store';
import { useUIStore } from '@/src/store/ui.store';
import type { UserProfile, Level, BMIBand, EquipmentTier } from '@/src/types';

export default function OnboardingStartScreen() {
  const colors = useThemeColors();
  const router = useRouter();

  const setProfile = useProfileStore((s) => s.setProfile);
  const setPlan = usePlanStore((s) => s.setPlan);
  const setReminders = useReminderStore((s) => s.setReminders);
  const setOnboardingCompleted = useUIStore((s) => s.setOnboardingCompleted);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Summary state
  const [name, setName] = useState('');
  const [level, setLevel] = useState<Level>('beginner');
  const [bmi, setBmi] = useState<number>(22);
  const [bmiBand, setBmiBand] = useState<BMIBand | null>('normal');
  const [age, setAge] = useState<number>(22);
  const [equipment, setEquipment] = useState<EquipmentTier[]>([0]);
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [wakeTime, setWakeTime] = useState('06:30');
  const [workoutTime, setWorkoutTime] = useState('07:00');
  const [sleepGoalHours, setSleepGoalHours] = useState(8);
  const [hasCondition, setHasCondition] = useState(false);
  const [heightCm, setHeightCm] = useState(175);
  const [weightKg, setWeightKg] = useState(70);
  const [waistCm, setWaistCm] = useState(80);
  const [sex, setSex] = useState<'male' | 'female' | 'prefer_not_to_say' | null>(null);

  useEffect(() => {
    async function loadTemp() {
      try {
        const [aboutStr, healthStr, equipStr, levelStr, dayStr] = await Promise.all([
          AsyncStorage.getItem('@fawa_temp_about'),
          AsyncStorage.getItem('@fawa_temp_health'),
          AsyncStorage.getItem('@fawa_temp_equipment'),
          AsyncStorage.getItem('@fawa_temp_level'),
          AsyncStorage.getItem('@fawa_temp_day'),
        ]);

        if (aboutStr) {
          const a = JSON.parse(aboutStr);
          setName(a.name || 'Athlete');
          setAge(a.age || 22);
          setSex(a.sex || null);
          setHeightCm(a.heightCm || 175);
          setWeightKg(a.weightKg || 70);
          setWaistCm(a.waistCm || 80);
          const computedBmi = calculateBMI(a.weightKg || 70, a.heightCm || 175);
          setBmi(computedBmi);
          setBmiBand(getBMIBand(computedBmi, a.age || 22));
        }

        if (healthStr) {
          const h = JSON.parse(healthStr);
          setHasCondition(!!h.hasCondition);
        }

        if (equipStr) {
          setEquipment(JSON.parse(equipStr));
        }

        if (levelStr) {
          const l = JSON.parse(levelStr);
          setLevel(l.level || 'beginner');
        }

        if (dayStr) {
          const d = JSON.parse(dayStr);
          setWakeTime(d.wakeTime || '06:30');
          setWorkoutTime(d.workoutTime || '07:00');
          setSleepGoalHours(d.sleepGoalHours || 8);
        }
      } catch (e) {
        console.warn('Failed to load onboarding draft data', e);
      }
    }
    loadTemp();
  }, []);

  const handleStart = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const nowIso = new Date().toISOString();
      const profileId = `user-${Date.now()}`;

      const userProfile: UserProfile = {
        id: profileId,
        name: name.trim() || 'Athlete',
        age,
        sex,
        heightCm,
        weightKg,
        waistCm,
        bmi,
        bmiBand,
        level,
        hasHeartOrJointCondition: hasCondition,
        equipment,
        wakeTime,
        workoutTime,
        sleepGoalHours,
        startDate: format(startDate, 'yyyy-MM-dd'),
        createdAt: nowIso,
        updatedAt: nowIso,
      };

      // 1. Generate full 60-day plan
      const plan = generate60DayPlan(startDate, level, bmiBand);

      // 2. Generate default reminders
      const defaultReminders = buildDefaultReminders(userProfile);

      // 3. Persist to SQLite
      const db = await getDatabase();

      // Upsert User Profile
      await db.runAsync(
        `INSERT OR REPLACE INTO user_profile (
          id, name, age, sex, height_cm, weight_kg, waist_cm, bmi, bmi_band,
          level, has_condition, equipment, wake_time, workout_time, sleep_goal_hours,
          start_date, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          userProfile.id,
          userProfile.name,
          userProfile.age,
          userProfile.sex,
          userProfile.heightCm,
          userProfile.weightKg,
          userProfile.waistCm,
          userProfile.bmi,
          userProfile.bmiBand,
          userProfile.level,
          userProfile.hasHeartOrJointCondition ? 1 : 0,
          JSON.stringify(userProfile.equipment),
          userProfile.wakeTime,
          userProfile.workoutTime,
          userProfile.sleepGoalHours,
          userProfile.startDate,
          userProfile.createdAt,
          userProfile.updatedAt,
        ],
      );

      // Insert Plan Days
      for (const day of plan) {
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
            JSON.stringify(day.notes),
            JSON.stringify(day.exercises),
            day.isCompleted ? 1 : 0,
            day.completedAt,
          ],
        );
      }

      // Insert Reminders
      for (const rem of defaultReminders) {
        await db.runAsync(
          `INSERT OR REPLACE INTO reminders (
            id, kind, title, body, fire_time, repeat_rule, priority, sound,
            vibration, snooze_mins, linked_entity, enabled, created_at, last_fired_at, status
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            rem.id,
            rem.kind,
            rem.title,
            rem.body,
            rem.fireTime,
            JSON.stringify(rem.repeatRule),
            rem.priority,
            rem.sound,
            rem.vibration ? 1 : 0,
            rem.snoozeMins,
            rem.linkedEntity ? JSON.stringify(rem.linkedEntity) : null,
            rem.enabled ? 1 : 0,
            rem.createdAt,
            rem.lastFiredAt,
            rem.status,
          ],
        );
      }

      // 4. Update memory stores
      setProfile(userProfile);
      setPlan(plan);
      setReminders(defaultReminders);
      await setOnboardingCompleted(true);

      // Clean up temporary drafts
      await Promise.all([
        AsyncStorage.removeItem('@fawa_temp_about'),
        AsyncStorage.removeItem('@fawa_temp_health'),
        AsyncStorage.removeItem('@fawa_temp_equipment'),
        AsyncStorage.removeItem('@fawa_temp_level'),
        AsyncStorage.removeItem('@fawa_temp_day'),
      ]);

      // Route into main tabs
      router.replace('/(tabs)/today');
    } catch (err: any) {
      console.error('Error starting program:', err);
      setError(err?.message || 'Failed to initialize your 60-day plan. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [
    name,
    age,
    sex,
    heightCm,
    weightKg,
    waistCm,
    bmi,
    bmiBand,
    level,
    hasCondition,
    equipment,
    wakeTime,
    workoutTime,
    sleepGoalHours,
    startDate,
    setProfile,
    setPlan,
    setReminders,
    setOnboardingCompleted,
    router,
  ]);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]}>
      <StatusBar barStyle="light-content" backgroundColor={colors.bg} />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.green, fontFamily: FontFamilies.displayExtraBold }]}>
            Ready.
          </Text>
          <Text style={[styles.subtitle, { color: colors.textMuted, fontFamily: FontFamilies.bodyRegular }]}>
            Here is your personal 60-day Winter Arc blueprint.
          </Text>
        </View>

        {/* Blueprint summary card */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.line }]}>
          <View style={styles.row}>
            <Text style={[styles.cardLabel, { color: colors.textMuted, fontFamily: FontFamilies.bodyMedium }]}>
              Athlete
            </Text>
            <Text style={[styles.cardVal, { color: colors.text, fontFamily: FontFamilies.bodyBold }]}>
              {name || 'Athlete'}
            </Text>
          </View>

          <View style={[styles.divider, { backgroundColor: colors.line }]} />

          <View style={styles.row}>
            <Text style={[styles.cardLabel, { color: colors.textMuted, fontFamily: FontFamilies.bodyMedium }]}>
              Training Level
            </Text>
            <Text
              style={[
                styles.cardVal,
                { color: colors.green, fontFamily: FontFamilies.bodyBold, textTransform: 'capitalize' },
              ]}
            >
              {level}
            </Text>
          </View>

          {age >= 18 && (
            <>
              <View style={[styles.divider, { backgroundColor: colors.line }]} />
              <View style={styles.row}>
                <Text style={[styles.cardLabel, { color: colors.textMuted, fontFamily: FontFamilies.bodyMedium }]}>
                  BMI Band
                </Text>
                <Text
                  style={[
                    styles.cardVal,
                    { color: colors.yellow, fontFamily: FontFamilies.bodyBold, textTransform: 'capitalize' },
                  ]}
                >
                  {bmiBand || 'Normal'} ({bmi.toFixed(1)})
                </Text>
              </View>
            </>
          )}

          <View style={[styles.divider, { backgroundColor: colors.line }]} />

          <View style={styles.row}>
            <Text style={[styles.cardLabel, { color: colors.textMuted, fontFamily: FontFamilies.bodyMedium }]}>
              Equipment
            </Text>
            <Text style={[styles.cardVal, { color: colors.text, fontFamily: FontFamilies.bodyMedium }]}>
              {equipment.includes(1) ? 'Tier 0 + Tier 1' : 'Tier 0 (Home items)'}
            </Text>
          </View>

          <View style={[styles.divider, { backgroundColor: colors.line }]} />

          <View style={styles.row}>
            <Text style={[styles.cardLabel, { color: colors.textMuted, fontFamily: FontFamilies.bodyMedium }]}>
              Workout Time
            </Text>
            <Text style={[styles.cardVal, { color: colors.text, fontFamily: FontFamilies.mono }]}>
              {workoutTime}
            </Text>
          </View>

          <View style={[styles.divider, { backgroundColor: colors.line }]} />

          <View style={styles.row}>
            <Text style={[styles.cardLabel, { color: colors.textMuted, fontFamily: FontFamilies.bodyMedium }]}>
              Start Date
            </Text>
            <TouchableOpacity
              onPress={() => {
                // Toggle between starting today or tomorrow
                const tomorrow = addDays(new Date(), 1);
                setStartDate((prev) =>
                  format(prev, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')
                    ? tomorrow
                    : new Date(),
                );
              }}
              style={styles.datePickerBtn}
            >
              <Text style={[styles.cardVal, { color: colors.green, fontFamily: FontFamilies.mono }]}>
                {format(startDate, 'MMM d, yyyy')}{' '}
                <Text style={{ fontSize: 12, color: colors.textMuted }}>(Tap to toggle)</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 60-day breakdown pill strip */}
        <View style={styles.phasePreview}>
          <Text style={[styles.previewHeading, { color: colors.textMuted, fontFamily: FontFamilies.bodyMedium }]}>
            60 days · 4 phases · 3 test checkpoints
          </Text>
          <View style={styles.phasePillsRow}>
            <View style={[styles.phasePill, { backgroundColor: colors.surface2 }]}>
              <Text style={[styles.phaseTitle, { color: colors.green }]}>Foundation</Text>
              <Text style={[styles.phaseDays, { color: colors.textMuted }]}>Days 1–15</Text>
            </View>
            <View style={[styles.phasePill, { backgroundColor: colors.surface2 }]}>
              <Text style={[styles.phaseTitle, { color: colors.green }]}>Build</Text>
              <Text style={[styles.phaseDays, { color: colors.textMuted }]}>Days 16–30</Text>
            </View>
            <View style={[styles.phasePill, { backgroundColor: colors.surface2 }]}>
              <Text style={[styles.phaseTitle, { color: colors.yellow }]}>Intensify</Text>
              <Text style={[styles.phaseDays, { color: colors.textMuted }]}>Days 31–45</Text>
            </View>
            <View style={[styles.phasePill, { backgroundColor: colors.surface2 }]}>
              <Text style={[styles.phaseTitle, { color: colors.yellow }]}>Peak</Text>
              <Text style={[styles.phaseDays, { color: colors.textMuted }]}>Days 46–60</Text>
            </View>
          </View>
        </View>

        {error && (
          <Text style={[styles.errorText, { color: colors.safety, fontFamily: FontFamilies.bodyMedium }]}>
            {error}
          </Text>
        )}

        <ChargeButton
          label="Start Day 1"
          onPress={handleStart}
          loading={loading}
          isPrimary={true}
          style={styles.startBtn}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  scroll: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxxl,
    gap: Spacing.lg,
  },
  header: {
    marginTop: Spacing.md,
    gap: Spacing.xxs,
  },
  title: {
    fontSize: TypeScale.xxl,
  },
  subtitle: {
    fontSize: TypeScale.sm,
  },
  card: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing.lg,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.xs,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: Spacing.xs,
  },
  cardLabel: {
    fontSize: TypeScale.sm,
  },
  cardVal: {
    fontSize: TypeScale.sm,
  },
  datePickerBtn: {
    paddingVertical: 2,
  },
  phasePreview: {
    gap: Spacing.xs,
  },
  previewHeading: {
    fontSize: TypeScale.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  phasePillsRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  phasePill: {
    flex: 1,
    borderRadius: Radius.md,
    padding: Spacing.sm,
    alignItems: 'center',
  },
  phaseTitle: {
    fontSize: 12,
    fontWeight: '700',
  },
  phaseDays: {
    fontSize: 10,
    marginTop: 2,
  },
  errorText: {
    fontSize: TypeScale.sm,
    textAlign: 'center',
  },
  startBtn: {
    marginTop: Spacing.sm,
  },
});
