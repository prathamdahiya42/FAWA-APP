import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Modal,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useKeepAwake } from 'expo-keep-awake';
import * as Haptics from 'expo-haptics';
import { useThemeColors } from '@/src/theme';
import { FontFamilies, TypeScale } from '@/src/theme/typography';
import { Spacing, Radius, TouchTarget } from '@/src/theme/spacing';
import { ChargeButton } from '@/src/ui/ChargeButton';
import { HoldButton } from '@/src/ui/HoldButton';
import { QuickCaptureSheet } from '@/src/ui/QuickCaptureSheet';
import { usePlanStore } from '@/src/store/plan.store';
import { useProfileStore } from '@/src/store/profile.store';
import { useWorkoutStore } from '@/src/store/workout.store';
import { useUIStore } from '@/src/store/ui.store';
import { getDatabase } from '@/src/db/database';
import exercisesData from '@/src/data/exercises';
import { interpolateDose, applyDeload, applyTaper, getRepRange } from '@/src/engine/dose';
import { isDeloadDay, isTaperDay } from '@/src/engine/plan-generator';
import { getDefaultRestSeconds } from '@/src/engine/level';
import { PAIN_DOCTOR_ADVICE, SORENESS_ADVICE } from '@/src/engine/safety';
import type {
  PlanDay,
  Exercise,
  SessionSection,
  SetLog,
  ExerciseLog,
  WorkoutLog,
} from '@/src/types';

export default function WorkoutPlayerScreen() {
  useKeepAwake(); // Keep screen awake during workouts
  const { dayId } = useLocalSearchParams<{ dayId: string }>();
  const router = useRouter();
  const colors = useThemeColors();

  const profile = useProfileStore((s) => s.profile);
  const planDays = usePlanStore((s) => s.planDays);
  const updatePlanDay = usePlanStore((s) => s.updateDay);
  const activeWorkout = useWorkoutStore((s) => s.activeWorkout);
  const startWorkoutStore = useWorkoutStore((s) => s.startWorkout);
  const clearWorkoutStore = useWorkoutStore((s) => s.clearWorkout);
  const showToast = useUIStore((s) => s.showToast);
  const hapticsEnabled = useUIStore((s) => s.hapticsEnabled);

  // Find plan day
  const planDay = useMemo(() => {
    return planDays.find((d) => d.id === dayId) || planDays[0];
  }, [planDays, dayId]);

  const level = profile?.level || 'beginner';
  const isDeload = isDeloadDay(planDay?.dayNumber || 1);
  const isTaper = isTaperDay(planDay?.dayNumber || 1);

  // Available sections for this workout
  const sections: SessionSection[] = ['warmup', 'main', 'core', 'cooldown'];
  const [currentSection, setCurrentSection] = useState<SessionSection>('warmup');
  const [exerciseIndex, setExerciseIndex] = useState(0);

  // Exercises filtered by section
  const sectionSlots = useMemo(() => {
    if (!planDay?.exercises) return [];
    return planDay.exercises.filter((slot) => slot.section === currentSection);
  }, [planDay, currentSection]);

  const currentSlot = sectionSlots[exerciseIndex] || sectionSlots[0];

  // Resolve exercise object from seed library
  const currentExercise: Exercise = useMemo(() => {
    const found = exercisesData.find((e) => e.id === currentSlot?.exerciseId);
    return (
      found || {
        id: currentSlot?.exerciseId || 'L1',
        name: 'Bodyweight Squat',
        muscleGroup: 'lower_body',
        equipmentTier: 0,
        impact: 'none',
        type: 'reps',
        beginnerDay1: { sets: 3, reps: 10 },
        beginnerDay60: { sets: 3, reps: 20 },
        intermediateDay1: { sets: 4, reps: 15 },
        intermediateDay60: { sets: 4, reps: 25 },
        easierId: null,
        harderId: null,
        substitutions: {},
        bmiBandRestrictions: {},
        cues: ['Chest up', 'Knees out', 'Push through heels'],
        commonMistake: 'Knees caving in',
        imageRef: null,
        isCustom: false,
        createdAt: new Date().toISOString(),
      }
    );
  }, [currentSlot]);

  // Target dose calculated from interpolation + deload/taper
  const targetDose = useMemo(() => {
    const day1 = level === 'intermediate' ? currentExercise.intermediateDay1 : currentExercise.beginnerDay1;
    const day60 = level === 'intermediate' ? currentExercise.intermediateDay60 : currentExercise.beginnerDay60;
    let dose = interpolateDose(day1, day60, planDay?.dayNumber || 1);
    if (isDeload) dose = applyDeload(dose);
    if (isTaper) dose = applyTaper(dose);
    return dose;
  }, [currentExercise, level, planDay?.dayNumber, isDeload, isTaper]);

  const repRange = useMemo(() => getRepRange(targetDose), [targetDose]);

  // Set-by-set state
  const totalSets = targetDose.sets || 3;
  const [completedSets, setCompletedSets] = useState<SetLog[]>([]);
  const [currentSetReps, setCurrentSetReps] = useState<number>(targetDose.reps || 10);

  // Rest timer
  const defaultRest = getDefaultRestSeconds(level);
  const [restSecondsRemaining, setRestSecondsRemaining] = useState<number>(0);
  const [isResting, setIsResting] = useState<boolean>(false);
  const restIntervalRef = useRef<any>(null);

  // Timed exercise countdown
  const [timerSecondsRemaining, setTimerSecondsRemaining] = useState<number>(0);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);
  const timerIntervalRef = useRef<any>(null);

  // Pain modal & swap modal & note sheet
  const [painModalVisible, setPainModalVisible] = useState(false);
  const [swapModalVisible, setSwapModalVisible] = useState(false);
  const [noteSheetVisible, setNoteSheetVisible] = useState(false);
  const [rpeModalVisible, setRpeModalVisible] = useState(false);

  // Workout duration tracking
  const [durationSeconds, setDurationSeconds] = useState(0);
  const workoutStartRef = useRef<number>(Date.now());

  useEffect(() => {
    const durInterval = setInterval(() => {
      setDurationSeconds(Math.floor((Date.now() - workoutStartRef.current) / 1000));
    }, 1000);
    return () => clearInterval(durInterval);
  }, []);

  // Sync reps when exercise changes
  useEffect(() => {
    setCurrentSetReps(targetDose.reps || 10);
    setCompletedSets([]);
    setIsResting(false);
    setIsTimerRunning(false);
    if (currentExercise.type === 'timed' || currentExercise.type === 'duration') {
      setTimerSecondsRemaining(targetDose.seconds || (targetDose.minutes ? targetDose.minutes * 60 : 30));
    }
  }, [currentExercise, targetDose]);

  // Rest countdown runner
  useEffect(() => {
    if (isResting) {
      restIntervalRef.current = setInterval(() => {
        setRestSecondsRemaining((prev) => {
          if (prev <= 1) {
            clearInterval(restIntervalRef.current);
            setIsResting(false);
            if (hapticsEnabled) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            return 0;
          }
          if (prev <= 4 && hapticsEnabled) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      clearInterval(restIntervalRef.current);
    }
    return () => clearInterval(restIntervalRef.current);
  }, [isResting, hapticsEnabled]);

  // Exercise countdown runner
  useEffect(() => {
    if (isTimerRunning) {
      timerIntervalRef.current = setInterval(() => {
        setTimerSecondsRemaining((prev) => {
          if (prev <= 1) {
            clearInterval(timerIntervalRef.current);
            setIsTimerRunning(false);
            handleSetComplete();
            return 0;
          }
          if (prev <= 4 && hapticsEnabled) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      clearInterval(timerIntervalRef.current);
    }
    return () => clearInterval(timerIntervalRef.current);
  }, [isTimerRunning, hapticsEnabled]);

  // Complete a set
  const handleSetComplete = () => {
    if (hapticsEnabled) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const newSet: SetLog = {
      setNumber: completedSets.length + 1,
      reps: currentExercise.type === 'reps' ? currentSetReps : undefined,
      seconds: currentExercise.type === 'timed' ? targetDose.seconds : undefined,
      hasPain: false,
    };

    const nextSets = [...completedSets, newSet];
    setCompletedSets(nextSets);

    if (nextSets.length < totalSets) {
      // Start rest
      setRestSecondsRemaining(defaultRest);
      setIsResting(true);
    } else {
      // Exercise finished: advance
      showToast(`${currentExercise.name} complete!`);
      handleNextExercise();
    }
  };

  // Move to next exercise or next section
  const handleNextExercise = () => {
    if (exerciseIndex + 1 < sectionSlots.length) {
      setExerciseIndex(exerciseIndex + 1);
    } else {
      const currentSecIdx = sections.indexOf(currentSection);
      if (currentSecIdx + 1 < sections.length) {
        setCurrentSection(sections[currentSecIdx + 1]);
        setExerciseIndex(0);
      } else {
        // All sections finished!
        setRpeModalVisible(true);
      }
    }
  };

  // Finish workout completely and save to SQLite
  const handleFinalSave = async (sessionRpe = 5) => {
    try {
      const db = await getDatabase();
      const nowIso = new Date().toISOString();
      const logId = `wlog-${Date.now()}`;

      await db.runAsync(
        `INSERT OR REPLACE INTO workout_logs (
          id, plan_day_id, day_number, started_at, completed_at, duration_seconds,
          exercise_logs, session_rpe, notes, pain_event_logged, is_partial
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          logId,
          planDay.id,
          planDay.dayNumber,
          nowIso,
          nowIso,
          durationSeconds,
          JSON.stringify([]),
          sessionRpe,
          '',
          0,
          0,
        ],
      );

      // Mark plan day as completed
      await db.runAsync('UPDATE plan_days SET is_completed = 1, completed_at = ? WHERE id = ?', [
        nowIso,
        planDay.id,
      ]);

      updatePlanDay(planDay.id, { isCompleted: true, completedAt: nowIso });
      clearWorkoutStore();

      showToast('Workout finished! Great effort today 🔥');
      router.replace('/(tabs)/today');
    } catch (err) {
      console.warn('Failed to save workout log', err);
      router.replace('/(tabs)/today');
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]}>
      <StatusBar barStyle="light-content" backgroundColor={colors.bg} />

      {/* Header bar */}
      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.closeBtn}
          accessibilityLabel="Exit player"
          accessibilityRole="button"
        >
          <Text style={[styles.closeIcon, { color: colors.text }]}>✕</Text>
        </TouchableOpacity>

        <View style={styles.topInfo}>
          <Text style={[styles.topDayTitle, { color: colors.text, fontFamily: FontFamilies.bodyBold }]}>
            Day {planDay?.dayNumber || 1} · {planDay?.sessionLabel || 'Session'}
          </Text>
          <Text style={[styles.topTimer, { color: colors.textMuted, fontFamily: FontFamilies.mono }]}>
            {Math.floor(durationSeconds / 60)}:
            {String(durationSeconds % 60).padStart(2, '0')}
          </Text>
        </View>

        <TouchableOpacity
          onPress={() => setNoteSheetVisible(true)}
          style={[styles.noteBtn, { backgroundColor: colors.surface2 }]}
          accessibilityLabel="Add note for this exercise"
        >
          <Text style={{ color: colors.text, fontSize: 13 }}>Note</Text>
        </TouchableOpacity>
      </View>

      {/* Section tabs */}
      <View style={styles.sectionTabs}>
        {sections.map((sec) => (
          <TouchableOpacity
            key={sec}
            onPress={() => {
              setCurrentSection(sec);
              setExerciseIndex(0);
            }}
            style={[
              styles.sectionTab,
              {
                borderBottomColor: currentSection === sec ? colors.green : 'transparent',
              },
            ]}
          >
            <Text
              style={[
                styles.sectionTabText,
                {
                  color: currentSection === sec ? colors.green : colors.textMuted,
                  fontFamily: FontFamilies.bodyBold,
                },
              ]}
            >
              {sec.toUpperCase()}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Rest Banner (overlays exercise when resting) */}
        {isResting ? (
          <View style={[styles.restCard, { backgroundColor: colors.surface, borderColor: colors.yellow }]}>
            <Text style={[styles.restTitle, { color: colors.yellow, fontFamily: FontFamilies.displayBold }]}>
              REST
            </Text>
            <Text style={[styles.restCountdown, { color: colors.text, fontFamily: FontFamilies.mono }]}>
              {restSecondsRemaining}s
            </Text>
            <Text style={{ color: colors.textMuted, fontFamily: FontFamilies.bodyRegular }}>
              Next: Set {completedSets.length + 1} of {totalSets}
            </Text>

            <View style={styles.restActionsRow}>
              <TouchableOpacity
                onPress={() => setRestSecondsRemaining((prev) => prev + 15)}
                style={[styles.restActionBtn, { backgroundColor: colors.surface2, borderColor: colors.line }]}
              >
                <Text style={{ color: colors.text, fontFamily: FontFamilies.bodyMedium, fontSize: 13 }}>
                  +15 sec
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  setIsResting(false);
                  setRestSecondsRemaining(0);
                }}
                style={[styles.restActionBtn, { backgroundColor: colors.green }]}
              >
                <Text style={{ color: colors.inkOnGreen, fontFamily: FontFamilies.bodyBold, fontSize: 13 }}>
                  Skip Rest
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          /* Exercise Card */
          <View style={[styles.exerciseCard, { backgroundColor: colors.surface, borderColor: colors.line }]}>
            <View style={styles.cardTopRow}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.exerciseName, { color: colors.text, fontFamily: FontFamilies.displayBold }]}>
                  {currentExercise.name}
                </Text>
                <Text style={[styles.exerciseTarget, { color: colors.green, fontFamily: FontFamilies.mono }]}>
                  {currentExercise.type === 'reps' && repRange
                    ? `Target: ${repRange.min}–${repRange.max} reps`
                    : currentExercise.type === 'timed'
                    ? `Target: ${targetDose.seconds || 30}s hold`
                    : `Target: ${targetDose.minutes || 5} min`}
                </Text>
              </View>

              {/* Something hurts button */}
              <TouchableOpacity
                onPress={() => setPainModalVisible(true)}
                style={[styles.painBtn, { backgroundColor: colors.surface2 }]}
                accessibilityLabel="Something hurts"
              >
                <Text style={{ color: colors.safety, fontFamily: FontFamilies.bodyBold, fontSize: 11 }}>
                  ⚠️ Hurts?
                </Text>
              </TouchableOpacity>
            </View>

            {/* Set Dots */}
            <View style={styles.setsDotsRow}>
              {Array.from({ length: totalSets }).map((_, i) => (
                <View
                  key={`dot-${i}`}
                  style={[
                    styles.setDot,
                    {
                      backgroundColor:
                        i < completedSets.length
                          ? colors.green
                          : i === completedSets.length
                          ? colors.yellow
                          : colors.surface2,
                      borderColor: i === completedSets.length ? colors.yellow : colors.line,
                    },
                  ]}
                />
              ))}
              <Text style={[styles.setCountText, { color: colors.textMuted, fontFamily: FontFamilies.bodyMedium }]}>
                Set {Math.min(completedSets.length + 1, totalSets)} of {totalSets}
              </Text>
            </View>

            {/* Counter / Timer display */}
            {currentExercise.type === 'reps' ? (
              <View style={styles.stepperContainer}>
                <TouchableOpacity
                  onPress={() => setCurrentSetReps((r) => Math.max(1, r - 1))}
                  style={[styles.stepperBtn, { backgroundColor: colors.surface2 }]}
                  accessibilityLabel="Decrease reps"
                >
                  <Text style={[styles.stepperBtnText, { color: colors.text }]}>−</Text>
                </TouchableOpacity>

                <View style={styles.stepperNumContainer}>
                  <Text style={[styles.stepperNum, { color: colors.text, fontFamily: FontFamilies.mono }]}>
                    {currentSetReps}
                  </Text>
                  <Text style={{ color: colors.textMuted, fontSize: 12, fontFamily: FontFamilies.bodyMedium }}>
                    REPS
                  </Text>
                </View>

                <TouchableOpacity
                  onPress={() => setCurrentSetReps((r) => r + 1)}
                  style={[styles.stepperBtn, { backgroundColor: colors.surface2 }]}
                  accessibilityLabel="Increase reps"
                >
                  <Text style={[styles.stepperBtnText, { color: colors.text }]}>+</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.timerContainer}>
                <Text style={[styles.timerCountdown, { color: colors.yellow, fontFamily: FontFamilies.mono }]}>
                  {timerSecondsRemaining}s
                </Text>
                <TouchableOpacity
                  onPress={() => setIsTimerRunning(!isTimerRunning)}
                  style={[styles.timerToggleBtn, { backgroundColor: isTimerRunning ? colors.surface2 : colors.green }]}
                >
                  <Text
                    style={{
                      color: isTimerRunning ? colors.text : colors.inkOnGreen,
                      fontFamily: FontFamilies.bodyBold,
                    }}
                  >
                    {isTimerRunning ? 'Pause' : 'Start Timer'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Form Cues */}
            <View style={styles.cuesContainer}>
              <Text style={[styles.cuesTitle, { color: colors.textMuted, fontFamily: FontFamilies.bodyBold }]}>
                FORM CUES
              </Text>
              {currentExercise.cues.map((cue, idx) => (
                <Text key={idx} style={[styles.cueText, { color: colors.text, fontFamily: FontFamilies.bodyRegular }]}>
                  • {cue}
                </Text>
              ))}
              {currentExercise.commonMistake ? (
                <Text style={[styles.mistakeText, { color: colors.yellowSoft, fontFamily: FontFamilies.bodyRegular }]}>
                  ⚠️ Avoid: {currentExercise.commonMistake}
                </Text>
              ) : null}
            </View>

            {/* Swap options */}
            <View style={styles.swapsRow}>
              <TouchableOpacity
                onPress={() => setSwapModalVisible(true)}
                style={[styles.swapBtn, { backgroundColor: colors.surface2, borderColor: colors.line }]}
              >
                <Text style={{ color: colors.text, fontFamily: FontFamilies.bodyMedium, fontSize: 12 }}>
                  ⇄ Swap Variation
                </Text>
              </TouchableOpacity>
            </View>

            {/* Set complete button */}
            <ChargeButton
              label={
                completedSets.length + 1 >= totalSets
                  ? 'Complete Exercise'
                  : `Log Set ${completedSets.length + 1}`
              }
              onPress={handleSetComplete}
              isPrimary={true}
              style={{ marginTop: Spacing.sm }}
            />
          </View>
        )}

        {/* Early finish button */}
        <View style={styles.finishEarlyContainer}>
          <HoldButton
            label="Hold to finish early"
            onComplete={() => setRpeModalVisible(true)}
            holdDurationMs={600}
          />
        </View>
      </ScrollView>

      {/* Pain Modal */}
      <Modal visible={painModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.surface, borderColor: colors.safety }]}>
            <Text style={[styles.modalTitle, { color: colors.safety, fontFamily: FontFamilies.displayBold }]}>
              Stop the set
            </Text>
            <Text style={[styles.modalBody, { color: colors.text, fontFamily: FontFamilies.bodyRegular }]}>
              {PAIN_DOCTOR_ADVICE}
            </Text>
            <Text style={[styles.modalSubBody, { color: colors.textMuted, fontFamily: FontFamilies.bodyRegular }]}>
              {SORENESS_ADVICE}
            </Text>

            <View style={styles.modalActions}>
              <ChargeButton
                label="End Workout Safely"
                onPress={() => {
                  setPainModalVisible(false);
                  handleFinalSave(3);
                }}
                isOutlined={true}
              />
              <ChargeButton
                label="I'm OK, Resume"
                onPress={() => setPainModalVisible(false)}
                isPrimary={true}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Finish / RPE Modal */}
      <Modal visible={rpeModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.surface, borderColor: colors.line }]}>
            <Text style={[styles.modalTitle, { color: colors.green, fontFamily: FontFamilies.displayBold }]}>
              Workout Complete! 🔥
            </Text>
            <Text style={[styles.modalSubtitle, { color: colors.textMuted, fontFamily: FontFamilies.bodyRegular }]}>
              Rate the overall session intensity (RPE 1–10):
            </Text>

            <View style={styles.rpeGrid}>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((r) => (
                <TouchableOpacity
                  key={`rpe-${r}`}
                  onPress={() => {
                    setRpeModalVisible(false);
                    handleFinalSave(r);
                  }}
                  style={[styles.rpeChip, { backgroundColor: colors.surface2, borderColor: colors.line }]}
                >
                  <Text style={[styles.rpeChipText, { color: colors.text, fontFamily: FontFamilies.mono }]}>
                    {r}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <ChargeButton
              label="Save Session"
              onPress={() => {
                setRpeModalVisible(false);
                handleFinalSave(5);
              }}
              isPrimary={true}
              style={{ marginTop: Spacing.md }}
            />
          </View>
        </View>
      </Modal>

      {/* Quick capture note sheet */}
      <QuickCaptureSheet
        visible={noteSheetVisible}
        onClose={() => setNoteSheetVisible(false)}
        attachedTo={{ type: 'exercise', id: currentExercise.id }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  closeBtn: {
    width: TouchTarget,
    height: TouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeIcon: {
    fontSize: 20,
    fontWeight: '700',
  },
  topInfo: {
    alignItems: 'center',
  },
  topDayTitle: {
    fontSize: TypeScale.sm,
  },
  topTimer: {
    fontSize: TypeScale.xs,
    marginTop: 2,
  },
  noteBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.pill,
  },
  sectionTabs: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
  },
  sectionTab: {
    paddingVertical: Spacing.xs,
    borderBottomWidth: 2,
  },
  sectionTabText: {
    fontSize: 11,
    letterSpacing: 0.5,
  },
  scroll: {
    padding: Spacing.md,
    paddingBottom: Spacing.xxxl,
    gap: Spacing.md,
  },
  exerciseCard: {
    borderRadius: Radius.xl,
    borderWidth: 1,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  exerciseName: {
    fontSize: TypeScale.xl,
    letterSpacing: -0.5,
  },
  exerciseTarget: {
    fontSize: TypeScale.sm,
    marginTop: 4,
  },
  painBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Radius.pill,
  },
  setsDotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  setDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1.5,
  },
  setCountText: {
    fontSize: TypeScale.xs,
    marginLeft: 6,
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.lg,
    marginVertical: Spacing.sm,
  },
  stepperBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperBtnText: {
    fontSize: 28,
    fontWeight: '300',
  },
  stepperNumContainer: {
    alignItems: 'center',
    minWidth: 80,
  },
  stepperNum: {
    fontSize: TypeScale.xxl,
  },
  timerContainer: {
    alignItems: 'center',
    gap: Spacing.sm,
    marginVertical: Spacing.sm,
  },
  timerCountdown: {
    fontSize: 54,
  },
  timerToggleBtn: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: Radius.pill,
  },
  cuesContainer: {
    gap: 4,
    paddingVertical: Spacing.xs,
  },
  cuesTitle: {
    fontSize: TypeScale.xs,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  cueText: {
    fontSize: TypeScale.sm,
    lineHeight: 20,
  },
  mistakeText: {
    fontSize: TypeScale.xs,
    marginTop: 6,
    lineHeight: 18,
  },
  swapsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  swapBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.pill,
    borderWidth: 1,
  },
  restCard: {
    borderRadius: Radius.xl,
    borderWidth: 1.5,
    padding: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  restTitle: {
    fontSize: TypeScale.lg,
    letterSpacing: 2,
  },
  restCountdown: {
    fontSize: 64,
  },
  restActionsRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.md,
  },
  restActionBtn: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: Radius.pill,
    borderWidth: 1,
  },
  finishEarlyContainer: {
    marginTop: Spacing.md,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  modalCard: {
    width: '100%',
    borderRadius: Radius.xl,
    borderWidth: 1.5,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  modalTitle: {
    fontSize: TypeScale.xl,
  },
  modalSubtitle: {
    fontSize: TypeScale.sm,
  },
  modalBody: {
    fontSize: TypeScale.sm,
    lineHeight: 22,
  },
  modalSubBody: {
    fontSize: TypeScale.xs,
    lineHeight: 18,
  },
  modalActions: {
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  rpeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
    marginVertical: Spacing.sm,
  },
  rpeChip: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rpeChipText: {
    fontSize: 16,
  },
});
