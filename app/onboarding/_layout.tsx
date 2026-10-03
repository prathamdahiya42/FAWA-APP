import { Stack } from 'expo-router';

export default function OnboardingLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <Stack.Screen name="welcome" />
      <Stack.Screen name="about-you" />
      <Stack.Screen name="health-flags" />
      <Stack.Screen name="equipment" />
      <Stack.Screen name="placement-test" />
      <Stack.Screen name="your-day" />
      <Stack.Screen name="start" />
    </Stack>
  );
}
