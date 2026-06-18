// ============================================================
// JOURNAL — an achievements dashboard and history of completed tasks.
// Shows streaks, weekly productivity charts, and logs.
// ============================================================
import React, { useCallback, useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useStore } from '../lib/store.js';
import { useAppTheme } from '../lib/useTheme.js';
import { doneGroups, listName, calculateStreak } from '../lib/selectors.js';
import { Icon } from '../components/icons.js';
import { Wordmark } from '../components/Wordmark.js';
import { TaskCard } from '../components/TaskCard.js';
import { getPet } from '../lib/pets.js';
import { Pet, HeaderPet } from '../components/Pet.js';
import { Kicker, Display, H2, Meta, EmptyState } from '../components/ui.js';
import { FONT } from '../theme.js';
import { AppHeader } from '../components/AppHeader.js';

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
  const streak = state.settings?.streak || 0;

  // Calculate monthly stats
  const completedThisMonthCount = useMemo(() => {
    return state.tasks.filter((t) => {
      if (!t.isCompleted || !t.completedAt) return false;
      const tc = new Date(t.completedAt);
      const now = new Date();
      return tc.getMonth() === now.getMonth() && tc.getFullYear() === now.getFullYear();
    }).length;
  }, [state.tasks]);

  const mostProductiveDay = useMemo(() => {
    const last30DaysLimit = new Date();
    last30DaysLimit.setDate(last30DaysLimit.getDate() - 30);
    const completionsLast30Days = state.tasks.filter((t) => {
      if (!t.isCompleted || !t.completedAt) return false;
      const tc = new Date(t.completedAt);
      return tc >= last30DaysLimit;
    });

    const dayOfWeekCounts = [0, 0, 0, 0, 0, 0, 0];
    completionsLast30Days.forEach((t) => {
      const day = new Date(t.completedAt).getDay();
      dayOfWeekCounts[day]++;
    });

    const daysOfWeekLabels = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    let maxCompletions = 0;
    let mostProductiveDayIndex = -1;
    dayOfWeekCounts.forEach((count, i) => {
      if (count > maxCompletions) {
        maxCompletions = count;
        mostProductiveDayIndex = i;
      }
    });
    return mostProductiveDayIndex !== -1 && maxCompletions > 0 
      ? daysOfWeekLabels[mostProductiveDayIndex] 
      : 'None';
  }, [state.tasks]);

  const listsWithStats = useMemo(() => {
    const stats = state.lists.map((l) => {
      const listTasks = state.tasks.filter((t) => t.listId === l.id);
      const totalTasks = listTasks.length;
      const completedTasks = listTasks.filter((t) => t.isCompleted).length;
      const rate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
      return {
        id: l.id,
        name: l.name,
        accent: l.accent,
        total: totalTasks,
        completed: completedTasks,
        rate,
      };
    }).filter(l => l.total > 0);

    const inboxTasks = state.tasks.filter((t) => t.listId === null);
    const totalInbox = inboxTasks.length;
    const completedInbox = inboxTasks.filter((t) => t.isCompleted).length;
    if (totalInbox > 0) {
      stats.unshift({
        id: 'inbox',
        name: 'Inbox',
        accent: theme.accent,
        total: totalInbox,
        completed: completedInbox,
        rate: Math.round((completedInbox / totalInbox) * 100),
      });
    }
    return stats;
  }, [state.lists, state.tasks, theme.accent]);

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

  const s = useMemo(() => makeStyles(theme), [theme]);
  const maxCount = Math.max(...dayCounts.map((d) => d.count), 1);

  return (
    <ScrollView
      style={s.container}
      contentContainerStyle={s.scroll}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <AppHeader
        theme={theme}
        settings={state.settings}
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

      {/* Monthly Recap Card */}
      <View style={[s.recapCard, { backgroundColor: theme.surface, borderColor: theme.hairline }]}>
        <Text style={[s.recapTitle, { color: theme.text }]}>Monthly Recap</Text>
        <Text style={[s.recapSub, { color: theme.text3 }]}>Your highlights this month</Text>

        <View style={s.recapGrid}>
          <View style={s.recapBlock}>
            <Text style={[s.recapBlockLabel, { color: theme.text3 }]}>Finished</Text>
            <Text style={[s.recapBlockVal, { color: theme.text }]}>{completedThisMonthCount}</Text>
            <Text style={[s.recapBlockSub, { color: theme.text3 }]}>{completedThisMonthCount === 1 ? 'task' : 'tasks'} this month</Text>
          </View>
          <View style={s.recapBlock}>
            <Text style={[s.recapBlockLabel, { color: theme.text3 }]}>Peak Day</Text>
            <Text style={[s.recapBlockVal, { color: theme.text }]} numberOfLines={1}>{mostProductiveDay}</Text>
            <Text style={[s.recapBlockSub, { color: theme.text3 }]}>Most productive day</Text>
          </View>
        </View>

        {listsWithStats.length > 0 && (
          <View style={s.listProgressSection}>
            <Text style={[s.listProgressTitle, { color: theme.text3 }]}>Completion by List</Text>
            {listsWithStats.map((item) => (
              <View key={item.id} style={s.listProgressRow}>
                <View style={s.listProgressHeader}>
                  <View style={s.listProgressNameRow}>
                    <View style={[s.listProgressDot, { backgroundColor: item.accent }]} />
                    <Text style={[s.listProgressName, { color: theme.text }]} numberOfLines={1}>{item.name}</Text>
                  </View>
                  <Text style={[s.listProgressPercent, { color: theme.text }]}>{item.rate}%</Text>
                </View>
                <View style={[s.listProgressBarTrack, { backgroundColor: theme.surface2 }]}>
                  <View
                    style={[
                      s.listProgressBarFill,
                      {
                        width: `${item.rate}%`,
                        backgroundColor: item.accent,
                      },
                    ]}
                  />
                </View>
              </View>
            ))}
          </View>
        )}
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
    recapCard: {
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
    recapTitle: {
      fontFamily: FONT.serifMedium || FONT.serif,
      fontSize: 17,
      fontWeight: '600',
    },
    recapSub: {
      fontFamily: FONT.sansMedium,
      fontSize: 12,
      marginTop: 2,
      marginBottom: 16,
    },
    recapGrid: {
      flexDirection: 'row',
      gap: 12,
      marginBottom: 20,
    },
    recapBlock: {
      flex: 1,
      backgroundColor: t.surface2,
      borderRadius: 12,
      padding: 12,
    },
    recapBlockLabel: {
      fontFamily: FONT.sansSemi,
      fontSize: 10,
      letterSpacing: 1,
      textTransform: 'uppercase',
      marginBottom: 4,
    },
    recapBlockVal: {
      fontFamily: FONT.serifMedium || FONT.serif,
      fontSize: 20,
      fontWeight: '600',
    },
    recapBlockSub: {
      fontFamily: FONT.sansMedium,
      fontSize: 11,
      marginTop: 2,
    },
    listProgressSection: {
      marginTop: 8,
    },
    listProgressTitle: {
      fontFamily: FONT.sansSemi,
      fontSize: 11,
      letterSpacing: 1.2,
      textTransform: 'uppercase',
      marginBottom: 10,
    },
    listProgressRow: {
      marginBottom: 12,
    },
    listProgressHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 6,
    },
    listProgressNameRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      flex: 1,
    },
    listProgressDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    listProgressName: {
      fontFamily: FONT.sansSemi,
      fontSize: 12.5,
      flex: 1,
    },
    listProgressPercent: {
      fontFamily: FONT.sansBold,
      fontSize: 12.5,
    },
    listProgressBarTrack: {
      height: 6,
      borderRadius: 3,
      overflow: 'hidden',
    },
    listProgressBarFill: {
      height: '100%',
      borderRadius: 3,
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
