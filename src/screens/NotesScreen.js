// ============================================================
// NOTES — a tactical scratchpad for jotting down thoughts.
// Rendered in a grid of glassmorphic, colorful cards.
// ============================================================
import React, { useState, useMemo } from 'react';
import {
  Dimensions,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  LayoutAnimation,
} from 'react-native';
import { useStore } from '../lib/store.js';
import { useAppTheme } from '../lib/useTheme.js';
import { Icon } from '../components/icons.js';
import { getPet } from '../lib/pets.js';
import { Pet, HeaderPet } from '../components/Pet.js';
import { Kicker, Display } from '../components/ui.js';
import { Wordmark } from '../components/Wordmark.js';
import { AppHeader } from '../components/AppHeader.js';
import { FONT, ACCENTS, softOf } from '../theme.js';
import { selectionFeedback } from '../lib/feedback.js';

const { width: SCREEN_W } = Dimensions.get('window');

function GlassyHeader({ theme, settings, onOpenPets, onOpenSettings }) {
  return (
    <AppHeader
      theme={theme}
      settings={settings}
      onOpenPets={onOpenPets}
      onOpenSettings={onOpenSettings}
    />
  );
}

export function NotesScreen({ onOpenSearch, onOpenPets, onOpenSettings, onOpenNote }) {
  const { state, actions } = useStore();
  const theme = useAppTheme();
  const notes = state.notes || [];
  const [notesLimit, setNotesLimit] = React.useState(12);
  const [query, setQuery] = React.useState('');

  const s = useMemo(() => makeStyles(theme), [theme]);

  // Sort notes: pinned notes first, keeping the relative order of others
  const sortedNotes = useMemo(() => {
    return [...notes].sort((a, b) => {
      const aPinned = !!a.pinned;
      const bPinned = !!b.pinned;
      if (aPinned !== bPinned) {
        return aPinned ? -1 : 1;
      }
      return 0;
    });
  }, [notes]);

  // Notes-only search — matches against BOTH title and content.
  const q = query.trim().toLowerCase();
  const filtered = q
    ? sortedNotes.filter(
        (n) =>
          (n.title || '').toLowerCase().includes(q) ||
          (n.content || '').toLowerCase().includes(q)
      )
    : sortedNotes;

  const visibleNotes = filtered.slice(0, notesLimit);

  const handleTogglePin = (note) => {
    selectionFeedback(state.settings);
    if (LayoutAnimation.configureNext) {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    }
    actions.updateNote(note.id, { pinned: !note.pinned });
  };

  // Build one ordered list so the "New note" card always comes AFTER the
  // last note (not first). Hidden while actively searching so results stay clean.
  const items = visibleNotes.map((n) => ({ key: n.id, type: 'note', note: n }));
  if (!q) items.push({ key: '__add__', type: 'add' });
  const col1 = items.filter((_, idx) => idx % 2 === 0);
  const col2 = items.filter((_, idx) => idx % 2 !== 0);

  const renderItem = (it) =>
    it.type === 'add' ? (
      <Pressable
        key={it.key}
        onPress={() => onOpenNote(null)}
        style={[s.noteCard, s.addNoteCard]}
      >
        <Icon.plus size={20} color={theme.text3} />
        <Text style={[s.addNoteText, { color: theme.text3 }]}>New note...</Text>
      </Pressable>
    ) : (
      <NoteCard
        key={it.key}
        note={it.note}
        theme={theme}
        onPress={() => onOpenNote(it.note)}
        onLongPress={() => handleTogglePin(it.note)}
      />
    );

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <ScrollView
        style={s.container}
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <GlassyHeader
          theme={theme}
          settings={state.settings}
          onOpenPets={onOpenPets}
          onOpenSettings={onOpenSettings}
        />

        {/* Notes search — searches titles & descriptions of notes only */}
        <View style={[s.searchBar, { backgroundColor: theme.surface, borderColor: theme.hairline2 }]}>
          <Icon.search size={16} color={theme.text3} />
          <TextInput
            style={[s.searchInput, { color: theme.text }]}
            placeholder="Search notes..."
            placeholderTextColor={theme.text3}
            value={query}
            onChangeText={setQuery}
            returnKeyType="search"
            autoCorrect={false}
          />
          {query.length > 0 && (
            <Pressable onPress={() => setQuery('')} hitSlop={10}>
              <Text style={[s.searchClear, { color: theme.text3 }]}>✕</Text>
            </Pressable>
          )}
        </View>

        {/* No-results message when searching */}
        {q && filtered.length === 0 ? (
          <View style={s.noResults}>
            <Text style={[s.noResultsText, { color: theme.text3 }]}>
              No notes match “{query.trim()}”.
            </Text>
          </View>
        ) : (
          <View style={s.gridRow}>
            <View style={s.gridCol}>{col1.map(renderItem)}</View>
            <View style={s.gridCol}>{col2.map(renderItem)}</View>
          </View>
        )}

        {filtered.length > notesLimit && (
          <Pressable
            onPress={() => setNotesLimit((prev) => prev + 12)}
            style={s.loadMoreBtn}
          >
            <Text style={s.loadMoreText}>Show older notes ({filtered.length - notesLimit} remaining)</Text>
          </Pressable>
        )}

        <View style={{ height: 120 }} />
      </ScrollView>
    </View>
  );
}

function NoteCard({ note, theme, onPress, onLongPress }) {
  const s = makeStyles(theme);
  const accent = note.accent || ACCENTS[0];
  const title = (note.title || '').trim();
  const content = (note.content || '').trim();
  const noteAccentSoft = softOf(accent, theme.mode === 'light' ? 0.08 : 0.12);
  const pinned = !!note.pinned;

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      style={[
        s.noteCard,
        {
          backgroundColor: theme.surface,
          borderColor: accent,
          shadowColor: accent,
        },
      ]}
    >
      {/* Background tint overlay */}
      <View style={[StyleSheet.absoluteFillObject, { backgroundColor: noteAccentSoft, borderRadius: theme.radius - 2 }]} />
      
      {pinned && (
        <View style={s.pinIconWrap}>
          <Icon.pin size={12} color={accent} fill={accent} />
        </View>
      )}

      {title ? (
        <Text style={[s.noteTitle, pinned ? { marginRight: 14 } : null, { color: theme.text }]} numberOfLines={2}>
          {title}
        </Text>
      ) : null}
      {content ? (
        <Text style={[s.noteContent, { color: theme.text2 }]} numberOfLines={6}>
          {content}
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
    searchInput: {
      flex: 1,
      fontFamily: FONT.sansMedium,
      fontSize: 14,
      padding: 0,
    },
    searchClear: {
      fontFamily: FONT.sansBold,
      fontSize: 13,
      paddingHorizontal: 2,
    },
    noResults: {
      paddingVertical: 40,
      alignItems: 'center',
    },
    noResultsText: {
      fontFamily: FONT.sansMedium,
      fontSize: 14,
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
    pinIconWrap: {
      position: 'absolute',
      top: 10,
      right: 10,
      zIndex: 10,
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
