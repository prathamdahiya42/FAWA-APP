import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useThemeColors } from '@/src/theme';
import { FontFamilies, TypeScale } from '@/src/theme/typography';
import { Spacing } from '@/src/theme/spacing';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  const colors = useThemeColors();

  return (
    <View style={styles.container}>
      {icon && <View style={styles.iconContainer}>{icon}</View>}
      <Text style={[styles.title, { color: colors.text, fontFamily: FontFamilies.displayBold }]}>
        {title}
      </Text>
      <Text style={[styles.description, { color: colors.textMuted, fontFamily: FontFamilies.bodyRegular }]}>
        {description}
      </Text>
      {action && <View style={styles.actionContainer}>{action}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
    marginTop: Spacing.lg,
  },
  iconContainer: {
    marginBottom: Spacing.md,
  },
  title: {
    fontSize: TypeScale.lg,
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  description: {
    fontSize: TypeScale.sm,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: Spacing.md,
    maxWidth: 280,
  },
  actionContainer: {
    marginTop: Spacing.xs,
    width: '100%',
    maxWidth: 220,
  },
});
