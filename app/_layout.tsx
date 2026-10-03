import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator } from 'react-native';
import { useFonts } from 'expo-font';
import {
  BricolageGrotesque_700Bold,
  BricolageGrotesque_800ExtraBold,
} from '@expo-google-fonts/bricolage-grotesque';
import {
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_700Bold,
} from '@expo-google-fonts/dm-sans';
import { JetBrainsMono_400Regular } from '@expo-google-fonts/jetbrains-mono';
import { getDatabase } from '@/src/db/database';
import { runMigrations } from '@/src/db/migrations';
import { useUIStore } from '@/src/store/ui.store';
import { useThemeColors } from '@/src/theme';

export default function RootLayout() {
  const hydrateFromStorage = useUIStore((s) => s.hydrateFromStorage);
  const hydrated = useUIStore((s) => s.hydrated);
  const colors = useThemeColors();

  const [fontsLoaded] = useFonts({
    BricolageGrotesque_700Bold,
    BricolageGrotesque_800ExtraBold,
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_700Bold,
    JetBrainsMono_400Regular,
  });

  useEffect(() => {
    async function init() {
      try {
        const db = await getDatabase();
        await runMigrations(db);
      } catch (e) {
        console.error('[FAWA] DB init error:', e);
      } finally {
        await hydrateFromStorage();
      }
    }
    init();
  }, []);

  if (!fontsLoaded || !hydrated) {
    return (
      <View style={{ flex: 1, backgroundColor: '#07110A', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator color="#2BE36B" size="large" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false, animation: 'fade' }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="onboarding" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="player/[dayId]"
          options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }}
        />
        <Stack.Screen
          name="alarm/[reminderId]"
          options={{ presentation: 'fullScreenModal', animation: 'fade' }}
        />
        <Stack.Screen
          name="test/[dayNumber]"
          options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
        />
        <Stack.Screen
          name="settings"
          options={{ animation: 'slide_from_right' }}
        />
      </Stack>
    </GestureHandlerRootView>
  );
}
