import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
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
import { calculateBMI } from '@/src/engine/bmi';

interface AboutData {
  weightKg: number;
  heightCm: number;
  age: number;
}

export default function HealthFlagsScreen() {
  const colors = useThemeColors();
  const router = useRouter();

  const [hasCondition, setHasCondition] = useState(false);
  const [clearanceAcknowledged, setClearanceAcknowledged] = useState(false);
  const [bmi, setBmi] = useState<number | null>(null);
  const [age, setAge] = useState<number>(25);

  useEffect(() => {
    AsyncStorage.getItem('@fawa_temp_about').then((raw) => {
      if (raw) {
        const data = JSON.parse(raw) as AboutData;
        setBmi(calculateBMI(data.weightKg, data.heightCm));
        setAge(data.age);
      }
    });
  }, []);

  const needsClearance = hasCondition || (bmi !== null && bmi >= 30 && age >= 18);
  const canProceed = !needsClearance || clearanceAcknowledged;

  const handleNext = useCallback(async () => {
    if (!canProceed) return;
    await AsyncStorage.setItem(
      '@fawa_temp_health',
      JSON.stringify({ hasCondition, clearanceAcknowledged }),
    );
    router.push('/onboarding/equipment');
  }, [canProceed, hasCondition, clearanceAcknowledged, router]);

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
          Health check
        </Text>
        <Text style={[styles.stepIndicator, { color: colors.textMuted, fontFamily: FontFamilies.bodyRegular }]}>
          2 of 5
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Condition checkbox row */}
        <TouchableOpacity
          style={[
            styles.checkRow,
            {
              backgroundColor: colors.surface,
              borderRadius: Radius.lg,
              borderColor: hasCondition ? colors.green : colors.line,
              borderWidth: 1.5,
            },
          ]}
          onPress={() => {
            setHasCondition((v) => !v);
            setClearanceAcknowledged(false);
          }}
          accessibilityRole="checkbox"
          accessibilityLabel="I have a heart or joint condition, or I'm unsure"
          accessibilityState={{ checked: hasCondition }}
        >
          <View style={[
            styles.checkbox,
            {
              backgroundColor: hasCondition ? colors.green : 'transparent',
              borderColor: hasCondition ? colors.green : colors.textMuted,
              borderWidth: 2,
              borderRadius: Radius.sm,
            },
          ]}>
            {hasCondition && (
              <Text style={{ color: colors.inkOnGreen, fontSize: 14, fontFamily: FontFamilies.bodyBold }}>
                ✓
              </Text>
            )}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.checkLabel, { color: colors.text, fontFamily: FontFamilies.bodyBold }]}>
              I have a heart or joint condition, or I'm unsure
            </Text>
            <Text style={[styles.checkNote, { color: colors.textMuted, fontFamily: FontFamilies.bodyRegular }]}>
              We'll keep things safe.
            </Text>
          </View>
        </TouchableOpacity>

        {/* Medical clearance warning card */}
        {needsClearance && (
          <View
            style={[
              styles.warningCard,
              {
                backgroundColor: colors.yellow,
                borderRadius: Radius.lg,
              },
            ]}
            accessibilityLiveRegion="polite"
            accessibilityLabel="Medical clearance required"
          >
            <Text style={[styles.warningTitle, { color: colors.inkOnYellow, fontFamily: FontFamilies.bodyBold }]}>
              ⚠ Medical clearance required
            </Text>
            <Text style={[styles.warningBody, { color: colors.inkOnYellow, fontFamily: FontFamilies.bodyRegular }]}>
              {bmi !== null && bmi >= 30
                ? 'Your BMI indicates higher cardiovascular risk. '
                : ''}
              Before starting any exercise programme, please consult your doctor or a qualified health professional. You take full responsibility for your health during this programme.
            </Text>

            {!clearanceAcknowledged ? (
              <ChargeButton
                label="I understand and will consult a doctor"
                isOutlined
                onPress={() => setClearanceAcknowledged(true)}
                accessibilityLabel="I understand and will consult a doctor before starting"
              />
            ) : (
              <View style={[styles.acknowledgedBadge, { backgroundColor: colors.greenDeep, borderRadius: Radius.pill }]}>
                <Text style={[styles.acknowledgedText, { color: colors.inkOnGreen, fontFamily: FontFamilies.bodyBold }]}>
                  ✓ Acknowledged
                </Text>
              </View>
            )}
          </View>
        )}

        <ChargeButton
          label="Next"
          isPrimary
          onPress={handleNext}
          disabled={!canProceed}
          accessibilityLabel="Continue to equipment selection"
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
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xxl,
    gap: Spacing.md,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    gap: Spacing.md,
    minHeight: TouchTarget,
  },
  checkbox: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkLabel: {
    fontSize: TypeScale.md,
    marginBottom: Spacing.xxs,
  },
  checkNote: {
    fontSize: TypeScale.sm,
  },
  warningCard: {
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  warningTitle: {
    fontSize: TypeScale.md,
  },
  warningBody: {
    fontSize: TypeScale.sm,
    lineHeight: 20,
  },
  acknowledgedBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  acknowledgedText: {
    fontSize: TypeScale.sm,
  },
});
