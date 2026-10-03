import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useThemeColors } from '@/src/theme';
import { FontFamilies, TypeScale } from '@/src/theme/typography';
import { Spacing, Radius, TouchTarget } from '@/src/theme/spacing';
import { ChargeButton } from '@/src/ui/ChargeButton';
import { determineLevelFromTest } from '@/src/engine/level';
import type { Level } from '@/src/types';

type Mode = 'pick' | 'test' | 'know' | 'beginner';

function parseMmSs(str: string): number | null {
  const match = str.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const mins = parseInt(match[1], 10);
  const secs = parseInt(match[2], 10);
  if (secs >= 60) return null;
  return mins * 60 + secs;
}

interface TestForm {
  pushUps: string;
  plankSecs: string;
  twoKmTime: string;
  canRun20: boolean | null;
}

function TestFields({
  form,
  onChange,
}: {
  form: TestForm;
  onChange: (f: TestForm) => void;
}) {
  const colors = useThemeColors();
  const inputStyle = [
    styles.input,
    {
      backgroundColor: colors.surface2,
      color: colors.text,
      fontFamily: FontFamilies.bodyRegular,
      borderColor: colors.line,
    },
  ];

  return (
    <View style={{ gap: Spacing.md }}>
      <View style={styles.fieldGroup}>
        <Text style={[styles.fieldLabel, { color: colors.text, fontFamily: FontFamilies.bodyMedium }]}>
          Max push-ups (reps)
        </Text>
        <TextInput
          style={inputStyle}
          placeholder="e.g. 20"
          placeholderTextColor={colors.textMuted}
          value={form.pushUps}
          onChangeText={(v) => onChange({ ...form, pushUps: v })}
          keyboardType="number-pad"
          accessibilityLabel="Maximum push-ups you can do"
        />
      </View>

      <View style={styles.fieldGroup}>
        <Text style={[styles.fieldLabel, { color: colors.text, fontFamily: FontFamilies.bodyMedium }]}>
          Plank hold (seconds)
        </Text>
        <TextInput
          style={inputStyle}
          placeholder="e.g. 60"
          placeholderTextColor={colors.textMuted}
          value={form.plankSecs}
          onChangeText={(v) => onChange({ ...form, plankSecs: v })}
          keyboardType="number-pad"
          accessibilityLabel="Plank hold time in seconds"
        />
      </View>

      <View style={styles.fieldGroup}>
        <Text style={[styles.fieldLabel, { color: colors.text, fontFamily: FontFamilies.bodyMedium }]}>
          2 km time (MM:SS)
        </Text>
        <TextInput
          style={inputStyle}
          placeholder="e.g. 11:30"
          placeholderTextColor={colors.textMuted}
          value={form.twoKmTime}
          onChangeText={(v) => onChange({ ...form, twoKmTime: v })}
          keyboardType="default"
          accessibilityLabel="2 kilometre run time in minutes and seconds"
        />
      </View>

      <View style={styles.fieldGroup}>
        <Text style={[styles.fieldLabel, { color: colors.text, fontFamily: FontFamilies.bodyMedium }]}>
          Can you run 20 minutes continuously?
        </Text>
        <View style={styles.toggleRow}>
          {([true, false] as const).map((val) => {
            const selected = form.canRun20 === val;
            return (
              <TouchableOpacity
                key={String(val)}
                style={[
                  styles.toggleBtn,
                  {
                    backgroundColor: selected ? colors.green : colors.surface2,
                    borderColor: selected ? colors.green : colors.line,
                    minHeight: TouchTarget,
                  },
                ]}
                onPress={() => onChange({ ...form, canRun20: val })}
                accessibilityRole="radio"
                accessibilityLabel={val ? 'Yes' : 'No'}
                accessibilityState={{ selected }}
              >
                <Text
                  style={[
                    styles.toggleLabel,
                    { color: selected ? colors.inkOnGreen : colors.text, fontFamily: FontFamilies.bodyMedium },
                  ]}
                >
                  {val ? 'Yes' : 'No'}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </View>
  );
}

export default function PlacementTestScreen() {
  const colors = useThemeColors();
  const router = useRouter();

  const [mode, setMode] = useState<Mode>('pick');
  const [age, setAge] = useState(25);
  const [form, setForm] = useState<TestForm>({ pushUps: '', plankSecs: '', twoKmTime: '', canRun20: null });
  const [result, setResult] = useState<Level | null>(null);

  useEffect(() => {
    AsyncStorage.getItem('@fawa_temp_about').then((raw) => {
      if (raw) setAge(JSON.parse(raw).age ?? 25);
    });
  }, []);

  const classifyFromForm = useCallback((f: TestForm): Level => {
    if (age < 16) return 'beginner';
    return determineLevelFromTest({
      twoKmTimeSecs: parseMmSs(f.twoKmTime),
      maxPushUps: f.pushUps ? parseInt(f.pushUps, 10) : null,
      plankSeconds: f.plankSecs ? parseInt(f.plankSecs, 10) : null,
      canRun20Min: f.canRun20,
      age,
    });
  }, [age]);

  const handleFormChange = useCallback((f: TestForm) => {
    setForm(f);
    if (mode === 'know') {
      setResult(classifyFromForm(f));
    }
  }, [mode, classifyFromForm]);

  const handleSubmitTest = useCallback(() => {
    setResult(classifyFromForm(form));
  }, [form, classifyFromForm]);

  const handleConfirm = useCallback(async () => {
    const level = result ?? 'beginner';
    await AsyncStorage.setItem('@fawa_temp_level', level);
    router.push('/onboarding/your-day');
  }, [result, router]);

  const resultLabel = result === 'intermediate' ? 'Intermediate' : 'Beginner';
  const resultColor = result === 'intermediate' ? colors.yellow : colors.green;
  const resultInk = result === 'intermediate' ? colors.inkOnYellow : colors.inkOnGreen;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]}>
      <StatusBar barStyle="light-content" backgroundColor={colors.bg} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          accessibilityLabel="Go back"
          accessibilityRole="button"
        >
          <Text style={[styles.backArrow, { color: colors.text }]}>←</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text, fontFamily: FontFamilies.bodyBold }]}>
          How fit are you?
        </Text>
        <Text style={[styles.stepIndicator, { color: colors.textMuted, fontFamily: FontFamilies.bodyRegular }]}>
          4 of 5
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {age < 16 && (
          <View
            style={[styles.infoCard, { backgroundColor: colors.surface, borderRadius: Radius.lg }]}
            accessibilityLiveRegion="polite"
          >
            <Text style={[styles.infoText, { color: colors.textMuted, fontFamily: FontFamilies.bodyRegular }]}>
              You're under 16, so we'll start you on the Beginner programme — the safest way to build a strong foundation.
            </Text>
          </View>
        )}

        {/* Option cards */}
        {mode === 'pick' && age >= 16 && (
          <>
            {[
              { id: 'test' as Mode, label: 'Do a quick test now', desc: 'We'll classify you based on your numbers.' },
              { id: 'know' as Mode, label: 'I know my numbers', desc: 'Enter your stats and see your level instantly.' },
              { id: 'beginner' as Mode, label: 'Start as Beginner (safest choice)', desc: 'Skip the test and begin at day 1 foundation level.' },
            ].map((opt) => (
              <TouchableOpacity
                key={opt.id}
                style={[
                  styles.optCard,
                  {
                    backgroundColor: colors.surface,
                    borderRadius: Radius.lg,
                    borderColor: colors.line,
                    borderWidth: 1,
                  },
                ]}
                onPress={() => {
                  if (opt.id === 'beginner') {
                    setResult('beginner');
                    setMode('beginner');
                  } else {
                    setMode(opt.id);
                  }
                }}
                accessibilityRole="button"
                accessibilityLabel={opt.label}
              >
                <Text style={[styles.optLabel, { color: colors.text, fontFamily: FontFamilies.bodyBold }]}>
                  {opt.label}
                </Text>
                <Text style={[styles.optDesc, { color: colors.textMuted, fontFamily: FontFamilies.bodyRegular }]}>
                  {opt.desc}
                </Text>
              </TouchableOpacity>
            ))}
          </>
        )}

        {/* Test form */}
        {(mode === 'test' || mode === 'know') && (
          <>
            <TestFields form={form} onChange={handleFormChange} />
            {mode === 'test' && !result && (
              <ChargeButton
                label="Classify me"
                onPress={handleSubmitTest}
                accessibilityLabel="Submit test results to determine level"
              />
            )}
          </>
        )}

        {/* Result card */}
        {result !== null && (
          <View
            style={[styles.resultCard, { backgroundColor: resultColor, borderRadius: Radius.lg }]}
            accessibilityLiveRegion="polite"
            accessibilityLabel={`Your level: ${resultLabel}`}
          >
            <Text style={[styles.resultLabel, { color: resultInk, fontFamily: FontFamilies.displayBold }]}>
              {resultLabel}
            </Text>
            <Text style={[styles.resultDesc, { color: resultInk, fontFamily: FontFamilies.bodyRegular }]}>
              {result === 'intermediate'
                ? 'You're ready for the intermediate track. Harder sessions, bigger gains.'
                : 'The safest, most effective way to start. Build your base first.'}
            </Text>
          </View>
        )}

        {(result !== null || age < 16) && (
          <ChargeButton
            label="Confirm"
            isPrimary
            onPress={handleConfirm}
            accessibilityLabel="Confirm level and continue"
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  backBtn: {
    minHeight: TouchTarget,
    minWidth: TouchTarget,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  backArrow: { fontSize: 24 },
  headerTitle: {
    flex: 1,
    fontSize: TypeScale.md,
    textAlign: 'center',
  },
  stepIndicator: {
    fontSize: TypeScale.xs,
    minWidth: 40,
    textAlign: 'right',
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xxl,
    gap: Spacing.md,
  },
  infoCard: {
    padding: Spacing.md,
  },
  infoText: {
    fontSize: TypeScale.sm,
    lineHeight: 20,
  },
  optCard: {
    padding: Spacing.md,
    gap: Spacing.xxs,
    minHeight: TouchTarget,
  },
  optLabel: {
    fontSize: TypeScale.md,
  },
  optDesc: {
    fontSize: TypeScale.sm,
  },
  fieldGroup: {
    gap: Spacing.xxs,
  },
  fieldLabel: {
    fontSize: TypeScale.sm,
  },
  input: {
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    height: TouchTarget,
    fontSize: TypeScale.md,
  },
  toggleRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  toggleBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleLabel: {
    fontSize: TypeScale.sm,
  },
  resultCard: {
    padding: Spacing.lg,
    gap: Spacing.xs,
    alignItems: 'center',
  },
  resultLabel: {
    fontSize: TypeScale.xl,
  },
  resultDesc: {
    fontSize: TypeScale.sm,
    textAlign: 'center',
    lineHeight: 20,
  },
});
