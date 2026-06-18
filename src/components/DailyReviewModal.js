import React, { useState, useEffect } from 'react';
import { View, Text, Modal, StyleSheet, Pressable, Animated } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import { useStore } from '../lib/store.js';
import { useAppTheme } from '../lib/useTheme.js';
import { FONT } from '../theme.js';
import { Icon } from './icons.js';
import { startOfDay, addDays } from '../lib/date.js';
import { softFeedback } from '../lib/feedback.js';
import { getPet } from '../lib/pets.js';

export function DailyReviewModal({ open, onClose, tasks }) {
  const theme = useAppTheme();
  const { actions, state } = useStore();
  const [currentIndex, setCurrentIndex] = useState(0);

  const petId = state.settings?.pet || 'zen';
  const pet = getPet(petId);

  // If we swipe through all of them
  useEffect(() => {
    if (open && currentIndex >= tasks.length && tasks.length > 0) {
      const timer = setTimeout(() => {
        onClose();
        setCurrentIndex(0);
      }, 2500);
      return () => clearTimeout(timer);
    }
    if (!open) setCurrentIndex(0);
  }, [currentIndex, tasks.length, open, onClose]);

  const handleDone = (task) => {
    softFeedback();
    actions.updateTask(task.id, { isCompleted: true, completedAt: new Date().toISOString() });
    setCurrentIndex((prev) => prev + 1);
  };

  const handleTomorrow = (task) => {
    softFeedback();
    const tomorrow = addDays(startOfDay(), 1).toISOString();
    // Fixed bug: property is 'dueAt' not 'due'
    actions.updateTask(task.id, { dueAt: tomorrow });
    setCurrentIndex((prev) => prev + 1);
  };

  const handleDelete = (task) => {
    softFeedback();
    actions.deleteTask(task.id);
    setCurrentIndex((prev) => prev + 1);
  };

  if (!open) return null;

  const currentTask = tasks[currentIndex];
  const isFinished = currentIndex >= tasks.length || tasks.length === 0;

  const renderLeftActions = (progress, dragX) => {
    const scale = dragX.interpolate({ inputRange: [0, 100], outputRange: [0, 1], extrapolate: 'clamp' });
    return (
      <View style={[styles.actionBox, { backgroundColor: theme.accent, alignItems: 'flex-start', paddingLeft: 40 }]}>
        <Animated.View style={{ transform: [{ scale }] }}>
          <Icon.tick size={36} color={theme.onAccent} />
        </Animated.View>
      </View>
    );
  };

  const renderRightActions = (progress, dragX) => {
    const scale = dragX.interpolate({ inputRange: [-100, 0], outputRange: [1, 0], extrapolate: 'clamp' });
    return (
      <View style={[styles.actionBox, { backgroundColor: theme.surface2, alignItems: 'flex-end', paddingRight: 40 }]}>
        <Animated.View style={{ transform: [{ scale }] }}>
          <Icon.cal size={36} color={theme.text2} />
        </Animated.View>
      </View>
    );
  };

  return (
    <Modal transparent visible={open} animationType="fade" onRequestClose={onClose}>
      <View style={[styles.container, { backgroundColor: theme.bg }]}>
        
        {/* Companion Header */}
        <View style={styles.header}>
          <Text style={styles.petEmoji}>{pet.emoji}</Text>
          <Text style={[styles.title, { color: theme.text }]}>Evening Review</Text>
          {!isFinished ? (
            <Text style={[styles.subtitle, { color: theme.text3 }]}>
              {tasks.length - currentIndex} {tasks.length - currentIndex === 1 ? 'task' : 'tasks'} remaining. Let's clear your mind before tomorrow.
            </Text>
          ) : null}
        </View>

        <View style={styles.cardArea}>
          {!isFinished && currentTask ? (
            <GestureHandlerRootView>
              <Swipeable
                key={currentTask.id}
                renderLeftActions={renderLeftActions}
                renderRightActions={renderRightActions}
                onSwipeableLeftOpen={() => handleDone(currentTask)}
                onSwipeableRightOpen={() => handleTomorrow(currentTask)}
                friction={1.5}
                leftThreshold={80}
                rightThreshold={80}
              >
                <View style={[
                  styles.card, 
                  { 
                    backgroundColor: theme.accent,
                    borderColor: theme.accent,
                    borderWidth: 1,
                  }
                ]}>
                  <Text style={[styles.cardTitle, { color: theme.onAccent }]}>{currentTask.title}</Text>
                  {currentTask.note ? (
                    <Text style={[styles.cardNote, { color: theme.onAccent, opacity: 0.8 }]} numberOfLines={3}>
                      {currentTask.note}
                    </Text>
                  ) : null}
                  
                  <View style={styles.hints}>
                    <View style={styles.hintCol}>
                      <Text style={[styles.hintIcon, { color: theme.onAccent, opacity: 0.9 }]}>←</Text>
                      <Text style={[styles.hintText, { color: theme.onAccent, opacity: 0.9 }]}>Complete</Text>
                    </View>
                    <View style={[styles.hintCol, { alignItems: 'flex-end' }]}>
                      <Text style={[styles.hintIcon, { color: theme.onAccent, opacity: 0.6 }]}>→</Text>
                      <Text style={[styles.hintText, { color: theme.onAccent, opacity: 0.6 }]}>Tomorrow</Text>
                    </View>
                  </View>
                </View>
              </Swipeable>
            </GestureHandlerRootView>
          ) : (
            <View style={styles.doneState}>
              <Text style={styles.doneEmote}>{pet.anim?.rest?.emote || '✨'}</Text>
              <Text style={[styles.doneText, { color: theme.text }]}>All caught up.</Text>
              <Text style={[styles.doneSub, { color: theme.text3 }]}>
                {pet.name} is resting now. You should too.
              </Text>
            </View>
          )}
        </View>

        {!isFinished && currentTask && (
          <Pressable onPress={() => handleDelete(currentTask)} style={styles.deleteBtn}>
            <Text style={[styles.deleteText, { color: theme.text4 }]}>Or just delete this task</Text>
          </Pressable>
        )}

        <Pressable onPress={onClose} style={styles.closeBtn}>
          <Text style={[styles.closeText, { color: theme.text2 }]}>Close</Text>
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 80,
    paddingHorizontal: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  petEmoji: {
    fontSize: 56,
    marginBottom: 16,
  },
  title: {
    fontFamily: FONT.serif,
    fontSize: 34,
    marginBottom: 10,
  },
  subtitle: {
    fontFamily: FONT.sans,
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  cardArea: {
    flex: 1,
    justifyContent: 'center',
  },
  card: {
    padding: 32,
    borderRadius: 32,
    minHeight: 240,
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 3,
  },
  cardTitle: {
    fontFamily: FONT.sansSemi,
    fontSize: 26,
    marginBottom: 16,
    textAlign: 'center',
    lineHeight: 34,
  },
  cardNote: {
    fontFamily: FONT.serifItalic,
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 26,
  },
  hints: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 40,
  },
  hintCol: {
    alignItems: 'flex-start',
  },
  hintIcon: {
    fontFamily: FONT.sansSemi,
    fontSize: 20,
    marginBottom: 4,
  },
  hintText: {
    fontFamily: FONT.sansMedium,
    fontSize: 13,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  actionBox: {
    flex: 1,
    justifyContent: 'center',
    borderRadius: 32,
  },
  doneState: {
    alignItems: 'center',
  },
  doneEmote: {
    fontSize: 72,
    marginBottom: 24,
  },
  doneText: {
    fontFamily: FONT.serifMedium,
    fontSize: 32,
  },
  doneSub: {
    fontFamily: FONT.sans,
    fontSize: 17,
    marginTop: 12,
    textAlign: 'center',
    paddingHorizontal: 30,
    lineHeight: 26,
  },
  deleteBtn: {
    padding: 20,
    alignItems: 'center',
  },
  deleteText: {
    fontFamily: FONT.sans,
    fontSize: 15,
    textDecorationLine: 'underline',
  },
  closeBtn: {
    paddingBottom: 50,
    alignItems: 'center',
  },
  closeText: {
    fontFamily: FONT.sansSemi,
    fontSize: 17,
  },
});
