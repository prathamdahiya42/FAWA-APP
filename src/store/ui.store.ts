import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { setThemeOverride } from '@/src/theme';

interface UIState {
  themeOverride: 'dark' | 'light' | null;
  setThemeOverride: (theme: 'dark' | 'light' | null) => Promise<void>;
  hapticsEnabled: boolean;
  setHapticsEnabled: (v: boolean) => Promise<void>;
  reduceMotion: boolean;
  setReduceMotion: (v: boolean) => void;
  soundEnabled: boolean;
  setSoundEnabled: (v: boolean) => void;
  toastMessage: string | null;
  showToast: (msg: string, durationMs?: number) => void;
  hideToast: () => void;
  onboardingCompleted: boolean;
  setOnboardingCompleted: (v: boolean) => Promise<void>;
  hydrated: boolean;
  hydrateFromStorage: () => Promise<void>;
}

const STORAGE_KEY = '@fawa_ui_state';

export const useUIStore = create<UIState>((set, get) => ({
  themeOverride: null,
  hapticsEnabled: true,
  reduceMotion: false,
  soundEnabled: true,
  toastMessage: null,
  onboardingCompleted: false,
  hydrated: false,

  setThemeOverride: async (theme) => {
    set({ themeOverride: theme });
    setThemeOverride(theme);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ ...get(), themeOverride: theme, hydrated: undefined }));
  },

  setHapticsEnabled: async (v) => {
    set({ hapticsEnabled: v });
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ ...get(), hapticsEnabled: v, hydrated: undefined }));
  },

  setReduceMotion: (v) => set({ reduceMotion: v }),

  setSoundEnabled: (v) => set({ soundEnabled: v }),

  showToast: (msg, durationMs = 3000) => {
    set({ toastMessage: msg });
    setTimeout(() => set({ toastMessage: null }), durationMs);
  },

  hideToast: () => set({ toastMessage: null }),

  setOnboardingCompleted: async (v) => {
    set({ onboardingCompleted: v });
    await AsyncStorage.setItem('@fawa_onboarding', v ? '1' : '0');
  },

  hydrateFromStorage: async () => {
    try {
      const [raw, onboarded] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEY),
        AsyncStorage.getItem('@fawa_onboarding'),
      ]);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<UIState>;
        if (parsed.themeOverride !== undefined) setThemeOverride(parsed.themeOverride);
        set({
          themeOverride: parsed.themeOverride ?? null,
          hapticsEnabled: parsed.hapticsEnabled ?? true,
          soundEnabled: parsed.soundEnabled ?? true,
        });
      }
      set({
        onboardingCompleted: onboarded === '1',
        hydrated: true,
      });
    } catch {
      set({ hydrated: true });
    }
  },
}));
