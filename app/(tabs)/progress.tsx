import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  StatusBar,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useThemeColors } from '@/src/theme';
import { FontFamilies, TypeScale } from '@/src/theme/typography';
import { Spacing, Radius } from '@/src/theme/spacing';
import { StreakFlame } from '@/src/ui/StreakFlame';
import { ChartLine } from '@/src/ui/ChartLine';
import { EmptyState } from '@/src/ui/EmptyState';
import { ChargeButton } from '@/src/ui/ChargeButton';
import { usePlanStore } from '@/src/store/plan.store';
import { useProfileStore } from '@/src/store/profile.store';
import { getDatabase } from '@/src/db/database';
import { getWeightTarget, getWaistTarget } from '@/src/engine/bmi';

export default function ProgressScreen() {
  const colors = useThemeColors();
  const router = useRouter();

  const planDays = usePlanStore((s) => s.planDays);
  const profile = useProfileStore((s) => s.profile);

  const [testResults, setTestResults] = useState<any[]>([]);
  const [weightLogs, setWeightLogs] = useState<Array<{ xLabel: string; value: number }>>([]);
  const [hydrationAvg, setHydrationAvg] = useState<number>(0);
  const [sleepAvg, setSleepAvg] = useState<number>(0);

  // Load progress data from SQLite
  useEffect(() => {
    async function loadStats() {
      try {
        const db = await getDatabase();

        // Test results
        const tests = await db.getAllAsync<any>(
          'SELECT * FROM test_results ORDER BY day_number ASC',
        );
        setTestResults(tests);

        // Body metrics / Weight trend
        const metrics = await db.getAllAsync<any>(
          'SELECT date, weight_kg FROM body_metrics WHERE weight_kg IS NOT NULL ORDER BY date ASC LIMIT 10',
        );
        if (metrics.length > 0) {
          setWeightLogs(
            metrics.map((m) => ({
              xLabel: m.date.slice(5), // MM-DD
              value: m.weight_kg,
            })),
          );
        } else if (profile?.weightKg) {
          setWeightLogs([
            { xLabel: 'Start', value: profile.weightKg },
          ]);
        }

        // Hydration 7-day average
        const hyd = await db.getAllAsync<any>(
          'SELECT glasses_logged FROM hydration_logs ORDER BY date DESC LIMIT 7',
        );
        if (hyd.length > 0) {
          const sum = hyd.reduce((acc, h) => acc + h.glasses_logged, 0);
          setHydrationAvg(Math.round((sum / hyd.length) * 10) / 10);
        }

        // Sleep 7-day average
        const sleep = await db.getAllAsync<any>(
          'SELECT duration_hours FROM sleep_logs WHERE duration_hours IS NOT NULL ORDER BY date DESC LIMIT 7',
        );
        if (sleep.length > 0) {
          const sum = sleep.reduce((acc, s) => acc + s.duration_hours, 0);
          setSleepAvg(Math.round((sum / sleep.length) * 10) / 10);
        }
      } catch (err) {
        console.warn('Failed to load progress stats', err);
      }
    }
    loadStats();
  }, [profile?.weightKg]);

  // Streak & completion rate calculations
  const totalCompleted = useMemo(() => {
    return planDays.filter((d) => d.isCompleted).length;
  }, [planDays]);

  const completionRate = useMemo(() => {
    if (planDays.length === 0) return 0;
    return Math.round((totalCompleted / planDays.length) * 100);
  }, [totalCompleted, planDays.length]);

  // Target ranges for weight
  const weightTargetRange = useMemo(() => {
    if (!profile?.bmiBand || !profile?.weightKg) return null;
    const target = getWeightTarget(profile.bmiBand, 60);
    return {
      min: profile.weightKg + target.min,
      max: profile.weightKg + target.max,
    };
  }, [profile?.bmiBand, profile?.weightKg]);

  const testDays = [1, 15, 30, 60];

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]}>
      <StatusBar barStyle="light-content" backgroundColor={colors.bg} />

      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text, fontFamily: FontFamilies.displayBold }]}>
          Progress & Consistency
        </Text>
        <Text style={[styles.subtitle, { color: colors.textMuted, fontFamily: FontFamilies.bodyRegular }]}>
          Ranges, not promises. Real data only.
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Streak & Consistency Card */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.line }]}>
          <View style={styles.streakRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.cardLabel, { color: colors.textMuted, fontFamily: FontFamilies.bodyMedium }]}>
                CURRENT STREAK
              </Text>
              <Text style={[styles.streakBig, { color: colors.yellow, fontFamily: FontFamilies.mono }]}>
                {totalCompleted} <Text style={{ fontSize: 16, color: colors.textMuted }}>days</Text>
              </Text>
              <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 2 }}>
                Completion Rate: {completionRate}% of 60 days
              </Text>
            </View>
            <StreakFlame count={totalCompleted} size={54} showText={false} />
          </View>

          {/* Completion bar */}
          <View style={[styles.progressTrack, { backgroundColor: colors.surface2 }]}>
            <View
              style={[
                styles.progressBar,
                {
                  backgroundColor: colors.green,
                  width: `${completionRate}%`,
                },
              ]}
            />
          </View>
        </View>

        {/* Test Battery Benchmarks */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.line }]}>
          <Text style={[styles.cardTitle, { color: colors.text, fontFamily: FontFamilies.displayBold }]}>
            Test Battery Checkpoints
          </Text>
          <Text style={[styles.cardSubtitle, { color: colors.textMuted, fontFamily: FontFamilies.bodyRegular }]}>
            Identical battery at Days 1, 15, 30, and 60.
          </Text>

          <View style={styles.testDaysGrid}>
            {testDays.map((d) => {
              const result = testResults.find((r) => r.day_number === d);
              const isLogged = !!result;
              return (
                <TouchableOpacity
                  key={`test-${d}`}
                  onPress={() => router.push(`/test/${d}` as any)}
                  style={[
                    styles.testCard,
                    {
                      backgroundColor: colors.surface2,
                      borderColor: isLogged ? colors.green : colors.line,
                    },
                  ]}
                >
                  <Text style={[styles.testDayNum, { color: colors.yellow, fontFamily: FontFamilies.mono }]}>
                    Day {d}
                  </Text>
                  <Text
                    style={{
                      color: isLogged ? colors.green : colors.textMuted,
                      fontFamily: FontFamilies.bodyBold,
                      fontSize: 11,
                      marginTop: 4,
                    }}
                  >
                    {isLogged ? '✓ Logged' : 'Pending'}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Weight Trend Chart */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.line }]}>
          <Text style={[styles.cardTitle, { color: colors.text, fontFamily: FontFamilies.displayBold }]}>
            Weight Trend (kg)
          </Text>
          <Text style={[styles.cardSubtitle, { color: colors.textMuted, fontFamily: FontFamilies.bodyRegular }]}>
            Target range shaded behind the line.
          </Text>

          <ChartLine
            data={weightLogs}
            targetMin={weightTargetRange?.min}
            targetMax={weightTargetRange?.max}
            unit="kg"
          />

          <Text style={{ color: colors.textMuted, fontSize: 11, textAlign: 'center', marginTop: 4 }}>
            In the first 15 days, waist circumference and photo shifts precede scale movement.
          </Text>
        </View>

        {/* 7-Day Averages Row */}
        <View style={styles.metricsRow}>
          <View style={[styles.metricCard, { backgroundColor: colors.surface, borderColor: colors.line }]}>
            <Text style={[styles.metricLabel, { color: colors.textMuted, fontFamily: FontFamilies.bodyMedium }]}>
              Hydration Avg
            </Text>
            <Text style={[styles.metricVal, { color: colors.green, fontFamily: FontFamilies.mono }]}>
              {hydrationAvg || '—'}{' '}
              <Text style={{ fontSize: 13, color: colors.textMuted }}>glasses/day</Text>
            </Text>
          </View>

          <View style={[styles.metricCard, { backgroundColor: colors.surface, borderColor: colors.line }]}>
            <Text style={[styles.metricLabel, { color: colors.textMuted, fontFamily: FontFamilies.bodyMedium }]}>
              Sleep Avg
            </Text>
            <Text style={[styles.metricVal, { color: colors.yellow, fontFamily: FontFamilies.mono }]}>
              {sleepAvg || '—'}{' '}
              <Text style={{ fontSize: 13, color: colors.textMuted }}>hours/night</Text>
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  header: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: 2,
  },
  title: {
    fontSize: TypeScale.xl,
  },
  subtitle: {
    fontSize: TypeScale.xs,
  },
  scroll: {
    padding: Spacing.md,
    paddingBottom: Spacing.xxxl,
    gap: Spacing.md,
  },
  card: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing.md,
    gap: Spacing.xs,
  },
  streakRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardLabel: {
    fontSize: TypeScale.xs,
    letterSpacing: 0.5,
  },
  streakBig: {
    fontSize: 40,
    marginVertical: 2,
  },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginTop: Spacing.sm,
  },
  progressBar: {
    height: '100%',
    borderRadius: 4,
  },
  cardTitle: {
    fontSize: TypeScale.md,
  },
  cardSubtitle: {
    fontSize: TypeScale.xs,
    marginBottom: Spacing.xs,
  },
  testDaysGrid: {
    flexDirection: 'row',
    gap: 8,
    marginTop: Spacing.xs,
  },
  testCard: {
    flex: 1,
    borderRadius: Radius.md,
    borderWidth: 1,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  testDayNum: {
    fontSize: 16,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  metricCard: {
    flex: 1,
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing.md,
    gap: Spacing.xxs,
  },
  metricLabel: {
    fontSize: TypeScale.xs,
  },
  metricVal: {
    fontSize: TypeScale.lg,
    marginTop: 2,
  },
});
