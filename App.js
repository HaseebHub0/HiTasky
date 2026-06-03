// ============================================================
// HiTasky — Application Shell (React Native / Expo Go)
// Routes between onboarding and the live app (Today · Lists ·
// Done · Settings). Everything runs fully offline.
// ============================================================
import React, { useCallback, useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { LogBox, StyleSheet, View } from 'react-native';
LogBox.ignoreLogs(['expo-notifications']);
import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import {
  useFonts,
  Newsreader_300Light,
  Newsreader_400Regular,
  Newsreader_500Medium,
  Newsreader_300Light_Italic,
  Newsreader_400Regular_Italic,
} from '@expo-google-fonts/newsreader';
import {
  HankenGrotesk_400Regular,
  HankenGrotesk_500Medium,
  HankenGrotesk_600SemiBold,
  HankenGrotesk_700Bold,
} from '@expo-google-fonts/hanken-grotesk';

import { StoreProvider, useStore } from './src/lib/store.js';
import { useAppTheme } from './src/lib/useTheme.js';
import { listName, todayTasks, doneGroups } from './src/lib/selectors.js';
import { softFeedback } from './src/lib/feedback.js';
import { initBilling } from './src/lib/billing.js';
import { AdBanner, recordCompletionForAd, showInterstitial, markAdShown } from './src/lib/adManager.js';
import { emitPetReaction, getPet } from './src/lib/pets.js';

import { BottomNav } from './src/components/BottomNav.js';
import { Fab, Toast, PaywallDialog, FeedbackPrompt } from './src/components/ui.js';
import { AddSheet } from './src/components/AddSheet.js';
import { SearchModal } from './src/components/SearchModal.js';
import { PetShop } from './src/components/PetShop.js';
import { FeedbackDialog } from './src/components/FeedbackDialog.js';
import { Confetti } from './src/components/Confetti.js';

import { TodayScreen } from './src/screens/TodayScreen.js';
import { ListsOverview, ListDetail, NewListDialog } from './src/screens/ListsScreen.js';
import { NotesScreen } from './src/screens/NotesScreen.js';
import { DoneScreen } from './src/screens/DoneScreen.js';
import { SettingsScreen } from './src/screens/SettingsScreen.js';
import { OnboardingScreen } from './src/screens/OnboardingScreen.js';

function AppShell() {
  const { state, actions } = useStore();
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const onboarded = state.settings.onboarded;
  const isProUser = state.settings.purchased;

  // Initialize billing on mount (non-blocking)
  useEffect(() => {
    initBilling();
  }, []);

  const [tab, setTab] = useState('today');
  const [listView, setListView] = useState({ mode: 'overview', id: null });
  const [sheet, setSheet] = useState(null);
  const [newList, setNewList] = useState(false);
  const [toast, setToast] = useState('');
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [petShopOpen, setPetShopOpen] = useState(false);
  const [feedbackPromptOpen, setFeedbackPromptOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  // Confetti trigger state
  const [confettiTrigger, setConfettiTrigger] = useState(false);
  const [prevActiveCount, setPrevActiveCount] = useState(null);

  const activeTodayTasks = todayTasks(state);
  const activeCount = activeTodayTasks.length;

  useEffect(() => {
    if (prevActiveCount === null) {
      setPrevActiveCount(activeCount);
      return;
    }
    if (prevActiveCount > 0 && activeCount === 0) {
      const completedToday = doneGroups(state).today;
      if (completedToday.length > 0) {
        setConfettiTrigger(true);
      }
    }
    setPrevActiveCount(activeCount);
  }, [activeCount, state]);

  const showToast = useCallback((m) => setToast(m), []);

  // mark each tab as "seen" (input to the feedback-prompt heuristic)
  useEffect(() => {
    if (!onboarded) return;
    const seen = state.settings.tabsSeen || {};
    if (!seen[tab]) actions.setSetting('tabsSeen', { ...seen, [tab]: true });
  }, [tab, onboarded]);

  // Once the user has settled in — 3+ tasks completed and every tab
  // visited — invite feedback. Shown only once.
  const completedTotal = state.tasks.filter((t) => t.isCompleted).length;
  const tabsSeen = state.settings.tabsSeen || {};
  const allTabsSeen = ['today', 'lists', 'notes', 'done'].every((k) => tabsSeen[k]);
  useEffect(() => {
    if (onboarded && !state.settings.feedbackPrompted && completedTotal >= 3 && allTabsSeen) {
      const t = setTimeout(() => setFeedbackPromptOpen(true), 900);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [onboarded, completedTotal, allTabsSeen, state.settings.feedbackPrompted]);

  /* ---------- onboarding ---------- */
  if (!onboarded) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
        <StatusBar style={theme.mode === 'light' ? 'dark' : 'light'} />
        <OnboardingScreen />
      </SafeAreaView>
    );
  }

  /* ---------- live app ---------- */
  const openAdd = () => {
    if (!state.settings.purchased && state.tasks.filter((t) => !t.isCompleted).length >= 15) {
      setPaywallOpen(true);
      return;
    }
    const defaultListId = tab === 'lists' && listView.mode === 'detail' ? listView.id : null;
    setSheet({ mode: 'add', task: { listId: defaultListId } });
  };
  const openEdit = (task) => setSheet({ mode: 'edit', task });

  const onSave = (data) => {
    if (sheet.mode === 'add') {
      actions.addTask(data);
      const lName = data.listId ? listName(state, data.listId) : 'Inbox';
      showToast('Added to ' + lName);
      emitPetReaction('add');
    } else {
      actions.updateTask(sheet.task.id, data);
      showToast('Saved');
    }
    softFeedback(state.settings);
    setSheet(null);
  };
  const onDelete = (id) => {
    actions.deleteTask(id);
    setSheet(null);
    showToast('Task deleted');
  };

  const toggleTheme = () => {
    softFeedback(state.settings);
    actions.setSetting('theme', theme.mode === 'light' ? 'dark' : 'light');
  };

  let screen;
  if (tab === 'today') {
    screen = (
      <TodayScreen
        onOpenTask={openEdit}
        onOpenPets={() => setPetShopOpen(true)}
        onOpenSettings={() => setTab('settings')}
      />
    );
  } else if (tab === 'lists') {
    screen =
      listView.mode === 'overview' ? (
        <ListsOverview
          onOpenList={(id) => setListView({ mode: 'detail', id })}
          onNewList={() => {
            if (!state.settings.purchased && state.lists.length >= 3) {
              setPaywallOpen(true);
            } else {
              setNewList(true);
            }
          }}
          onTriggerPaywall={() => setPaywallOpen(true)}
          onOpenPets={() => setPetShopOpen(true)}
          onOpenSettings={() => setTab('settings')}
        />
      ) : (
        <ListDetail
          listId={listView.id}
          onBack={() => setListView({ mode: 'overview', id: null })}
          onOpenTask={openEdit}
          onAddTask={openAdd}
          onTriggerPaywall={() => setPaywallOpen(true)}
          onOpenPets={() => setPetShopOpen(true)}
          onOpenSettings={() => setTab('settings')}
        />
      );
  } else if (tab === 'notes') {
    screen = (
      <NotesScreen
        onOpenSearch={() => setSearchOpen(true)}
        onOpenPets={() => setPetShopOpen(true)}
        onOpenSettings={() => setTab('settings')}
      />
    );
  } else if (tab === 'done') {
    screen = (
      <DoneScreen
        onOpenTask={openEdit}
        onOpenPets={() => setPetShopOpen(true)}
        onOpenSettings={() => setTab('settings')}
      />
    );
  } else {
    screen = (
      <SettingsScreen
        onToast={showToast}
        onTriggerPaywall={() => setPaywallOpen(true)}
        onBack={() => setTab('today')}
      />
    );
  }

  const showFab = tab === 'today';

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <StatusBar style={theme.mode === 'light' ? 'dark' : 'light'} />
      <SafeAreaView style={styles.container} edges={['top']}>
        {screen}
      </SafeAreaView>

      {showFab && <Fab theme={theme} onPress={openAdd} />}

      {/* Ad banner for free-tier users (hidden for Pro, dormant until ADS_ENABLED) */}
      <AdBanner isProUser={isProUser} theme={theme} />

      <BottomNav
        active={tab}
        onChange={(t) => {
          if (t === 'lists' && tab === 'lists') setListView({ mode: 'overview', id: null });
          setTab(t);
        }}
        theme={theme}
        settings={state.settings}
        bottomInset={insets.bottom}
      />

      {/* Add / Edit sheet */}
      <AddSheet
        open={!!sheet}
        mode={sheet?.mode || 'add'}
        task={sheet?.task}
        onSave={onSave}
        onDelete={onDelete}
        onClose={() => setSheet(null)}
        onTriggerPaywall={() => setPaywallOpen(true)}
      />

      {/* New list dialog */}
      {newList && (
        <NewListDialog
          theme={theme}
          state={state}
          onTriggerPaywall={() => setPaywallOpen(true)}
          onClose={() => setNewList(false)}
          onCreate={(name, accent, icon) => {
            actions.addList(name, accent, icon);
            setNewList(false);
            showToast('List created');
          }}
        />
      )}

      {/* Search */}
      <SearchModal
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        onOpenTask={openEdit}
        theme={theme}
      />

      {/* Pet shop — choose / unlock companions */}
      <PetShop
        open={petShopOpen}
        theme={theme}
        mode={theme.mode}
        currentPet={state.settings.pet}
        purchased={state.settings.purchased}
        onSelect={(id) => {
          actions.setSetting('pet', id);
          actions.setSetting('accent', null); // let the pet's signature colour lead
          showToast(`${getPet(id).name} is now your companion`);
        }}
        onClose={() => setPetShopOpen(false)}
        onTriggerPaywall={() => setPaywallOpen(true)}
      />

      {/* Auto feedback prompt + dialog */}
      <FeedbackPrompt
        open={feedbackPromptOpen}
        theme={theme}
        onShare={() => {
          actions.setSetting('feedbackPrompted', true);
          setFeedbackPromptOpen(false);
          setFeedbackOpen(true);
        }}
        onDismiss={() => {
          actions.setSetting('feedbackPrompted', true);
          setFeedbackPromptOpen(false);
        }}
      />
      <FeedbackDialog
        open={feedbackOpen}
        onClose={() => setFeedbackOpen(false)}
        theme={theme}
        onToast={showToast}
      />

      {/* Confetti Celebration */}
      <Confetti trigger={confettiTrigger} onComplete={() => setConfettiTrigger(false)} />

      {/* Paywall Dialog */}
      <PaywallDialog
        open={paywallOpen}
        theme={theme}
        onPurchase={() => {
          actions.setSetting('purchased', true);
          setPaywallOpen(false);
          showToast('HiTasky Premium Activated!');
        }}
        onRestore={() => {
          actions.setSetting('purchased', true);
          setPaywallOpen(false);
          showToast('Purchase Restored!');
        }}
        onCancel={() => setPaywallOpen(false)}
      />

      {/* Toast */}
      <Toast message={toast} theme={theme} onDone={() => setToast('')} />
    </View>
  );
}

export default function App() {
  const [fontsLoaded] = useFonts({
    Newsreader_300Light,
    Newsreader_400Regular,
    Newsreader_500Medium,
    Newsreader_300Light_Italic,
    Newsreader_400Regular_Italic,
    HankenGrotesk_400Regular,
    HankenGrotesk_500Medium,
    HankenGrotesk_600SemiBold,
    HankenGrotesk_700Bold,
  });

  if (!fontsLoaded) return null;

  return (
    <GestureHandlerRootView style={styles.container}>
      <SafeAreaProvider>
        <StoreProvider>
          <AppShell />
        </StoreProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
