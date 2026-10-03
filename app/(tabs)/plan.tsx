import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useThemeColors } from '@/src/theme';
import { FontFamilies, TypeScale } from '@/src/theme/typography';
import { Spacing, Radius, TouchTarget } from '@/src/theme/spacing';
import { ChargeButton } from '@/src/ui/ChargeButton';
import { EmptyState } from '@/src/ui/EmptyState';
import { usePlanStore } from '@/src/store/plan.store';
import { useProfileStore } from '@/src/store/profile.store';
import exercisesData from '@/src/data/exercises';
import type { PlanDay, Exercise, MuscleGroup, ImpactLevel } from '@/src/types';

export default function PlanScreen() {
  const colors = useThemeColors();
  const router = useRouter();

  const planDays = usePlanStore((s) => s.planDays);
  const profile = useProfileStore((s) => s.profile);

  // Selected day preview sheet
  const [selectedDay, setSelectedDay] = useState<PlanDay | null>(null);

  // Exercise library modal
  const [libraryVisible, setLibraryVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMuscle, setSelectedMuscle] = useState<MuscleGroup | 'all'>('all');
  const [selectedImpact, setSelectedImpact] = useState<ImpactLevel | 'all'>('all');

  // Filtered exercises
  const filteredExercises = useMemo(() => {
    return exercisesData.filter((e) => {
      const matchesSearch =
        e.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.muscleGroup.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesMuscle = selectedMuscle === 'all' || e.muscleGroup === selectedMuscle;
      const matchesImpact = selectedImpact === 'all' || e.impact === selectedImpact;
      return matchesSearch && matchesMuscle && matchesImpact;
    });
  }, [searchQuery, selectedMuscle, selectedImpact]);

  const muscleGroups: Array<{ key: MuscleGroup | 'all'; label: string }> = [
    { key: 'all', label: 'All' },
    { key: 'lower_body', label: 'Legs' },
    { key: 'push', label: 'Push' },
    { key: 'pull', label: 'Pull' },
    { key: 'core', label: 'Core' },
    { key: 'cardio', label: 'Cardio' },
    { key: 'warmup', label: 'Warm-up' },
  ];

  if (planDays.length === 0) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]}>
        <EmptyState
          title="No Plan Generated Yet"
          description="Complete onboarding to get your personal 60-day Winter Arc program."
          action={
            <ChargeButton
              label="Start Onboarding"
              onPress={() => router.push('/onboarding/welcome')}
              isPrimary={true}
            />
          }
        />
      </SafeAreaView>
    );
  }

  // Helper for cell colors
  const getCellColors = (day: PlanDay) => {
    if (day.isCompleted) return { bg: colors.green, text: colors.inkOnGreen, border: colors.green };
    if (day.type === 'test') return { bg: colors.yellow, text: colors.inkOnYellow, border: colors.yellow };
    if (day.type === 'rest') return { bg: colors.surface2, text: colors.textMuted, border: colors.line };
    if (day.type === 'cardio') return { bg: colors.surface2, text: colors.green, border: colors.line };
    if (day.type === 'deload') return { bg: colors.surface2, text: colors.textMuted, border: colors.line };
    if (day.type === 'taper') return { bg: colors.surface2, text: colors.yellow, border: colors.yellowSoft };
    return { bg: colors.surface, text: colors.text, border: colors.line };
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]}>
      <StatusBar barStyle="light-content" backgroundColor={colors.bg} />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.title, { color: colors.text, fontFamily: FontFamilies.displayBold }]}>
            60-Day Plan
          </Text>
          <Text style={[styles.subtitle, { color: colors.textMuted, fontFamily: FontFamilies.bodyRegular }]}>
            Level: {profile?.level || 'Beginner'} · Tap any day to preview
          </Text>
        </View>

        <TouchableOpacity
          onPress={() => setLibraryVisible(true)}
          style={[styles.libraryBtn, { backgroundColor: colors.surface2, borderColor: colors.green }]}
          accessibilityLabel="Exercise Library"
        >
          <Text style={{ color: colors.green, fontFamily: FontFamilies.bodyBold, fontSize: 12 }}>
            Library
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Phase legend */}
        <View style={styles.legendRow}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: colors.surface, borderColor: colors.line }]} />
            <Text style={[styles.legendText, { color: colors.textMuted }]}>Training</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: colors.yellow }]} />
            <Text style={[styles.legendText, { color: colors.textMuted }]}>Test Day</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: colors.surface2 }]} />
            <Text style={[styles.legendText, { color: colors.textMuted }]}>Rest / Cardio</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: colors.green }]} />
            <Text style={[styles.legendText, { color: colors.textMuted }]}>Done</Text>
          </View>
        </View>

        {/* 60-day Grid (7 columns like a calendar) */}
        <View style={styles.grid}>
          {planDays.map((day) => {
            const cellColors = getCellColors(day);
            return (
              <TouchableOpacity
                key={`day-${day.dayNumber}`}
                onPress={() => setSelectedDay(day)}
                style={[
                  styles.dayCell,
                  {
                    backgroundColor: cellColors.bg,
                    borderColor: cellColors.border,
                  },
                ]}
                accessibilityLabel={`Day ${day.dayNumber}, ${day.sessionLabel}`}
              >
                <Text
                  style={[
                    styles.dayNum,
                    {
                      color: cellColors.text,
                      fontFamily: FontFamilies.mono,
                    },
                  ]}
                >
                  {day.dayNumber}
                </Text>
                <Text
                  style={[
                    styles.dayTypeSub,
                    {
                      color: cellColors.text,
                      fontFamily: FontFamilies.bodyRegular,
                    },
                  ]}
                  numberOfLines={1}
                >
                  {day.type === 'test' ? 'TEST' : day.type === 'rest' ? 'REST' : day.sessionLabel.slice(0, 4)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      {/* Selected Day Preview Modal */}
      {selectedDay && (
        <Modal visible={!!selectedDay} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={[styles.previewCard, { backgroundColor: colors.surface, borderColor: colors.line }]}>
              <View style={styles.previewTop}>
                <View>
                  <Text style={[styles.previewDayTitle, { color: colors.green, fontFamily: FontFamilies.displayBold }]}>
                    Day {selectedDay.dayNumber}
                  </Text>
                  <Text style={[styles.previewSessionTitle, { color: colors.text, fontFamily: FontFamilies.bodyBold }]}>
                    {selectedDay.sessionLabel}
                  </Text>
                  <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 2 }}>
                    Phase: {selectedDay.phase} · {selectedDay.date}
                  </Text>
                </View>

                <TouchableOpacity
                  onPress={() => setSelectedDay(null)}
                  style={styles.previewCloseBtn}
                >
                  <Text style={{ color: colors.textMuted, fontSize: 18 }}>✕</Text>
                </TouchableOpacity>
              </View>

              {/* Exercises in this day */}
              <View style={styles.exercisesList}>
                <Text style={{ color: colors.textMuted, fontFamily: FontFamilies.bodyBold, fontSize: 12 }}>
                  EXERCISES ({selectedDay.exercises.length})
                </Text>
                {selectedDay.exercises.slice(0, 5).map((slot, i) => {
                  const ex = exercisesData.find((e) => e.id === slot.exerciseId);
                  return (
                    <Text key={i} style={{ color: colors.text, fontSize: 13, paddingVertical: 2 }}>
                      • {ex?.name || slot.exerciseId} ({slot.section})
                    </Text>
                  );
                })}
                {selectedDay.exercises.length > 5 && (
                  <Text style={{ color: colors.textMuted, fontSize: 12 }}>
                    +{selectedDay.exercises.length - 5} more exercises
                  </Text>
                )}
              </View>

              <View style={styles.previewActions}>
                <ChargeButton
                  label={selectedDay.isCompleted ? 'View Workout' : 'Start Workout'}
                  onPress={() => {
                    const id = selectedDay.id;
                    const isTest = selectedDay.type === 'test';
                    setSelectedDay(null);
                    if (isTest) {
                      router.push(`/test/${selectedDay.dayNumber}` as any);
                    } else {
                      router.push(`/player/${id}` as any);
                    }
                  }}
                  isPrimary={true}
                />
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* Exercise Library Modal */}
      <Modal visible={libraryVisible} animationType="slide">
        <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]}>
          <View style={styles.libraryHeader}>
            <TouchableOpacity onPress={() => setLibraryVisible(false)}>
              <Text style={{ color: colors.text, fontSize: 16 }}>← Back</Text>
            </TouchableOpacity>
            <Text style={[styles.libraryTitle, { color: colors.text, fontFamily: FontFamilies.displayBold }]}>
              Exercise Library
            </Text>
            <View style={{ width: 40 }} />
          </View>

          {/* Search box */}
          <View style={styles.searchContainer}>
            <TextInput
              style={[
                styles.searchInput,
                { backgroundColor: colors.surface2, color: colors.text, borderColor: colors.line },
              ]}
              placeholder="Search exercise or muscle group…"
              placeholderTextColor={colors.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          {/* Muscle group chips */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtersScroll}>
            {muscleGroups.map((mg) => (
              <TouchableOpacity
                key={mg.key}
                onPress={() => setSelectedMuscle(mg.key)}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: selectedMuscle === mg.key ? colors.green : colors.surface2,
                    borderColor: selectedMuscle === mg.key ? colors.green : colors.line,
                  },
                ]}
              >
                <Text
                  style={{
                    color: selectedMuscle === mg.key ? colors.inkOnGreen : colors.textMuted,
                    fontFamily: FontFamilies.bodyBold,
                    fontSize: 12,
                  }}
                >
                  {mg.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Exercise list */}
          <ScrollView contentContainerStyle={styles.libraryList}>
            {filteredExercises.map((ex) => (
              <View
                key={ex.id}
                style={[styles.libraryItem, { backgroundColor: colors.surface, borderColor: colors.line }]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[styles.libExName, { color: colors.text, fontFamily: FontFamilies.bodyBold }]}>
                    {ex.name}
                  </Text>
                  <Text style={{ color: colors.green, fontSize: 12, textTransform: 'capitalize' }}>
                    {ex.muscleGroup.replace('_', ' ')} · Impact: {ex.impact} · Tier {ex.equipmentTier}
                  </Text>
                  <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 4 }}>
                    {ex.cues[0]}
                  </Text>
                </View>
              </View>
            ))}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  title: {
    fontSize: TypeScale.xl,
  },
  subtitle: {
    fontSize: TypeScale.xs,
    marginTop: 2,
  },
  libraryBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.pill,
    borderWidth: 1,
  },
  scroll: {
    padding: Spacing.md,
    paddingBottom: Spacing.xxxl,
    gap: Spacing.md,
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xs,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1,
  },
  legendText: {
    fontSize: 10,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'flex-start',
  },
  dayCell: {
    width: '12.5%',
    aspectRatio: 1,
    borderRadius: Radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 2,
  },
  dayNum: {
    fontSize: 13,
    fontWeight: '700',
  },
  dayTypeSub: {
    fontSize: 8,
    textTransform: 'uppercase',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end',
  },
  previewCard: {
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    borderTopWidth: 1,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  previewTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  previewDayTitle: {
    fontSize: TypeScale.md,
  },
  previewSessionTitle: {
    fontSize: TypeScale.lg,
  },
  previewCloseBtn: {
    padding: Spacing.xs,
  },
  exercisesList: {
    gap: 4,
  },
  previewActions: {
    marginTop: Spacing.sm,
  },
  libraryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  libraryTitle: {
    fontSize: TypeScale.lg,
  },
  searchContainer: {
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.xs,
  },
  searchInput: {
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    fontSize: 14,
  },
  filtersScroll: {
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
    maxHeight: 40,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.pill,
    borderWidth: 1,
    marginRight: 6,
    height: 32,
    justifyContent: 'center',
  },
  libraryList: {
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  libraryItem: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing.md,
  },
  libExName: {
    fontSize: 15,
    marginBottom: 2,
  },
});
