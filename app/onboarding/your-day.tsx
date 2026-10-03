import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  StatusBar,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { useThemeColors } from '@/src/theme';
import { FontFamilies, TypeScale } from '@/src/theme/typography';
import { Spacing, Radius, TouchTarget } from '@/src/theme/spacing';
import { ChargeButton } from '@/src/ui/ChargeButton';

type SleepGoal = 7 | 8 | 9;

interface TimeStepper {
  label: string;
  value: string;
  onChange: (v: string) => void;
  accessibilityLabel: string;
}

function parseHHMM(str: string): { h: number; m: number } | null {
  const match = str.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const h = parseInt(match[1], 10);
  const m = parseInt(match[2], 10);
  if (h > 23 || m > 59) return null;
  return { h, m };
}

function formatHHMM(h: number, m: number): string {
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function TimeStepper({ label, value, onChange, accessibilityLabel }: TimeStepper) {
  const colors = useThemeColors();

  const step = (direction: 1 | -1, unit: 'h' | 'm') => {
    const parsed = parseHHMM(value);
    if (!parsed) return;
    let { h, m } = parsed;
    if (unit === 'h') {
      h = (h + direction + 24) % 24;
    } else {
      m = (m + direction * 15 + 60) % 60;
    }
    onChange(formatHHMM(h, m));
  };

  return (
    <View style={styles.stepperGroup}>
      <Text style={[styles.stepperLabel, { color: colors.text, fontFamily: FontFamilies.bodyMedium }]}>
        {label}
      </Text>
      <View style={styles.stepperRow} accessibilityLabel={accessibilityLabel} accessibilityRole="adjustable">
        {/* Hours */}
        <TouchableOpacity
          onPress={() => step(-1, 'h')}
          style={[styles.stepBtn, { borderColor: colors.line, borderRadius: Radius.sm }]}
          accessibilityLabel="Decrease hour"
          accessibilityRole="button"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={[{ color: colors.text, fontSize: TypeScale.lg, fontFamily: FontFamilies.bodyBold }]}>−</Text>
        </TouchableOpacity>
        <Text style={[styles.timeDisplay, { color: colors.text, fontFamily: FontFamilies.mono, backgroundColor: colors.surface, borderRadius: Radius.md }]}>
          {value}
        </Text>
        <TouchableOpacity
          onPress={() => step(1, 'h')}
          style={[styles.stepBtn, { borderColor: colors.line, borderRadius: Radius.sm }]}
          accessibilityLabel="Increase hour"
          accessibilityRole="button"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={[{ color: colors.text, fontSize: TypeScale.lg, fontFamily: FontFamilies.bodyBold }]}>+</Text>
        </TouchableOpacity>
      </View>
      {/* Minute fine control */}
      <View style={styles.minuteRow}>
        <TouchableOpacity
          onPress={() => step(-1, 'm')}
          style={[styles.minBtn, { backgroundColor: colors.surface2, borderRadius: Radius.pill }]}
          accessibilityLabel="Minus 15 minutes"
          accessibilityRole="button"
        >
          <Text style={[{ color: colors.textMuted, fontFamily: FontFamilies.bodyRegular, fontSize: TypeScale.xs }]}>−15 min</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => step(1, 'm')}
          style={[styles.minBtn, { backgroundColor: colors.surface2, borderRadius: Radius.pill }]}
          accessibilityLabel="Plus 15 minutes"
          accessibilityRole="button"
        >
          <Text style={[{ color: colors.textMuted, fontFamily: FontFamilies.bodyRegular, fontSize: TypeScale.xs }]}>+15 min</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function YourDayScreen() {
  const colors = useThemeColors();
  const router = useRouter();

  const [wakeTime, setWakeTime] = useState('06:30');
  const [workoutTime, setWorkoutTime] = useState('07:00');
  const [sleepGoal, setSleepGoal] = useState<SleepGoal>(8);
  const [notifStatus, setNotifStatus] = useState<'idle' | 'granted' | 'denied'>('idle');

  const SLEEP_OPTIONS: { value: SleepGoal; label: string }[] = [
    { value: 7, label: '7 hours' },
    { value: 8, label: '8 hours ★' },
    { value: 9, label: '9 hours' },
  ];

  const requestNotifications = useCallback(async () => {
    try {
      const { status } = await Notifications.requestPermissionsAsync();
      setNotifStatus(status === 'granted' ? 'granted' : 'denied');
    } catch {
      setNotifStatus('denied');
    }
  }, []);

  const handleNext = useCallback(async () => {
    await AsyncStorage.setItem(
      '@fawa_temp_day',
      JSON.stringify({ wakeTime, workoutTime, sleepGoalHours: sleepGoal }),
    );
    router.push('/onboarding/start');
  }, [wakeTime, workoutTime, sleepGoal, router]);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]}>
      <StatusBar barStyle="light-content" backgroundColor={colors.bg} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          accessibilityLabel="Go back"
          accessibilityRole="button"
        >
          <Text style={[styles.backArrow, { color: colors.text }]}>←</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text, fontFamily: FontFamilies.bodyBold }]}>
          Your day
        </Text>
        <Text style={[styles.stepIndicator, { color: colors.textMuted, fontFamily: FontFamilies.bodyRegular }]}>
          5 of 5
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Wake time */}
        <TimeStepper
          label="I usually wake up at"
          value={wakeTime}
          onChange={setWakeTime}
          accessibilityLabel={`Wake time, currently ${wakeTime}`}
        />

        {/* Workout time */}
        <TimeStepper
          label="Best time for my workout"
          value={workoutTime}
          onChange={setWorkoutTime}
          accessibilityLabel={`Workout time, currently ${workoutTime}`}
        />

        {/* Sleep goal */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text, fontFamily: FontFamilies.bodyBold }]}>
            Sleep goal
          </Text>
          <View style={styles.chipRow}>
            {SLEEP_OPTIONS.map((opt) => {
              const selected = sleepGoal === opt.value;
              return (
                <TouchableOpacity
                  key={opt.value}
                  style={[
                    styles.chip,
                    {
                      flex: 1,
                      backgroundColor: selected ? colors.green : colors.surface2,
                      borderColor: selected ? colors.green : colors.line,
                      borderRadius: Radius.pill,
                      borderWidth: 1.5,
                      minHeight: TouchTarget,
                    },
                  ]}
                  onPress={() => setSleepGoal(opt.value)}
                  accessibilityRole="radio"
                  accessibilityLabel={`${opt.value} hours sleep goal`}
                  accessibilityState={{ selected }}
                >
                  <Text
                    style={[
                      styles.chipLabel,
                      {
                        color: selected ? colors.inkOnGreen : colors.text,
                        fontFamily: FontFamilies.bodyMedium,
                      },
                    ]}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Notifications card */}
        <View
          style={[styles.notifCard, { backgroundColor: colors.surface, borderRadius: Radius.lg }]}
        >
          <Text style={[styles.notifTitle, { color: colors.text, fontFamily: FontFamilies.bodyBold }]}>
            Stay on track
          </Text>
          <Text style={[styles.notifBody, { color: colors.textMuted, fontFamily: FontFamilies.bodyRegular }]}>
            FAWA sends a gentle workout reminder and a sleep wind-down nudge every night. No spam — just 2 nudges a day.
          </Text>

          {notifStatus === 'granted' ? (
            <Text style={[styles.notifGranted, { color: colors.green, fontFamily: FontFamilies.bodyBold }]}>
              ✓ Notifications enabled
            </Text>
          ) : (
            <View style={{ gap: Spacing.xs }}>
              <ChargeButton
                label="Allow notifications"
                onPress={requestNotifications}
                accessibilityLabel="Allow FAWA to send workout and sleep notifications"
              />
              <TouchableOpacity
                onPress={() => router.push('/onboarding/start')}
                style={styles.laterBtn}
                accessibilityRole="button"
                accessibilityLabel="Skip notifications for now"
              >
                <Text style={[styles.laterText, { color: colors.textMuted, fontFamily: FontFamilies.bodyRegular }]}>
                  Maybe later
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <ChargeButton
          label="Next"
          isPrimary
          onPress={handleNext}
          accessibilityLabel="Save your day preferences and continue"
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  backBtn: {
    minHeight: TouchTarget,
    minWidth: TouchTarget,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  backArrow: { fontSize: 24 },
  headerTitle: {
    flex: 1,
    fontSize: TypeScale.md,
    textAlign: 'center',
  },
  stepIndicator: {
    fontSize: TypeScale.xs,
    minWidth: 40,
    textAlign: 'right',
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xxl,
    gap: Spacing.xl,
  },
  stepperGroup: {
    gap: Spacing.xs,
  },
  stepperLabel: {
    fontSize: TypeScale.sm,
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    justifyContent: 'center',
  },
  stepBtn: {
    minWidth: TouchTarget,
    minHeight: TouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  timeDisplay: {
    fontSize: TypeScale.xl,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    textAlign: 'center',
    minWidth: 100,
  },
  minuteRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
    justifyContent: 'center',
  },
  minBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xxs,
    minHeight: TouchTarget,
    justifyContent: 'center',
    alignItems: 'center',
  },
  section: {
    gap: Spacing.xs,
  },
  sectionTitle: {
    fontSize: TypeScale.md,
  },
  chipRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  chip: {
    paddingHorizontal: Spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipLabel: {
    fontSize: TypeScale.sm,
    textAlign: 'center',
  },
  notifCard: {
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  notifTitle: {
    fontSize: TypeScale.md,
  },
  notifBody: {
    fontSize: TypeScale.sm,
    lineHeight: 20,
  },
  notifGranted: {
    fontSize: TypeScale.md,
  },
  laterBtn: {
    alignItems: 'center',
    minHeight: TouchTarget,
    justifyContent: 'center',
  },
  laterText: {
    fontSize: TypeScale.sm,
  },
});
