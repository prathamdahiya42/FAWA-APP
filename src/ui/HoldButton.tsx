import React, { useRef, useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LongPressGestureHandler, State as GestureState } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useThemeColors } from '@/src/theme';
import { useUIStore } from '@/src/store/ui.store';
import { TouchTarget } from '@/src/theme/spacing';
import { FontFamilies } from '@/src/theme/typography';

interface HoldButtonProps {
  label: string;
  onComplete: () => void;
  holdDurationMs?: number;
  style?: object;
  accessibilityLabel?: string;
  accessibilityHint?: string;
}

/**
 * Hold Button — for destructive / important confirmations.
 *
 * Hold for holdDurationMs → yellow fill sweeps across → fires onComplete
 * Release early → fill resets + soft shake
 *
 * Used for: finish workout early, dismiss alarm, delete data.
 */
export function HoldButton({
  label,
  onComplete,
  holdDurationMs = 600,
  style,
  accessibilityLabel,
  accessibilityHint,
}: HoldButtonProps) {
  const colors = useThemeColors();
  const hapticsEnabled = useUIStore((s) => s.hapticsEnabled);
  const reduceMotion = useUIStore((s) => s.reduceMotion);

  const fillProgress = useSharedValue(0);
  const shakeOffset = useSharedValue(0);
  const isHolding = useRef(false);
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const triggerSuccess = useCallback(() => {
    if (hapticsEnabled) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    onComplete();
  }, [hapticsEnabled, onComplete]);

  const startHold = useCallback(() => {
    isHolding.current = true;
    if (!reduceMotion) {
      fillProgress.value = withTiming(1, { duration: holdDurationMs });
    } else {
      fillProgress.value = 1;
    }
    if (hapticsEnabled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    holdTimer.current = setTimeout(() => {
      if (isHolding.current) {
        runOnJS(triggerSuccess)();
      }
    }, holdDurationMs);
  }, [holdDurationMs, hapticsEnabled, reduceMotion, triggerSuccess]);

  const cancelHold = useCallback(() => {
    if (!isHolding.current) return;
    isHolding.current = false;
    if (holdTimer.current) {
      clearTimeout(holdTimer.current);
      holdTimer.current = null;
    }
    fillProgress.value = withTiming(0, { duration: 200 });
    if (!reduceMotion) {
      shakeOffset.value = withSequence(
        withTiming(-6, { duration: 40 }),
        withTiming(6, { duration: 40 }),
        withTiming(-4, { duration: 40 }),
        withTiming(4, { duration: 40 }),
        withSpring(0, { stiffness: 500, damping: 20 }),
      );
    }
  }, [reduceMotion]);

  const fillStyle = useAnimatedStyle(() => ({
    width: `${fillProgress.value * 100}%` as any,
  }));

  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: reduceMotion ? 0 : shakeOffset.value }],
  }));

  return (
    <LongPressGestureHandler
      minDurationMs={0}
      onHandlerStateChange={({ nativeEvent }) => {
        if (nativeEvent.state === GestureState.BEGAN) startHold();
        else if (
          nativeEvent.state === GestureState.END ||
          nativeEvent.state === GestureState.CANCELLED ||
          nativeEvent.state === GestureState.FAILED
        ) {
          cancelHold();
        }
      }}
    >
      <Animated.View
        style={[styles.pill, { borderColor: colors.yellow, backgroundColor: colors.surface2 }, containerStyle, style]}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? label}
        accessibilityHint={
          accessibilityHint ?? `Hold for ${(holdDurationMs / 1000).toFixed(1)} seconds to confirm`
        }
      >
        {/* Fill sweep */}
        <Animated.View
          style={[styles.fill, { backgroundColor: colors.yellow }, fillStyle]}
          pointerEvents="none"
        />
        <Text
          style={[styles.label, { color: colors.yellow, fontFamily: FontFamilies.bodyBold }]}
          numberOfLines={1}
        >
          {label}
        </Text>
      </Animated.View>
    </LongPressGestureHandler>
  );
}

const styles = StyleSheet.create({
  pill: {
    minHeight: TouchTarget,
    borderRadius: 100,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 14,
    overflow: 'hidden',
    alignSelf: 'stretch',
  },
  fill: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    borderRadius: 100,
  },
  label: {
    fontSize: 16,
    letterSpacing: 0.3,
    zIndex: 2,
  },
});
