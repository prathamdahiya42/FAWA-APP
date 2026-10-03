import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useThemeColors } from '@/src/theme';
import { useUIStore } from '@/src/store/ui.store';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface ProgressRingProps {
  size?: number;
  strokeWidth?: number;
  progress: number; // 0 to 1
  phase?: 'Foundation' | 'Build' | 'Intensify' | 'Peak';
  isComplete?: boolean;
  children?: React.ReactNode;
}

export function ProgressRing({
  size = 180,
  strokeWidth = 14,
  progress = 0,
  phase = 'Foundation',
  isComplete = false,
  children,
}: ProgressRingProps) {
  const colors = useThemeColors();
  const reduceMotion = useUIStore((s) => s.reduceMotion);

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clampedProgress = Math.min(Math.max(progress, 0), 1);

  const animatedProgress = useSharedValue(clampedProgress);

  useEffect(() => {
    if (reduceMotion) {
      animatedProgress.value = clampedProgress;
    } else {
      animatedProgress.value = withTiming(clampedProgress, {
        duration: 900,
        easing: Easing.out(Easing.cubic),
      });
    }
  }, [clampedProgress, reduceMotion]);

  const animatedProps = useAnimatedProps(() => {
    const strokeDashoffset = circumference * (1 - animatedProgress.value);
    return {
      strokeDashoffset,
    };
  });

  // Phase accent colors
  const gradientStops = isComplete
    ? { start: colors.yellow, end: colors.yellowSoft }
    : phase === 'Foundation'
    ? { start: colors.green, end: colors.greenDeep }
    : phase === 'Build'
    ? { start: colors.green, end: colors.yellow }
    : phase === 'Intensify'
    ? { start: '#1FF05A', end: colors.yellow }
    : { start: colors.yellow, end: colors.green };

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <Defs>
          <LinearGradient id="ringGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor={gradientStops.start} />
            <Stop offset="100%" stopColor={gradientStops.end} />
          </LinearGradient>
        </Defs>

        {/* Track circle */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={colors.surface2}
          strokeWidth={strokeWidth}
          fill="none"
        />

        {/* Animated Progress circle */}
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={isComplete ? colors.yellow : 'url(#ringGradient)'}
          strokeWidth={strokeWidth}
          strokeDasharray={`${circumference} ${circumference}`}
          animatedProps={animatedProps}
          strokeLinecap="round"
          fill="none"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>

      {children && <View style={styles.childContainer}>{children}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  childContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
