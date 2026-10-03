import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  StatusBar,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useThemeColors } from '@/src/theme';
import { FontFamilies, TypeScale } from '@/src/theme/typography';
import { Spacing, Radius, TouchTarget } from '@/src/theme/spacing';
import { ChargeButton } from '@/src/ui/ChargeButton';
import { calculateBMI, getBMIBand } from '@/src/engine/bmi';
import type { BMIBand } from '@/src/types';

type SexOption = 'male' | 'female' | 'prefer_not_to_say';

const SEX_OPTIONS: { value: SexOption; label: string }[] = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'prefer_not_to_say', label: 'Prefer not to say' },
];

const BMI_BAND_LABELS: Record<BMIBand, string> = {
  underweight: 'Underweight',
  normal: 'Healthy weight',
  overweight: 'Overweight',
  obese: 'Obese',
};

function ScreenHeader({ onBack }: { onBack: () => void }) {
  const colors = useThemeColors();
  return (
    <View style={styles.header}>
      <TouchableOpacity
        onPress={onBack}
        style={styles.backBtn}
        accessibilityLabel="Go back"
        accessibilityRole="button"
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      >
        <Text style={[styles.backArrow, { color: colors.text }]}>←</Text>
      </TouchableOpacity>
      <Text style={[styles.headerTitle, { color: colors.text, fontFamily: FontFamilies.bodyBold }]}>
        About you
      </Text>
      <Text style={[styles.stepIndicator, { color: colors.textMuted, fontFamily: FontFamilies.bodyRegular }]}>
        1 of 5
      </Text>
    </View>
  );
}

interface FieldProps {
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}

function Field({ label, hint, error, children }: FieldProps) {
  const colors = useThemeColors();
  return (
    <View style={styles.fieldGroup}>
      <Text style={[styles.fieldLabel, { color: colors.text, fontFamily: FontFamilies.bodyMedium }]}>
        {label}
      </Text>
      {hint && (
        <Text style={[styles.fieldHint, { color: colors.textMuted, fontFamily: FontFamilies.bodyRegular }]}>
          {hint}
        </Text>
      )}
      {children}
      {error ? (
        <Text style={[styles.errorText, { color: colors.safety, fontFamily: FontFamilies.bodyRegular }]}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

export default function AboutYouScreen() {
  const colors = useThemeColors();
  const router = useRouter();

  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [sex, setSex] = useState<SexOption | null>(null);
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [waist, setWaist] = useState('');

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Computed BMI
  const ageNum = parseInt(age, 10);
  const heightNum = parseFloat(height);
  const weightNum = parseFloat(weight);
  const bmiValue =
    !isNaN(ageNum) &&
    !isNaN(heightNum) &&
    !isNaN(weightNum) &&
    heightNum > 0 &&
    weightNum > 0
      ? calculateBMI(weightNum, heightNum)
      : null;
  const bmiBand =
    bmiValue !== null && !isNaN(ageNum)
      ? getBMIBand(bmiValue, ageNum)
      : null;
  const showBMI = bmiValue !== null && ageNum >= 18;

  const validate = useCallback((): boolean => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = 'Name is required.';
    const a = parseInt(age, 10);
    if (isNaN(a) || a < 10 || a > 100) e.age = 'Enter an age between 10 and 100.';
    if (!sex) e.sex = 'Please select a sex.';
    const h = parseFloat(height);
    if (isNaN(h) || h < 100 || h > 250) e.height = 'Enter a height between 100–250 cm.';
    const w = parseFloat(weight);
    if (isNaN(w) || w < 30 || w > 300) e.weight = 'Enter a weight between 30–300 kg.';
    const wc = parseFloat(waist);
    if (isNaN(wc) || wc < 50 || wc > 200) e.waist = 'Enter a waist between 50–200 cm.';
    setErrors(e);
    return Object.keys(e).length === 0;
  }, [name, age, sex, height, weight, waist]);

  const handleNext = useCallback(async () => {
    if (!validate()) return;
    const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
    await AsyncStorage.setItem(
      '@fawa_temp_about',
      JSON.stringify({ name: name.trim(), age: parseInt(age, 10), sex, heightCm: parseFloat(height), weightKg: parseFloat(weight), waistCm: parseFloat(waist) }),
    );
    router.push('/onboarding/health-flags');
  }, [validate, name, age, sex, height, weight, waist, router]);

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
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]}>
      <StatusBar barStyle="light-content" backgroundColor={colors.bg} />
      <ScreenHeader onBack={() => router.back()} />
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Name */}
        <Field label="Name" error={errors.name}>
          <TextInput
            style={inputStyle}
            placeholder="What should we call you?"
            placeholderTextColor={colors.textMuted}
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
            returnKeyType="next"
            accessibilityLabel="Your name"
          />
        </Field>

        {/* Age */}
        <Field label="Age" error={errors.age}>
          <TextInput
            style={inputStyle}
            placeholder="e.g. 22"
            placeholderTextColor={colors.textMuted}
            value={age}
            onChangeText={setAge}
            keyboardType="number-pad"
            returnKeyType="next"
            accessibilityLabel="Your age"
          />
        </Field>

        {/* Sex */}
        <Field label="Sex" error={errors.sex}>
          <View style={styles.chipRow}>
            {SEX_OPTIONS.map((opt) => {
              const selected = sex === opt.value;
              return (
                <TouchableOpacity
                  key={opt.value}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: selected ? colors.green : colors.surface2,
                      borderColor: selected ? colors.green : colors.line,
                      minHeight: TouchTarget,
                    },
                  ]}
                  onPress={() => setSex(opt.value)}
                  accessibilityRole="radio"
                  accessibilityLabel={opt.label}
                  accessibilityState={{ selected }}
                >
                  <Text
                    style={[
                      styles.chipLabel,
                      {
                        color: selected ? colors.inkOnGreen : colors.text,
                        fontFamily: FontFamilies.bodyMedium,
                      },
                    ]}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </Field>

        {/* Height */}
        <Field label="Height (cm)" error={errors.height}>
          <TextInput
            style={inputStyle}
            placeholder="e.g. 170"
            placeholderTextColor={colors.textMuted}
            value={height}
            onChangeText={setHeight}
            keyboardType="decimal-pad"
            returnKeyType="next"
            accessibilityLabel="Your height in centimetres"
          />
        </Field>

        {/* Weight */}
        <Field label="Weight (kg)" error={errors.weight}>
          <TextInput
            style={inputStyle}
            placeholder="e.g. 70"
            placeholderTextColor={colors.textMuted}
            value={weight}
            onChangeText={setWeight}
            keyboardType="decimal-pad"
            returnKeyType="next"
            accessibilityLabel="Your weight in kilograms"
          />
        </Field>

        {/* Waist */}
        <Field label="Waist (cm)" hint="Measure at the navel, relaxed" error={errors.waist}>
          <TextInput
            style={inputStyle}
            placeholder="e.g. 80"
            placeholderTextColor={colors.textMuted}
            value={waist}
            onChangeText={setWaist}
            keyboardType="decimal-pad"
            returnKeyType="done"
            accessibilityLabel="Your waist measurement in centimetres"
          />
        </Field>

        {/* Live BMI card */}
        {showBMI && bmiValue !== null && (
          <View
            style={[
              styles.bmiCard,
              {
                backgroundColor: colors.green,
                borderRadius: Radius.md,
              },
            ]}
            accessibilityLabel={`Your BMI is ${bmiValue}, ${bmiBand ? BMI_BAND_LABELS[bmiBand] : ''}`}
          >
            <Text style={[styles.bmiValue, { color: colors.inkOnGreen, fontFamily: FontFamilies.displayBold }]}>
              BMI {bmiValue}
            </Text>
            {bmiBand && (
              <Text style={[styles.bmiBand, { color: colors.inkOnGreen, fontFamily: FontFamilies.bodyRegular }]}>
                {BMI_BAND_LABELS[bmiBand]}
              </Text>
            )}
          </View>
        )}

        <ChargeButton
          label="Next"
          isPrimary
          onPress={handleNext}
          accessibilityLabel="Continue to health check"
          style={{ marginTop: Spacing.sm }}
        />
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
    paddingBottom: Spacing.xxl,
    gap: Spacing.md,
  },
  fieldGroup: {
    gap: Spacing.xxs,
  },
  fieldLabel: {
    fontSize: TypeScale.sm,
  },
  fieldHint: {
    fontSize: TypeScale.xs,
  },
  input: {
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    height: TouchTarget,
    fontSize: TypeScale.md,
  },
  errorText: {
    fontSize: TypeScale.xs,
    marginTop: 2,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  chip: {
    flex: 1,
    minWidth: 80,
    borderWidth: 1.5,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipLabel: {
    fontSize: TypeScale.sm,
    textAlign: 'center',
  },
  bmiCard: {
    padding: Spacing.md,
    alignItems: 'center',
    gap: Spacing.xxs,
  },
  bmiValue: {
    fontSize: TypeScale.xl,
  },
  bmiBand: {
    fontSize: TypeScale.sm,
  },
});
