import React, { useState, useCallback } from 'react';
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
import type { EquipmentTier } from '@/src/types';

interface EquipmentOption {
  tier: EquipmentTier;
  title: string;
  detail: string;
}

const OPTIONS: EquipmentOption[] = [
  {
    tier: 0,
    title: 'Nothing (or home things)',
    detail: 'Chair, table, wall, stairs, backpack with books',
  },
  {
    tier: 1,
    title: 'Basic gym equipment',
    detail: 'Pull-up bar, resistance band, dumbbells, skipping rope',
  },
];

export default function EquipmentScreen() {
  const colors = useThemeColors();
  const router = useRouter();

  // Tier 0 is selected by default
  const [selected, setSelected] = useState<Set<EquipmentTier>>(new Set([0]));

  const toggle = useCallback((tier: EquipmentTier) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(tier)) {
        next.delete(tier);
      } else {
        next.add(tier);
      }
      return next;
    });
  }, []);

  const handleNext = useCallback(async () => {
    const tiers = Array.from(selected) as EquipmentTier[];
    // Always include at least tier 0 for safety
    if (!tiers.includes(0)) tiers.push(0);
    await AsyncStorage.setItem('@fawa_temp_equipment', JSON.stringify(tiers));
    router.push('/onboarding/placement-test');
  }, [selected, router]);

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
          What do you have?
        </Text>
        <Text style={[styles.stepIndicator, { color: colors.textMuted, fontFamily: FontFamilies.bodyRegular }]}>
          3 of 5
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={[styles.subtitle, { color: colors.textMuted, fontFamily: FontFamilies.bodyRegular }]}>
          Select all that apply. We'll build your plan around what you have.
        </Text>

        {OPTIONS.map((opt) => {
          const isSelected = selected.has(opt.tier);
          return (
            <TouchableOpacity
              key={opt.tier}
              style={[
                styles.card,
                {
                  backgroundColor: colors.surface,
                  borderRadius: Radius.lg,
                  borderColor: isSelected ? colors.green : colors.line,
                  borderWidth: 1.5,
                },
              ]}
              onPress={() => toggle(opt.tier)}
              accessibilityRole="checkbox"
              accessibilityLabel={`${opt.title}: ${opt.detail}`}
              accessibilityState={{ checked: isSelected }}
            >
              {/* Checkbox */}
              <View
                style={[
                  styles.checkbox,
                  {
                    backgroundColor: isSelected ? colors.green : 'transparent',
                    borderColor: isSelected ? colors.green : colors.textMuted,
                    borderRadius: Radius.sm,
                    borderWidth: 2,
                  },
                ]}
              >
                {isSelected && (
                  <Text style={{ color: colors.inkOnGreen, fontSize: 14, fontFamily: FontFamilies.bodyBold }}>
                    ✓
                  </Text>
                )}
              </View>

              <View style={{ flex: 1, gap: Spacing.xxs }}>
                <Text style={[styles.cardTitle, { color: colors.text, fontFamily: FontFamilies.bodyBold }]}>
                  Tier {opt.tier}: {opt.title}
                </Text>
                <Text style={[styles.cardDetail, { color: colors.textMuted, fontFamily: FontFamilies.bodyRegular }]}>
                  {opt.detail}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}

        <ChargeButton
          label="Next"
          isPrimary
          onPress={handleNext}
          accessibilityLabel="Continue to placement test"
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
  subtitle: {
    fontSize: TypeScale.sm,
    lineHeight: 20,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: Spacing.md,
    gap: Spacing.md,
    minHeight: TouchTarget,
  },
  checkbox: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  cardTitle: {
    fontSize: TypeScale.md,
  },
  cardDetail: {
    fontSize: TypeScale.sm,
    lineHeight: 20,
  },
});
