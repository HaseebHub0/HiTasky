// ============================================================
// Rapid Capture (formerly BrainDump) — rapid-fire thought capture.
//
// Open it → just type, one thought per line.
// Hit "Done" → each non-empty line becomes a task in Inbox.
//
// This is for anxious moments when you need to get everything
// out of your head. It functions as an elegant scratchpad.
// ============================================================
import React, { useState, useRef, useEffect } from 'react';
import { StyleSheet, View, Text, Modal, Pressable, TextInput, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useStore } from '../lib/store.js';
import { FONT } from '../theme.js';
import { Icon } from './icons.js';

export function BrainDump({ open, onClose, onSave, theme }) {
  const { state } = useStore();
  const lists = state.lists;
  const [listId, setListId] = useState(null);
  const [text, setText] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    if (open) {
      setText('');
      setListId(null);
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [open]);

  const lines = text.split('\n').filter((l) => l.trim().length > 0);
  const count = lines.length;

  const handleSave = () => {
    if (count === 0) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onSave(lines.map((l) => l.trim()), listId);
    onClose();
  };

  const st = makeStyles(theme);

  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={st.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={st.header}>
          <Pressable onPress={onClose} style={st.closeBtn}>
            <Icon.chevLeft size={20} color={theme.text2} />
          </Pressable>
          <View style={st.titleWrap}>
            <Text style={st.title}>Rapid Capture</Text>
            <Text style={st.subtitle}>Empty your mind. One thought per line.</Text>
          </View>
          <View style={{ width: 44 }} />
        </View>

        {/* Input area */}
        <ScrollView
          style={[st.scrollArea, { backgroundColor: theme.surface }]}
          contentContainerStyle={st.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={[st.marginLine, { borderLeftColor: theme.accentSoft }]} />
          <TextInput
            ref={inputRef}
            style={[st.input, { color: theme.text }]}
            value={text}
            onChangeText={setText}
            placeholder={"Buy groceries\nEmail Sarah back\nFinish the report\nBook dentist appointment\n..."}
            placeholderTextColor={theme.text4}
            multiline
            autoFocus={false}
            textAlignVertical="top"
            selectionColor={theme.accent}
          />
        </ScrollView>

        {lists && lists.length > 0 && (
          <View style={{ paddingHorizontal: 24, paddingBottom: 12 }}>
            <Text style={{ fontFamily: FONT.sansSemi, fontSize: 11, color: theme.text3, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 8 }}>SAVE TO LIST</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={{ gap: 8 }}>
              <Pressable
                onPress={() => setListId(null)}
                style={{ paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, backgroundColor: listId === null ? theme.accentSoft : theme.surface2, borderColor: listId === null ? theme.accent : 'transparent' }}
              >
                <Text style={{ fontSize: 12, fontFamily: FONT.sansSemi, color: listId === null ? theme.accent : theme.text2 }}>Inbox</Text>
              </Pressable>
              {lists.map((l) => {
                const on = listId === l.id;
                return (
                  <Pressable
                    key={l.id}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setListId(on ? null : l.id);
                    }}
                    style={{ paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, backgroundColor: on ? theme.accentSoft : theme.surface2, borderColor: on ? theme.accent : 'transparent', flexDirection: 'row', alignItems: 'center', gap: 6 }}
                  >
                    <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: l.accent }} />
                    <Text style={{ fontSize: 12, fontFamily: FONT.sansSemi, color: on ? theme.accent : theme.text2 }}>{l.name}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* Footer */}
        <View style={st.footer}>
          <Text style={[st.countText, { color: theme.text3 }]}>
            {count === 0
              ? 'Start typing...'
              : count === 1
                ? '1 thought captured'
                : `${count} thoughts captured`}
          </Text>
          <Pressable
            style={[st.saveBtn, { backgroundColor: count > 0 ? theme.accent : theme.surface2 }]}
            onPress={handleSave}
            disabled={count === 0}
          >
            <Text style={[st.saveBtnText, { color: count > 0 ? theme.onAccent : theme.text4 }]}>
              Add {count > 0 ? count : ''} to Inbox
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function makeStyles(t) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: t.bg,
      paddingTop: 56,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      paddingHorizontal: 24,
    },
    closeBtn: {
      width: 44,
      height: 44,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 22,
      backgroundColor: t.surface,
    },
    titleWrap: {
      flex: 1,
      alignItems: 'center',
      paddingTop: 4,
    },
    title: {
      fontFamily: FONT.serif,
      fontSize: 22,
      color: t.text,
    },
    subtitle: {
      fontFamily: FONT.serifItalic || FONT.serif,
      fontSize: 13,
      color: t.text3,
      marginTop: 4,
    },
    scrollArea: {
      flex: 1,
      marginHorizontal: 16,
      marginTop: 20,
      marginBottom: 20,
      borderRadius: 16,
      paddingHorizontal: 20,
      flexDirection: 'row',
    },
    scrollContent: {
      flexGrow: 1,
      paddingVertical: 20,
    },
    marginLine: {
      position: 'absolute',
      left: 36,
      top: 0,
      bottom: 0,
      borderLeftWidth: 2,
    },
    input: {
      fontFamily: FONT.serif,
      fontSize: 18,
      lineHeight: 34,
      color: t.text,
      flex: 1,
      textAlignVertical: 'top',
      paddingTop: 0,
      paddingLeft: 56,
    },
    footer: {
      paddingHorizontal: 24,
      paddingBottom: 36,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: t.hairline,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    countText: {
      fontFamily: FONT.sansMedium,
      fontSize: 13,
    },
    saveBtn: {
      paddingHorizontal: 20,
      paddingVertical: 12,
      borderRadius: 14,
    },
    saveBtnText: {
      fontFamily: FONT.sansBold,
      fontSize: 14,
    },
  });
}
