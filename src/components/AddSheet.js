// ============================================================
// AddSheet — bottom-sheet for adding / editing a task.
// Quick date picks, list chips, send button.
// Mirrors the web AddEditSheet but native.
// ============================================================
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Icon, NibMark } from './icons.js';
import { FONT } from '../theme.js';
import { useAppTheme } from '../lib/useTheme.js';
import { useStore } from '../lib/store.js';
import { startOfDay, addDays, thisWeekend, dueLabel } from '../lib/date.js';
import { softFeedback } from '../lib/feedback.js';

export function AddSheet({ open, mode = 'add', task, onSave, onDelete, onClose, onTriggerPaywall }) {
  const theme = useAppTheme();
  const { state } = useStore();
  const lists = state.lists;
  const settings = state.settings;

  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
  const [listId, setListId] = useState(null);
  const [dueAt, setDueAt] = useState(null);
  const [reminderAt, setReminderAt] = useState(null);
  const [recurring, setRecurring] = useState(null);
  const [showPicker, setShowPicker] = useState(false);
  const [pickerMode, setPickerMode] = useState('date');
  const [pickerDate, setPickerDate] = useState(new Date());
  const [pickerTarget, setPickerTarget] = useState('due'); // 'due' | 'reminder'

  const slideY = useRef(new Animated.Value(400)).current;
  const scrimOp = useRef(new Animated.Value(0)).current;
  const titleRef = useRef(null);

  // seed fields when opening
  useEffect(() => {
    if (open) {
      if (mode === 'edit' && task) {
        setTitle(task.title || '');
        setNote(task.note || '');
        setListId(task.listId || null);
        setDueAt(task.dueAt || null);
        setReminderAt(task.reminderAt || null);
        setRecurring(task.recurring || null);
      } else {
        setTitle('');
        setNote('');
        setListId(task?.listId || null);
        setDueAt(null);
        setReminderAt(null);
        setRecurring(null);
      }
      Animated.parallel([
        Animated.spring(slideY, { toValue: 0, damping: 16, stiffness: 160, mass: 0.9, useNativeDriver: true }),
        Animated.timing(scrimOp, { toValue: 1, duration: 250, useNativeDriver: true }),
      ]).start(() => {
        setTimeout(() => titleRef.current?.focus(), 100);
      });
    } else {
      Animated.parallel([
        Animated.timing(slideY, { toValue: 400, duration: 220, useNativeDriver: true }),
        Animated.timing(scrimOp, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [open]);

  const dismiss = () => {
    Keyboard.dismiss();
    onClose();
  };

  const submit = () => {
    if (!title.trim()) return;
    softFeedback(settings);
    onSave({ title: title.trim(), note: note.trim(), listId, dueAt, reminderAt, recurring });
  };

  // write a chosen ISO into whichever field the picker was opened for
  const writeField = (iso) => (pickerTarget === 'reminder' ? setReminderAt(iso) : setDueAt(iso));

  const pickQuick = (type) => {
    softFeedback(settings);
    const now = new Date();
    if (type === 'today') setDueAt(startOfDay(now).toISOString());
    else if (type === 'tomorrow') setDueAt(addDays(startOfDay(now), 1).toISOString());
    else if (type === 'weekend') setDueAt(thisWeekend(now).toISOString());
    else if (type === 'calendar') {
      setPickerTarget('due');
      setPickerDate(dueAt ? new Date(dueAt) : new Date());
      setPickerMode('date');
      setShowPicker(true);
    }
  };

  // Reminder time: anchored to the due date if set, else today.
  const setReminderQuick = (hour) => {
    softFeedback(settings);
    const base = dueAt ? new Date(dueAt) : new Date();
    base.setHours(hour, 0, 0, 0);
    setReminderAt(base.toISOString());
  };

  const openReminderCustom = () => {
    softFeedback(settings);
    setPickerTarget('reminder');
    setPickerDate(reminderAt ? new Date(reminderAt) : dueAt ? new Date(dueAt) : new Date());
    setPickerMode('date');
    setShowPicker(true);
  };

  const isReminderHour = (hour) => {
    if (!reminderAt) return false;
    const d = new Date(reminderAt);
    return d.getHours() === hour && d.getMinutes() === 0;
  };

  const isQuick = (type) => {
    if (!dueAt) return false;
    const d = startOfDay(new Date(dueAt));
    const today = startOfDay();
    if (type === 'today') return d.getTime() === today.getTime();
    if (type === 'tomorrow') return d.getTime() === addDays(today, 1).getTime();
    if (type === 'weekend') return d.getTime() === thisWeekend().getTime();
    return false;
  };

  const onDateChange = (ev, selected) => {
    if (Platform.OS === 'android') setShowPicker(false);
    if (selected) {
      if (pickerMode === 'date') {
        setPickerDate(selected);
        if (Platform.OS === 'android') {
          // on Android, show time picker after date
          setPickerMode('time');
          setShowPicker(true);
        } else {
          writeField(selected.toISOString());
        }
      } else {
        // time picked
        const final = new Date(pickerDate);
        final.setHours(selected.getHours(), selected.getMinutes(), 0, 0);
        writeField(final.toISOString());
        setPickerDate(final);
      }
    }
  };

  const s = makeStyles(theme);
  const canSend = title.trim().length > 0;

  if (!open) return null;

  return (
    <Modal transparent visible={open} animationType="none" onRequestClose={dismiss}>
      {/* scrim */}
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: theme.scrim, opacity: scrimOp }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={dismiss} />
      </Animated.View>

      {/* sheet */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={s.kavWrap}
        keyboardVerticalOffset={0}
      >
        <Animated.View style={[s.sheet, { transform: [{ translateY: slideY }] }]}>
          {/* grabber */}
          <View style={s.grabber} />

          {/* title input */}
          <View style={s.inputRow}>
            <TextInput
              ref={titleRef}
              style={[s.titleInput, { fontFamily: settings.sansTitles ? FONT.sansMedium : FONT.serif }]}
              placeholder="What needs doing?"
              placeholderTextColor={theme.text4}
              value={title}
              onChangeText={setTitle}
              returnKeyType="done"
              onSubmitEditing={() => canSend && submit()}
              selectionColor={theme.accent}
            />
            <Pressable
              onPress={submit}
              disabled={!canSend}
              style={[s.sendBtn, { backgroundColor: canSend ? theme.accent : theme.surface2 }]}
            >
              <Icon.send size={20} color={canSend ? theme.onAccent : theme.text4} />
            </Pressable>
          </View>

          {/* note input */}
          <TextInput
            style={s.noteInput}
            placeholder="Add a note…"
            placeholderTextColor={theme.text4}
            value={note}
            onChangeText={setNote}
            selectionColor={theme.accent}
          />

          {/* when chips */}
          <Text style={[s.label, { color: theme.text3 }]}>WHEN</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.chipScroll} contentContainerStyle={{ gap: 9 }}>
            <Chip label="Today" on={isQuick('today')} theme={theme} onPress={() => pickQuick('today')} />
            <Chip label="Tomorrow" on={isQuick('tomorrow')} theme={theme} onPress={() => pickQuick('tomorrow')} />
            <Chip label="This weekend" on={isQuick('weekend')} theme={theme} onPress={() => pickQuick('weekend')} />
            <Chip icon={<Icon.cal size={16} color={theme.text2} />} theme={theme} onPress={() => pickQuick('calendar')} />
          </ScrollView>

          {dueAt && (
            <View style={s.dueBadge}>
              <Icon.cal size={14} color={theme.accent} />
              <Text style={[s.dueText, { color: theme.accent }]}>{dueLabel(dueAt)}</Text>
              <Pressable onPress={() => { setDueAt(null); }} hitSlop={8}>
                <Text style={{ color: theme.text3, fontSize: 16, fontWeight: '700' }}>×</Text>
              </Pressable>
            </View>
          )}

          {/* remind me */}
          <Text style={[s.label, { color: theme.text3, marginTop: 18 }]}>REMIND ME</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.chipScroll} contentContainerStyle={{ gap: 9 }}>
            <Chip label="Off" on={!reminderAt} theme={theme} onPress={() => { softFeedback(settings); setReminderAt(null); }} />
            <Chip label="9:00 AM" on={isReminderHour(9)} theme={theme} onPress={() => setReminderQuick(9)} />
            <Chip label="1:00 PM" on={isReminderHour(13)} theme={theme} onPress={() => setReminderQuick(13)} />
            <Chip label="6:00 PM" on={isReminderHour(18)} theme={theme} onPress={() => setReminderQuick(18)} />
            <Chip icon={<Icon.bell size={15} color={theme.text2} />} theme={theme} onPress={openReminderCustom} />
          </ScrollView>

          {reminderAt && (
            <View style={s.dueBadge}>
              <Icon.bell size={14} color={theme.accent} />
              <Text style={[s.dueText, { color: theme.accent }]}>Reminder · {dueLabel(reminderAt)}</Text>
              <Pressable onPress={() => setReminderAt(null)} hitSlop={8}>
                <Text style={{ color: theme.text3, fontSize: 16, fontWeight: '700' }}>×</Text>
              </Pressable>
            </View>
          )}

          {/* Repeat */}
          <Text style={[s.label, { color: theme.text3, marginTop: 18 }]}>REPEAT</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.chipScroll} contentContainerStyle={{ gap: 9 }}>
            <Chip label="Once" on={recurring === null} theme={theme} onPress={() => { softFeedback(settings); setRecurring(null); }} />
            <Chip label="Daily" on={recurring === 'daily'} theme={theme} onPress={() => { softFeedback(settings); setRecurring(recurring === 'daily' ? null : 'daily'); }} />
            <Chip label="Weekdays" on={recurring === 'weekdays'} theme={theme} onPress={() => { softFeedback(settings); setRecurring(recurring === 'weekdays' ? null : 'weekdays'); }} />
            <Chip label="Weekly" on={recurring === 'weekly'} theme={theme} onPress={() => { softFeedback(settings); setRecurring(recurring === 'weekly' ? null : 'weekly'); }} />
          </ScrollView>

          {/* list chips */}
          {lists.length > 0 && (
            <>
              <Text style={[s.label, { color: theme.text3, marginTop: 18 }]}>LIST</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.chipScroll} contentContainerStyle={{ gap: 9 }}>
                {lists.map((l) => (
                  <Chip
                    key={l.id}
                    label={l.name}
                    on={listId === l.id}
                    theme={theme}
                    dotColor={l.accent}
                    onPress={() => {
                      softFeedback(settings);
                      setListId(listId === l.id ? null : l.id);
                    }}
                  />
                ))}
              </ScrollView>
            </>
          )}

          {/* edit mode: delete */}
          {mode === 'edit' && (
            <Pressable style={s.deleteRow} onPress={() => onDelete && onDelete(task.id)}>
              <Icon.trash size={18} color="#C2503A" />
              <Text style={s.deleteText}>Delete task</Text>
            </Pressable>
          )}

          <View style={{ height: 12 }} />
        </Animated.View>
      </KeyboardAvoidingView>

      {/* native date picker */}
      {showPicker && (
        Platform.OS === 'ios' ? (
          <Modal transparent animationType="slide">
            <View style={s.pickerOverlay}>
              <View style={[s.pickerContainer, { backgroundColor: theme.surface }]}>
                <View style={s.pickerHeader}>
                  <Pressable onPress={() => setShowPicker(false)}>
                    <Text style={[s.pickerBtn, { color: theme.text2 }]}>Cancel</Text>
                  </Pressable>
                  <Pressable onPress={() => {
                    writeField(pickerDate.toISOString());
                    setShowPicker(false);
                  }}>
                    <Text style={[s.pickerBtn, { color: theme.accent }]}>Done</Text>
                  </Pressable>
                </View>
                <DateTimePicker
                  value={pickerDate}
                  mode="datetime"
                  display="spinner"
                  onChange={(_, d) => d && setPickerDate(d)}
                  textColor={theme.text}
                  style={{ height: 200 }}
                />
              </View>
            </View>
          </Modal>
        ) : (
          <DateTimePicker
            value={pickerDate}
            mode={pickerMode}
            display="default"
            onChange={onDateChange}
          />
        )
      )}
    </Modal>
  );
}

/* ---------- Chip component ---------- */
function Chip({ label, icon, on, theme, dotColor, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        chipStyles.chip,
        {
          backgroundColor: on ? theme.accentSoft : theme.surface2,
          borderColor: on ? theme.accent : 'transparent',
        },
      ]}
    >
      {dotColor && <View style={[chipStyles.dot, { backgroundColor: dotColor }]} />}
      {icon || <Text style={[chipStyles.text, { color: on ? theme.accent : theme.text2 }]}>{label}</Text>}
    </Pressable>
  );
}

const chipStyles = StyleSheet.create({
  chip: {
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 13,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  text: { fontSize: 13, fontFamily: FONT.sansSemi },
  dot: { width: 6, height: 6, borderRadius: 3 },
});

function makeStyles(t) {
  return StyleSheet.create({
    kavWrap: { flex: 1, justifyContent: 'flex-end' },
    sheet: {
      backgroundColor: t.surface,
      borderTopLeftRadius: 26,
      borderTopRightRadius: 26,
      paddingHorizontal: 24,
      paddingTop: 12,
      shadowColor: '#000',
      shadowOpacity: 0.6,
      shadowRadius: 50,
      shadowOffset: { width: 0, height: -20 },
      elevation: 20,
    },
    grabber: {
      width: 40,
      height: 4,
      borderRadius: 3,
      backgroundColor: t.text4,
      alignSelf: 'center',
      marginBottom: 18,
    },
    inputRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
    },
    titleInput: {
      flex: 1,
      fontSize: 23,
      color: t.text,
      paddingVertical: 4,
    },
    noteInput: {
      fontFamily: FONT.sans,
      fontSize: 14,
      color: t.text2,
      marginTop: 8,
      paddingVertical: 4,
    },
    sendBtn: {
      width: 46,
      height: 46,
      borderRadius: 15,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: t.accent,
      shadowOpacity: 0.5,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 10 },
      elevation: 8,
    },
    label: {
      fontFamily: FONT.sansSemi,
      fontSize: 12,
      letterSpacing: 1.9,
      textTransform: 'uppercase',
      marginTop: 22,
      marginBottom: 12,
    },
    chipScroll: { flexGrow: 0 },
    dueBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginTop: 10,
    },
    dueText: { fontFamily: FONT.sansSemi, fontSize: 12.5 },
    deleteRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginTop: 24,
      paddingVertical: 12,
    },
    deleteText: {
      fontFamily: FONT.sansSemi,
      fontSize: 14,
      color: '#C2503A',
    },
    pickerOverlay: {
      flex: 1,
      justifyContent: 'flex-end',
      backgroundColor: 'rgba(0,0,0,0.4)',
    },
    pickerContainer: {
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      paddingBottom: 34,
    },
    pickerHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      padding: 16,
    },
    pickerBtn: {
      fontFamily: FONT.sansSemi,
      fontSize: 16,
    },
  });
}
