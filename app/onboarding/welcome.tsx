import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useThemeColors } from '@/src/theme';
import { FontFamilies, TypeScale } from '@/src/theme/typography';
import { Spacing, Radius } from '@/src/theme/spacing';
import { ChargeButton } from '@/src/ui/ChargeButton';

export default function WelcomeScreen() {
  const colors = useThemeColors();
  const router = useRouter();

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]}>
      <StatusBar barStyle="light-content" backgroundColor={colors.bg} />
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* App name */}
        <Text
          style={[
            styles.appName,
            { color: colors.green, fontFamily: FontFamilies.displayExtraBold },
          ]}
          accessibilityRole="header"
        >
          FAWA Winter Arc
        </Text>

        {/* Subtitle */}
        <Text
          style={[
            styles.subtitle,
            { color: colors.text, fontFamily: FontFamilies.bodyRegular },
          ]}
        >
          Your 60-day Winter Arc starts here.
        </Text>

        {/* Disclaimer card */}
        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.surface,
              borderRadius: Radius.lg,
            },
          ]}
          accessibilityRole="none"
        >
          <Text
            style={[
              styles.cardTitle,
              { color: colors.text, fontFamily: FontFamilies.bodyBold },
            ]}
          >
            Before we start
          </Text>
          <Text
            style={[
              styles.cardBody,
              { color: colors.textMuted, fontFamily: FontFamilies.bodyRegular },
            ]}
          >
            FAWA is not a medical product. If you feel sharp pain, stop
            immediately. If you have a known health condition, get clearance
            from a doctor before you begin.
          </Text>
        </View>

        {/* CTA */}
        <ChargeButton
          label="I understand — let's go"
          isPrimary
          onPress={() => router.push('/onboarding/about-you')}
          accessibilityLabel="I understand the disclaimer, let's go to onboarding"
        />

        {/* Fine print */}
        <Text
          style={[
            styles.finePrint,
            { color: colors.textMuted, fontFamily: FontFamilies.bodyRegular },
          ]}
        >
          Exercise only. No diet tracking. No login required.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xxxl,
    paddingBottom: Spacing.xxl,
    justifyContent: 'center',
    gap: Spacing.lg,
  },
  appName: {
    fontSize: TypeScale.xxl,
    lineHeight: 48,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: TypeScale.md,
    textAlign: 'center',
    marginTop: Spacing.xs,
  },
  card: {
    padding: Spacing.lg,
    marginVertical: Spacing.sm,
  },
  cardTitle: {
    fontSize: TypeScale.md,
    marginBottom: Spacing.xs,
  },
  cardBody: {
    fontSize: TypeScale.sm,
    lineHeight: 22,
  },
  finePrint: {
    fontSize: TypeScale.xs,
    textAlign: 'center',
    marginTop: Spacing.xs,
  },
});
