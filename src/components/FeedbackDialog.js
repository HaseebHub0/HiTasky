// ============================================================
// FeedbackDialog — mood + note, saved locally and sent to the
// Google Sheet. Used from Settings and from the auto feedback
// prompt (after the user has settled into the app).
// ============================================================
import React, { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View, Modal, TextInput } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { submitFeedbackToSheet, isSheetConfigured } from '../lib/feedbackSheet.js';
import { FONT } from '../theme.js';

export function FeedbackDialog({ open, onClose, theme, onToast }) {
  const [mood, setMood] = useState('Calm');
  const [comment, setComment] = useState('');
  const [sending, setSending] = useState(false);

  const moods = [
    { label: '🌱 Calm', val: 'Calm' },
    { label: '🎯 Focused', val: 'Focused' },
    { label: '💬 Neutral', val: 'Neutral' },
    { label: '⚡ Distracted', val: 'Distracted' },
  ];

  const handleSubmit = async () => {
    if (!comment.trim()) {
      onToast('Please write some thoughts');
      return;
    }
    setSending(true);

    const feedbackItem = {
      mood,
      comment: comment.trim(),
      date: new Date().toISOString(),
    };

    // 1. Always save locally first — nothing is ever lost.
    try {
      const raw = await AsyncStorage.getItem('hitasky.feedback');
      const list = raw ? JSON.parse(raw) : [];
      list.push(feedbackItem);
      await AsyncStorage.setItem('hitasky.feedback', JSON.stringify(list));
    } catch (e) {
      // ignore — sheet send below may still succeed
    }

    // 2. Send to the Google Sheet when configured.
    try {
      if (isSheetConfigured()) {
        await submitFeedbackToSheet(feedbackItem, {
          version: 'v1.0',
          platform: Platform.OS,
          theme: theme.mode,
        });
        onToast('Thank you — your feedback was sent.');
      } else {
        onToast('Feedback saved locally. Thank you!');
      }
      setComment('');
      onClose();
    } catch (e) {
      onToast('Saved on device. Thank you!');
      setComment('');
      onClose();
    } finally {
      setSending(false);
    }
  };

  const st = makeDlgStyles(theme);

  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={[st.scrim, { backgroundColor: theme.scrim }]} onPress={onClose} />
      <View style={st.centerWrap} pointerEvents="box-none">
        <View style={[st.dialog, { backgroundColor: theme.surface }]}>
          <Text style={[st.dialogTitle, { color: theme.text }]}>Feedback & Thoughts</Text>
          <Text style={[st.dialogSub, { color: theme.text2 }]}>
            How does HiTasky feel for you? Your note is saved on this device and sent privately to the HiTasky team.
          </Text>

          <Text style={[st.kicker, { color: theme.text3, marginTop: 16, marginBottom: 8 }]}>Current Feeling</Text>
          <View style={st.moodRow}>
            {moods.map((m) => {
              const active = mood === m.val;
              return (
                <Pressable
                  key={m.val}
                  onPress={() => setMood(m.val)}
                  style={[
                    st.moodBtn,
                    {
                      backgroundColor: active ? theme.accentSoft : theme.surface2,
                      borderColor: active ? theme.accent : 'transparent',
                    },
                  ]}
                >
                  <Text style={[st.moodText, { color: active ? theme.text : theme.text2 }]}>{m.label}</Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={[st.kicker, { color: theme.text3, marginTop: 16, marginBottom: 8 }]}>Your thoughts</Text>
          <TextInput
            style={[st.input, { color: theme.text, borderColor: theme.hairline2 }]}
            placeholder="Write your feedback or ideas..."
            placeholderTextColor={theme.text4}
            value={comment}
            onChangeText={setComment}
            multiline
            numberOfLines={4}
            selectionColor={theme.accent}
          />

          <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
            <Pressable style={[st.dlgBtn, { backgroundColor: theme.surface2 }]} onPress={onClose}>
              <Text style={{ fontFamily: FONT.sansBold, fontSize: 14, color: theme.text2 }}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[st.dlgBtn, { backgroundColor: theme.accent }]}
              onPress={handleSubmit}
              disabled={sending}
            >
              <Text style={{ fontFamily: FONT.sansBold, fontSize: 14, color: theme.onAccent }}>
                {sending ? 'Saving...' : 'Submit'}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function makeDlgStyles(t) {
  return StyleSheet.create({
    scrim: { ...StyleSheet.absoluteFillObject },
    centerWrap: { flex: 1, justifyContent: 'center', paddingHorizontal: 24 },
    dialog: { borderRadius: 24, padding: 24 },
    dialogTitle: { fontFamily: FONT.serif, fontSize: 22, marginBottom: 6 },
    dialogSub: { fontFamily: FONT.sansMedium, fontSize: 13, lineHeight: 18 },
    kicker: { fontFamily: FONT.sansSemi, fontSize: 11, letterSpacing: 1.2, textTransform: 'uppercase' },
    moodRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
    moodBtn: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1.5 },
    moodText: { fontFamily: FONT.sansSemi, fontSize: 13 },
    input: {
      fontFamily: FONT.sans,
      fontSize: 14.5,
      borderWidth: 1.5,
      borderRadius: 14,
      paddingHorizontal: 16,
      paddingVertical: 12,
      minHeight: 80,
      textAlignVertical: 'top',
      marginBottom: 8,
    },
    dlgBtn: { flex: 1, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  });
}
