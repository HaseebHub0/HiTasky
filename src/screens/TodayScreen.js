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
import { Wordmark } from '../components/Wordmark.js';
import { Icon } from '../components/icons.js';
import { TaskCard } from '../components/TaskCard.js';
import { Kicker, Display, H2, Meta, EmptyState } from '../components/ui.js';
import { FONT } from '../theme.js';

export function TodayScreen({ onOpenTask, onOpenSearch }) {
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
        <View style={s.header}>
          <Wordmark theme={theme} size={22} />
          <View style={s.headerRight}>
            <Pressable
              onPress={onOpenSearch}
              hitSlop={8}
              style={[s.searchBtn, { backgroundColor: theme.surface, borderColor: theme.hairline2 }]}
              accessibilityRole="button"
              accessibilityLabel="Search tasks"
            >
              <Icon.search size={18} color={theme.text3} />
            </Pressable>
            <Text style={[s.dateMeta, { color: theme.text3 }]}>{headerDate()}</Text>
          </View>
        </View>
        <EmptyState
          title="Nothing pressing."
          subtitle="You've cleared the page. Enjoy the white space for a while."
          footer="Tap  +  when something arrives."
          illustration="calm"
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
        <View style={s.header}>
          <Wordmark theme={theme} size={22} />
          <View style={s.headerRight}>
            <Pressable
              onPress={onOpenSearch}
              hitSlop={8}
              style={[s.searchBtn, { backgroundColor: theme.surface, borderColor: theme.hairline2 }]}
              accessibilityRole="button"
              accessibilityLabel="Search tasks"
            >
              <Icon.search size={18} color={theme.text3} />
            </Pressable>
            <Text style={[s.dateMeta, { color: theme.text3 }]}>{headerDate()}</Text>
          </View>
        </View>

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

        <View style={{ height: 100 }} />
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
      paddingTop: 16,
      paddingBottom: 26,
    },
    brand: { flexDirection: 'row', alignItems: 'center', gap: 9 },
    brandWord: { fontFamily: FONT.serifMedium || FONT.serif, fontSize: 18, letterSpacing: 0.2 },
    dateMeta: { fontFamily: FONT.sansMedium, fontSize: 13 },
    headerRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    searchBtn: {
      width: 38,
      height: 38,
      borderRadius: 12,
      borderWidth: 1,
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
