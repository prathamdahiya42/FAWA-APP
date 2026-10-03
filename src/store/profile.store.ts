import { create } from 'zustand';
import type { UserProfile } from '@/src/types';

interface ProfileState {
  profile: UserProfile | null;
  setProfile: (p: UserProfile) => void;
  updateProfile: (partial: Partial<UserProfile>) => void;
  clearProfile: () => void;
}

export const useProfileStore = create<ProfileState>((set, get) => ({
  profile: null,
  setProfile: (p) => set({ profile: p }),
  updateProfile: (partial) => {
    const current = get().profile;
    if (current) {
      set({ profile: { ...current, ...partial, updatedAt: new Date().toISOString() } });
    }
  },
  clearProfile: () => set({ profile: null }),
}));
