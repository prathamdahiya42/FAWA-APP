import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
import { useUIStore } from '@/src/store/ui.store';

/**
 * Entry point — redirects to onboarding or main app depending on state.
 * The hydration guard ensures we wait for AsyncStorage before navigating.
 */
export default function IndexScreen() {
  const router = useRouter();
  const hydrated = useUIStore((s) => s.hydrated);
  const onboardingCompleted = useUIStore((s) => s.onboardingCompleted);

  useEffect(() => {
    if (!hydrated) return;
    // Small tick to allow Expo Router layout to mount
    const t = setTimeout(() => {
      if (onboardingCompleted) {
        router.replace('/(tabs)/today');
      } else {
        router.replace('/onboarding/welcome');
      }
    }, 50);
    return () => clearTimeout(t);
  }, [hydrated, onboardingCompleted]);

  return (
    <View style={{ flex: 1, backgroundColor: '#07110A', justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator color="#2BE36B" size="large" />
    </View>
  );
}
