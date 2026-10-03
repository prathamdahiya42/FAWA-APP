import React, { useCallback, useEffect } from 'react';
import {
  TouchableWithoutFeedback,
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withRepeat,
  withSequence,
  runOnJS,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useThemeColors } from '@/src/theme';
import { useUIStore } from '@/src/store/ui.store';
import { TouchTarget } from '@/src/theme/spacing';
import { FontFamilies } from '@/src/theme/typography';

interface ChargeButtonProps {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  success?: boolean;
  /** Enables the slow breathing glow — use only on the single main CTA of a screen */
  isPrimary?: boolean;
  /** Outlined secondary style */
  isOutlined?: boolean;
  style?: object;
  accessibilityLabel?: string;
  testID?: string;
}

/**
 * Charge Button — the signature interactive element of FAWA.
 *
 * Press in  → spring scale to 0.96 + light haptic + yellow ripple
 * Release   → spring back with overshoot
 * Success   → label morphs to ✓, fill turns yellow
 * Primary   → slow 3s breathing glow when idle
 * Loading   → pill shrinks to spinner
 * Disabled  → colour-only (no animation)
 * Reduced motion → colour change only, no movement
 */
export function ChargeButton({
  label,
  onPress,
  disabled = false,
  loading = false,
  success = false,
  isPrimary = false,
  isOutlined = false,
  style,
  accessibilityLabel,
  testID,
}: ChargeButtonProps) {
  const colors = useThemeColors();
  const hapticsEnabled = useUIStore((s) => s.hapticsEnabled);
  const reduceMotion = useUIStore((s) => s.reduceMotion);

  const scale = useSharedValue(1);
  const glowOpacity = useSharedValue(0);
  const rippleScale = useSharedValue(0);
  const rippleOpacity = useSharedValue(0);

  // ── Breathing glow ────────────────────────────────────────────────────────
  useEffect(() => {
    if (isPrimary && !disabled && !loading && !success && !reduceMotion) {
      glowOpacity.value = withRepeat(
        withSequence(
          withTiming(0.45, { duration: 1500 }),
          withTiming(0.0, { duration: 1500 }),
        ),
        -1,
        false,
      );
    } else {
      glowOpacity.value = withTiming(0, { duration: 300 });
    }
  }, [isPrimary, disabled, loading, success, reduceMotion]);

  // ── Handlers ─────────────────────────────────────────────────────────────
  const triggerHaptic = useCallback(() => {
    if (hapticsEnabled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, [hapticsEnabled]);

  const handlePressIn = useCallback(() => {
    if (disabled || loading) return;
    if (!reduceMotion) {
      scale.value = withSpring(0.96, { stiffness: 400, damping: 20 });
      rippleScale.value = 0;
      rippleOpacity.value = 0.6;
      rippleScale.value = withTiming(1.3, { duration: 360 });
      rippleOpacity.value = withTiming(0, { duration: 360 });
    }
    runOnJS(triggerHaptic)();
  }, [disabled, loading, reduceMotion, triggerHaptic]);

  const handlePressOut = useCallback(() => {
    if (disabled || loading) return;
    if (!reduceMotion) {
      scale.value = withSpring(1, {
        stiffness: 250,
        damping: 10,
        overshootClamping: false,
      });
    }
  }, [disabled, loading, reduceMotion]);

  const handlePress = useCallback(() => {
    if (disabled || loading) return;
    onPress();
  }, [disabled, loading, onPress]);

  // ── Animated styles ───────────────────────────────────────────────────────
  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: reduceMotion ? 1 : scale.value }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  const rippleStyle = useAnimatedStyle(() => ({
    opacity: rippleOpacity.value,
    transform: [{ scale: rippleScale.value }],
  }));

  // ── Derived colours ───────────────────────────────────────────────────────
  const bgColor = isOutlined
    ? 'transparent'
    : success
    ? colors.yellow
    : colors.green;
  const textColor = isOutlined
    ? colors.green
    : success
    ? colors.inkOnYellow
    : colors.inkOnGreen;
  const isDisabled = disabled || loading;

  return (
    <View style={[styles.wrapper, style]}>
      {/* Breathing glow */}
      {isPrimary && !reduceMotion && (
        <Animated.View
          style={[styles.glow, { backgroundColor: colors.green }, glowStyle]}
          pointerEvents="none"
        />
      )}

      <TouchableWithoutFeedback
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={handlePress}
        disabled={isDisabled}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? label}
        accessibilityState={{ disabled: isDisabled }}
        testID={testID}
      >
        <Animated.View
          style={[
            styles.pill,
            {
              backgroundColor: bgColor,
              borderColor: isOutlined ? colors.green : 'transparent',
              borderWidth: isOutlined ? 1.5 : 0,
              opacity: isDisabled ? 0.48 : 1,
            },
            containerStyle,
          ]}
        >
          {/* Yellow spark ripple */}
          {!reduceMotion && (
            <Animated.View
              style={[styles.ripple, { backgroundColor: colors.yellow }, rippleStyle]}
              pointerEvents="none"
            />
          )}

          {loading ? (
            <ActivityIndicator color={textColor} size="small" />
          ) : (
            <Text
              style={[
                styles.label,
                { color: textColor, fontFamily: FontFamilies.bodyBold },
              ]}
              numberOfLines={1}
              accessibilityRole="text"
            >
              {success ? '✓ Done' : label}
            </Text>
          )}
        </Animated.View>
      </TouchableWithoutFeedback>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'relative',
    alignSelf: 'stretch',
  },
  glow: {
    position: 'absolute',
    top: -10,
    left: -10,
    right: -10,
    bottom: -10,
    borderRadius: 60,
    zIndex: 0,
  },
  pill: {
    minHeight: TouchTarget,
    borderRadius: 100,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 14,
    overflow: 'hidden',
    zIndex: 1,
  },
  ripple: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    alignSelf: 'center',
  },
  label: {
    fontSize: 16,
    letterSpacing: 0.3,
    zIndex: 2,
  },
});
