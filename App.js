// ============================================================
// HiTasky — Application Shell (React Native / Expo Go)
// Routes between onboarding and the live app (Today · Lists ·
// Done · Settings). Everything runs fully offline.
// ============================================================
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { LogBox, StyleSheet, View, Modal, Pressable, Text, Platform, UIManager, AppState, Linking } from 'react-native';

if (Platform.OS === 'android') {
  if (UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  }
}
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
import { Caveat_400Regular, Caveat_700Bold } from '@expo-google-fonts/caveat';
import { Mali_400Regular, Mali_500Medium, Mali_600SemiBold, Mali_700Bold, Mali_400Regular_Italic } from '@expo-google-fonts/mali';
import { Inter_300Light, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import { PlayfairDisplay_400Regular, PlayfairDisplay_500Medium, PlayfairDisplay_400Regular_Italic } from '@expo-google-fonts/playfair-display';
import { SpaceMono_400Regular, SpaceMono_700Bold, SpaceMono_400Regular_Italic } from '@expo-google-fonts/space-mono';

import * as Updates from 'expo-updates';
import { StoreProvider, useStore } from './src/lib/store.js';
import { useAppTheme } from './src/lib/useTheme.js';
import { listName, todayTasks, doneGroups } from './src/lib/selectors.js';
import { softFeedback, addFeedback, deleteFeedback } from './src/lib/feedback.js';
import { initBilling, getProProduct, purchaseLifetimePro, restorePurchase } from './src/lib/billing.js';
import { PAYWALL_PRICING, FREE_FOR_ALL } from './src/lib/config.js';
import { track, flushAnalytics } from './src/lib/analytics.js';
import { initCrashReporting } from './src/lib/crash.js';
import { checkIntegrity, isProductionBuild } from './src/lib/security.js';
import { AdBanner, recordCompletionForAd, showInterstitial, markAdShown } from './src/lib/adManager.js';
import { emitPetReaction, getPet } from './src/lib/pets.js';
import { recordCompletion } from './src/lib/greeting.js';

import { BottomNav } from './src/components/BottomNav.js';
import { Fab, Toast, PaywallDialog, RatingDialog, TrialBanner } from './src/components/ui.js';
import { AddSheet } from './src/components/AddSheet.js';
import { NoteSheet } from './src/components/NoteSheet.js';
import { SearchModal } from './src/components/SearchModal.js';
import { PetShop } from './src/components/PetShop.js';
import { FeedbackDialog } from './src/components/FeedbackDialog.js';
import { Confetti } from './src/components/Confetti.js';
import { FocusTimer } from './src/components/FocusTimer.js';
import { BrainDump } from './src/components/BrainDump.js';
import { FONT, ACCENTS } from './src/theme.js';
import { Icon } from './src/components/icons.js';

import { TodayScreen } from './src/screens/TodayScreen.js';
import { ListsOverview, ListDetail, NewListDialog } from './src/screens/ListsScreen.js';
import { NotesScreen } from './src/screens/NotesScreen.js';
import { DoneScreen } from './src/screens/DoneScreen.js';
import { SettingsScreen } from './src/screens/SettingsScreen.js';
import { OnboardingScreen } from './src/screens/OnboardingScreen.js';
import { ScheduleScreen } from './src/screens/ScheduleScreen.js';

function AppShell() {
  const { state, actions, entitlement } = useStore();
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const onboarded = state.settings.onboarded;
  const isProUser = state.settings.purchased;

  // Initialize crash reporting + billing on mount (non-blocking)
  useEffect(() => {
    initCrashReporting();
    // FREE-LAUNCH GUARD: while the app is free-for-all we do NOT open a Play
    // Billing connection at startup (no initConnection, no purchase listeners).
    // Billing code stays intact — it simply never executes. When monetization
    // is re-enabled later (FREE_FOR_ALL = false, shipped via OTA), this resumes.
    if (!FREE_FOR_ALL) initBilling();
  }, []);

  // Automatic check for OTA updates on app launch AND when resuming from background
  useEffect(() => {
    const checkUpdates = async () => {
      if (Platform.OS === 'web') return;
      try {
        if (!Updates.isEnabled) return;
        const check = await Updates.checkForUpdateAsync();
        if (check.isAvailable) {
          await Updates.fetchUpdateAsync();
          showToast('New update downloaded. Restarting...');
          setTimeout(async () => {
            await Updates.reloadAsync();
          }, 1500);
        }
      } catch (e) {
        console.warn('[Updates] Auto update check failed:', e.message);
      }
    };

    // Check on initial load
    checkUpdates();

    // Check when returning to foreground
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        checkUpdates();
      }
    });

    return () => sub.remove();
  }, [showToast]);

  // Anti-tamper gate (Phase 2.3): only enforce on real production builds
  // so Expo Go / dev is unaffected. Lock (not crash) if compromised.
  const [locked, setLocked] = useState(false);
  useEffect(() => {
    if (!isProductionBuild()) return;
    (async () => {
      const verdict = await checkIntegrity();
      if (verdict.compromised) setLocked(true);
    })();
  }, []);

  const [tab, setTab] = useState('today');
  const [listView, setListView] = useState({ mode: 'overview', id: null });
  const [sheet, setSheet] = useState(null);
  const [noteSheet, setNoteSheet] = useState(null);
  const [fabMenuOpen, setFabMenuOpen] = useState(false);
  const [newList, setNewList] = useState(false);
  const [toast, setToast] = useState(null);
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [petShopOpen, setPetShopOpen] = useState(false);
  const [ratingOpen, setRatingOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [proProduct, setProProduct] = useState(null);
  const [purchaseBusy, setPurchaseBusy] = useState(false);
  const [focusTimerOpen, setFocusTimerOpen] = useState(false);
  const [brainDumpOpen, setBrainDumpOpen] = useState(false);

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
      if (completedToday.length > 0 && state.settings.animations !== false) {
        setConfettiTrigger(true);
      }
    }
    setPrevActiveCount(activeCount);
  }, [activeCount, state]);

  const showToast = useCallback((msg, onUndo = null, duration = 3000) => {
    setToast({ message: msg, onUndo, duration });
  }, []);

  // Flush the offline analytics buffer whenever the app comes to the
  // foreground (best moment to catch a regained connection).
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') flushAnalytics();
    });
    flushAnalytics();
    return () => sub.remove();
  }, []);

  // Engagement KPI: emit task_completed when the completed count rises.
  // Centralized here so every screen's completion is captured once.
  const completedCount = state.tasks.filter((t) => t.isCompleted).length;
  const prevCompletedRef = useRef(null);
  useEffect(() => {
    if (prevCompletedRef.current === null) {
      prevCompletedRef.current = completedCount;
      return;
    }
    if (completedCount > prevCompletedRef.current) {
      track('task_completed', { delta: completedCount - prevCompletedRef.current });
      // Record streak for the greeting display
      recordCompletion();
    }
    prevCompletedRef.current = completedCount;
  }, [completedCount]);

  // FOMO paywall: once the 7-day trial has lapsed (and the user hasn't
  // bought Pro), surface the full-screen paywall on launch. Inline gates
  // (task/list limits, etc.) catch any premium action afterwards.
  useEffect(() => {
    if (onboarded && entitlement.trialExpired) {
      const t = setTimeout(() => setPaywallOpen(true), 400);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [onboarded, entitlement.trialExpired]);

  // Fetch the live Play Store price + log the view when the paywall opens.
  useEffect(() => {
    if (!paywallOpen) return;
    track('paywall_viewed', { trialDaysLeft: entitlement.trialDaysLeft, expired: entitlement.trialExpired });
    let cancelled = false;
    (async () => {
      const p = await getProProduct();
      if (!cancelled) setProProduct(p);
    })();
    return () => { cancelled = true; };
  }, [paywallOpen]);

  const handlePurchase = useCallback(async () => {
    setPurchaseBusy(true);
    track('purchase_attempted', { productId: 'hitasky_lifetime_pro' });
    try {
      const res = await purchaseLifetimePro();
      if (res.success) {
        actions.setSetting('purchased', true);
        actions.setSetting('purchasedAt', res.purchasedAt || new Date().toISOString());
        track('purchase_success', { productId: 'hitasky_lifetime_pro' });
        setPaywallOpen(false);
        showToast('HiTasky Premium activated — thank you!');
      } else if (res.error !== 'cancelled') {
        track('purchase_failed', { error: res.error });
        showToast(res.error || 'Purchase could not be completed.');
      }
    } finally {
      setPurchaseBusy(false);
    }
  }, [actions, showToast]);

  const handleRestore = useCallback(async () => {
    setPurchaseBusy(true);
    try {
      const res = await restorePurchase();
      if (res.success) {
        actions.setSetting('purchased', true);
        actions.setSetting('purchasedAt', res.purchasedAt || new Date().toISOString());
        track('purchase_restored', {});
        setPaywallOpen(false);
        showToast('Purchase restored!');
      } else {
        showToast(res.error || 'No previous purchase found.');
      }
    } finally {
      setPurchaseBusy(false);
    }
  }, [actions, showToast]);

  // mark each tab as "seen" (input to the feedback-prompt heuristic)
  useEffect(() => {
    if (!onboarded) return;
    const seen = state.settings.tabsSeen || {};
    if (!seen[tab]) actions.setSetting('tabsSeen', { ...seen, [tab]: true });
  }, [tab, onboarded]);

  // Once the user has settled in — 3+ tasks completed and every tab
  // visited — invite a rating. Shown once; "Maybe later" snoozes it for
  // ~14 days rather than disabling it forever (anti-spam, but recoverable).
  const completedTotal = state.tasks.filter((t) => t.isCompleted).length;
  const tabsSeen = state.settings.tabsSeen || {};
  const allTabsSeen = ['today', 'lists', 'notes', 'done'].every((k) => tabsSeen[k]);
  const reviewPrompted = state.settings.reviewPrompted;
  const reviewSnoozedAt = state.settings.reviewSnoozedAt;
  const snoozeElapsed =
    !reviewSnoozedAt || Date.now() - new Date(reviewSnoozedAt).getTime() > 14 * 24 * 60 * 60 * 1000;
  useEffect(() => {
    if (onboarded && !reviewPrompted && snoozeElapsed && completedTotal >= 3 && allTabsSeen) {
      const t = setTimeout(() => setRatingOpen(true), 900);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [onboarded, completedTotal, allTabsSeen, reviewPrompted, snoozeElapsed]);

  // Feedback popup — shows once after the user has explored all tabs.
  // Separate from the rating flow: fires even without 3 completed tasks.
  // The feedbackPrompted flag ensures it only fires once per install.
  const feedbackPrompted = state.settings.feedbackPrompted;
  useEffect(() => {
    if (onboarded && allTabsSeen && !feedbackPrompted && !reviewPrompted) {
      const t = setTimeout(() => {
        actions.setSetting('feedbackPrompted', true);
        setFeedbackOpen(true);
      }, 1200);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [onboarded, allTabsSeen, feedbackPrompted, reviewPrompted]);

  // Open the device's Play Store review page (falls back to the web URL).
  const openPlayStoreReview = useCallback(async () => {
    const market = 'market://details?id=com.hitasky.app';
    const web = 'https://play.google.com/store/apps/details?id=com.hitasky.app';
    try {
      const can = await Linking.canOpenURL(market);
      await Linking.openURL(can ? market : web);
    } catch (e) {
      try { await Linking.openURL(web); } catch (e2) {}
    }
  }, []);

  // Rating flow: 4–5 stars → Play Store; 1–3 stars → in-app feedback form.
  const handleRatingSubmit = useCallback((stars) => {
    actions.setSetting('reviewPrompted', true);
    setRatingOpen(false);
    track('app_rated', { stars });
    if (stars >= 4) {
      openPlayStoreReview();
      showToast('Thank you for the support!');
    } else {
      setTimeout(() => setFeedbackOpen(true), 250);
    }
  }, [actions, openPlayStoreReview, showToast]);

  const handleRatingLater = useCallback(() => {
    actions.setSetting('reviewSnoozedAt', new Date().toISOString());
    setRatingOpen(false);
  }, [actions]);

  /* ---------- anti-tamper lock (Phase 2.3) ---------- */
  if (locked) {
    return (
      <View style={[styles.container, { backgroundColor: theme.bg, alignItems: 'center', justifyContent: 'center', padding: 32 }]}>
        <StatusBar style={theme.mode === 'light' ? 'dark' : 'light'} />
        <Text style={{ fontFamily: FONT.serif, fontSize: 22, color: theme.text, textAlign: 'center', marginBottom: 12 }}>
          Unable to run securely
        </Text>
        <Text style={{ fontFamily: FONT.sans, fontSize: 14, lineHeight: 21, color: theme.text2, textAlign: 'center' }}>
          HiTasky can't run on a modified or rooted environment. Please install the official version from Google Play.
        </Text>
      </View>
    );
  }

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
  const openAdd = (initial = null) => {
    if (!state.settings.purchased && state.tasks.filter((t) => !t.isCompleted).length >= 15) {
      setPaywallOpen(true);
      return;
    }
    const defaultListId = tab === 'lists' && listView.mode === 'detail' ? listView.id : null;
    let initialTask = { listId: defaultListId };
    if (typeof initial === 'string') {
      initialTask.dueAt = initial;
    } else if (initial && typeof initial === 'object') {
      initialTask = { ...initialTask, ...initial };
    }
    setSheet({ mode: 'add', task: initialTask });
  };
  const openEdit = (task) => setSheet({ mode: 'edit', task });

  const onSave = (data) => {
    if (sheet.mode === 'add') {
      actions.addTask(data);
      const lName = data.listId ? listName(state, data.listId) : 'Inbox';
      showToast('Added to ' + lName);
      emitPetReaction('add');
      addFeedback(state.settings);
    } else {
      actions.updateTask(sheet.task.id, data);
      showToast('Saved');
      softFeedback(state.settings);
    }
    setSheet(null);
  };
  const onDelete = (id) => {
    const taskToDelete = state.tasks.find((t) => t.id === id);
    actions.deleteTask(id);
    deleteFeedback(state.settings);
    setSheet(null);
    if (taskToDelete) {
      showToast('Task deleted', () => {
        actions.restoreTask(taskToDelete);
        showToast('Task restored');
      });
    } else {
      showToast('Task deleted');
    }
  };

  const openAddNote = () => {
    setNoteSheet({ mode: 'add', note: null });
  };
  const openEditNote = (note) => {
    setNoteSheet({ mode: 'edit', note });
  };
  const onSaveNote = (data) => {
    if (noteSheet.mode === 'add') {
      actions.addNote(data);
      showToast('Note created');
      addFeedback(state.settings);
    } else {
      actions.updateNote(noteSheet.note.id, data);
      showToast('Note saved');
      softFeedback(state.settings);
    }
    setNoteSheet(null);
  };
  const onDeleteNote = (id) => {
    const noteToDelete = state.notes.find((n) => n.id === id);
    actions.deleteNote(id);
    deleteFeedback(state.settings);
    setNoteSheet(null);
    if (noteToDelete) {
      showToast('Note deleted', () => {
        actions.restoreNote(noteToDelete);
        showToast('Note restored');
      });
    } else {
      showToast('Note deleted');
    }
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
  } else if (tab === 'schedule') {
    screen = (
      <ScheduleScreen
        onOpenTask={openEdit}
        onAddTask={openAdd}
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
        onOpenNote={(note) => (note ? openEditNote(note) : openAddNote())}
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
        onOpenPets={() => setPetShopOpen(true)}
        onOpenRating={() => setRatingOpen(true)}
      />
    );
  }

  const showFab = tab === 'today';

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <StatusBar style={theme.mode === 'light' ? 'dark' : 'light'} />
      <SafeAreaView style={styles.container} edges={['top']}>
        {entitlement.inTrial && (
          <TrialBanner
            daysLeft={entitlement.trialDaysLeft}
            theme={theme}
            onPress={() => setPaywallOpen(true)}
          />
        )}
        {screen}
      </SafeAreaView>

      {showFab && <Fab theme={theme} onPress={() => setFabMenuOpen(true)} bottomInset={insets.bottom} />}

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

      {/* Rating + review flow */}
      <RatingDialog
        open={ratingOpen}
        theme={theme}
        petId={state.settings.pet || 'zen'}
        onSubmit={handleRatingSubmit}
        onLater={handleRatingLater}
        onClose={handleRatingLater}
      />
      <FeedbackDialog
        open={feedbackOpen}
        onClose={() => setFeedbackOpen(false)}
        theme={theme}
        onToast={showToast}
      />

      {/* Confetti Celebration */}
      <Confetti trigger={confettiTrigger} onComplete={() => setConfettiTrigger(false)} />

      {/* Paywall Dialog — real billing, honest pricing */}
      <PaywallDialog
        open={paywallOpen}
        theme={theme}
        busy={purchaseBusy}
        salePrice={(proProduct && proProduct.localizedPrice) || PAYWALL_PRICING.saleFallback}
        referencePrice={PAYWALL_PRICING.referencePrice}
        badge={PAYWALL_PRICING.badge}
        onPurchase={handlePurchase}
        onRestore={handleRestore}
        onCancel={() => setPaywallOpen(false)}
      />

      {/* Toast */}
      <Toast
        message={toast?.message}
        onUndo={toast?.onUndo}
        duration={toast?.duration}
        theme={theme}
        onDone={() => setToast(null)}
      />

      {/* NoteSheet */}
      <NoteSheet
        open={!!noteSheet}
        mode={noteSheet?.mode}
        note={noteSheet?.note}
        theme={theme}
        onSave={onSaveNote}
        onDelete={onDeleteNote}
        onClose={() => setNoteSheet(null)}
      />

      {/* Focus Timer */}
      <FocusTimer
        open={focusTimerOpen}
        onClose={() => setFocusTimerOpen(false)}
        theme={theme}
        petId={state.settings.pet}
      />

      {/* Brain Dump */}
      <BrainDump
        open={brainDumpOpen}
        onClose={() => setBrainDumpOpen(false)}
        theme={theme}
        onSave={(lines, listId) => {
          lines.forEach((title) => actions.addTask({ title, listId }));
          const targetName = listId ? state.lists.find((l) => l.id === listId)?.name || 'List' : 'Inbox';
          showToast(`${lines.length} thought${lines.length > 1 ? 's' : ''} added to ${targetName}`);
        }}
      />

      {/* FAB Select Option Menu */}
      <Modal visible={fabMenuOpen} transparent animationType="fade" onRequestClose={() => setFabMenuOpen(false)}>
        <Pressable style={styles.scrim} onPress={() => setFabMenuOpen(false)} />
        <View style={[styles.fabMenuWrap, { bottom: 170 + insets.bottom }]} pointerEvents="box-none">
          <View style={[styles.fabMenu, { backgroundColor: theme.surface, borderColor: theme.surface2 }]}>
            <Pressable
              style={styles.fabMenuItem}
              onPress={() => {
                setFabMenuOpen(false);
                openAdd();
              }}
            >
              <Icon.tick size={18} color={theme.accent} />
              <Text style={[styles.fabMenuText, { color: theme.text, fontFamily: FONT.sansSemi }]}>Create Task</Text>
            </Pressable>
            <View style={[styles.fabMenuDivider, { backgroundColor: theme.hairline }]} />
            <Pressable
              style={styles.fabMenuItem}
              onPress={() => {
                setFabMenuOpen(false);
                setBrainDumpOpen(true);
              }}
            >
              <Icon.send size={18} color={theme.accent} />
              <Text style={[styles.fabMenuText, { color: theme.text, fontFamily: FONT.sansSemi }]}>Rapid Capture</Text>
            </Pressable>
            <View style={[styles.fabMenuDivider, { backgroundColor: theme.hairline }]} />
            <Pressable
              style={styles.fabMenuItem}
              onPress={() => {
                setFabMenuOpen(false);
                openAddNote();
              }}
            >
              <Icon.book size={18} color={theme.accent} />
              <Text style={[styles.fabMenuText, { color: theme.text, fontFamily: FONT.sansSemi }]}>Create Note</Text>
            </Pressable>
            <View style={[styles.fabMenuDivider, { backgroundColor: theme.hairline }]} />
            <Pressable
              style={styles.fabMenuItem}
              onPress={() => {
                setFabMenuOpen(false);
                setFocusTimerOpen(true);
              }}
            >
              <Icon.timer size={18} color={theme.accent} />
              <Text style={[styles.fabMenuText, { color: theme.text, fontFamily: FONT.sansSemi }]} numberOfLines={1}>
                Start Focus
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>
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
    Caveat_400Regular,
    Caveat_700Bold,
    Mali_400Regular,
    Mali_500Medium,
    Mali_600SemiBold,
    Mali_700Bold,
    Mali_400Regular_Italic,
    Inter_300Light,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    PlayfairDisplay_400Regular,
    PlayfairDisplay_500Medium,
    PlayfairDisplay_400Regular_Italic,
    SpaceMono_400Regular,
    SpaceMono_700Bold,
    SpaceMono_400Regular_Italic,
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
  scrim: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.15)' },
  fabMenuWrap: {
    position: 'absolute',
    right: 20,
    zIndex: 20,
  },
  fabMenu: {
    borderRadius: 16,
    borderWidth: 2,
    width: 185,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
    overflow: 'hidden',
  },
  fabMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  fabMenuText: {
    fontFamily: FONT.sansSemi,
    fontSize: 14,
  },
  fabMenuDivider: {
    height: 1,
  },
});
