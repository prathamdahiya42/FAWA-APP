import React, { useEffect } from 'react';
import { Text, StyleSheet, Platform } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
} from 'react-native-reanimated';
import { useUIStore } from '@/src/store/ui.store';
import { useThemeColors } from '@/src/theme';
import { FontFamilies } from '@/src/theme/typography';
import { Radius, Spacing } from '@/src/theme/spacing';

export function Toast() {
  const toastMessage = useUIStore((s) => s.toastMessage);
  const colors = useThemeColors();
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(-20);

  useEffect(() => {
    if (toastMessage) {
      opacity.value = withTiming(1, { duration: 250 });
      translateY.value = withSpring(0, { damping: 15 });
    } else {
      opacity.value = withTiming(0, { duration: 200 });
      translateY.value = withTiming(-20, { duration: 200 });
    }
  }, [toastMessage]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  if (!toastMessage) return null;

  return (
    <Animated.View
      style={[
        styles.toast,
        {
          backgroundColor: colors.surface2,
          borderColor: colors.green,
        },
        animatedStyle,
      ]}
      pointerEvents="none"
    >
      <Text style={[styles.text, { color: colors.text, fontFamily: FontFamilies.bodyMedium }]}>
        {toastMessage}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 56 : 36,
    left: 20,
    right: 20,
    zIndex: 9999,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.lg,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  text: {
    fontSize: 14,
    textAlign: 'center',
  },
});
