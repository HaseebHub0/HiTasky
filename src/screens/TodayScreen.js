// ============================================================
// TODAY — the focus view. "What do I do now?"
// First card is the hero "Now"; the rest are "Next". Reorderable
// via react-native-draggable-flatlist.
// ============================================================
import React, { useCallback } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import DraggableFlatList from 'react-native-draggable-flatlist';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useStore } from '../lib/store.js';
import { useAppTheme } from '../lib/useTheme.js';
import { todayTasks, doneGroups, listName, scheduledTasks } from '../lib/selectors.js';
import { headerDate } from '../lib/date.js';
import { softFeedback } from '../lib/feedback.js';
import { Wordmark } from '../components/Wordmark.js';
import { Icon } from '../components/icons.js';
import { TaskCard } from '../components/TaskCard.js';
import { PetCompanion } from '../components/PetCompanion.js';
import { Pet } from '../components/Pet.js';
import { getPet } from '../lib/pets.js';
import { Kicker, Display, H2, Meta, EmptyState } from '../components/ui.js';
import { FONT } from '../theme.js';

// Header — pet-change button (logo) + "Hi Tasky" wordmark on the left,
// settings button on the right. Styled like a glassy droplet.
function TodayHeader({ theme, settings, s, onOpenPets, onOpenSettings }) {
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
          style={[s.settingsBtn, { backgroundColor: theme.surface2, borderColor: theme.hairline2 }]}
          accessibilityRole="button"
          accessibilityLabel="Open settings"
        >
          <Icon.sliders size={18} color={theme.text3} />
        </Pressable>
      </View>
    </View>
  );
}

export function TodayScreen({ onOpenTask, onOpenPets, onOpenSettings }) {
  const { state, actions } = useStore();
  const theme = useAppTheme();
  const tasks = todayTasks(state);
  const done = doneGroups(state).today;
  const scheduled = scheduledTasks(state);

  const complete = useCallback((task) => actions.toggleTask(task.id, true), []);
  const uncomplete = useCallback((task) => actions.toggleTask(task.id, false), []);
  const nameFor = (t) => listName(state, t.listId);

  const hero = tasks[0] || null;
  const rest = tasks.slice(1);

  const onDragEnd = useCallback(({ data }) => {
    actions.reorder(data.map((t) => t.id));
  }, []);

  const renderItem = useCallback(({ item, drag, isActive, getIndex }) => {
    const idx = getIndex();
    return (
      <TaskCard
        task={item}
        theme={theme}
        settings={state.settings}
        listName={nameFor(item)}
        onComplete={complete}
        onOpen={onOpenTask}
        drag={drag}
        isActive={isActive}
      />
    );
  }, [theme, state.settings, state.lists]);

  const s = makeStyles(theme);

  // empty state
  if (tasks.length === 0 && done.length === 0 && scheduled.length === 0) {
    return (
      <ScrollView
        style={s.container}
        contentContainerStyle={[s.scroll, { flexGrow: 1 }]}
        showsVerticalScrollIndicator={false}
      >
        <TodayHeader
          theme={theme}
          settings={state.settings}
          s={s}
          onOpenPets={onOpenPets}
          onOpenSettings={onOpenSettings}
        />
        {/* Date subheader */}
        <Kicker style={{ color: theme.accent, paddingHorizontal: 4, marginBottom: 12 }}>{headerDate()}</Kicker>
        <EmptyState
          title="Nothing pressing."
          subtitle="You've cleared the page. Enjoy the white space for a while."
          footer="Tap  +  when something arrives."
          petId={state.settings.pet}
          theme={theme}
        />
      </ScrollView>
    );
  }

  return (
    <GestureHandlerRootView style={s.container}>
      <ScrollView
        style={s.container}
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <TodayHeader
          theme={theme}
          settings={state.settings}
          s={s}
          onOpenPets={onOpenPets}
          onOpenSettings={onOpenSettings}
        />

        {/* Date subheader */}
        <Kicker style={{ color: theme.accent, paddingHorizontal: 4, marginBottom: 12 }}>{headerDate()}</Kicker>

        {/* Hero card */}
        {hero && (
          <>
            <Kicker style={{ color: theme.text3, marginBottom: 12 }}>Now</Kicker>
            <TaskCard
              key={hero.id}
              task={hero}
              theme={theme}
              settings={state.settings}
              hero
              listName={nameFor(hero)}
              onComplete={complete}
              onOpen={onOpenTask}
            />
          </>
        )}

        {/* Next tasks */}
        {rest.length > 0 && (
          <>
            <View style={s.nextHeader}>
              <Text style={s.kicker}>
                NEXT · <Text style={{ color: theme.accent }}>{rest.length} left</Text>
              </Text>
            </View>
            {rest.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                theme={theme}
                settings={state.settings}
                listName={nameFor(task)}
                onComplete={complete}
                onOpen={onOpenTask}
              />
            ))}
          </>
        )}

        {/* Scheduled section */}
        {scheduled.length > 0 && (
          <>
            <View style={s.nextHeader}>
              <Text style={s.kicker}>
                SCHEDULED · <Text style={{ color: theme.accent }}>{scheduled.length} upcoming</Text>
              </Text>
            </View>
            {scheduled.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                theme={theme}
                settings={state.settings}
                listName={nameFor(task)}
                onComplete={complete}
                onOpen={onOpenTask}
              />
            ))}
          </>
        )}

        {/* Done section */}
        {done.length > 0 && (
          <>
            <View style={s.doneHeader}>
              <Text style={s.kicker}>DONE · {done.length}</Text>
              <View style={[s.hairline, { backgroundColor: theme.hairline }]} />
            </View>
            {done.map((t) => (
              <TaskCard
                key={t.id}
                task={t}
                theme={theme}
                settings={state.settings}
                listName={nameFor(t)}
                onUncomplete={uncomplete}
                onOpen={onOpenTask}
              />
            ))}
          </>
        )}

        <View style={{ height: 140 }} />
      </ScrollView>
    </GestureHandlerRootView>
  );
}

function makeStyles(t) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: t.bg },
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
    brand: { flexDirection: 'row', alignItems: 'center', gap: 9 },
    brandRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    brandWord: { fontFamily: FONT.serifMedium || FONT.serif, fontSize: 18, letterSpacing: 0.2 },
    dateMeta: { fontFamily: FONT.sansMedium, fontSize: 13 },
    headerRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
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
      alignItems: 'center',
      justifyContent: 'center',
    },
    kicker: {
      fontFamily: FONT.sansSemi,
      fontSize: 12,
      letterSpacing: 1.9,
      textTransform: 'uppercase',
      color: t.text3,
    },
    nextHeader: {
      marginTop: 24,
      marginBottom: 14,
    },
    doneHeader: {
      marginTop: 28,
      marginBottom: 8,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    hairline: { flex: 1, height: 1 },
    emptyWrap: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 38,
    },
  });
}
