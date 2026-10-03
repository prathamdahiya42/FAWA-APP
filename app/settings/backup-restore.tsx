import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  TextInput,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useThemeColors } from '@/src/theme';
import { FontFamilies, TypeScale } from '@/src/theme/typography';
import { Spacing, Radius } from '@/src/theme/spacing';
import { ChargeButton } from '@/src/ui/ChargeButton';
import { Toast } from '@/src/ui/Toast';
import { useUIStore } from '@/src/store/ui.store';
import { exportDatabaseBackup, importDatabaseBackup } from '@/src/services/backup.service';

export default function BackupRestoreScreen() {
  const colors = useThemeColors();
  const router = useRouter();
  const showToast = useUIStore((s) => s.showToast);

  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [jsonInput, setJsonInput] = useState('');
  const [showJsonInput, setShowJsonInput] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      await exportDatabaseBackup();
      showToast('Backup created and ready to share/save.');
    } catch (err: any) {
      console.warn('Backup export failed', err);
      showToast('Failed to export backup.');
    } finally {
      setExporting(false);
    }
  };

  const handleImportText = async () => {
    if (!jsonInput.trim()) {
      showToast('Please paste a valid JSON backup string.');
      return;
    }

    setImporting(true);
    try {
      await importDatabaseBackup(jsonInput);
      showToast('Data restored successfully! Please restart the app.');
      setJsonInput('');
      setShowJsonInput(false);
    } catch (err: any) {
      console.warn('Backup import failed', err);
      showToast(`Restore failed: ${err?.message || 'Invalid format'}`);
    } finally {
      setImporting(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]}>
      <StatusBar barStyle="light-content" backgroundColor={colors.bg} />
      <Toast />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={{ color: colors.text, fontSize: 18 }}>← Back</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text, fontFamily: FontFamilies.displayBold }]}>
          Backup & Restore
        </Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Info card */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.line }]}>
          <Text style={[styles.cardTitle, { color: colors.text, fontFamily: FontFamilies.displayBold }]}>
            Offline-First Data Sovereignty
          </Text>
          <Text style={[styles.cardBody, { color: colors.textMuted, fontFamily: FontFamilies.bodyRegular }]}>
            All your workouts, test records, notes, and alarms stay entirely on your device. There is no cloud account or tracking. You can export a full JSON backup anytime to keep in your personal cloud or move to another phone.
          </Text>
        </View>

        {/* Export card */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.line }]}>
          <Text style={[styles.cardTitle, { color: colors.green, fontFamily: FontFamilies.displayBold }]}>
            Export Backup
          </Text>
          <Text style={[styles.cardBody, { color: colors.textMuted, fontFamily: FontFamilies.bodyRegular }]}>
            Generates a verified JSON file containing your user profile, 60-day plan state, logs, tests, body metrics, and notes.
          </Text>

          <ChargeButton
            label="Export JSON Backup"
            onPress={handleExport}
            loading={exporting}
            isPrimary={true}
            style={{ marginTop: Spacing.xs }}
          />
        </View>

        {/* Import card */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.line }]}>
          <Text style={[styles.cardTitle, { color: colors.yellow, fontFamily: FontFamilies.displayBold }]}>
            Restore from Backup
          </Text>
          <Text style={[styles.cardBody, { color: colors.textMuted, fontFamily: FontFamilies.bodyRegular }]}>
            Restore your entire program and logs from a previous FAWA backup.
          </Text>

          {!showJsonInput ? (
            <ChargeButton
              label="Paste Backup JSON"
              onPress={() => setShowJsonInput(true)}
              isOutlined={true}
              style={{ marginTop: Spacing.xs }}
            />
          ) : (
            <View style={styles.inputContainer}>
              <TextInput
                style={[
                  styles.jsonInput,
                  { backgroundColor: colors.surface2, color: colors.text, borderColor: colors.line },
                ]}
                placeholder="Paste full backup JSON here…"
                placeholderTextColor={colors.textMuted}
                multiline
                numberOfLines={6}
                value={jsonInput}
                onChangeText={setJsonInput}
              />
              <View style={styles.inputActions}>
                <TouchableOpacity
                  onPress={() => setShowJsonInput(false)}
                  style={[styles.cancelBtn, { borderColor: colors.line }]}
                >
                  <Text style={{ color: colors.textMuted }}>Cancel</Text>
                </TouchableOpacity>

                <ChargeButton
                  label="Restore Data"
                  onPress={handleImportText}
                  loading={importing}
                  disabled={!jsonInput.trim()}
                  style={{ flex: 1 }}
                />
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  backBtn: { padding: Spacing.xs },
  title: { fontSize: TypeScale.lg },
  scroll: {
    padding: Spacing.md,
    paddingBottom: Spacing.xxxl,
    gap: Spacing.md,
  },
  card: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing.lg,
    gap: Spacing.xs,
  },
  cardTitle: { fontSize: 16 },
  cardBody: { fontSize: 13, lineHeight: 20 },
  inputContainer: {
    marginTop: Spacing.sm,
    gap: Spacing.sm,
  },
  jsonInput: {
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.md,
    fontFamily: FontFamilies.mono,
    fontSize: 11,
    height: 120,
    textAlignVertical: 'top',
  },
  inputActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    alignItems: 'center',
  },
  cancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: Radius.pill,
    borderWidth: 1,
  },
});
