// ============================================================
// LISTS — flat projects. Overview + detail view.
// Space and elevation separate tasks; never heavy divider lines.
// ============================================================
import React, { useState, useCallback } from 'react';
import {
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
import { listSummary, tasksForList, inboxTasks } from '../lib/selectors.js';
import { Icon } from '../components/icons.js';
import { Wordmark } from '../components/Wordmark.js';
import { TaskCard } from '../components/TaskCard.js';
import { getPet } from '../lib/pets.js';
import { Kicker, Display, H2, ConfirmDialog, EmptyState } from '../components/ui.js';
import { FONT, ACCENTS, softOf } from '../theme.js';

const LIST_ICONS = [
  { id: 'list', label: 'List' },
  { id: 'book', label: 'Book' },
  { id: 'home', label: 'Home' },
  { id: 'briefcase', label: 'Work' },
  { id: 'heart', label: 'Love' },
  { id: 'star', label: 'Star' },
];

function ListsOverviewHeader({ theme, settings, s, onOpenPets, onOpenSettings }) {
  const currentPet = settings?.pet || 'zen';
  const pet = getPet(currentPet);

  return (
    <View style={s.header}>
      <View style={s.brandRow}>
        <Pressable
          onPress={onOpenPets}
          hitSlop={8}
          style={[s.petBtn, { backgroundColor: theme.accentSoft, borderColor: theme.accent }]}
          accessibilityRole="button"
          accessibilityLabel="Open pet companion selector"
        >
          <Text style={s.petEmoji}>{pet.emoji}</Text>
        </Pressable>
        <Wordmark theme={theme} size={22} />
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

/* ================================================================
   OVERVIEW — every list at a glance
   ================================================================ */
export function ListsOverview({ onOpenList, onNewList, onOpenPets, onOpenSettings }) {
  const { state } = useStore();
  const theme = useAppTheme();
  const lists = listSummary(state);
  const s = makeOverviewStyles(theme);

  const tile = (key, icon, name, sub, accent, onPress) => (
    <Pressable key={key} style={s.tile} onPress={onPress}>
      <View style={[s.swatch, accent && { backgroundColor: softOf(accent, 0.16) }]}>
        {icon}
      </View>
      <View style={s.tileBody}>
        <Text style={[s.tileName, { color: theme.text }]}>{name}</Text>
        <Text style={[s.tileSub, { color: theme.text3 }]}>{sub}</Text>
      </View>
      <Icon.chev size={16} color={theme.text4} />
    </Pressable>
  );

  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.bg }} contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
      <ListsOverviewHeader
        theme={theme}
        settings={state.settings}
        s={s}
        onOpenPets={onOpenPets}
        onOpenSettings={onOpenSettings}
      />

      {/* Lists */}
      {lists.map((l) => {
        const sub = l.total === 0 ? 'No tasks yet'
          : l.remaining === 0 ? `All ${l.total} done`
          : `${l.remaining} left · ${l.done} done`;
        const ListIcon = Icon[l.icon] || Icon.lists;
        return tile(l.id, <ListIcon size={20} color={l.accent} />, l.name, sub, l.accent,
          () => onOpenList(l.id));
      })}

      {/* New list */}
      <Pressable style={[s.tile, { marginTop: 13 }]} onPress={onNewList}>
        <View style={s.swatch}>
          <Icon.plus size={20} color={theme.text3} />
        </View>
        <View style={s.tileBody}>
          <Text style={[s.tileName, { color: theme.text }]}>New list</Text>
          <Text style={[s.tileSub, { color: theme.text3 }]}>Group tasks your way</Text>
        </View>
      </Pressable>

      <View style={{ height: 140 }} />
    </ScrollView>
  );
}

function makeOverviewStyles(t) {
  return StyleSheet.create({
    scroll: { paddingHorizontal: 22 },
    header: {
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
    tile: {
      backgroundColor: t.surface,
      borderRadius: t.radius,
      padding: 18,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 16,
      marginBottom: 10,
      shadowColor: '#000',
      shadowOpacity: t.mode === 'light' ? 0.1 : 0.35,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: 8 },
      elevation: 3,
    },
    swatch: {
      width: 44,
      height: 44,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: t.surface2,
    },
    tileBody: { flex: 1, gap: 3 },
    tileName: { fontFamily: FONT.sansSemi, fontSize: 15.5 },
    tileSub: { fontFamily: FONT.sansMedium, fontSize: 12.5 },
  });
}

/* ================================================================
   DETAIL — a single list's tasks
   ================================================================ */
export function ListDetail({ listId, onBack, onOpenTask, onAddTask, onTriggerPaywall, onOpenPets, onOpenSettings }) {
  const { state, actions } = useStore();
  const theme = useAppTheme();
  const [editing, setEditing] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);

  const isInbox = !listId;
  const list = isInbox ? null : state.lists.find((l) => l.id === listId);

  if (!isInbox && !list) {
    onBack();
    return null;
  }

  const { active, done } = isInbox
    ? { active: inboxTasks(state), done: [] }
    : tasksForList(state, listId);
  const doneCount = isInbox
    ? state.tasks.filter((t) => !t.listId && t.isCompleted).length
    : done.length;
  const total = active.length + (isInbox ? doneCount : done.length);

  const complete = useCallback((task) => actions.toggleTask(task.id, true), []);
  const uncomplete = useCallback((task) => actions.toggleTask(task.id, false), []);

  const s = makeDetailStyles(theme);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.bg }} contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
      <View style={s.header}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <Pressable style={s.backBtn} onPress={onBack}>
            <Icon.chevLeft size={16} color={theme.text3} />
            <Text style={[s.backText, { color: theme.text3 }]}>Lists</Text>
          </Pressable>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Pressable
              onPress={onOpenPets}
              hitSlop={8}
              style={[s.petBtn, { backgroundColor: theme.accentSoft, borderColor: theme.accent }]}
              accessibilityRole="button"
              accessibilityLabel="Open pet companion selector"
            >
              <Text style={s.petEmoji}>{getPet(state.settings.pet || 'zen').emoji}</Text>
            </Pressable>
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

        <View style={s.headerRow}>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              {list && (() => {
                const DetailIcon = Icon[list.icon] || Icon.lists;
                return <DetailIcon size={18} color={list.accent} />;
              })()}
              <Kicker style={{ color: theme.text3, marginBottom: 0 }}>
                {isInbox ? 'Unfiled' : 'Project'}
              </Kicker>
            </View>
            <Display style={{ color: theme.text }}>{isInbox ? 'Inbox' : list.name}</Display>
            <View style={s.progress}>
              <Text style={s.progressText}>
                {total === 0 ? (
                  'Nothing here yet'
                ) : (
                  <>
                    <Text style={{ fontFamily: FONT.serif, fontSize: 19, color: theme.accent }}>{doneCount}</Text>
                    <Text style={{ color: theme.text3 }}> of {total} done</Text>
                  </>
                )}
              </Text>
            </View>
          </View>
          {!isInbox && (
            <Pressable onPress={() => setEditing(true)} hitSlop={10} style={[s.settingsBtn, { width: 38, height: 38, borderRadius: 12 }]}>
              <Icon.gear size={20} color={theme.text3} />
            </Pressable>
          )}
        </View>
      </View>

      {/* Add Task Card */}
      <Pressable
        style={[
          s.addCard,
          {
            borderColor: theme.hairline2,
            backgroundColor: theme.surface,
          },
        ]}
        onPress={onAddTask}
      >
        <View style={s.addCardRow}>
          <Icon.plus size={16} color={theme.accent} />
          <Text style={[s.addCardText, { color: theme.text3 }]}>
            Add task to this list...
          </Text>
        </View>
      </Pressable>

      {/* Active tasks */}
      {active.length > 0 ? (
        active.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            theme={theme}
            settings={state.settings}
            onComplete={complete}
            onOpen={onOpenTask}
          />
        ))
      ) : total === 0 ? (
        <EmptyState
          title="A blank page."
          subtitle="This list is empty. Add the first thing to get started."
          icon={list?.icon || 'list'}
          theme={theme}
        />
      ) : (
        <H2 style={{ color: theme.text2, fontWeight: '300', paddingVertical: 18, paddingHorizontal: 2, fontStyle: 'italic' }}>
          All done here. Lovely.
        </H2>
      )}

      {/* Done tasks */}
      {done.length > 0 && (
        <>
          <Kicker style={{ color: theme.text3, marginTop: 28, marginBottom: 6 }}>Done</Kicker>
          {done.map((t) => (
            <TaskCard
              key={t.id}
              task={t}
              theme={theme}
              settings={state.settings}
              onUncomplete={uncomplete}
              onOpen={onOpenTask}
            />
          ))}
        </>
      )}

      <View style={{ height: 100 }} />

      {/* Edit list dialog */}
      {editing && (
        <ListEditDialog
          list={list}
          theme={theme}
          onClose={() => setEditing(false)}
          onTriggerPaywall={onTriggerPaywall}
          onSave={(patch) => { actions.updateList(list.id, patch); setEditing(false); }}
          onDelete={() => { setEditing(false); setConfirmDel(true); }}
        />
      )}

      <ConfirmDialog
        open={confirmDel}
        title={`Delete "${list ? list.name : ''}"?`}
        body="The list is removed. Its tasks move to your Inbox — nothing is lost."
        confirmLabel="Delete list"
        danger
        theme={theme}
        onCancel={() => setConfirmDel(false)}
        onConfirm={() => { actions.deleteList(list.id); setConfirmDel(false); onBack(); }}
      />
    </ScrollView>
  );
}

function makeDetailStyles(t) {
  return StyleSheet.create({
    scroll: { paddingHorizontal: 22 },
    header: {
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
    backBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingVertical: 6,
      paddingHorizontal: 12,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: t.hairline2,
      backgroundColor: t.surface2,
    },
    backText: { fontFamily: FONT.sansSemi, fontSize: 14 },
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
    headerRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginTop: 12 },
    progress: { marginTop: 10 },
    progressText: { fontFamily: FONT.sansMedium, fontSize: 13, color: t.text3 },
    addCard: {
      borderWidth: 1.5,
      borderStyle: 'dashed',
      borderRadius: t.radius,
      paddingVertical: 14,
      paddingHorizontal: 20,
      marginBottom: 16,
      alignItems: 'center',
      justifyContent: 'center',
    },
    addCardRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    addCardText: {
      fontFamily: FONT.sansSemi,
      fontSize: 14.5,
    },
  });
}

/* ================================================================
   LIST EDIT DIALOG
   ================================================================ */
function ListEditDialog({ list, theme, onSave, onDelete, onClose, onTriggerPaywall }) {
  const { state } = useStore();
  const [name, setName] = useState(list.name);
  const [accent, setAccent] = useState(list.accent);
  const [selectedIcon, setSelectedIcon] = useState(list.icon || 'list');
  const s = makeDialogStyles(theme);

  return (
    <Modal transparent visible animationType="fade" onRequestClose={onClose}>
      <Pressable style={[StyleSheet.absoluteFill, { backgroundColor: theme.scrim }]} onPress={onClose} />
      <View style={s.centerWrap} pointerEvents="box-none">
        <View style={[s.dialog, { backgroundColor: theme.surface }]}>
          <Text style={[s.dialogTitle, { color: theme.text }]}>Edit list</Text>
          <TextInput
            style={[s.input, { color: theme.text, borderColor: theme.hairline2 }]}
            value={name}
            onChangeText={setName}
            autoFocus
            selectionColor={theme.accent}
            onSubmitEditing={() => name.trim() && onSave({ name: name.trim(), accent, icon: selectedIcon })}
          />
          
          <View style={s.swatchRow}>
            {ACCENTS.map((c) => (
              <Pressable
                key={c}
                onPress={() => {
                  if (!state.settings.purchased) {
                    onTriggerPaywall();
                  } else {
                    setAccent(c);
                  }
                }}
                style={[s.swatchPick, { backgroundColor: c }, accent === c && s.swatchOn]}
              />
            ))}
          </View>

          <View style={s.iconRow}>
            {LIST_ICONS.map((item) => {
              const IconComp = Icon[item.id] || Icon.lists;
              const isSelected = selectedIcon === item.id;
              return (
                <Pressable
                  key={item.id}
                  onPress={() => {
                    if (!state.settings.purchased) {
                      onTriggerPaywall();
                    } else {
                      setSelectedIcon(item.id);
                    }
                  }}
                  style={[
                    s.iconPick,
                    {
                      backgroundColor: isSelected ? theme.accentSoft : theme.surface2,
                      borderColor: isSelected ? theme.accent : 'transparent',
                    },
                  ]}
                >
                  <IconComp size={18} color={isSelected ? theme.accent : theme.text2} />
                </Pressable>
              );
            })}
          </View>

          <View style={s.btnRow}>
            <Pressable style={[s.btn, { backgroundColor: theme.surface2 }]} onPress={onDelete}>
              <Text style={{ fontFamily: FONT.sansBold, fontSize: 14, color: '#d2674e' }}>Delete</Text>
            </Pressable>
            <Pressable
              style={[s.btn, { backgroundColor: theme.accent }]}
              onPress={() => name.trim() && onSave({ name: name.trim(), accent, icon: selectedIcon })}
            >
              <Text style={{ fontFamily: FONT.sansBold, fontSize: 14, color: theme.onAccent }}>Save</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function makeDialogStyles(t) {
  return StyleSheet.create({
    centerWrap: { flex: 1, justifyContent: 'center', paddingHorizontal: 24 },
    dialog: { borderRadius: 24, padding: 24 },
    dialogTitle: { fontFamily: FONT.serif, fontSize: 22, marginBottom: 16 },
    input: {
      fontFamily: FONT.sans,
      fontSize: 16,
      borderWidth: 1,
      borderRadius: 14,
      paddingHorizontal: 16,
      paddingVertical: 12,
      marginBottom: 16,
    },
    swatchRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
    swatchPick: { width: 30, height: 30, borderRadius: 15 },
    swatchOn: { borderWidth: 3, borderColor: '#fff' },
    iconRow: { flexDirection: 'row', gap: 10, marginBottom: 20, flexWrap: 'wrap' },
    iconPick: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1.5,
    },
    btnRow: { flexDirection: 'row', gap: 10 },
    btn: { flex: 1, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  });
}

/* ================================================================
   NEW LIST DIALOG (used from App.js)
   ================================================================ */
export function NewListDialog({ theme, onCreate, onClose, onTriggerPaywall, state }) {
  const [name, setName] = useState('');
  const [accent, setAccent] = useState(ACCENTS[0]);
  const [selectedIcon, setSelectedIcon] = useState('list');
  const s = makeDialogStyles(theme);

  return (
    <Modal transparent visible animationType="fade" onRequestClose={onClose}>
      <Pressable style={[StyleSheet.absoluteFill, { backgroundColor: theme.scrim }]} onPress={onClose} />
      <View style={s.centerWrap} pointerEvents="box-none">
        <View style={[s.dialog, { backgroundColor: theme.surface }]}>
          <Text style={[s.dialogTitle, { color: theme.text }]}>New list</Text>
          <TextInput
            style={[s.input, { color: theme.text, borderColor: theme.hairline2 }]}
            placeholder="e.g. Work, Reading, Home"
            placeholderTextColor={theme.text4}
            value={name}
            onChangeText={setName}
            autoFocus
            selectionColor={theme.accent}
            onSubmitEditing={() => name.trim() && onCreate(name.trim(), accent, selectedIcon)}
          />

          <View style={s.swatchRow}>
            {ACCENTS.map((c) => (
              <Pressable
                key={c}
                onPress={() => {
                  if (state && !state.settings.purchased) {
                    onTriggerPaywall();
                  } else {
                    setAccent(c);
                  }
                }}
                style={[s.swatchPick, { backgroundColor: c }, accent === c && s.swatchOn]}
              />
            ))}
          </View>

          <View style={s.iconRow}>
            {LIST_ICONS.map((item) => {
              const IconComp = Icon[item.id] || Icon.lists;
              const isSelected = selectedIcon === item.id;
              return (
                <Pressable
                  key={item.id}
                  onPress={() => {
                    if (state && !state.settings.purchased) {
                      onTriggerPaywall();
                    } else {
                      setSelectedIcon(item.id);
                    }
                  }}
                  style={[
                    s.iconPick,
                    {
                      backgroundColor: isSelected ? theme.accentSoft : theme.surface2,
                      borderColor: isSelected ? theme.accent : 'transparent',
                    },
                  ]}
                >
                  <IconComp size={18} color={isSelected ? theme.accent : theme.text2} />
                </Pressable>
              );
            })}
          </View>

          <View style={s.btnRow}>
            <Pressable style={[s.btn, { backgroundColor: theme.surface2 }]} onPress={onClose}>
              <Text style={{ fontFamily: FONT.sansBold, fontSize: 14, color: theme.text2 }}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[s.btn, { backgroundColor: theme.accent }]}
              onPress={() => name.trim() && onCreate(name.trim(), accent, selectedIcon)}
            >
              <Text style={{ fontFamily: FONT.sansBold, fontSize: 14, color: theme.onAccent }}>Create</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
