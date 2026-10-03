import { create } from 'zustand';
import type { Reminder, Note } from '@/src/types';

interface ReminderState {
  reminders: Reminder[];
  notes: Note[];
  setReminders: (r: Reminder[]) => void;
  addReminder: (r: Reminder) => void;
  updateReminder: (id: string, updates: Partial<Reminder>) => void;
  removeReminder: (id: string) => void;
  setNotes: (n: Note[]) => void;
  addNote: (n: Note) => void;
  updateNote: (id: string, updates: Partial<Note>) => void;
  removeNote: (id: string) => void;
  undoStack: Note[];         // last deleted note (for undo)
  pushUndo: (n: Note) => void;
  popUndo: () => Note | undefined;
}

export const useReminderStore = create<ReminderState>((set, get) => ({
  reminders: [],
  notes: [],
  undoStack: [],

  setReminders: (r) => set({ reminders: r }),
  addReminder: (r) => set((s) => ({ reminders: [r, ...s.reminders] })),
  updateReminder: (id, updates) =>
    set((s) => ({
      reminders: s.reminders.map((r) => (r.id === id ? { ...r, ...updates } : r)),
    })),
  removeReminder: (id) =>
    set((s) => ({ reminders: s.reminders.filter((r) => r.id !== id) })),

  setNotes: (n) => set({ notes: n }),
  addNote: (n) => set((s) => ({ notes: [n, ...s.notes] })),
  updateNote: (id, updates) =>
    set((s) => ({
      notes: s.notes.map((n) =>
        n.id === id ? { ...n, ...updates, updatedAt: new Date().toISOString() } : n,
      ),
    })),
  removeNote: (id) =>
    set((s) => ({ notes: s.notes.filter((n) => n.id !== id) })),

  pushUndo: (n) => set((s) => ({ undoStack: [n, ...s.undoStack].slice(0, 5) })),
  popUndo: () => {
    const { undoStack } = get();
    if (undoStack.length === 0) return undefined;
    const [top, ...rest] = undoStack;
    set({ undoStack: rest });
    return top;
  },
}));
