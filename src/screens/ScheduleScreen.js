import React, { useState, useMemo, useCallback, useRef } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  Text,
  Pressable,
  PanResponder,
  Animated,
  LayoutAnimation,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppTheme } from '../lib/useTheme.js';
import { useStore } from '../lib/store.js';
import { FONT } from '../theme.js';
import { listName } from '../lib/selectors.js';
import { AppHeader } from '../components/AppHeader.js';
import { TaskCard } from '../components/TaskCard.js';
import { Kicker, EmptyState } from '../components/ui.js';
import { Icon } from '../components/icons.js';
import { dueLabel } from '../lib/date.js';

// Local date helpers for comparisons
function getLocalDateString(date = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

const formatDateString = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

// Generates 42 days grid (6 rows of 7 columns, starting Monday)
const getDaysInMonthGrid = (year, month) => {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  
  let firstDayOfWeek = firstDay.getDay();
  let padDays = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1; // Mon-start
  
  const grid = [];
  const pad = (n) => String(n).padStart(2, '0');
  
  // Previous month padding
  const prevMonthLast = new Date(year, month, 0).getDate();
  const prevYear = month === 0 ? year - 1 : year;
  const prevMon = month === 0 ? 11 : month - 1;
  for (let i = padDays - 1; i >= 0; i--) {
    const dayNum = prevMonthLast - i;
    grid.push({
      dateString: `${prevYear}-${pad(prevMon + 1)}-${pad(dayNum)}`,
      dayNum,
      isCurrentMonth: false,
    });
  }
  
  // Current month days
  const totalDays = lastDay.getDate();
  for (let i = 1; i <= totalDays; i++) {
    grid.push({
      dateString: `${year}-${pad(month + 1)}-${pad(i)}`,
      dayNum: i,
      isCurrentMonth: true,
    });
  }
  
  // Next month padding
  const nextYear = month === 11 ? year + 1 : year;
  const nextMon = month === 11 ? 0 : month + 1;
  let nextPad = 42 - grid.length;
  for (let i = 1; i <= nextPad; i++) {
    grid.push({
      dateString: `${nextYear}-${pad(nextMon + 1)}-${pad(i)}`,
      dayNum: i,
      isCurrentMonth: false,
    });
  }
  
  return grid;
};



// Draggable wrapper using the dragHandlers prop of TaskCard
function DraggableTaskItem({ task, theme, settings, listName, onComplete, onUncomplete, onOpen, onDragStart, onDragMove, onDragEnd, isSelected, draggable = false }) {
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e, gestureState) => {
        onDragStart(task, gestureState.y0);
      },
      onPanResponderMove: (e, gestureState) => {
        onDragMove(gestureState.dx, gestureState.dy, gestureState.moveY);
      },
      onPanResponderRelease: (e, gestureState) => {
        onDragEnd(gestureState.moveY);
      },
      onPanResponderTerminate: () => {
        onDragEnd(null);
      }
    })
  ).current;

  return (
    <View style={isSelected && { borderColor: theme.accent, borderWidth: 1.5, borderRadius: theme.radius }}>
      <TaskCard
        task={task}
        theme={theme}
        settings={settings}
        listName={listName}
        onComplete={onComplete}
        onUncomplete={onUncomplete}
        onOpen={onOpen}
        dragHandlers={draggable ? panResponder.panHandlers : undefined}
      />
    </View>
  );
}

export function ScheduleScreen({ onOpenTask, onAddTask, onOpenPets, onOpenSettings }) {
  const theme = useAppTheme();
  const { state, actions } = useStore();
  const insets = useSafeAreaInsets();
  const settings = state.settings;
  const tasks = state.tasks;
  
  const [viewMode, setViewMode] = useState('month'); // 'day' | 'week' | 'month' | 'timeline'
  const [selectedTaskToSchedule, setSelectedTaskToSchedule] = useState(null);
  
  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  });

  const [currentMonthDate, setCurrentMonthDate] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  const s = useMemo(() => makeStyles(theme), [theme]);

  // Helper to retrieve tasks for a date (handles completed vs incomplete tasks for past and today/future dates)
  const getTasksForDate = useCallback((taskList, dateStr) => {
    const todayStr = getLocalDateString();
    const isPast = dateStr < todayStr;
    const pad = (n) => String(n).padStart(2, '0');
    const formatDateStr = (dObj) => `${dObj.getFullYear()}-${pad(dObj.getMonth() + 1)}-${pad(dObj.getDate())}`;

    return taskList.filter(t => {
      if (!t.dueAt) return false;
      
      const dueD = new Date(t.dueAt);
      if (isNaN(dueD.getTime())) return false;
      
      // Determine if task is UTC midnight (i.e. date-only / all-day)
      const isUtcMidnight = dueD.getUTCHours() === 0 && dueD.getUTCMinutes() === 0;
      
      let dueStr;
      if (isUtcMidnight) {
        dueStr = `${dueD.getUTCFullYear()}-${pad(dueD.getUTCMonth() + 1)}-${pad(dueD.getUTCDate())}`;
      } else {
        dueStr = formatDateStr(dueD);
      }

      let isOverlap = false;
      if (t.startAt) {
        const startD = new Date(t.startAt);
        if (!isNaN(startD.getTime())) {
          const isStartUtcMidnight = startD.getUTCHours() === 0 && startD.getUTCMinutes() === 0;
          const startStr = isStartUtcMidnight
            ? `${startD.getUTCFullYear()}-${pad(startD.getUTCMonth() + 1)}-${pad(startD.getUTCDate())}`
            : formatDateStr(startD);
          isOverlap = dateStr >= startStr && dateStr <= dueStr;
        }
      } else {
        isOverlap = dueStr === dateStr;
      }

      if (isPast) {
        // For past dates:
        // 1. Show completed tasks if completed on this date
        if (t.isCompleted && t.completedAt) {
          const compD = new Date(t.completedAt);
          if (!isNaN(compD.getTime())) {
            return formatDateStr(compD) === dateStr;
          }
        }
        // 2. Show incomplete/overdue tasks scheduled on this date
        if (!t.isCompleted) {
          return isOverlap;
        }
        return false;
      } else {
        // For today & future: show active (incomplete) tasks
        if (t.isCompleted) return false;
        return isOverlap;
      }
    });
  }, []);
  
  // Date selection intercept
  const handleDateTap = useCallback((dateString) => {
    const todayStr = getLocalDateString();
    const isPast = dateString < todayStr;

    // 1. Reschedule action
    if (selectedTaskToSchedule) {
      if (isPast) {
        setSelectedTaskToSchedule(null);
        return;
      }
      const newDate = new Date(dateString + 'T12:00:00Z');
      actions.updateTask(selectedTaskToSchedule.id, {
        dueAt: newDate.toISOString(),
        startAt: null,
      });
      setSelectedTaskToSchedule(null);
    }
    
    setSelectedDate(dateString);
  }, [selectedTaskToSchedule, actions]);

  const switchView = (mode) => {
    if (LayoutAnimation && LayoutAnimation.configureNext) {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    }
    setViewMode(mode);
  };

  const handlePrevMonth = () => {
    setCurrentMonthDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonthDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const handleSlotPress = useCallback((hour) => {
    const todayStr = getLocalDateString();
    if (selectedDate < todayStr) return; // past date guard
    
    const [y, m, d] = selectedDate.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d, hour, 0, 0, 0);
    const isoString = dateObj.toISOString();
    
    onAddTask({ dueAt: isoString, reminderAt: isoString });
  }, [selectedDate, onAddTask]);
  
  const selectedTasks = useMemo(() => {
    return getTasksForDate(tasks, selectedDate).sort(
      (a, b) => new Date(a.dueAt || 0) - new Date(b.dueAt || 0)
    );
  }, [tasks, selectedDate, getTasksForDate]);

  const unscheduledTasks = useMemo(() => {
    return tasks.filter(t => !t.dueAt && !t.isCompleted);
  }, [tasks]);

  const allScheduledTasks = useMemo(() => {
    return tasks
      .filter(t => !t.isCompleted && t.dueAt)
      .sort((a, b) => new Date(a.dueAt) - new Date(b.dueAt));
  }, [tasks]);

  const complete = useCallback((task) => actions.toggleTask(task.id, true), [actions]);
  const uncomplete = useCallback((task) => actions.toggleTask(task.id, false), [actions]);
  const nameFor = useCallback((t) => listName(state, t.listId), [state]);

  // Drag and drop states & refs (Daily Timeline)
  const [draggingTask, setDraggingTask] = useState(null);
  const [dragStartTop, setDragStartTop] = useState(0);
  const [hoveredHour, setHoveredHour] = useState(null);
  const dragXY = useRef(new Animated.ValueXY()).current;
  const dragScale = useRef(new Animated.Value(1)).current;
  const dragRotate = useRef(new Animated.Value(0)).current;
  const timelineRef = useRef(null);
  const [timelineLayout, setTimelineLayout] = useState({ y: 0, height: 0 });
  const [timelineScrollY, setTimelineScrollY] = useState(0);

  const onTimelineLayout = () => {
    timelineRef.current?.measure((x, y, width, height, pageX, pageY) => {
      setTimelineLayout({ y: pageY, height });
    });
  };

  const handleTimelineScroll = (event) => {
    setTimelineScrollY(event.nativeEvent.contentOffset.y);
  };

  const handleDragStart = (task, pageY) => {
    setDraggingTask(task);
    setDragStartTop(pageY - 45); // assuming card height is 90
    dragXY.setValue({ x: 0, y: 0 });
    dragScale.setValue(1);
    dragRotate.setValue(0);
    Animated.parallel([
      Animated.spring(dragScale, { toValue: 1.06, friction: 7, tension: 70, useNativeDriver: true }),
      Animated.spring(dragRotate, { toValue: 1, friction: 7, tension: 70, useNativeDriver: true })
    ]).start();
  };

  const handleDragMove = (dx, dy, moveY) => {
    dragXY.setValue({ x: dx, y: dy });
    if (moveY && timelineLayout.y > 0) {
      const localY = moveY - timelineLayout.y + timelineScrollY;
      const hourIndex = Math.floor(localY / 100);
      const hour = 7 + hourIndex;
      if (hour >= 7 && hour <= 22) {
        setHoveredHour(hour);
      } else {
        setHoveredHour(null);
      }
    } else {
      setHoveredHour(null);
    }
  };

  const handleDragEnd = (moveY) => {
    Animated.parallel([
      Animated.spring(dragScale, { toValue: 1, friction: 8, useNativeDriver: true }),
      Animated.spring(dragRotate, { toValue: 0, friction: 8, useNativeDriver: true })
    ]).start();

    if (moveY !== null && draggingTask && timelineLayout.y > 0) {
      const localY = moveY - timelineLayout.y + timelineScrollY;
      const hourIndex = Math.floor(localY / 100);
      const hour = 7 + hourIndex;
      if (hour >= 7 && hour <= 22) {
        const [y, m, d] = selectedDate.split('-').map(Number);
        const newDate = new Date(y, m - 1, d, hour, 0, 0, 0);
        actions.updateTask(draggingTask.id, { dueAt: newDate.toISOString(), startAt: null });
      }
    }
    setDraggingTask(null);
    setHoveredHour(null);
  };

  // Week Days Calculation (Weekly view)
  const weekDays = useMemo(() => {
    const current = new Date(selectedDate + 'T12:00:00');
    const day = current.getDay();
    const diff = current.getDate() - day + (day === 0 ? -6 : 1); // Monday start
    const startOfWeek = new Date(current.setDate(diff));
    
    const days = [];
    const pad = (n) => String(n).padStart(2, '0');
    for (let i = 0; i < 7; i++) {
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + i);
      const dString = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
      days.push({
        dateString: dString,
        dayName: d.toLocaleDateString('en-US', { weekday: 'short' }),
        dayNum: d.getDate(),
      });
    }
    return days;
  }, [selectedDate]);

  // Helper to render Day timeline tasks
  const getTasksForHour = (hour) => {
    return selectedTasks.filter(t => {
      const d = new Date(t.dueAt);
      const isUtcMidnight = d.getUTCHours() === 0 && d.getUTCMinutes() === 0;
      const isLocalMidnight = d.getHours() === 0 && d.getMinutes() === 0;
      return !(isUtcMidnight || isLocalMidnight) && d.getHours() === hour;
    });
  };

  const allDayTasks = useMemo(() => {
    return selectedTasks.filter(t => {
      const d = new Date(t.dueAt);
      const isUtcMidnight = d.getUTCHours() === 0 && d.getUTCMinutes() === 0;
      const isLocalMidnight = d.getHours() === 0 && d.getMinutes() === 0;
      return isUtcMidnight || isLocalMidnight;
    });
  }, [selectedTasks]);

  const hoursList = [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22];

  // Custom Month Grid calculations
  const daysGrid = useMemo(() => {
    return getDaysInMonthGrid(currentMonthDate.getFullYear(), currentMonthDate.getMonth());
  }, [currentMonthDate]);


  const LABELS = {
    day: 'Daily',
    week: 'Weekly',
    month: 'Monthly',
    timeline: 'Database',
  };

  const bottomPaddingSpacing = 160 + insets.bottom;

  const rotateInterpolate = dragRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '-2.5deg']
  });

  return (
    <View style={s.container}>
      <ScrollView
        ref={timelineRef}
        onLayout={onTimelineLayout}
        onScroll={handleTimelineScroll}
        scrollEventThrottle={16}
        scrollEnabled={!draggingTask}
        style={s.container}
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
      >
        <AppHeader
          theme={theme}
          settings={settings}
          onOpenPets={onOpenPets}
          onOpenSettings={onOpenSettings}
        />
        
        {/* Performance Test Mock Data Injection Button */}
        <Pressable
          onPress={() => {
            actions.injectMockData();
          }}
          style={({ pressed }) => [
            {
              paddingVertical: 10,
              paddingHorizontal: 16,
              backgroundColor: theme.accentSoft,
              borderRadius: 14,
              borderWidth: 1.5,
              borderColor: theme.accent,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 20,
              opacity: pressed ? 0.8 : 1,
            }
          ]}
        >
          <Text style={{ color: theme.accent, fontSize: 11.5, fontFamily: FONT.sansSemi, letterSpacing: 1.2 }}>
            ⚡ GENERATE PERFORMANCE MOCK DATA
          </Text>
        </Pressable>

        {viewMode !== 'timeline' && (
          <View style={s.topDateHeader}>
            <Kicker style={{ color: theme.accent, textAlign: 'center', marginBottom: 16 }}>
              {new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
            </Kicker>
          </View>
        )}

        {/* View Mode Selector */}
        <View style={s.viewModeContainer}>
          {['day', 'week', 'month', 'timeline'].map((mode) => (
            <Pressable
              key={mode}
              onPress={() => switchView(mode)}
              style={[s.viewModeBtn, viewMode === mode && s.viewModeBtnActive]}
            >
              <Text style={[s.viewModeText, { color: viewMode === mode ? theme.onAccent : theme.text3 }]}>
                {LABELS[mode].toUpperCase()}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Selected Task Rescheduling Alert */}
        {selectedTaskToSchedule && (
          <View style={[s.rescheduleBanner, { backgroundColor: theme.accentSoft, borderColor: theme.accent }]}>
            <Text style={[s.rescheduleText, { color: theme.accent }]}>
              Tap any date to schedule: "{selectedTaskToSchedule.title}"
            </Text>
            <Pressable onPress={() => setSelectedTaskToSchedule(null)}>
              <Text style={{ color: theme.accent, fontWeight: '700' }}>Cancel</Text>
            </Pressable>
          </View>
        )}

        {/* 1. Month View (Custom Grid Calendar) */}
        {viewMode === 'month' && (
          <View>
            <View style={s.monthHeader}>
              <Pressable onPress={handlePrevMonth} style={s.navArrow}>
                <Icon.chevLeft size={20} color={theme.text} />
              </Pressable>
              <Text style={[s.monthTitle, { color: theme.text, fontFamily: FONT.serifMedium }]}>
                {currentMonthDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </Text>
              <Pressable onPress={handleNextMonth} style={s.navArrow}>
                <Icon.chev size={20} color={theme.text} />
              </Pressable>
            </View>

            <View style={s.monthGridContainer}>
              <View style={s.weekdayRow}>
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(w => (
                  <View key={w} style={s.weekdayCell}>
                    <Text style={[s.weekdayText, { color: theme.text3, fontFamily: FONT.sans }]}>{w}</Text>
                  </View>
                ))}
              </View>

              <View style={s.daysGrid}>
                {daysGrid.map((day) => {
                  const dateString = day.dateString;
                  const isTodayDay = getLocalDateString() === dateString;
                  const isSelected = selectedDate === dateString;
                  
                  const dateTasks = getTasksForDate(tasks, dateString);

                  let cellBg = 'transparent';
                  let circleBg = 'transparent';
                  let textCol = theme.text;
                  
                  if (isSelected) {
                    circleBg = theme.accentSoft;
                    textCol = theme.accent;
                  } else if (!day.isCurrentMonth) {
                    textCol = theme.text4;
                  } else if (isTodayDay) {
                    textCol = theme.accent;
                  }

                  return (
                    <Pressable
                      key={dateString}
                      onPress={() => handleDateTap(dateString)}
                      style={[s.dayCell, { backgroundColor: cellBg }]}
                    >
                      <View style={[s.dayNumberCircle, { backgroundColor: circleBg }]}>
                        <Text style={[
                          s.dayNumberText, 
                          { color: textCol, fontFamily: FONT.sansSemi },
                          isTodayDay && { fontWeight: 'bold' }
                        ]}>
                          {day.dayNum}
                        </Text>
                      </View>
                      <View style={s.dotsRow}>
                        {dateTasks.slice(0, 3).map((_, idx) => (
                          <View 
                            key={idx} 
                            style={[
                              s.dot, 
                              { backgroundColor: theme.accent }
                            ]} 
                          />
                        ))}
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </View>
        )}

        {/* 2. Week View */}
        {viewMode === 'week' && (
          <View style={s.weekStrip}>
            {weekDays.map((wd) => {
              const isSelected = wd.dateString === selectedDate;
              const hasTasks = getTasksForDate(tasks, wd.dateString).length > 0;
              return (
                <Pressable
                  key={wd.dateString}
                  onPress={() => handleDateTap(wd.dateString)}
                  style={[s.weekDayCard, isSelected && s.weekDayCardSelected]}
                >
                  <Text style={[s.weekDayName, isSelected && s.weekDayTextSelected, { color: theme.text3 }]}>{wd.dayName}</Text>
                  <Text style={[s.weekDayNum, isSelected && s.weekDayTextSelected, { color: theme.text }]}>{wd.dayNum}</Text>
                  {hasTasks && <View style={[s.weekDot, { backgroundColor: isSelected ? theme.accent : theme.text4 }]} />}
                </Pressable>
              );
            })}
          </View>
        )}

        {/* 3. Daily View (Hourly timeline) */}
        {viewMode === 'day' && (
          <View style={s.timelineContainer}>
            {/* Anytime/All-Day section */}
            {allDayTasks.length > 0 && (
              <View style={s.allDayContainer}>
                <View style={s.allDayHeader}>
                  <Icon.cal size={14} color={theme.accent} />
                  <Text style={[s.allDayTitle, { color: theme.text2 }]}>ANYTIME</Text>
                </View>
                <View style={s.allDayList}>
                  {allDayTasks.map((t) => (
                    <DraggableTaskItem
                      key={t.id}
                      task={t}
                      theme={theme}
                      settings={settings}
                      listName={nameFor(t)}
                      onComplete={complete}
                      onUncomplete={uncomplete}
                      onOpen={onOpenTask}
                      onDragStart={handleDragStart}
                      onDragMove={handleDragMove}
                      onDragEnd={handleDragEnd}
                      draggable={true}
                    />
                  ))}
                </View>
              </View>
            )}

            {hoursList.map((hour) => {
              const hourTasks = getTasksForHour(hour);
              const todayStr = getLocalDateString();
              const isPastDate = selectedDate < todayStr;
              
              return (
                <View key={hour} style={s.timelineRow}>
                  <View style={s.timelineHour}>
                    <Text style={s.timelineHourText}>
                      {hour > 12 ? `${hour - 12} PM` : hour === 12 ? '12 PM' : `${hour} AM`}
                    </Text>
                  </View>
                  <Pressable
                    disabled={isPastDate}
                    onPress={() => handleSlotPress(hour)}
                    style={[
                      s.timelineSlot,
                      hourTasks.length === 0 && s.timelineSlotEmpty,
                      hoveredHour === hour && {
                        backgroundColor: theme.accentSoft,
                        borderLeftColor: theme.accent,
                        borderLeftWidth: 1.5,
                      }
                    ]}
                  >
                    {hourTasks.map((t) => (
                      <DraggableTaskItem
                        key={t.id}
                        task={t}
                        theme={theme}
                        settings={settings}
                        listName={nameFor(t)}
                        onComplete={complete}
                        onUncomplete={uncomplete}
                        onOpen={onOpenTask}
                        onDragStart={handleDragStart}
                        onDragMove={handleDragMove}
                        onDragEnd={handleDragEnd}
                        draggable={true}
                      />
                    ))}
                  </Pressable>
                </View>
              );
            })}
          </View>
        )}

        {/* 4. Notion Database Table View */}
        {viewMode === 'timeline' && (
          <View style={s.dbTableContainer}>
            <View style={s.dbTableHeader}>
              <Text style={[s.dbColHeader, { flex: 2, color: theme.text3 }]}>TASK</Text>
              <Text style={[s.dbColHeader, { flex: 1.2, color: theme.text3 }]}>DUE DATE</Text>
              <Text style={[s.dbColHeader, { flex: 1.2, color: theme.text3, textAlign: 'right' }]}>LIST</Text>
            </View>
            
            {allScheduledTasks.length === 0 ? (
              <EmptyState
                title="No Scheduled Tasks"
                subtitle="Your schedule is completely clear."
                petId={settings.pet}
                theme={theme}
              />
            ) : (
              allScheduledTasks.map((t) => {
                const list = state.lists.find(l => l.id === t.listId);
                const badgeBg = list?.accent ? `${list.accent}15` : theme.surface2;
                const badgeText = list?.accent || theme.text3;
                
                return (
                  <View key={t.id} style={[s.dbTableRow, { borderBottomColor: theme.hairline }]}>
                    {/* Task Column */}
                    <View style={[s.dbColCell, { flex: 2, flexDirection: 'row', alignItems: 'center', gap: 8 }]}>
                      <Pressable
                        onPress={() => t.isCompleted ? uncomplete(t) : complete(t)}
                        style={[s.dbCheckbox, { borderColor: theme.hairline2, backgroundColor: t.isCompleted ? theme.accent : 'transparent' }]}
                      >
                        {t.isCompleted && <Icon.tick size={8} color={theme.onAccent} />}
                      </Pressable>
                      <Pressable onPress={() => onOpenTask(t)} style={{ flex: 1 }}>
                        <Text numberOfLines={1} style={[s.dbTaskTitle, { color: theme.text, fontFamily: FONT.sansSemi }]}>
                          {t.title}
                        </Text>
                      </Pressable>
                    </View>
                    
                    {/* Due Date Column */}
                    <View style={[s.dbColCell, { flex: 1.2 }]}>
                      <Text style={[s.dbDateText, { color: theme.text2, fontFamily: FONT.sans }]}>
                        {dueLabel(t.dueAt)}
                      </Text>
                    </View>
                    
                    {/* List Column */}
                    <View style={[s.dbColCell, { flex: 1.2, alignItems: 'flex-end' }]}>
                      <View style={[s.dbListBadge, { backgroundColor: badgeBg }]}>
                        <Text numberOfLines={1} style={[s.dbListBadgeText, { color: badgeText, fontFamily: FONT.sansSemi }]}>
                          {nameFor(t)}
                        </Text>
                      </View>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        )}



        {/* List of Tasks for Selected Date (for Day, Week, and Month views, but not Timeline view as tasks are rendered inline) */}
        {viewMode !== 'timeline' && viewMode !== 'day' && (
          selectedTasks.length === 0 ? (
            <EmptyState
              title="Free Day"
              subtitle="No tasks scheduled for this day."
              footer={selectedDate >= getLocalDateString() ? "Tap + to add one." : ""}
              petId={settings.pet}
              theme={theme}
            />
          ) : (
            selectedTasks.map(t => (
              <DraggableTaskItem
                key={t.id}
                task={t}
                theme={theme}
                settings={settings}
                listName={nameFor(t)}
                onComplete={complete}
                onUncomplete={uncomplete}
                onOpen={onOpenTask}
                onDragStart={handleDragStart}
                onDragMove={handleDragMove}
                onDragEnd={handleDragEnd}
              />
            ))
          )
        )}

        {/* Unscheduled Tasks section at the bottom */}
        {unscheduledTasks.length > 0 && (
          <View style={s.poolSection}>
            <Text style={s.poolTitle}>Unscheduled Tasks</Text>
            <View style={s.poolContainer}>
              {unscheduledTasks.map(t => (
                <DraggableTaskItem
                  key={t.id}
                  task={t}
                  theme={theme}
                  settings={settings}
                  listName={nameFor(t)}
                  onComplete={complete}
                  onUncomplete={uncomplete}
                  onOpen={() => setSelectedTaskToSchedule(selectedTaskToSchedule?.id === t.id ? null : t)}
                  onDragStart={handleDragStart}
                  onDragMove={handleDragMove}
                  onDragEnd={handleDragEnd}
                  isSelected={selectedTaskToSchedule?.id === t.id}
                />
              ))}
            </View>
          </View>
        )}

        <View style={{ height: bottomPaddingSpacing }} />
      </ScrollView>

      {/* Floating Drag Overlay */}
      {draggingTask && (
        <Animated.View
          pointerEvents="none"
          style={[
            s.draggingOverlay,
            {
              transform: [
                { translateX: dragXY.x },
                { translateY: dragXY.y },
                { scale: dragScale },
                { rotate: rotateInterpolate }
              ],
              top: dragStartTop,
            }
          ]}
        >
          <TaskCard task={draggingTask} theme={theme} settings={settings} />
        </Animated.View>
      )}

    </View>
  );
}

function makeStyles(t) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: t.bg },
    scroll: { paddingHorizontal: 22 },
    tasksHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
      paddingHorizontal: 4,
    },
    addButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingVertical: 4,
      paddingHorizontal: 8,
      borderRadius: 12,
      backgroundColor: t.surface,
      borderWidth: 1,
      borderColor: t.surface2,
    },
    addText: {
      fontFamily: FONT.sansSemi,
      fontSize: 12,
    },
    // View mode selector
    viewModeContainer: {
      flexDirection: 'row',
      backgroundColor: t.surface2,
      borderRadius: 14,
      padding: 3,
      marginBottom: 20,
      borderWidth: 1,
      borderColor: t.hairline,
    },
    viewModeBtn: {
      flex: 1,
      paddingVertical: 8,
      alignItems: 'center',
      borderRadius: 11,
    },
    viewModeBtnActive: {
      backgroundColor: t.accent,
    },
    viewModeText: {
      fontFamily: FONT.sansSemi,
      fontSize: 11,
      letterSpacing: 1,
    },
    // Week view
    weekStrip: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 24,
      gap: 6,
    },
    weekDayCard: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: 12,
      borderRadius: 14,
      backgroundColor: t.surface,
      borderWidth: 1.5,
      borderColor: t.surface2,
    },
    weekDayCardSelected: {
      borderColor: t.accent,
      backgroundColor: t.accentSoft,
    },
    weekDayName: {
      fontFamily: FONT.sansMedium,
      fontSize: 11,
      marginBottom: 4,
    },
    weekDayNum: {
      fontFamily: FONT.sansSemi,
      fontSize: 16,
    },
    weekDayTextSelected: {
      color: t.accent,
    },
    weekDot: {
      width: 4,
      height: 4,
      borderRadius: 2,
      marginTop: 4,
    },
    // Day timeline view
    timelineContainer: {
      marginBottom: 24,
    },
    timelineRow: {
      flexDirection: 'row',
      minHeight: 100,
    },
    topDateHeader: {
      alignItems: 'center',
      marginTop: 4,
    },
    timelineHour: {
      width: 60,
      alignItems: 'flex-end',
      paddingRight: 12,
      paddingTop: 8,
    },
    timelineHourText: {
      fontFamily: FONT.sansMedium,
      fontSize: 11.5,
    },
    timelineSlot: {
      flex: 1,
      borderLeftWidth: 1,
      borderLeftColor: t.hairline2,
      borderBottomWidth: 1,
      borderBottomColor: t.hairline,
      paddingHorizontal: 8,
      paddingVertical: 6,
      justifyContent: 'center',
    },
    timelineSlotEmpty: {
      opacity: 0.4,
    },
    // Reschedule Banner
    rescheduleBanner: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 16,
      borderWidth: 1.5,
      marginBottom: 16,
    },
    rescheduleText: {
      fontFamily: FONT.sansSemi,
      fontSize: 12.5,
      flex: 1,
      marginRight: 12,
    },
    // Unscheduled Pool
    poolSection: {
      marginTop: 20,
      borderTopWidth: 1,
      borderTopColor: t.hairline,
      paddingTop: 20,
      paddingBottom: 40,
    },
    poolTitle: {
      fontFamily: FONT.sansSemi,
      fontSize: 12,
      letterSpacing: 1.9,
      textTransform: 'uppercase',
      color: t.text3,
      marginBottom: 12,
    },
    poolContainer: {
      gap: 10,
    },
    draggingOverlay: {
      position: 'absolute',
      left: 22,
      right: 22,
      shadowColor: '#000',
      shadowOpacity: 0.3,
      shadowRadius: 20,
      shadowOffset: { width: 0, height: 12 },
      elevation: 10,
    },
    // Month custom calendar styling
    monthHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
      paddingHorizontal: 4,
    },
    monthTitle: {
      fontSize: 18,
      fontWeight: '600',
    },
    navArrow: {
      padding: 8,
      borderRadius: 12,
      backgroundColor: t.surface,
      borderWidth: 1,
      borderColor: t.surface2,
    },
    monthGridContainer: {
      backgroundColor: t.surface,
      borderRadius: 24,
      padding: 16,
      borderWidth: 2,
      borderColor: t.surface2,
      marginBottom: 24,
      overflow: 'hidden',
    },
    weekdayRow: {
      flexDirection: 'row',
      marginBottom: 12,
      borderBottomWidth: 1,
      borderBottomColor: t.hairline,
      paddingBottom: 8,
    },
    weekdayCell: {
      flex: 1,
      alignItems: 'center',
    },
    weekdayText: {
      fontSize: 11,
      fontWeight: '600',
      letterSpacing: 0.5,
    },
    daysGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
    },
    dayCell: {
      width: '14.28%',
      aspectRatio: 1,
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      marginVertical: 2,
    },
    dayNumberCircle: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 2,
    },
    dayNumberText: {
      fontSize: 14,
    },
    dotsRow: {
      flexDirection: 'row',
      gap: 3,
      justifyContent: 'center',
      height: 5,
      marginTop: 4,
      zIndex: 2,
    },
    dot: {
      width: 4,
      height: 4,
      borderRadius: 2,
    },
    // Anytime / All-Day tasks styling
    allDayContainer: {
      marginBottom: 20,
      borderBottomWidth: 1,
      borderBottomColor: t.hairline,
      paddingBottom: 16,
    },
    allDayHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginBottom: 10,
      paddingHorizontal: 4,
    },
    allDayTitle: {
      fontFamily: FONT.sansSemi,
      fontSize: 11,
      letterSpacing: 1.5,
    },
    allDayList: {
      gap: 8,
    },
    // Notion Database Table styling
    dbTableContainer: {
      backgroundColor: t.surface,
      borderRadius: 20,
      borderWidth: 1.5,
      borderColor: t.surface2,
      overflow: 'hidden',
      marginBottom: 24,
    },
    dbTableHeader: {
      flexDirection: 'row',
      backgroundColor: t.surface2,
      paddingVertical: 10,
      paddingHorizontal: 16,
      borderBottomWidth: 1.5,
      borderBottomColor: t.hairline2,
    },
    dbColHeader: {
      fontFamily: FONT.sansSemi,
      fontSize: 10,
      letterSpacing: 1.5,
    },
    dbTableRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderBottomWidth: 1,
    },
    dbColCell: {
      justifyContent: 'center',
    },
    dbCheckbox: {
      width: 18,
      height: 18,
      borderRadius: 4,
      borderWidth: 1.5,
      alignItems: 'center',
      justifyContent: 'center',
    },
    dbTaskTitle: {
      fontSize: 13,
    },
    dbDateText: {
      fontSize: 12,
    },
    dbListBadge: {
      paddingVertical: 4,
      paddingHorizontal: 8,
      borderRadius: 6,
      maxWidth: 90,
    },
    dbListBadgeText: {
      fontSize: 10,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
  });
}
