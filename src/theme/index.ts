import { useColorScheme } from 'react-native';
import { DarkColors, LightColors, PhaseAccents } from './colors';
import type { Colors, PhaseName } from './colors';
import { FontFamilies, TypeScale } from './typography';
import { Spacing, Radius, TouchTarget } from './spacing';

export { DarkColors, LightColors, PhaseAccents, FontFamilies, TypeScale, Spacing, Radius, TouchTarget };
export type { Colors, PhaseName };

// Lazy import to avoid circular deps — store reads theme from AsyncStorage
let _themeOverride: 'dark' | 'light' | null = null;
export function setThemeOverride(t: 'dark' | 'light' | null) {
  _themeOverride = t;
}
export function getThemeOverride() {
  return _themeOverride;
}

export function useThemeColors(): Colors {
  const systemScheme = useColorScheme();
  const override = _themeOverride;
  const isDark =
    override === 'dark' ||
    (override === null && systemScheme === 'dark') ||
    (override === null && systemScheme !== 'light'); // default dark
  return isDark ? DarkColors : LightColors;
}
