// ============================================================
// NOTES — a tactical scratchpad for jotting down thoughts.
// Rendered in a grid of glassmorphic, colorful cards.
// ============================================================
import React, { useState } from 'react';
import {
  Dimensions,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useStore } from '../lib/store.js';
import { useAppTheme } from '../lib/useTheme.js';
import { Icon } from '../components/icons.js';
import { getPet } from '../lib/pets.js';
import { Pet, HeaderPet } from '../components/Pet.js';
import { Kicker, Display } from '../components/ui.js';
import { FONT, ACCENTS, softOf } from '../theme.js';

const { width: SCREEN_W } = Dimensions.get('window');

function GlassyHeader({ theme, settings, title, onOpenPets, onOpenSettings }) {
  const s = makeStyles(theme);
  const currentPet = settings?.pet || 'zen';

  return (
    <View style={s.glassHeader}>
      <View style={s.brandRow}>
        <HeaderPet petId={currentPet} theme={theme} onPress={onOpenPets} />
        <Text style={[s.brandWord, { color: theme.text }]}>{title}</Text>
      </View>
      <View style={s.headerRight}>
        <Pressable
          onPress={onOpenSettings}
          hitSlop={8}
          style={s.settingsBtn}
          accessibilityRole="button"
          accessibilityLabel="Open settings"
        >
          <Icon.sliders size={18} color={theme.text3} />
        </Pressable>
      </View>
    </View>
  );
}

export function NotesScreen({ onOpenSearch, onOpenPets, onOpenSettings, onOpenNote }) {
  const { state } = useStore();
  const theme = useAppTheme();
  const notes = state.notes || [];
  const [notesLimit, setNotesLimit] = React.useState(12);

  const s = makeStyles(theme);

  // Group notes into 2 columns for a clean grid layout
  const visibleNotes = notes.slice(0, notesLimit);
  const col1 = visibleNotes.filter((_, idx) => idx % 2 === 0);
  const col2 = visibleNotes.filter((_, idx) => idx % 2 !== 0);

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <ScrollView
        style={s.container}
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
      >
        <GlassyHeader
          theme={theme}
          settings={state.settings}
          title="Hi Tasky"
          onOpenPets={onOpenPets}
          onOpenSettings={onOpenSettings}
        />

        {/* Search Kicker */}
        <Pressable
          style={[s.searchBar, { backgroundColor: theme.surface, borderColor: theme.hairline2 }]}
          onPress={onOpenSearch}
        >
          <Icon.search size={16} color={theme.text3} />
          <Text style={s.searchPlaceholder}>Search tasks...</Text>
        </Pressable>

        {/* Notes Grid */}
        <View style={s.gridRow}>
          {/* Column 1 */}
          <View style={s.gridCol}>
            {/* Add note card as the first item */}
            <Pressable onPress={() => onOpenNote(null)} style={[s.noteCard, s.addNoteCard]}>
              <Icon.plus size={20} color={theme.text3} />
              <Text style={[s.addNoteText, { color: theme.text3 }]}>New note...</Text>
            </Pressable>

            {col1.map((note) => (
              <NoteCard key={note.id} note={note} theme={theme} onPress={() => onOpenNote(note)} />
            ))}
          </View>

          {/* Column 2 */}
          <View style={s.gridCol}>
            {col2.map((note) => (
              <NoteCard key={note.id} note={note} theme={theme} onPress={() => onOpenNote(note)} />
            ))}
            {notes.length === 0 && (
              <View style={s.emptyColumnSpacer} />
            )}
        </View>
      </View>

        {notes.length > notesLimit && (
          <Pressable
            onPress={() => setNotesLimit((prev) => prev + 12)}
            style={s.loadMoreBtn}
          >
            <Text style={s.loadMoreText}>Show older notes ({notes.length - notesLimit} remaining)</Text>
          </Pressable>
        )}

        <View style={{ height: 120 }} />
      </ScrollView>
    </View>
  );
}

function NoteCard({ note, theme, onPress }) {
  const s = makeStyles(theme);
  const noteAccentSoft = softOf(note.accent, theme.mode === 'light' ? 0.08 : 0.12);

  return (
    <Pressable
      onPress={onPress}
      style={[
        s.noteCard,
        {
          backgroundColor: theme.surface,
          borderColor: note.accent,
          shadowColor: note.accent,
        },
      ]}
    >
      {/* Background tint overlay */}
      <View style={[StyleSheet.absoluteFillObject, { backgroundColor: noteAccentSoft, borderRadius: theme.radius - 2 }]} />
      {note.title.trim() ? (
        <Text style={[s.noteTitle, { color: theme.text }]} numberOfLines={2}>
          {note.title}
        </Text>
      ) : null}
      {note.content.trim() ? (
        <Text style={[s.noteContent, { color: theme.text2 }]} numberOfLines={6}>
          {note.content}
        </Text>
      ) : null}
    </Pressable>
  );
}

function makeStyles(t) {
  return StyleSheet.create({
    container: { flex: 1 },
    scroll: { paddingHorizontal: 22 },
    glassHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 22,
      paddingVertical: 14,
      borderRadius: 32,
      borderWidth: 2,
      borderColor: t.surface2,
      backgroundColor: t.surface,
      marginTop: 16,
      marginBottom: 20,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: t.mode === 'light' ? 0.08 : 0.25,
      shadowRadius: 12,
      elevation: 5,
    },
    brandRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    brandWord: { fontFamily: FONT.serifMedium || FONT.serif, fontSize: 18, letterSpacing: 0.2 },
    headerRight: { flexDirection: 'row', alignItems: 'center' },
    petBtn: {
      width: 34,
      height: 34,
      borderRadius: 17,
      borderWidth: 1.5,
      alignItems: 'center',
      justifyContent: 'center',
    },
    petEmoji: {
      fontSize: 18,
    },
    settingsBtn: {
      width: 32,
      height: 32,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: t.hairline2,
      backgroundColor: t.surface2,
      alignItems: 'center',
      justifyContent: 'center',
    },
    searchBar: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: t.surface,
      borderColor: t.hairline2,
      borderWidth: 1,
      borderRadius: 14,
      paddingHorizontal: 16,
      paddingVertical: 11,
      marginBottom: 20,
      gap: 10,
      shadowColor: '#000',
      shadowOpacity: t.mode === 'light' ? 0.05 : 0.15,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 3 },
      elevation: 2,
    },
    searchPlaceholder: {
      fontFamily: FONT.sansMedium,
      fontSize: 14,
      color: t.text3,
    },
    gridRow: {
      flexDirection: 'row',
      gap: 12,
    },
    gridCol: {
      flex: 1,
      gap: 12,
    },
    noteCard: {
      borderWidth: 1.5,
      borderRadius: t.radius - 2,
      padding: 16,
      minHeight: 80,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.1,
      shadowRadius: 10,
      elevation: 2,
      position: 'relative',
      overflow: 'hidden',
    },
    addNoteCard: {
      backgroundColor: 'transparent',
      borderColor: t.hairline2,
      borderStyle: 'dashed',
      justifyContent: 'center',
      alignItems: 'center',
      gap: 8,
      shadowOpacity: 0,
      elevation: 0,
      minHeight: 110,
    },
    addNoteText: {
      fontFamily: FONT.sansSemi,
      fontSize: 14,
    },
    emptyColumnSpacer: {
      height: 10,
    },
    noteTitle: {
      fontFamily: FONT.serifMedium || FONT.serif,
      fontSize: 16,
      fontWeight: '600',
      marginBottom: 6,
    },
    noteContent: {
      fontFamily: FONT.sans,
      fontSize: 13,
      lineHeight: 19,
    },
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
      justifyContent: 'space-between',
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
    loadMoreBtn: {
      paddingVertical: 13,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: t.radius,
      backgroundColor: t.surface2,
      marginTop: 20,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: t.hairline,
    },
    loadMoreText: {
      fontFamily: FONT.sansSemi,
      fontSize: 12.5,
      color: t.text3,
    },
  });
}
