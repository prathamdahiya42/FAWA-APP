import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Switch,
  StatusBar,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useThemeColors } from '@/src/theme';
import { FontFamilies, TypeScale } from '@/src/theme/typography';
import { Spacing, Radius, TouchTarget } from '@/src/theme/spacing';
import { HoldButton } from '@/src/ui/HoldButton';
import { useUIStore } from '@/src/store/ui.store';
import { useProfileStore } from '@/src/store/profile.store';
import { usePlanStore } from '@/src/store/plan.store';
import { getDatabase } from '@/src/db/database';

export default function SettingsScreen() {
  const colors = useThemeColors();
  const router = useRouter();

  const themeOverride = useUIStore((s) => s.themeOverride);
  const setThemeOverride = useUIStore((s) => s.setThemeOverride);
  const hapticsEnabled = useUIStore((s) => s.hapticsEnabled);
  const setHapticsEnabled = useUIStore((s) => s.setHapticsEnabled);
  const reduceMotion = useUIStore((s) => s.reduceMotion);
  const setReduceMotion = useUIStore((s) => s.setReduceMotion);
  const soundEnabled = useUIStore((s) => s.soundEnabled);
  const setSoundEnabled = useUIStore((s) => s.setSoundEnabled);
  const showToast = useUIStore((s) => s.showToast);
  const setOnboardingCompleted = useUIStore((s) => s.setOnboardingCompleted);

  const profile = useProfileStore((s) => s.profile);
  const updateProfile = useProfileStore((s) => s.updateProfile);
  const clearProfile = useProfileStore((s) => s.clearProfile);
  const setPlan = usePlanStore((s) => s.setPlan);

  const handleResetProgram = async () => {
    try {
      const db = await getDatabase();
      await db.execAsync(`
        DELETE FROM user_profile;
        DELETE FROM plan_days;
        DELETE FROM workout_logs;
        DELETE FROM test_results;
        DELETE FROM body_metrics;
        DELETE FROM reminders;
        DELETE FROM notes;
        DELETE FROM sleep_logs;
        DELETE FROM hydration_logs;
        DELETE FROM readiness_checks;
      `);

      await AsyncStorage.clear();
      clearProfile();
      setPlan([]);
      await setOnboardingCompleted(false);

      showToast('Program reset.');
      router.replace('/onboarding/welcome');
    } catch (e) {
      console.warn('Failed to reset app data', e);
    }
  };

  const handleToggleLevel = async () => {
    if (!profile) return;
    const nextLevel = profile.level === 'beginner' ? 'intermediate' : 'beginner';
    updateProfile({ level: nextLevel });
    try {
      const db = await getDatabase();
      await db.runAsync('UPDATE user_profile SET level = ? WHERE id = ?', [nextLevel, profile.id]);
      showToast(`Training level switched to ${nextLevel}.`);
    } catch (e) {
      console.warn('Failed to update level', e);
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]}>
      <StatusBar barStyle="light-content" backgroundColor={colors.bg} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={{ color: colors.text, fontSize: 18 }}>← Back</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text, fontFamily: FontFamilies.displayBold }]}>
          Settings
        </Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Profile Info */}
        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.line }]}>
          <Text style={[styles.sectionHeading, { color: colors.textMuted, fontFamily: FontFamilies.bodyBold }]}>
            PROFILE & PROGRAM
          </Text>

          <View style={styles.row}>
            <Text style={[styles.rowLabel, { color: colors.text }]}>Athlete</Text>
            <Text style={[styles.rowValue, { color: colors.textMuted }]}>{profile?.name || 'Athlete'}</Text>
          </View>

          <View style={[styles.divider, { backgroundColor: colors.line }]} />

          <View style={styles.row}>
            <Text style={[styles.rowLabel, { color: colors.text }]}>Program Level</Text>
            <TouchableOpacity onPress={handleToggleLevel} style={styles.chipBtn}>
              <Text style={{ color: colors.green, fontFamily: FontFamilies.bodyBold, textTransform: 'capitalize' }}>
                {profile?.level || 'Beginner'} (Tap to switch)
              </Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.divider, { backgroundColor: colors.line }]} />

          <View style={styles.row}>
            <Text style={[styles.rowLabel, { color: colors.text }]}>Current BMI</Text>
            <Text style={[styles.rowValue, { color: colors.yellow }]}>
              {profile?.bmi ? `${profile.bmi.toFixed(1)} (${profile.bmiBand || 'Normal'})` : '—'}
            </Text>
          </View>
        </View>

        {/* Appearance & Feel */}
        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.line }]}>
          <Text style={[styles.sectionHeading, { color: colors.textMuted, fontFamily: FontFamilies.bodyBold }]}>
            APPEARANCE & EXPERIENCE
          </Text>

          {/* Theme switcher */}
          <View style={styles.row}>
            <Text style={[styles.rowLabel, { color: colors.text }]}>Theme</Text>
            <View style={styles.themeChips}>
              <TouchableOpacity
                onPress={() => setThemeOverride('dark')}
                style={[
                  styles.themeChip,
                  {
                    backgroundColor: themeOverride === 'dark' || themeOverride === null ? colors.green : colors.surface2,
                  },
                ]}
              >
                <Text
                  style={{
                    color: themeOverride === 'dark' || themeOverride === null ? colors.inkOnGreen : colors.textMuted,
                    fontSize: 12,
                    fontFamily: FontFamilies.bodyBold,
                  }}
                >
                  Dark
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setThemeOverride('light')}
                style={[
                  styles.themeChip,
                  {
                    backgroundColor: themeOverride === 'light' ? colors.green : colors.surface2,
                  },
                ]}
              >
                <Text
                  style={{
                    color: themeOverride === 'light' ? colors.inkOnGreen : colors.textMuted,
                    fontSize: 12,
                    fontFamily: FontFamilies.bodyBold,
                  }}
                >
                  Light
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={[styles.divider, { backgroundColor: colors.line }]} />

          <View style={styles.row}>
            <Text style={[styles.rowLabel, { color: colors.text }]}>Haptic Feedback</Text>
            <Switch
              value={hapticsEnabled}
              onValueChange={setHapticsEnabled}
              trackColor={{ false: colors.surface2, true: colors.green }}
            />
          </View>

          <View style={[styles.divider, { backgroundColor: colors.line }]} />

          <View style={styles.row}>
            <Text style={[styles.rowLabel, { color: colors.text }]}>Audio Sounds</Text>
            <Switch
              value={soundEnabled}
              onValueChange={setSoundEnabled}
              trackColor={{ false: colors.surface2, true: colors.green }}
            />
          </View>

          <View style={[styles.divider, { backgroundColor: colors.line }]} />

          <View style={styles.row}>
            <Text style={[styles.rowLabel, { color: colors.text }]}>Reduce Motion</Text>
            <Switch
              value={reduceMotion}
              onValueChange={setReduceMotion}
              trackColor={{ false: colors.surface2, true: colors.green }}
            />
          </View>
        </View>

        {/* System & Tools */}
        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.line }]}>
          <Text style={[styles.sectionHeading, { color: colors.textMuted, fontFamily: FontFamilies.bodyBold }]}>
            SYSTEM & TOOLS
          </Text>

          <TouchableOpacity
            onPress={() => router.push('/settings/notification-health')}
            style={styles.navRow}
          >
            <Text style={[styles.rowLabel, { color: colors.text }]}>Notification Health</Text>
            <Text style={{ color: colors.textMuted }}>Check →</Text>
          </TouchableOpacity>

          <View style={[styles.divider, { backgroundColor: colors.line }]} />

          <TouchableOpacity
            onPress={() => router.push('/settings/backup-restore')}
            style={styles.navRow}
          >
            <Text style={[styles.rowLabel, { color: colors.text }]}>Backup & Restore</Text>
            <Text style={{ color: colors.textMuted }}>JSON →</Text>
          </TouchableOpacity>
        </View>

        {/* Medical disclaimer */}
        <View style={[styles.disclaimerCard, { backgroundColor: colors.surface2, borderColor: colors.line }]}>
          <Text style={{ color: colors.yellow, fontFamily: FontFamilies.bodyBold, fontSize: 13 }}>
            Safety & Medical Disclaimer
          </Text>
          <Text style={{ color: colors.textMuted, fontSize: 12, lineHeight: 18, marginTop: 4 }}>
            FAWA Winter Arc is an exercise program, not a medical device. Stop immediately if you experience sharp pain. Consult a physician before beginning any strenuous fitness program.
          </Text>
        </View>

        {/* Reset program */}
        <View style={styles.resetContainer}>
          <Text style={{ color: colors.safety, fontSize: 12, textAlign: 'center', marginBottom: 8 }}>
            DANGER ZONE: Completely wipe app data and start fresh
          </Text>
          <HoldButton
            label="Hold to Reset Program"
            onComplete={handleResetProgram}
            holdDurationMs={800}
          />
        </View>

        <Text style={{ color: colors.textMuted, fontSize: 11, textAlign: 'center', marginTop: Spacing.sm }}>
          FAWA Winter Arc v1.0.0 · Offline-First
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  backBtn: { padding: Spacing.xs },
  title: { fontSize: TypeScale.lg },
  scroll: {
    padding: Spacing.md,
    paddingBottom: Spacing.xxxl,
    gap: Spacing.md,
  },
  section: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing.md,
    gap: Spacing.xs,
  },
  sectionHeading: {
    fontSize: 11,
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.xs,
  },
  navRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  rowLabel: {
    fontSize: 14,
  },
  rowValue: {
    fontSize: 14,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
  },
  chipBtn: {
    paddingVertical: 2,
  },
  themeChips: {
    flexDirection: 'row',
    gap: 6,
  },
  themeChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: Radius.pill,
  },
  disclaimerCard: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing.md,
  },
  resetContainer: {
    marginTop: Spacing.md,
  },
});
