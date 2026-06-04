// ============================================================
// NoteSheet — hi-fidelity global note editor modal.
// ============================================================
import React, { useState, useEffect } from 'react';
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { FONT, ACCENTS } from '../theme.js';

export function NoteSheet({ open, mode, note, theme, onSave, onDelete, onClose }) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [accent, setAccent] = useState(ACCENTS[0]);

  useEffect(() => {
    if (open) {
      setTitle(note?.title || '');
      setContent(note?.content || '');
      setAccent(note?.accent || theme.accent || ACCENTS[0]);
    }
  }, [open, note, theme]);

  const handleSave = () => {
    onSave({
      title: title.trim(),
      content: content.trim(),
      accent,
    });
  };

  const s = makeStyles(theme);

  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={s.scrim} onPress={onClose} />
      <View style={s.centerWrap} pointerEvents="box-none">
        <View style={s.dialog}>
          <Text style={[s.dialogTitle, { color: theme.text }]}>
            {mode === 'edit' ? 'Edit note' : 'New note'}
          </Text>

          <TextInput
            style={[s.input, s.titleInput, { color: theme.text, borderColor: theme.hairline2 }]}
            placeholder="Title"
            placeholderTextColor={theme.text4}
            value={title}
            onChangeText={setTitle}
            selectionColor={accent}
          />

          <TextInput
            style={[s.input, s.contentInput, { color: theme.text, borderColor: theme.hairline2 }]}
            placeholder="Write something..."
            placeholderTextColor={theme.text4}
            value={content}
            onChangeText={setContent}
            multiline
            textAlignVertical="top"
            selectionColor={accent}
          />

          {/* Note color picker */}
          <View style={s.swatchRow}>
            {ACCENTS.map((c) => (
              <Pressable
                key={c}
                onPress={() => setAccent(c)}
                style={[s.swatch, { backgroundColor: c }, accent === c && s.swatchOn]}
              />
            ))}
          </View>

          <View style={s.btnRow}>
            {mode === 'edit' && (
              <Pressable style={[s.btn, s.deleteBtn]} onPress={() => onDelete(note.id)}>
                <Text style={s.deleteBtnText}>Delete</Text>
              </Pressable>
            )}
            <Pressable style={[s.btn, { backgroundColor: theme.surface2 }]} onPress={onClose}>
              <Text style={{ fontFamily: FONT.sansBold, fontSize: 14, color: theme.text2 }}>Close</Text>
            </Pressable>
            <Pressable style={[s.btn, { backgroundColor: accent }]} onPress={handleSave}>
              <Text style={{ fontFamily: FONT.sansBold, fontSize: 14, color: theme.mode === 'light' ? '#FFF' : '#1C1308' }}>Save</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function makeStyles(t) {
  return StyleSheet.create({
    scrim: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: t.scrim,
    },
    centerWrap: { flex: 1, justifyContent: 'center', paddingHorizontal: 24 },
    dialog: {
      backgroundColor: t.surface,
      borderRadius: 24,
      padding: 24,
      shadowColor: '#000',
      shadowOpacity: 0.3,
      shadowRadius: 20,
      elevation: 8,
    },
    dialogTitle: {
      fontFamily: FONT.serif,
      fontSize: 22,
      marginBottom: 16,
    },
    input: {
      fontFamily: FONT.sans,
      borderWidth: 1,
      borderRadius: 14,
      paddingHorizontal: 16,
      paddingVertical: 12,
      marginBottom: 14,
      backgroundColor: t.surface2,
    },
    titleInput: {
      fontFamily: FONT.sansSemi,
      fontSize: 16,
    },
    contentInput: {
      height: 140,
      fontSize: 14.5,
    },
    swatchRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
      rowGap: 12,
      marginBottom: 20,
      paddingHorizontal: 4,
    },
    swatch: {
      width: 28,
      height: 28,
      borderRadius: 14,
    },
    swatchOn: {
      borderWidth: 3,
      borderColor: '#fff',
    },
    btnRow: {
      flexDirection: 'row',
      gap: 10,
    },
    btn: {
      flex: 1,
      height: 46,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
    },
    deleteBtn: {
      backgroundColor: '#C2503A',
      flex: 0.8,
    },
    deleteBtnText: {
      fontFamily: FONT.sansBold,
      fontSize: 14,
      color: '#fff',
    },
  });
}
