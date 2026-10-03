import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  TextInput,
} from 'react-native';
import { format, parseISO, isPast, isToday, isTomorrow, addHours } from 'date-fns';
import { useThemeColors } from '@/src/theme';
import { FontFamilies, TypeScale } from '@/src/theme/typography';
import { Spacing, Radius, TouchTarget } from '@/src/theme/spacing';
import { ChargeButton } from '@/src/ui/ChargeButton';
import { EmptyState } from '@/src/ui/EmptyState';
import { QuickCaptureSheet } from '@/src/ui/QuickCaptureSheet';
import { Toast } from '@/src/ui/Toast';
import { useReminderStore } from '@/src/store/reminder.store';
import { useUIStore } from '@/src/store/ui.store';
import { getDatabase } from '@/src/db/database';
import type { Note, NoteType } from '@/src/types';

export default function CaptureScreen() {
  const colors = useThemeColors();

  const notes = useReminderStore((s) => s.notes);
  const updateNote = useReminderStore((s) => s.updateNote);
  const removeNote = useReminderStore((s) => s.removeNote);
  const addNote = useReminderStore((s) => s.addNote);
  const pushUndo = useReminderStore((s) => s.pushUndo);
  const popUndo = useReminderStore((s) => s.popUndo);
  const showToast = useUIStore((s) => s.showToast);

  const [sheetVisible, setSheetVisible] = useState(false);
  const [filterType, setFilterType] = useState<NoteType | 'all'>('all');
  const [search, setSearch] = useState('');

  // Handle Mark Done
  const handleToggleDone = async (note: Note) => {
    const updatedDone = !note.done;
    updateNote(note.id, { done: updatedDone });
    try {
      const db = await getDatabase();
      await db.runAsync('UPDATE notes SET done = ? WHERE id = ?', [updatedDone ? 1 : 0, note.id]);
      showToast(updatedDone ? 'Note marked as completed ✓' : 'Note moved back to active');
    } catch (e) {
      console.warn('Failed to update note status in db', e);
    }
  };

  // Handle Delete with Undo
  const handleDelete = async (note: Note) => {
    pushUndo(note);
    removeNote(note.id);
    try {
      const db = await getDatabase();
      await db.runAsync('DELETE FROM notes WHERE id = ?', [note.id]);
      showToast('Note deleted. Tap undo to restore.', 4000);
    } catch (e) {
      console.warn('Failed to delete note in db', e);
    }
  };

  // Handle Snooze
  const handleSnooze = async (note: Note, minutes = 10) => {
    const newRemindAt = new Date(Date.now() + minutes * 60 * 1000).toISOString();
    updateNote(note.id, { remindAt: newRemindAt });
    try {
      const db = await getDatabase();
      await db.runAsync('UPDATE notes SET remind_at = ? WHERE id = ?', [newRemindAt, note.id]);
      showToast(`Snoozed for ${minutes} minutes.`);
    } catch (e) {
      console.warn('Failed to snooze note in db', e);
    }
  };

  // Handle Undo
  const handleUndo = async () => {
    const restored = popUndo();
    if (restored) {
      addNote(restored);
      try {
        const db = await getDatabase();
        await db.runAsync(
          `INSERT OR REPLACE INTO notes (
            id, type, text, checklist_items, remind_at, priority, attached_to,
            done, pinned, timer_seconds, timer_started_at, countdown_reminder_id, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            restored.id,
            restored.type,
            restored.text,
            JSON.stringify(restored.checklistItems),
            restored.remindAt,
            restored.priority,
            restored.attachedTo ? JSON.stringify(restored.attachedTo) : null,
            restored.done ? 1 : 0,
            restored.pinned ? 1 : 0,
            restored.timerSeconds,
            restored.timerStartedAt,
            restored.countdownReminderId,
            restored.createdAt,
            restored.updatedAt,
          ],
        );
        showToast('Restored note!');
      } catch (e) {
        console.warn('Failed to restore note in db', e);
      }
    }
  };

  // Filter notes by search & type
  const filtered = useMemo(() => {
    return notes.filter((n) => {
      const matchesSearch = n.text.toLowerCase().includes(search.toLowerCase());
      const matchesType = filterType === 'all' || n.type === filterType;
      return matchesSearch && matchesType;
    });
  }, [notes, search, filterType]);

  // Smart section categorization
  const sections = useMemo(() => {
    const now = new Date();
    const inOneHour = addHours(now, 1);

    const nowDue: Note[] = [];
    const nextHour: Note[] = [];
    const laterToday: Note[] = [];
    const tomorrow: Note[] = [];
    const later: Note[] = [];
    const noReminder: Note[] = [];
    const doneList: Note[] = [];

    for (const note of filtered) {
      if (note.done) {
        doneList.push(note);
        continue;
      }
      if (!note.remindAt) {
        noReminder.push(note);
        continue;
      }

      const d = parseISO(note.remindAt);
      if (isPast(d)) {
        nowDue.push(note);
      } else if (d <= inOneHour) {
        nextHour.push(note);
      } else if (isToday(d)) {
        laterToday.push(note);
      } else if (isTomorrow(d)) {
        tomorrow.push(note);
      } else {
        later.push(note);
      }
    }

    return [
      { key: 'now', title: 'NOW (DUE)', data: nowDue, color: colors.safety },
      { key: 'nextHour', title: 'NEXT HOUR', data: nextHour, color: colors.yellow },
      { key: 'laterToday', title: 'LATER TODAY', data: laterToday, color: colors.green },
      { key: 'tomorrow', title: 'TOMORROW', data: tomorrow, color: colors.textMuted },
      { key: 'later', title: 'UPCOMING', data: later, color: colors.textMuted },
      { key: 'noReminder', title: 'NOTES', data: noReminder, color: colors.textMuted },
      { key: 'done', title: 'DONE', data: doneList, color: colors.textMuted },
    ];
  }, [filtered, colors]);

  const renderNoteCard = (note: Note) => {
    return (
      <View
        key={note.id}
        style={[
          styles.noteCard,
          {
            backgroundColor: colors.surface,
            borderColor: note.priority === 'alarm' ? colors.yellow : colors.line,
          },
        ]}
      >
        <View style={styles.noteTopRow}>
          <TouchableOpacity
            onPress={() => handleToggleDone(note)}
            style={[
              styles.checkCircle,
              {
                borderColor: note.done ? colors.green : colors.line,
                backgroundColor: note.done ? colors.green : 'transparent',
              },
            ]}
            accessibilityLabel={note.done ? 'Mark incomplete' : 'Mark complete'}
          >
            {note.done && <Text style={{ color: colors.inkOnGreen, fontSize: 12, fontWeight: '700' }}>✓</Text>}
          </TouchableOpacity>

          <View style={{ flex: 1 }}>
            <Text
              style={[
                styles.noteText,
                {
                  color: note.done ? colors.textMuted : colors.text,
                  textDecorationLine: note.done ? 'line-through' : 'none',
                  fontFamily: FontFamilies.bodyRegular,
                },
              ]}
            >
              {note.text}
            </Text>

            {note.remindAt && (
              <Text style={[styles.noteRemindText, { color: colors.yellow, fontFamily: FontFamilies.mono }]}>
                ⏰ {format(parseISO(note.remindAt), 'MMM d, h:mm a')}
                {note.priority === 'alarm' ? ' (Alarm)' : ''}
              </Text>
            )}
          </View>
        </View>

        {/* Action strip */}
        {!note.done && (
          <View style={styles.actionStrip}>
            <TouchableOpacity
              onPress={() => handleSnooze(note, 10)}
              style={[styles.smallActionBtn, { backgroundColor: colors.surface2 }]}
            >
              <Text style={{ color: colors.textMuted, fontSize: 11, fontFamily: FontFamilies.bodyMedium }}>
                +10m Snooze
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => handleDelete(note)}
              style={[styles.smallActionBtn, { backgroundColor: colors.surface2 }]}
            >
              <Text style={{ color: colors.safety, fontSize: 11, fontFamily: FontFamilies.bodyMedium }}>
                Delete
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]}>
      <StatusBar barStyle="light-content" backgroundColor={colors.bg} />
      <Toast />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.title, { color: colors.text, fontFamily: FontFamilies.displayBold }]}>
            Capture Hub
          </Text>
          <Text style={[styles.subtitle, { color: colors.textMuted, fontFamily: FontFamilies.bodyRegular }]}>
            Two taps to capture any reminder or note.
          </Text>
        </View>

        <TouchableOpacity
          onPress={() => setSheetVisible(true)}
          style={[styles.addBtn, { backgroundColor: colors.green }]}
          accessibilityLabel="Add note"
        >
          <Text style={{ color: colors.inkOnGreen, fontFamily: FontFamilies.bodyBold, fontSize: 13 }}>
            + Note
          </Text>
        </TouchableOpacity>
      </View>

      {/* Search and filters */}
      <View style={styles.filterBar}>
        <TextInput
          style={[
            styles.searchInput,
            { backgroundColor: colors.surface, color: colors.text, borderColor: colors.line },
          ]}
          placeholder="Search notes…"
          placeholderTextColor={colors.textMuted}
          value={search}
          onChangeText={setSearch}
        />

        <View style={styles.typeFilterRow}>
          {(['all', 'text', 'checklist', 'timer'] as const).map((t) => (
            <TouchableOpacity
              key={t}
              onPress={() => setFilterType(t)}
              style={[
                styles.typeChip,
                {
                  backgroundColor: filterType === t ? colors.green : colors.surface2,
                  borderColor: filterType === t ? colors.green : colors.line,
                },
              ]}
            >
              <Text
                style={{
                  color: filterType === t ? colors.inkOnGreen : colors.textMuted,
                  fontFamily: FontFamilies.bodyBold,
                  fontSize: 11,
                  textTransform: 'capitalize',
                }}
              >
                {t}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Main List */}
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {notes.length === 0 ? (
          <EmptyState
            title="Your Capture Hub is Clear"
            description="Capture any workout cue, hydration thought, or reminder in two taps."
            action={
              <ChargeButton
                label="+ Add First Note"
                onPress={() => setSheetVisible(true)}
                isPrimary={true}
              />
            }
          />
        ) : (
          sections.map((sec) => {
            if (sec.data.length === 0) return null;
            return (
              <View key={sec.key} style={styles.sectionGroup}>
                <Text style={[styles.sectionHeading, { color: sec.color, fontFamily: FontFamilies.bodyBold }]}>
                  {sec.title} ({sec.data.length})
                </Text>
                {sec.data.map(renderNoteCard)}
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Quick capture modal */}
      <QuickCaptureSheet visible={sheetVisible} onClose={() => setSheetVisible(false)} />
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
  addBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Radius.pill,
  },
  filterBar: {
    paddingHorizontal: Spacing.md,
    gap: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  searchInput: {
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    fontSize: 14,
  },
  typeFilterRow: {
    flexDirection: 'row',
    gap: 6,
  },
  typeChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.pill,
    borderWidth: 1,
  },
  scroll: {
    padding: Spacing.md,
    paddingBottom: Spacing.xxxl,
    gap: Spacing.md,
  },
  sectionGroup: {
    gap: Spacing.xs,
  },
  sectionHeading: {
    fontSize: 11,
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  noteCard: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing.md,
    gap: Spacing.xs,
  },
  noteTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  checkCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  noteText: {
    fontSize: 14,
    lineHeight: 20,
  },
  noteRemindText: {
    fontSize: 11,
    marginTop: 4,
  },
  actionStrip: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: Spacing.xxs,
  },
  smallActionBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.pill,
  },
});
