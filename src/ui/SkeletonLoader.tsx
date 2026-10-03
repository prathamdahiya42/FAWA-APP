import React, { useEffect } from 'react';
import { View, StyleSheet, DimensionValue } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useThemeColors } from '@/src/theme';
import { Radius } from '@/src/theme/spacing';
import { useUIStore } from '@/src/store/ui.store';

interface SkeletonLoaderProps {
  width?: DimensionValue;
  height?: number;
  borderRadius?: number;
  style?: object;
}

export function SkeletonLoader({
  width = '100%',
  height = 20,
  borderRadius = Radius.md,
  style,
}: SkeletonLoaderProps) {
  const colors = useThemeColors();
  const reduceMotion = useUIStore((s) => s.reduceMotion);

  const opacity = useSharedValue(0.35);

  useEffect(() => {
    if (!reduceMotion) {
      opacity.value = withRepeat(
        withSequence(
          withTiming(0.75, { duration: 800 }),
          withTiming(0.35, { duration: 800 }),
        ),
        -1,
        true,
      );
    } else {
      opacity.value = 0.5;
    }
  }, [reduceMotion]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        styles.skeleton,
        {
          width,
          height,
          borderRadius,
          backgroundColor: colors.surface2,
        },
        animatedStyle,
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  skeleton: {
    overflow: 'hidden',
  },
});
