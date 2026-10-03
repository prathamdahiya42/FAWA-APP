import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
} from 'react-native';
import { useThemeColors } from '@/src/theme';
import { FontFamilies, TypeScale } from '@/src/theme/typography';
import { Radius, Spacing, TouchTarget } from '@/src/theme/spacing';
import { ChargeButton } from './ChargeButton';
import { computeQuickCaptureTime, QuickCapturePresetKey } from '@/src/engine/reminder-rules';
import { useReminderStore } from '@/src/store/reminder.store';
import { useProfileStore } from '@/src/store/profile.store';
import { useUIStore } from '@/src/store/ui.store';
import { format } from 'date-fns';
import type { Note, NoteType, Priority } from '@/src/types';

interface QuickCaptureSheetProps {
  visible: boolean;
  onClose: () => void;
  attachedTo?: { type: 'day' | 'workout' | 'exercise' | 'test'; id: string } | null;
}

export function QuickCaptureSheet({ visible, onClose, attachedTo = null }: QuickCaptureSheetProps) {
  const colors = useThemeColors();
  const profile = useProfileStore((s) => s.profile);
  const addNote = useReminderStore((s) => s.addNote);
  const showToast = useUIStore((s) => s.showToast);

  const [text, setText] = useState('');
  const [noteType, setNoteType] = useState<NoteType>('text');
  const [selectedPreset, setSelectedPreset] = useState<QuickCapturePresetKey | null>(null);
  const [remindMe, setRemindMe] = useState(false);
  const [priority, setPriority] = useState<Priority>('gentle');
  const [loading, setLoading] = useState(false);

  const presets: Array<{ key: QuickCapturePresetKey; label: string }> = [
    { key: 'in10', label: 'In 10m' },
    { key: 'in30', label: 'In 30m' },
    { key: 'in1hr', label: 'In 1h' },
    { key: 'tonight', label: 'Tonight 9 PM' },
    { key: 'tomorrow', label: 'Tomorrow morning' },
  ];

  const handleSelectPreset = (key: QuickCapturePresetKey) => {
    if (selectedPreset === key) {
      setSelectedPreset(null);
      setRemindMe(false);
    } else {
      setSelectedPreset(key);
      setRemindMe(true);
    }
  };

  const handleSave = async () => {
    if (!text.trim()) return;

    setLoading(true);
    try {
      const wakeTime = profile?.wakeTime ?? '06:30';
      let remindAtDate: Date | null = null;

      if (remindMe && selectedPreset) {
        remindAtDate = computeQuickCaptureTime(selectedPreset, wakeTime);
      }

      const newNote: Note = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        type: noteType,
        text: text.trim(),
        checklistItems: [],
        remindAt: remindAtDate ? remindAtDate.toISOString() : null,
        priority,
        attachedTo,
        done: false,
        pinned: false,
        timerSeconds: noteType === 'timer' ? 600 : null,
        timerStartedAt: noteType === 'timer' ? new Date().toISOString() : null,
        countdownReminderId: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      addNote(newNote);

      if (remindAtDate) {
        showToast(`Saved. I'll remind you at ${format(remindAtDate, 'h:mm a')}.`);
      } else {
        showToast('Note saved.');
      }

      setText('');
      setSelectedPreset(null);
      setRemindMe(false);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.overlay}
      >
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
        <View style={[styles.sheet, { backgroundColor: colors.surface, borderTopColor: colors.line }]}>
          {/* Grab handle */}
          <View style={[styles.handle, { backgroundColor: colors.line }]} />

          <Text style={[styles.title, { color: colors.text, fontFamily: FontFamilies.displayBold }]}>
            Quick Capture
          </Text>

          <TextInput
            style={[
              styles.input,
              {
                color: colors.text,
                backgroundColor: colors.surface2,
                borderColor: colors.line,
                fontFamily: FontFamilies.bodyRegular,
              },
            ]}
            placeholder="What's on your mind? Note, cue, reminder…"
            placeholderTextColor={colors.textMuted}
            value={text}
            onChangeText={setText}
            multiline
            numberOfLines={3}
            autoFocus
          />

          {/* Type switcher */}
          <View style={styles.segmentedRow}>
            {(['text', 'checklist', 'timer'] as NoteType[]).map((t) => (
              <TouchableOpacity
                key={t}
                onPress={() => setNoteType(t)}
                style={[
                  styles.segmentChip,
                  {
                    backgroundColor: noteType === t ? colors.green : colors.surface2,
                    borderColor: noteType === t ? colors.green : colors.line,
                  },
                ]}
              >
                <Text
                  style={{
                    color: noteType === t ? colors.inkOnGreen : colors.textMuted,
                    fontFamily: FontFamilies.bodyMedium,
                    fontSize: 12,
                    textTransform: 'capitalize',
                  }}
                >
                  {t}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Time chips */}
          <Text style={[styles.sectionLabel, { color: colors.textMuted, fontFamily: FontFamilies.bodyMedium }]}>
            Remind me
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll}>
            {presets.map((p) => {
              const active = selectedPreset === p.key;
              return (
                <TouchableOpacity
                  key={p.key}
                  onPress={() => handleSelectPreset(p.key)}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: active ? colors.yellow : colors.surface2,
                      borderColor: active ? colors.yellow : colors.line,
                    },
                  ]}
                >
                  <Text
                    style={{
                      color: active ? colors.inkOnYellow : colors.text,
                      fontFamily: FontFamilies.bodyMedium,
                      fontSize: 12,
                    }}
                  >
                    {p.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Priority selector if reminder set */}
          {remindMe && (
            <View style={styles.priorityRow}>
              <Text style={{ color: colors.textMuted, fontFamily: FontFamilies.bodyRegular, fontSize: 13 }}>
                Alert level:
              </Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {(['gentle', 'alarm'] as Priority[]).map((p) => (
                  <TouchableOpacity
                    key={p}
                    onPress={() => setPriority(p)}
                    style={[
                      styles.priorityChip,
                      {
                        backgroundColor: priority === p ? (p === 'alarm' ? colors.yellow : colors.green) : colors.surface2,
                      },
                    ]}
                  >
                    <Text
                      style={{
                        color: priority === p ? (p === 'alarm' ? colors.inkOnYellow : colors.inkOnGreen) : colors.textMuted,
                        fontFamily: FontFamilies.bodyBold,
                        fontSize: 12,
                        textTransform: 'capitalize',
                      }}
                    >
                      {p}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          <ChargeButton
            label="Save"
            onPress={handleSave}
            disabled={!text.trim()}
            loading={loading}
            isPrimary={true}
            style={{ marginTop: Spacing.md }}
          />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
  },
  sheet: {
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    borderTopWidth: 1,
    padding: Spacing.lg,
    paddingBottom: Platform.OS === 'ios' ? 40 : Spacing.lg,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: Spacing.md,
  },
  title: {
    fontSize: TypeScale.lg,
    marginBottom: Spacing.sm,
  },
  input: {
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.md,
    fontSize: 15,
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: Spacing.sm,
  },
  segmentedRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: Spacing.md,
  },
  segmentChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: Radius.pill,
    borderWidth: 1,
  },
  sectionLabel: {
    fontSize: 12,
    marginBottom: 8,
  },
  chipsScroll: {
    flexDirection: 'row',
    marginBottom: Spacing.sm,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: Radius.pill,
    borderWidth: 1,
    marginRight: 8,
  },
  priorityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: Spacing.xs,
  },
  priorityChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.pill,
  },
});
