// ============================================================
// SETTINGS — appearance, feel, and local-only data tools.
// "Buy once, own forever" — offline & private by default.
// ============================================================
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useStore, exportData, importData } from '../lib/store.js';
import { useAppTheme } from '../lib/useTheme.js';
import { Icon } from '../components/icons.js';
import { Kicker, Display, Switch, Seg, ConfirmDialog } from '../components/ui.js';
import { FeedbackDialog } from '../components/FeedbackDialog.js';
import { FONT, ACCENTS } from '../theme.js';
import * as Updates from 'expo-updates';


export function SettingsScreen({ onToast, onTriggerPaywall }) {
  const { state, actions } = useStore();
  const theme = useAppTheme();
  const s = state.settings;
  const [confirm, setConfirm] = useState(null); // 'import' | 'clear' | 'reset'
  const [pendingImport, setPendingImport] = useState(null);
  const [checking, setChecking] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  const set = (k, v) => actions.setSetting(k, v);

  const checkUpdates = async () => {
    if (checking) return;
    if (!Updates.isEnabled) {
      onToast('Updates are available in published builds');
      return;
    }
    setChecking(true);
    try {
      const update = await Updates.checkForUpdateAsync();
      if (update.isAvailable) {
        onToast('Update found! Downloading...');
        await Updates.fetchUpdateAsync();
        onToast('Update installed. Restarting...');
        setTimeout(async () => {
          await Updates.reloadAsync();
        }, 1200);
      } else {
        onToast('Latest version installed');
      }
    } catch (e) {
      onToast('Updates check: ' + e.message);
    } finally {
      setChecking(false);
    }
  };


  const handleExport = async () => {
    try {
      await exportData(state);
      onToast('Backup saved');
    } catch (e) {
      onToast('Export failed');
    }
  };

  const handleImport = async () => {
    try {
      const data = await importData();
      if (!data) return;
      setPendingImport(data);
      setConfirm('import');
    } catch (e) {
      onToast(e.message || 'That file could not be read.');
    }
  };

  const st = makeStyles(theme);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.bg }}
      contentContainerStyle={st.scroll}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={st.header}>
        <Kicker style={{ color: theme.text3, marginBottom: 10 }}>Settings</Kicker>
        <Display style={{ color: theme.text }}>Yours to keep.</Display>
      </View>

      {/* ---- APPEARANCE ---- */}
      <View style={st.group}>
        <Kicker style={{ color: theme.text3, marginBottom: 4 }}>Appearance</Kicker>
        <View style={[st.card, { backgroundColor: theme.surface }]}>
          {/* Theme */}
          <View style={st.row}>
            <View style={st.ic}><Icon.sun size={18} color={theme.text3} /></View>
            <View style={st.rowBody}>
              <Text style={[st.rowTitle, { color: theme.text }]}>Theme</Text>
            </View>
            <Seg
              options={[{ label: 'Dark', value: 'dark' }, { label: 'Paper', value: 'light' }]}
              value={s.theme}
              onChange={(v) => set('theme', v)}
              theme={theme}
            />
          </View>

          <View style={[st.divider, { backgroundColor: theme.hairline }]} />

          {/* Accent */}
          <View style={st.row}>
            <View style={st.ic}>
              <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: theme.accent }} />
            </View>
            <View style={st.rowBody}>
              <Text style={[st.rowTitle, { color: theme.text }]}>Accent</Text>
              <Text style={[st.rowSub, { color: theme.text3 }]}>One signature colour</Text>
            </View>
            <View style={st.swatchRow}>
              {ACCENTS.slice(0, 4).map((c) => (
                <Pressable
                  key={c}
                  onPress={() => {
                    if (!s.purchased) {
                      onTriggerPaywall();
                    } else {
                      set('accent', c);
                    }
                  }}
                  style={[st.swatch, { backgroundColor: c }, s.accent === c && st.swatchOn]}
                />
              ))}
            </View>
          </View>

          <View style={[st.divider, { backgroundColor: theme.hairline }]} />

          {/* Serif titles */}
          <View style={st.row}>
            <View style={st.ic}>
              <Text style={{ fontFamily: FONT.serifItalic, fontSize: 17, color: theme.text3 }}>A</Text>
            </View>
            <View style={st.rowBody}>
              <Text style={[st.rowTitle, { color: theme.text }]}>Serif titles</Text>
              <Text style={[st.rowSub, { color: theme.text3 }]}>Editorial Newsreader on task titles</Text>
            </View>
            <Switch value={!s.sansTitles} onChange={() => set('sansTitles', !s.sansTitles)} theme={theme} />
          </View>
        </View>
      </View>

      {/* ---- FEEL ---- */}
      <View style={st.group}>
        <Kicker style={{ color: theme.text3, marginBottom: 4 }}>Feel</Kicker>
        <View style={[st.card, { backgroundColor: theme.surface }]}>
          {/* Haptics */}
          <View style={st.row}>
            <View style={st.ic}><Icon.haptic size={18} color={theme.text3} /></View>
            <View style={st.rowBody}>
              <Text style={[st.rowTitle, { color: theme.text }]}>Haptics</Text>
              <Text style={[st.rowSub, { color: theme.text3 }]}>A soft tick on every completed task</Text>
            </View>
            <Switch
              value={s.haptics}
              onChange={(v) => {
                if (!s.purchased) {
                  onTriggerPaywall();
                } else {
                  set('haptics', v);
                }
              }}
              theme={theme}
            />
          </View>

          <View style={[st.divider, { backgroundColor: theme.hairline }]} />

          {/* Ink Strike */}
          <View style={st.row}>
            <View style={st.ic}><Icon.tick size={16} color={theme.text3} /></View>
            <View style={st.rowBody}>
              <Text style={[st.rowTitle, { color: theme.text }]}>Completion animation</Text>
              <Text style={[st.rowSub, { color: theme.text3 }]}>Slide card out when completing</Text>
            </View>
            <Switch value={s.inkStrike} onChange={() => set('inkStrike', !s.inkStrike)} theme={theme} />
          </View>
        </View>
      </View>

      {/* ---- DATA ---- */}
      <View style={st.group}>
        <Kicker style={{ color: theme.text3, marginBottom: 4 }}>Your data · on this device</Kicker>
        <View style={[st.card, { backgroundColor: theme.surface }]}>
          <ActionRow
            icon={<Icon.download size={18} color={theme.text3} />}
            label="Back up locally"
            theme={theme}
            onPress={() => {
              if (!s.purchased) {
                onTriggerPaywall();
              } else {
                handleExport();
              }
            }}
          />
          <View style={[st.divider, { backgroundColor: theme.hairline }]} />
          <ActionRow
            icon={<Icon.upload size={18} color={theme.text3} />}
            label="Restore from a file"
            theme={theme}
            onPress={() => {
              if (!s.purchased) {
                onTriggerPaywall();
              } else {
                handleImport();
              }
            }}
          />
          <View style={[st.divider, { backgroundColor: theme.hairline }]} />
          <ActionRow icon={<Icon.trash size={18} color={theme.text3} />} label="Clear completed tasks" theme={theme} onPress={() => setConfirm('clear')} />
        </View>
      </View>

      {/* ---- UPDATES ---- */}
      <View style={st.group}>
        <Kicker style={{ color: theme.text3, marginBottom: 4 }}>Updates</Kicker>
        <View style={[st.card, { backgroundColor: theme.surface }]}>
          <ActionRow
            icon={<Icon.sun size={18} color={theme.text3} />}
            label={checking ? "Checking..." : "Check for updates"}
            theme={theme}
            onPress={checkUpdates}
          />
        </View>
      </View>
      
      {/* ---- FEEDBACK ---- */}
      <View style={st.group}>
        <Kicker style={{ color: theme.text3, marginBottom: 4 }}>Feedback</Kicker>
        <View style={[st.card, { backgroundColor: theme.surface }]}>
          <ActionRow
            icon={<Icon.hand size={18} color={theme.text3} />}
            label="Share your feedback"
            theme={theme}
            onPress={() => setFeedbackOpen(true)}
          />
        </View>
      </View>

      {/* ---- PRIVACY ---- */}
      <View style={st.group}>
        <Kicker style={{ color: theme.text3, marginBottom: 4 }}>Privacy</Kicker>
        <View style={[st.card, { backgroundColor: theme.surface }]}>
          <View style={st.row}>
            <View style={st.ic}><Icon.shield size={18} color={theme.text3} /></View>
            <View style={st.rowBody}>
              <Text style={[st.rowTitle, { color: theme.text }]}>Nothing leaves the phone</Text>
              <Text style={[st.rowSub, { color: theme.text3 }]}>No account, no cloud, no tracking. Works fully offline.</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Footer */}
      <View style={[st.footer, { paddingLeft: 4 }]}>
        <View>
          <Text style={{ fontFamily: FONT.serif, fontSize: 16, color: theme.text }}>
            HiTasky · v1.0 · {s.purchased ? 'Owned' : 'Trial'}
          </Text>
          <Text style={{ fontFamily: FONT.sansMedium, fontSize: 13, color: theme.text3, marginTop: 2 }}>
            Bought once. Yours forever.
          </Text>
        </View>
      </View>

      {/* Reset */}
      <Pressable style={[st.dangerRow, { borderTopColor: theme.hairline }]} onPress={() => setConfirm('reset')}>
        <Icon.trash size={18} color="#C2503A" />
        <Text style={st.dangerText}>Reset all data</Text>
        <Icon.chev size={16} color={theme.text4} />
      </Pressable>

      <View style={{ height: 100 }} />

      {/* Confirm dialogs */}
      <ConfirmDialog
        open={confirm === 'import'}
        title="Restore this backup?"
        body="This replaces everything currently in HiTasky with the contents of the file."
        confirmLabel="Restore"
        theme={theme}
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          actions.importData(pendingImport);
          setPendingImport(null);
          setConfirm(null);
          onToast('Backup restored');
        }}
      />
      <ConfirmDialog
        open={confirm === 'clear'}
        title="Clear completed tasks?"
        body="Finished tasks are permanently removed. Active tasks stay put."
        confirmLabel="Clear"
        danger
        theme={theme}
        onCancel={() => setConfirm(null)}
        onConfirm={() => { actions.clearCompleted(); setConfirm(null); onToast('Completed tasks cleared'); }}
      />
      <ConfirmDialog
        open={confirm === 'reset'}
        title="Reset all data?"
        body="Every task and list is removed and HiTasky returns to a fresh start."
        confirmLabel="Reset everything"
        danger
        theme={theme}
        onCancel={() => setConfirm(null)}
        onConfirm={() => { actions.reset(); setConfirm(null); onToast('HiTasky reset'); }}
      />

      {/* Feedback dialog */}
      <FeedbackDialog
        open={feedbackOpen}
        onClose={() => setFeedbackOpen(false)}
        theme={theme}
        onToast={onToast}
      />
    </ScrollView>
  );
}

function ActionRow({ icon, label, theme, onPress }) {
  return (
    <Pressable style={actionStyles.row} onPress={onPress}>
      <View style={actionStyles.ic}>{icon}</View>
      <Text style={[actionStyles.label, { color: theme.text }]}>{label}</Text>
      <Icon.chev size={16} color={theme.text4} />
    </Pressable>
  );
}

const actionStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 17 },
  ic: { width: 22, alignItems: 'center', justifyContent: 'center' },
  label: { flex: 1, fontFamily: FONT.sansSemi, fontSize: 15.5 },
});

function makeStyles(t) {
  return StyleSheet.create({
    scroll: { paddingHorizontal: 22 },
    header: { paddingTop: 18, paddingBottom: 6 },
    group: { marginTop: 26 },
    card: {
      borderRadius: t.radius,
      paddingHorizontal: 20,
      paddingVertical: 4,
      shadowColor: '#000',
      shadowOpacity: t.mode === 'light' ? 0.1 : 0.35,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: 8 },
      elevation: 3,
    },
    row: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingVertical: 17 },
    ic: { width: 22, alignItems: 'center', justifyContent: 'center' },
    rowBody: { flex: 1, minWidth: 0 },
    rowTitle: { fontFamily: FONT.sansSemi, fontSize: 15.5 },
    rowSub: { fontFamily: FONT.sansMedium, fontSize: 12.5, marginTop: 3 },
    divider: { height: 1 },
    swatchRow: { flexDirection: 'row', gap: 8 },
    swatch: { width: 26, height: 26, borderRadius: 13 },
    swatchOn: { borderWidth: 2.5, borderColor: '#fff' },
    footer: { marginTop: 26, marginLeft: 4, flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
    dangerRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 17, borderTopColor: t.hairline, borderTopWidth: 1 },
    dangerText: { flex: 1, fontFamily: FONT.sansSemi, fontSize: 15.5, color: '#C2503A' },
  });
}
