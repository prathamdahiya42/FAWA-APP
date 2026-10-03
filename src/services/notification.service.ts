import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { expandReminderToSchedule } from '@/src/engine/reminder-rules';
import type { Reminder } from '@/src/types';

// Configure foreground notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export const ALARM_CHANNEL_ID = 'fawa_alarms_channel';
export const REMINDER_CHANNEL_ID = 'fawa_reminders_channel';

/**
 * Configure Android Notification Channels.
 * Alarms get MAX importance with custom looping sound and vibration.
 */
export async function setupNotificationChannels(): Promise<void> {
  if (Platform.OS === 'android') {
    // Alarms channel (High importance, heads-up, bypass DND where permitted)
    await Notifications.setNotificationChannelAsync(ALARM_CHANNEL_ID, {
      name: 'FAWA Alarms',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 500, 250, 500],
      lightColor: '#FFD60A',
      sound: 'alarm.wav',
      enableLights: true,
      enableVibrate: true,
      bypassDnd: true,
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    });

    // Reminders channel (Default importance, gentle sound)
    await Notifications.setNotificationChannelAsync(REMINDER_CHANNEL_ID, {
      name: 'FAWA Reminders',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#2BE36B',
      sound: 'gentle.wav',
      enableLights: true,
      enableVibrate: true,
    });
  }

  // Set up interactive notification actions
  await Notifications.setNotificationCategoryAsync('REMINDER_ACTIONS', [
    {
      identifier: 'ACTION_DONE',
      buttonTitle: '✓ Done',
      options: { isDestructive: false, opensAppToForeground: false },
    },
    {
      identifier: 'ACTION_SNOOZE_10',
      buttonTitle: 'Snooze 10m',
      options: { isDestructive: false, opensAppToForeground: false },
    },
    {
      identifier: 'ACTION_SKIP',
      buttonTitle: 'Skip',
      options: { isDestructive: true, opensAppToForeground: false },
    },
  ]);
}

/**
 * Schedule a single reminder firing via expo-notifications.
 */
export async function scheduleSingleNotification(
  title: string,
  body: string,
  fireAt: Date,
  priority: 'gentle' | 'alarm' = 'gentle',
  dataPayload: Record<string, any> = {},
): Promise<string> {
  const channelId = priority === 'alarm' ? ALARM_CHANNEL_ID : REMINDER_CHANNEL_ID;

  const trigger: Notifications.NotificationTriggerInput = fireAt;

  const identifier = await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      sound: priority === 'alarm' ? 'alarm.wav' : 'gentle.wav',
      priority: priority === 'alarm' ? 'max' : 'high',
      categoryIdentifier: 'REMINDER_ACTIONS',
      data: { ...dataPayload, priority, channelId },
    },
    trigger,
  });

  return identifier;
}

/**
 * Top up the rolling 7-day notification window.
 * Keeps scheduled notifications safely under iOS 64 limit (capped at 50).
 */
export async function topUpRollingSchedule(reminders: Reminder[]): Promise<void> {
  // Cancel previous scheduled notifications to refresh
  await Notifications.cancelAllScheduledNotificationsAsync();

  let totalScheduled = 0;
  for (const rem of reminders) {
    if (!rem.enabled) continue;
    const firings = expandReminderToSchedule(rem, 7);

    for (const firing of firings) {
      if (totalScheduled >= 50) break;
      await scheduleSingleNotification(
        rem.title,
        rem.body,
        firing.fireAt,
        rem.priority,
        { reminderId: rem.id },
      );
      totalScheduled++;
    }

    if (totalScheduled >= 50) break;
  }
}
