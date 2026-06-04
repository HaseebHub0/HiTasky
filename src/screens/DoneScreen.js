// ============================================================
// JOURNAL — an achievements dashboard and history of completed tasks.
// Shows streaks, weekly productivity charts, and logs.
// ============================================================
import React, { useCallback } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useStore } from '../lib/store.js';
import { useAppTheme } from '../lib/useTheme.js';
import { doneGroups, listName } from '../lib/selectors.js';
import { Icon } from '../components/icons.js';
import { Wordmark } from '../components/Wordmark.js';
import { TaskCard } from '../components/TaskCard.js';
import { getPet } from '../lib/pets.js';
import { Pet, HeaderPet } from '../components/Pet.js';
import { Kicker, Display, H2, Meta, EmptyState } from '../components/ui.js';
import { FONT } from '../theme.js';

// Calculate the completion streak (consecutive days of completed tasks ending today or yesterday)
function calculateStreak(tasks) {
  const completedDates = new Set(
    tasks
      .filter((t) => t.isCompleted && t.completedAt)
      .map((t) => {
        const d = new Date(t.completedAt);
        return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      })
  );

  let streak = 0;
  let checkDate = new Date();
  const formatDate = (date) => `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;

  // If today has completion, count starting today
  if (completedDates.has(formatDate(checkDate))) {
    while (completedDates.has(formatDate(checkDate))) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    }
  } else {
    // Check if yesterday was completed
    checkDate.setDate(checkDate.getDate() - 1);
    if (completedDates.has(formatDate(checkDate))) {
      while (completedDates.has(formatDate(checkDate))) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      }
    }
  }
  return streak;
}

function DoneHeader({ theme, settings, s, onOpenPets, onOpenSettings }) {
  const currentPet = settings?.pet || 'zen';

  return (
    <View style={s.header}>
      <View style={s.brandRow}>
        <HeaderPet petId={currentPet} theme={theme} onPress={onOpenPets} />
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

export function DoneScreen({ onOpenTask, onOpenPets, onOpenSettings }) {
  const { state, actions } = useStore();
  const theme = useAppTheme();
  const { today, yesterday, earlier, total } = doneGroups(state);
  const [earlierLimit, setEarlierLimit] = React.useState(15);
  const uncomplete = useCallback((task) => actions.toggleTask(task.id, false), []);
  const nameFor = (t) => listName(state, t.listId);

  // Calculate 7-day stats
  const last7Days = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d;
  });

  const dayCounts = last7Days.map((d) => {
    const count = state.tasks.filter((t) => {
      if (!t.isCompleted || !t.completedAt) return false;
      const tc = new Date(t.completedAt);
      return (
        tc.getFullYear() === d.getFullYear() &&
        tc.getMonth() === d.getMonth() &&
        tc.getDate() === d.getDate()
      );
    }).length;
    return {
      date: d,
      count,
      label: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()],
    };
  });

  const completedThisWeekCount = dayCounts.reduce((acc, curr) => acc + curr.count, 0);
  const streak = calculateStreak(state.tasks);

  const section = (label, items) =>
    items.length > 0 && (
      <>
        <Kicker style={{ color: theme.text3, marginTop: 24, marginBottom: 6 }}>{label}</Kicker>
        {items.map((t) => (
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
    );

  const s = makeStyles(theme);
  const maxCount = Math.max(...dayCounts.map((d) => d.count), 1);

  return (
    <ScrollView
      style={s.container}
      contentContainerStyle={s.scroll}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <DoneHeader
        theme={theme}
        settings={state.settings}
        s={s}
        onOpenPets={onOpenPets}
        onOpenSettings={onOpenSettings}
      />

      <View style={{ marginTop: 6, marginBottom: 16 }}>
        <Kicker style={{ color: theme.text3, marginBottom: 6 }}>Journal</Kicker>
        <Display style={{ color: theme.text }}>Your progress.</Display>
      </View>

      {/* Stats Cards Row */}
      <View style={s.statsRow}>
        <View style={[s.statCard, { backgroundColor: theme.surface, borderColor: theme.hairline }]}>
          <Text style={[s.statKicker, { color: theme.text3 }]}>STREAK</Text>
          <View style={s.statValueRow}>
            <Text style={[s.statVal, { color: theme.text }]}>{streak}</Text>
            <Text style={[s.statLabel, { color: theme.text2 }]}>
              {streak === 1 ? 'day' : 'days'}
            </Text>
          </View>
        </View>
        <View style={[s.statCard, { backgroundColor: theme.surface, borderColor: theme.hairline }]}>
          <Text style={[s.statKicker, { color: theme.text3 }]}>THIS WEEK</Text>
          <View style={s.statValueRow}>
            <Text style={[s.statVal, { color: theme.text }]}>{completedThisWeekCount}</Text>
            <Text style={[s.statLabel, { color: theme.text2 }]}>
              {completedThisWeekCount === 1 ? 'task' : 'tasks'}
            </Text>
          </View>
        </View>
      </View>

      {/* Weekly Activity Bar Chart */}
      <View style={[s.chartCard, { backgroundColor: theme.surface, borderColor: theme.hairline }]}>
        <Text style={[s.chartTitle, { color: theme.text }]}>Weekly Activity</Text>
        <Text style={[s.chartSub, { color: theme.text3 }]}>Completions per day</Text>

        <View style={s.chartRow}>
          {dayCounts.map((dc, index) => {
            const barHeight = (dc.count / maxCount) * 80;
            const isToday = index === 6;
            return (
              <View key={index} style={s.chartCol}>
                <Text style={[s.chartCount, { color: dc.count > 0 ? theme.text : 'transparent' }]}>
                  {dc.count}
                </Text>
                <View style={[s.barTrack, { backgroundColor: theme.surface2 }]}>
                  <View
                    style={[
                      s.bar,
                      {
                        height: Math.max(barHeight, 4),
                        backgroundColor: dc.count > 0 ? theme.accent : theme.text4,
                        opacity: dc.count > 0 ? 1 : 0.25,
                      },
                    ]}
                  />
                </View>
                <Text
                  style={[
                    s.barLabel,
                    {
                      color: isToday ? theme.accent : theme.text3,
                      fontFamily: isToday ? FONT.sansBold : FONT.sansMedium,
                    },
                  ]}
                >
                  {dc.label}
                </Text>
              </View>
            );
          })}
        </View>
      </View>

      {/* History Log */}
      {total > 0 ? (
        <View style={s.historyContainer}>
          <View style={s.historyHeader}>
            <Text style={[s.kicker, { color: theme.text3 }]}>HISTORY LOG</Text>
            <Text style={[s.lifetimeText, { color: theme.text3 }]}>{total} total finished</Text>
          </View>
          {section('Today', today)}
          {section('Yesterday', yesterday)}
          {section('Earlier', earlier.slice(0, earlierLimit))}
          {earlier.length > earlierLimit && (
            <Pressable
              onPress={() => setEarlierLimit((prev) => prev + 20)}
              style={s.loadMoreBtn}
            >
              <Text style={s.loadMoreText}>Show older history ({earlier.length - earlierLimit} remaining)</Text>
            </Pressable>
          )}
        </View>
      ) : (
        <EmptyState
          title="Start your journal."
          subtitle="Complete tasks from your dashboard and track your progress here."
          illustration="journal"
          theme={theme}
        />
      )}

      <View style={{ height: 140 }} />
    </ScrollView>
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
    brand: { flexDirection: 'row', alignItems: 'center', gap: 9 },
    dateMeta: { fontFamily: FONT.sansMedium, fontSize: 13 },
    statsRow: {
      flexDirection: 'row',
      gap: 12,
      marginBottom: 16,
    },
    statCard: {
      flex: 1,
      borderRadius: t.radius,
      borderWidth: 1,
      padding: 16,
      justifyContent: 'center',
      shadowColor: '#000',
      shadowOpacity: t.mode === 'light' ? 0.04 : 0.15,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 4 },
      elevation: 2,
    },
    statKicker: {
      fontFamily: FONT.sansSemi,
      fontSize: 10.5,
      letterSpacing: 1.2,
      marginBottom: 6,
    },
    statValueRow: {
      flexDirection: 'row',
      alignItems: 'baseline',
      gap: 6,
    },
    statVal: {
      fontFamily: FONT.serifMedium || FONT.serif,
      fontSize: 28,
      fontWeight: '600',
    },
    statLabel: {
      fontFamily: FONT.sansMedium,
      fontSize: 13,
    },
    chartCard: {
      borderRadius: t.radius,
      borderWidth: 1,
      padding: 18,
      marginBottom: 26,
      shadowColor: '#000',
      shadowOpacity: t.mode === 'light' ? 0.04 : 0.15,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 4 },
      elevation: 2,
    },
    chartTitle: {
      fontFamily: FONT.serifMedium || FONT.serif,
      fontSize: 17,
      fontWeight: '600',
    },
    chartSub: {
      fontFamily: FONT.sansMedium,
      fontSize: 12,
      marginTop: 2,
    },
    chartRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-end',
      marginTop: 18,
      paddingHorizontal: 4,
    },
    chartCol: {
      alignItems: 'center',
      flex: 1,
    },
    chartCount: {
      fontSize: 10.5,
      fontFamily: FONT.sansBold,
      marginBottom: 6,
      height: 14,
    },
    barTrack: {
      height: 80,
      width: 14,
      borderRadius: 4,
      justifyContent: 'flex-end',
      overflow: 'hidden',
    },
    bar: {
      width: '100%',
      borderRadius: 4,
    },
    barLabel: {
      fontSize: 10.5,
      marginTop: 8,
    },
    historyContainer: {
      marginTop: 8,
    },
    historyHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'baseline',
      borderBottomWidth: 1,
      borderBottomColor: t.hairline,
      paddingBottom: 8,
      marginBottom: 8,
    },
    kicker: {
      fontFamily: FONT.sansSemi,
      fontSize: 11,
      letterSpacing: 1.5,
    },
    lifetimeText: {
      fontFamily: FONT.sansMedium,
      fontSize: 11.5,
    },
    emptyWrap: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 38,
      paddingVertical: 40,
    },
    loadMoreBtn: {
      paddingVertical: 13,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: t.radius,
      backgroundColor: t.surface2,
      marginTop: 8,
      marginBottom: 16,
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
