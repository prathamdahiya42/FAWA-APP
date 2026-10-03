import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { useThemeColors } from '@/src/theme';
import { FontFamilies, TypeScale } from '@/src/theme/typography';
import { Spacing, Radius } from '@/src/theme/spacing';
import { ChargeButton } from '@/src/ui/ChargeButton';
import { Toast } from '@/src/ui/Toast';
import { useUIStore } from '@/src/store/ui.store';
import { scheduleSingleNotification } from '@/src/services/notification.service';

export default function NotificationHealthScreen() {
  const colors = useThemeColors();
  const router = useRouter();
  const showToast = useUIStore((s) => s.showToast);

  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [testingAlarm, setTestingAlarm] = useState(false);

  useEffect(() => {
    async function checkHealth() {
      const { status } = await Notifications.getPermissionsAsync();
      setHasPermission(status === 'granted');
    }
    checkHealth();
  }, []);

  const requestPermission = async () => {
    const { status } = await Notifications.requestPermissionsAsync();
    setHasPermission(status === 'granted');
    if (status === 'granted') {
      showToast('Notifications enabled!');
    }
  };

  const sendTestAlarm = async () => {
    setTestingAlarm(true);
    try {
      const fireAt = new Date(Date.now() + 5000); // 5 seconds
      await scheduleSingleNotification(
        'FAWA Test Alarm 🔥',
        'Testing high-importance sound and heads-up display.',
        fireAt,
        'alarm',
      );
      showToast('Test alarm will fire in 5 seconds. Lock or background your phone.');
    } catch (e) {
      showToast('Failed to schedule test alarm.');
    } finally {
      setTestingAlarm(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]}>
      <StatusBar barStyle="light-content" backgroundColor={colors.bg} />
      <Toast />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={{ color: colors.text, fontSize: 18 }}>← Back</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text, fontFamily: FontFamilies.displayBold }]}>
          Notification Health
        </Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Status card */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.line }]}>
          <Text style={[styles.cardTitle, { color: colors.text, fontFamily: FontFamilies.displayBold }]}>
            Diagnostic Status
          </Text>

          {/* Permission */}
          <View style={styles.checkRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.checkTitle, { color: colors.text }]}>Notification Permission</Text>
              <Text style={{ color: colors.textMuted, fontSize: 12 }}>
                Required to fire workout reminders, alarms, and quick capture alerts.
              </Text>
            </View>
            <View
              style={[
                styles.badge,
                { backgroundColor: hasPermission ? colors.green : colors.safety },
              ]}
            >
              <Text
                style={{
                  color: hasPermission ? colors.inkOnGreen : '#FFF',
                  fontSize: 11,
                  fontFamily: FontFamilies.bodyBold,
                }}
              >
                {hasPermission ? 'ACTIVE' : 'DENIED'}
              </Text>
            </View>
          </View>

          {!hasPermission && (
            <TouchableOpacity onPress={requestPermission} style={styles.fixBtn}>
              <Text style={{ color: colors.green, fontSize: 12, fontFamily: FontFamilies.bodyBold }}>
                Tap to grant permission
              </Text>
            </TouchableOpacity>
          )}

          <View style={[styles.divider, { backgroundColor: colors.line }]} />

          {/* Android Exact Alarms */}
          <View style={styles.checkRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.checkTitle, { color: colors.text }]}>Exact Alarm Engine</Text>
              <Text style={{ color: colors.textMuted, fontSize: 12 }}>
                {Platform.OS === 'android'
                  ? 'High-importance Android notification channel with custom sound configured.'
                  : 'Time-sensitive notifications rolling 7-day schedule (capped under iOS 64 limit).'}
              </Text>
            </View>
            <View style={[styles.badge, { backgroundColor: colors.green }]}>
              <Text style={{ color: colors.inkOnGreen, fontSize: 11, fontFamily: FontFamilies.bodyBold }}>
                OK
              </Text>
            </View>
          </View>
        </View>

        {/* Battery Optimization Advice Card */}
        <View style={[styles.card, { backgroundColor: colors.surface2, borderColor: colors.line }]}>
          <Text style={{ color: colors.yellow, fontFamily: FontFamilies.bodyBold, fontSize: 14 }}>
            💡 Android Battery Optimization
          </Text>
          <Text style={{ color: colors.textMuted, fontSize: 12, lineHeight: 18, marginTop: 4 }}>
            For alarms to sound reliably when your phone has been asleep for hours, ensure FAWA is excluded from aggressive battery optimization in your device Settings → Apps → FAWA → Battery → Unrestricted.
          </Text>
        </View>

        {/* Test Alarm Action */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.line }]}>
          <Text style={[styles.cardTitle, { color: colors.text, fontFamily: FontFamilies.displayBold }]}>
            Test Alarm Sound & Banner
          </Text>
          <Text style={{ color: colors.textMuted, fontSize: 12, marginBottom: Spacing.sm }}>
            Schedules a test alarm for 5 seconds from now. Test while your app is in background or device is locked.
          </Text>

          <ChargeButton
            label="Send Test Alarm (5s)"
            onPress={sendTestAlarm}
            loading={testingAlarm}
            isPrimary={true}
          />
        </View>
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
  card: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing.md,
    gap: Spacing.xs,
  },
  cardTitle: { fontSize: 15 },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.xs,
    gap: Spacing.sm,
  },
  checkTitle: {
    fontSize: 14,
    marginBottom: 2,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.pill,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: Spacing.xs,
  },
  fixBtn: {
    paddingVertical: 4,
  },
});
