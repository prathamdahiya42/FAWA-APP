import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useThemeColors } from '@/src/theme';
import { FontFamilies } from '@/src/theme/typography';
import { useUIStore } from '@/src/store/ui.store';

interface StreakFlameProps {
  count: number;
  size?: number;
  showText?: boolean;
}

export function StreakFlame({ count, size = 28, showText = true }: StreakFlameProps) {
  const colors = useThemeColors();
  const reduceMotion = useUIStore((s) => s.reduceMotion);

  const scale = useSharedValue(1);

  useEffect(() => {
    if (count > 0 && !reduceMotion) {
      scale.value = withRepeat(
        withSequence(
          withTiming(1.08, { duration: 900 }),
          withTiming(0.96, { duration: 900 }),
        ),
        -1,
        true,
      );
    } else {
      scale.value = 1;
    }
  }, [count, reduceMotion]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const flameColor = count > 0 ? colors.yellow : colors.textMuted;

  return (
    <View style={styles.container}>
      <Animated.View style={animatedStyle}>
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path
            d="M12 2c-.5 2-2 3.5-3.5 5.5C7 9.5 6 12 6 14.5 6 18.1 8.7 21 12 21s6-2.9 6-6.5c0-3.5-2.5-6-4-8.5-.5 2-1.5 3-2 3.5-.5-2 0-5.5 0-7.5z"
            fill={flameColor}
          />
        </Svg>
      </Animated.View>
      {showText && (
        <Text
          style={[
            styles.text,
            {
              color: flameColor,
              fontFamily: FontFamilies.mono,
            },
          ]}
        >
          {count}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  text: {
    fontSize: 15,
    fontWeight: '700',
  },
});
