// ============================================================
// SearchModal — find any task by title or note, across every
// list. Full-screen, opens from the Today header.
// ============================================================
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStore } from '../lib/store.js';
import { Icon } from './icons.js';
import { TaskCard } from './TaskCard.js';
import { Illustration } from './illustrations.js';
import { listName } from '../lib/selectors.js';
import { Kicker } from './ui.js';
import { FONT } from '../theme.js';

export function SearchModal({ open, onClose, onOpenTask, theme }) {
  const { state, actions } = useStore();
  const [q, setQ] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    if (open) {
      setQ('');
      const t = setTimeout(() => inputRef.current?.focus(), 180);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [open]);

  const query = q.trim().toLowerCase();
  const results = useMemo(() => {
    if (!query) return { active: [], done: [] };
    const match = (t) =>
      (t.title && t.title.toLowerCase().includes(query)) ||
      (t.note && t.note.toLowerCase().includes(query));
    const hits = state.tasks.filter(match);
    return {
      active: hits.filter((t) => !t.isCompleted),
      done: hits.filter((t) => t.isCompleted),
    };
  }, [query, state.tasks]);

  const nameFor = (t) => listName(state, t.listId);
  const complete = (t) => actions.toggleTask(t.id, true);
  const uncomplete = (t) => actions.toggleTask(t.id, false);
  const openTask = (t) => { onOpenTask(t); onClose(); };

  const total = results.active.length + results.done.length;
  const s = makeStyles(theme);

  return (
    <Modal visible={open} animationType="slide" onRequestClose={onClose} presentationStyle="fullScreen">
      <SafeAreaView style={[s.root, { backgroundColor: theme.bg }]} edges={['top', 'bottom']}>
        {/* search bar */}
        <View style={s.bar}>
          <View style={[s.field, { backgroundColor: theme.surface, borderColor: theme.hairline2 }]}>
            <Icon.search size={18} color={theme.text3} />
            <TextInput
              ref={inputRef}
              style={[s.input, { color: theme.text }]}
              placeholder="Search tasks…"
              placeholderTextColor={theme.text4}
              value={q}
              onChangeText={setQ}
              selectionColor={theme.accent}
              returnKeyType="search"
              autoCorrect={false}
            />
            {q.length > 0 && (
              <Pressable onPress={() => setQ('')} hitSlop={8}>
                <Text style={{ color: theme.text3, fontSize: 18, fontWeight: '700' }}>×</Text>
              </Pressable>
            )}
          </View>
          <Pressable onPress={onClose} hitSlop={8}>
            <Text style={[s.cancel, { color: theme.accent }]}>Done</Text>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {!query ? (
            <View style={s.hint}>
              <Illustration name="page" theme={theme} />
              <Text style={[s.hintText, { color: theme.text3 }]}>Search across every list and the journal.</Text>
            </View>
          ) : total === 0 ? (
            <View style={s.hint}>
              <Illustration name="calm" theme={theme} />
              <Text style={[s.hintText, { color: theme.text3 }]}>No tasks match “{q.trim()}”.</Text>
            </View>
          ) : (
            <>
              {results.active.length > 0 && (
                <>
                  <Kicker style={{ color: theme.text3, marginBottom: 12 }}>
                    Active · <Text style={{ color: theme.accent }}>{results.active.length}</Text>
                  </Kicker>
                  {results.active.map((t) => (
                    <TaskCard
                      key={t.id}
                      task={t}
                      theme={theme}
                      settings={state.settings}
                      listName={nameFor(t)}
                      onComplete={complete}
                      onOpen={openTask}
                    />
                  ))}
                </>
              )}
              {results.done.length > 0 && (
                <>
                  <Kicker style={{ color: theme.text3, marginTop: 20, marginBottom: 6 }}>
                    Done · {results.done.length}
                  </Kicker>
                  {results.done.map((t) => (
                    <TaskCard
                      key={t.id}
                      task={t}
                      theme={theme}
                      settings={state.settings}
                      listName={nameFor(t)}
                      onUncomplete={uncomplete}
                      onOpen={openTask}
                    />
                  ))}
                </>
              )}
              <View style={{ height: 40 }} />
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

function makeStyles(t) {
  return StyleSheet.create({
    root: { flex: 1 },
    bar: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      paddingHorizontal: 18,
      paddingTop: 8,
      paddingBottom: 12,
    },
    field: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      borderWidth: 1,
      borderRadius: 14,
      paddingHorizontal: 14,
      height: 46,
    },
    input: { flex: 1, fontFamily: FONT.sans, fontSize: 16, paddingVertical: 0 },
    cancel: { fontFamily: FONT.sansSemi, fontSize: 15 },
    scroll: { paddingHorizontal: 22, paddingTop: 8 },
    hint: { alignItems: 'center', justifyContent: 'center', paddingTop: 60, gap: 18 },
    hintText: { fontFamily: FONT.sansMedium, fontSize: 14, textAlign: 'center', paddingHorizontal: 30 },
  });
}
