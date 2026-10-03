import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useKeepAwake } from 'expo-keep-awake';
import { format } from 'date-fns';
import { useThemeColors } from '@/src/theme';
import { FontFamilies, TypeScale } from '@/src/theme/typography';
import { Spacing, Radius } from '@/src/theme/spacing';
import { HoldButton } from '@/src/ui/HoldButton';
import { useReminderStore } from '@/src/store/reminder.store';
import { useUIStore } from '@/src/store/ui.store';
import { getDatabase } from '@/src/db/database';
import type { Reminder } from '@/src/types';

export default function AlarmScreen() {
  useKeepAwake();
  const { reminderId } = useLocalSearchParams<{ reminderId: string }>();
  const router = useRouter();
  const colors = useThemeColors();

  const reminders = useReminderStore((s) => s.reminders);
  const showToast = useUIStore((s) => s.showToast);
  const hapticsEnabled = useUIStore((s) => s.hapticsEnabled);

  const [currentTime, setCurrentTime] = useState(new Date());
  const hapticIntervalRef = useRef<any>(null);

  const reminder = reminders.find((r) => r.id === reminderId) || {
    id: reminderId || 'alarm',
    kind: 'sleep_wake',
    title: 'Rise and Shine',
    body: 'Good morning! Day 1 is ready for you.',
    priority: 'alarm',
    sound: 'alarm',
    snoozeMins: 10,
  } as Reminder;

  // Clock ticker
  useEffect(() => {
    const clock = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(clock);
  }, []);

  // Looping vibration pattern until dismissed
  useEffect(() => {
    if (hapticsEnabled) {
      hapticIntervalRef.current = setInterval(() => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      }, 1500);
    }
    return () => clearInterval(hapticIntervalRef.current);
  }, [hapticsEnabled]);

  const handleDismiss = async () => {
    clearInterval(hapticIntervalRef.current);
    try {
      const db = await getDatabase();
      await db.runAsync('UPDATE reminders SET status = ? WHERE id = ?', ['done', reminder.id]);
      showToast('Alarm dismissed.');
      router.replace('/(tabs)/today');
    } catch {
      router.replace('/(tabs)/today');
    }
  };

  const handleSnooze = async () => {
    clearInterval(hapticIntervalRef.current);
    const snoozeMins = reminder.snoozeMins || 10;
    const newFireTime = new Date(Date.now() + snoozeMins * 60 * 1000).toISOString();
    try {
      const db = await getDatabase();
      await db.runAsync(
        'UPDATE reminders SET fire_time = ?, status = ? WHERE id = ?',
        [newFireTime, 'snoozed', reminder.id],
      );
      showToast(`Alarm snoozed for ${snoozeMins} minutes.`);
      router.replace('/(tabs)/today');
    } catch {
      router.replace('/(tabs)/today');
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]}>
      <StatusBar barStyle="light-content" backgroundColor={colors.bg} />

      <View style={styles.container}>
        {/* Top alarm pill */}
        <View style={[styles.alarmPill, { backgroundColor: colors.yellow }]}>
          <Text style={[styles.alarmPillText, { color: colors.inkOnYellow, fontFamily: FontFamilies.bodyBold }]}>
            ALARM
          </Text>
        </View>

        {/* Big clock */}
        <View style={styles.clockContainer}>
          <Text style={[styles.bigClock, { color: colors.yellow, fontFamily: FontFamilies.mono }]}>
            {format(currentTime, 'HH:mm')}
          </Text>
          <Text style={[styles.dateText, { color: colors.textMuted, fontFamily: FontFamilies.bodyMedium }]}>
            {format(currentTime, 'EEEE, MMMM d')}
          </Text>
        </View>

        {/* Alarm details */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.line }]}>
          <Text style={[styles.alarmTitle, { color: colors.text, fontFamily: FontFamilies.displayBold }]}>
            {reminder.title}
          </Text>
          <Text style={[styles.alarmBody, { color: colors.textMuted, fontFamily: FontFamilies.bodyRegular }]}>
            {reminder.body}
          </Text>
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <HoldButton
            label="Hold to Dismiss"
            onComplete={handleDismiss}
            holdDurationMs={600}
            style={styles.dismissHoldBtn}
          />

          <TouchableOpacity
            onPress={handleSnooze}
            style={[styles.snoozeBtn, { backgroundColor: colors.surface2, borderColor: colors.line }]}
            accessibilityLabel={`Snooze for ${reminder.snoozeMins || 10} minutes`}
          >
            <Text style={{ color: colors.yellow, fontFamily: FontFamilies.bodyBold, fontSize: 15 }}>
              Snooze {reminder.snoozeMins || 10} min
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: {
    flex: 1,
    padding: Spacing.xl,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  alarmPill: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: Radius.pill,
    marginTop: Spacing.md,
  },
  alarmPillText: {
    fontSize: 12,
    letterSpacing: 1.5,
  },
  clockContainer: {
    alignItems: 'center',
    gap: 4,
  },
  bigClock: {
    fontSize: 76,
    letterSpacing: -2,
  },
  dateText: {
    fontSize: TypeScale.sm,
  },
  card: {
    width: '100%',
    borderRadius: Radius.xl,
    borderWidth: 1,
    padding: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.xs,
  },
  alarmTitle: {
    fontSize: TypeScale.xl,
    textAlign: 'center',
  },
  alarmBody: {
    fontSize: TypeScale.sm,
    textAlign: 'center',
    lineHeight: 20,
  },
  actions: {
    width: '100%',
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  dismissHoldBtn: {
    width: '100%',
  },
  snoozeBtn: {
    width: '100%',
    minHeight: TouchTarget,
    borderRadius: Radius.pill,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
  },
});
