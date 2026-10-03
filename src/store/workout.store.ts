import { create } from 'zustand';
import type { WorkoutLog, ExerciseLog, SessionSection } from '@/src/types';

interface WorkoutState {
  activeWorkout: WorkoutLog | null;
  currentExerciseIndex: number;
  currentSetIndex: number;
  currentSection: SessionSection;
  restCountdownSeconds: number;
  isResting: boolean;
  startWorkout: (log: WorkoutLog) => void;
  updateExerciseLog: (exerciseLog: ExerciseLog) => void;
  nextExercise: () => void;
  setCurrentSection: (s: SessionSection) => void;
  startRest: (seconds: number) => void;
  tickRest: () => void;
  skipRest: () => void;
  finishWorkout: () => void;
  clearWorkout: () => void;
  updateDuration: (seconds: number) => void;
}

export const useWorkoutStore = create<WorkoutState>((set, get) => ({
  activeWorkout: null,
  currentExerciseIndex: 0,
  currentSetIndex: 0,
  currentSection: 'warmup',
  restCountdownSeconds: 0,
  isResting: false,

  startWorkout: (log) =>
    set({
      activeWorkout: log,
      currentExerciseIndex: 0,
      currentSetIndex: 0,
      currentSection: 'warmup',
      isResting: false,
    }),

  updateExerciseLog: (exerciseLog) =>
    set((state) => {
      if (!state.activeWorkout) return state;
      const existing = state.activeWorkout.exerciseLogs.find(
        (e) => e.exerciseId === exerciseLog.exerciseId,
      );
      const exerciseLogs = existing
        ? state.activeWorkout.exerciseLogs.map((e) =>
            e.exerciseId === exerciseLog.exerciseId ? exerciseLog : e,
          )
        : [...state.activeWorkout.exerciseLogs, exerciseLog];
      return { activeWorkout: { ...state.activeWorkout, exerciseLogs } };
    }),

  nextExercise: () =>
    set((state) => ({ currentExerciseIndex: state.currentExerciseIndex + 1 })),

  setCurrentSection: (s) => set({ currentSection: s }),

  startRest: (seconds) => set({ isResting: true, restCountdownSeconds: seconds }),

  tickRest: () =>
    set((state) => {
      const next = state.restCountdownSeconds - 1;
      if (next <= 0) return { isResting: false, restCountdownSeconds: 0 };
      return { restCountdownSeconds: next };
    }),

  skipRest: () => set({ isResting: false, restCountdownSeconds: 0 }),

  finishWorkout: () =>
    set((state) => ({
      activeWorkout: state.activeWorkout
        ? { ...state.activeWorkout, completedAt: new Date().toISOString() }
        : null,
    })),

  clearWorkout: () =>
    set({
      activeWorkout: null,
      currentExerciseIndex: 0,
      currentSetIndex: 0,
      isResting: false,
      restCountdownSeconds: 0,
    }),

  updateDuration: (seconds) =>
    set((state) => ({
      activeWorkout: state.activeWorkout
        ? { ...state.activeWorkout, durationSeconds: seconds }
        : null,
    })),
}));
