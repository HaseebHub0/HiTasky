// ============================================================
// SETTINGS — appearance, feel, and local-only data tools.
// "Buy once, own forever" — offline & private by default.
// ============================================================
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useStore, exportData, importData } from '../lib/store.js';
import { useAppTheme } from '../lib/useTheme.js';
import { Icon } from '../components/icons.js';
import { PetCompanion } from '../components/PetCompanion.js';
import { Pet, HeaderPet } from '../components/Pet.js';
import { Wordmark } from '../components/Wordmark.js';
import { Kicker, Display, Switch, Seg, ConfirmDialog } from '../components/ui.js';
import { FeedbackDialog } from '../components/FeedbackDialog.js';
import { FONT, ACCENTS, softOf, makeTheme } from '../theme.js';
import { PETS, getPet } from '../lib/pets.js';
import { completionFeedback, selectionFeedback } from '../lib/feedback.js';
import * as Updates from 'expo-updates';
import { AppHeader } from '../components/AppHeader.js';


export function SettingsScreen({ onToast, onTriggerPaywall, onBack, onOpenPets, onOpenRating }) {
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
      <AppHeader
        theme={theme}
        settings={state.settings}
        onOpenPets={onOpenPets}
        onBack={onBack}
      />

      <View style={{ marginTop: 6, marginBottom: 16 }}>
        <Kicker style={{ color: theme.text3, marginBottom: 6 }}>Settings</Kicker>
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
          </View>
          {/* Full accent palette — wraps to a grid so all themes are pickable */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, paddingHorizontal: 14, paddingBottom: 14 }}>
            {ACCENTS.map((c) => (
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

          <View style={[st.divider, { backgroundColor: theme.hairline }]} />

          {/* Typography */}
          <View style={[st.row, { flexDirection: 'column', alignItems: 'stretch', gap: 10 }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
              <View style={st.ic}>
                <Text style={{ fontFamily: FONT.serifItalic, fontSize: 17, color: theme.text3 }}>Aa</Text>
              </View>
              <View style={st.rowBody}>
                <Text style={[st.rowTitle, { color: theme.text }]}>Typography</Text>
                <Text style={[st.rowSub, { color: theme.text3 }]}>App-wide font style</Text>
              </View>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={{ gap: 8, paddingHorizontal: 38, paddingBottom: 6 }}>
              <Pressable
                onPress={() => { selectionFeedback(s); set('fontStyle', 'editorial'); }}
                style={[st.sortChip, (s.fontStyle === 'editorial' || !s.fontStyle) && { backgroundColor: theme.accentSoft, borderColor: theme.accent }]}
              >
                <Text style={[st.sortChipText, { color: (s.fontStyle === 'editorial' || !s.fontStyle) ? theme.accent : theme.text2 }]}>Editorial</Text>
              </Pressable>
              <Pressable
                onPress={() => { selectionFeedback(s); set('fontStyle', 'elegant'); }}
                style={[st.sortChip, s.fontStyle === 'elegant' && { backgroundColor: theme.accentSoft, borderColor: theme.accent }]}
              >
                <Text style={[st.sortChipText, { color: s.fontStyle === 'elegant' ? theme.accent : theme.text2 }]}>Elegant</Text>
              </Pressable>
              <Pressable
                onPress={() => { selectionFeedback(s); set('fontStyle', 'minimal'); }}
                style={[st.sortChip, s.fontStyle === 'minimal' && { backgroundColor: theme.accentSoft, borderColor: theme.accent }]}
              >
                <Text style={[st.sortChipText, { color: s.fontStyle === 'minimal' ? theme.accent : theme.text2 }]}>Minimal</Text>
              </Pressable>
              <Pressable
                onPress={() => { selectionFeedback(s); set('fontStyle', 'classic'); }}
                style={[st.sortChip, s.fontStyle === 'classic' && { backgroundColor: theme.accentSoft, borderColor: theme.accent }]}
              >
                <Text style={[st.sortChipText, { color: s.fontStyle === 'classic' ? theme.accent : theme.text2 }]}>Classic</Text>
              </Pressable>
              <Pressable
                onPress={() => { selectionFeedback(s); set('fontStyle', 'modern'); }}
                style={[st.sortChip, s.fontStyle === 'modern' && { backgroundColor: theme.accentSoft, borderColor: theme.accent }]}
              >
                <Text style={[st.sortChipText, { color: s.fontStyle === 'modern' ? theme.accent : theme.text2 }]}>Modern</Text>
              </Pressable>
              <Pressable
                onPress={() => { selectionFeedback(s); set('fontStyle', 'code'); }}
                style={[st.sortChip, s.fontStyle === 'code' && { backgroundColor: theme.accentSoft, borderColor: theme.accent }]}
              >
                <Text style={[st.sortChipText, { color: s.fontStyle === 'code' ? theme.accent : theme.text2 }]}>Code</Text>
              </Pressable>
              <Pressable
                onPress={() => { selectionFeedback(s); set('fontStyle', 'cursive'); }}
                style={[st.sortChip, s.fontStyle === 'cursive' && { backgroundColor: theme.accentSoft, borderColor: theme.accent }]}
              >
                <Text style={[st.sortChipText, { color: s.fontStyle === 'cursive' ? theme.accent : theme.text2 }]}>Cursive</Text>
              </Pressable>
              <Pressable
                onPress={() => { selectionFeedback(s); set('fontStyle', 'cute'); }}
                style={[st.sortChip, s.fontStyle === 'cute' && { backgroundColor: theme.accentSoft, borderColor: theme.accent }]}
              >
                <Text style={[st.sortChipText, { color: s.fontStyle === 'cute' ? theme.accent : theme.text2 }]}>Cute</Text>
              </Pressable>
            </ScrollView>
          </View>

          <View style={[st.divider, { backgroundColor: theme.hairline }]} />

          {/* Sort Order */}
          <View style={[st.row, { flexDirection: 'column', alignItems: 'stretch', gap: 10 }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
              <View style={st.ic}><Icon.sliders size={18} color={theme.text3} /></View>
              <View style={st.rowBody}>
                <Text style={[st.rowTitle, { color: theme.text }]}>Sort Order</Text>
                <Text style={[st.rowSub, { color: theme.text3 }]}>Organise tasks on your lists</Text>
              </View>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={{ gap: 8, paddingHorizontal: 38, paddingBottom: 6 }}>
              <Pressable
                onPress={() => { selectionFeedback(s); set('sortBy', 'smart'); }}
                style={[st.sortChip, s.sortBy === 'smart' && { backgroundColor: theme.accentSoft, borderColor: theme.accent }]}
              >
                <Text style={[st.sortChipText, { color: s.sortBy === 'smart' ? theme.accent : theme.text2 }]}>Smart</Text>
              </Pressable>
              <Pressable
                onPress={() => { selectionFeedback(s); set('sortBy', 'dueDate'); }}
                style={[st.sortChip, s.sortBy === 'dueDate' && { backgroundColor: theme.accentSoft, borderColor: theme.accent }]}
              >
                <Text style={[st.sortChipText, { color: s.sortBy === 'dueDate' ? theme.accent : theme.text2 }]}>Due Date</Text>
              </Pressable>
              <Pressable
                onPress={() => { selectionFeedback(s); set('sortBy', 'priority'); }}
                style={[st.sortChip, s.sortBy === 'priority' && { backgroundColor: theme.accentSoft, borderColor: theme.accent }]}
              >
                <Text style={[st.sortChipText, { color: s.sortBy === 'priority' ? theme.accent : theme.text2 }]}>Priority</Text>
              </Pressable>
              <Pressable
                onPress={() => { selectionFeedback(s); set('sortBy', 'name'); }}
                style={[st.sortChip, s.sortBy === 'name' && { backgroundColor: theme.accentSoft, borderColor: theme.accent }]}
              >
                <Text style={[st.sortChipText, { color: s.sortBy === 'name' ? theme.accent : theme.text2 }]}>Alphabetical</Text>
              </Pressable>
              <Pressable
                onPress={() => { selectionFeedback(s); set('sortBy', 'createdAt'); }}
                style={[st.sortChip, s.sortBy === 'createdAt' && { backgroundColor: theme.accentSoft, borderColor: theme.accent }]}
              >
                <Text style={[st.sortChipText, { color: s.sortBy === 'createdAt' ? theme.accent : theme.text2 }]}>Created Date</Text>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </View>

      {/* ---- COMPANION ---- */}
      <View style={st.group}>
        <Kicker style={{ color: theme.text3, marginBottom: 4 }}>Companion</Kicker>
        <View style={[st.card, { backgroundColor: theme.surface }]}>
          {/* Active pet preview */}
          <View style={{ alignItems: 'center', paddingVertical: 16 }}>
            <PetCompanion petId={s.pet} size={56} showEmote={false} />
            <Text style={{ fontFamily: FONT.sansSemi, fontSize: 14, color: theme.text, marginTop: 8 }}>
              {getPet(s.pet).name} the {getPet(s.pet).species}
            </Text>
            <Text style={{ fontFamily: FONT.sansMedium, fontSize: 12, color: theme.text3, marginTop: 2 }}>
              {getPet(s.pet).tagline}
            </Text>
          </View>

          <View style={[st.divider, { backgroundColor: theme.hairline }]} />

          {/* Pet grid */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingVertical: 14, justifyContent: 'center' }}>
            {PETS.map((pet) => {
              const isSelected = s.pet === pet.id;
              const isLocked = !pet.free && !s.purchased;
              return (
                <Pressable
                  key={pet.id}
                  onPress={() => {
                    if (isLocked) {
                      onTriggerPaywall();
                    } else {
                      set('pet', pet.id);
                      // Auto-update accent to match pet's signature colour
                      set('accent', null);
                    }
                  }}
                  style={[
                    {
                      width: 60,
                      height: 60,
                      borderRadius: 18,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: isSelected ? softOf(pet.accent[theme.mode], 0.2) : theme.surface2,
                      borderWidth: isSelected ? 2 : 0,
                      borderColor: isSelected ? pet.accent[theme.mode] : 'transparent',
                    },
                  ]}
                >
                  <Pet petId={pet.id} theme={makeTheme(theme.mode, null, pet.id)} size={42} reactive={false} />
                  {isLocked && (
                    <View style={{ position: 'absolute', bottom: 2, right: 2 }}>
                      <Icon.lock size={11} color={theme.text3} />
                    </View>
                  )}
                </Pressable>
              );
            })}
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
              value={s.haptics !== false}
              onChange={(v) => {
                set('haptics', v);
                // Fire an immediate confirmation tap when enabling so the
                // user feels it working right away (ignores the just-set
                // value by forcing a pulse).
                if (v) completionFeedback({ haptics: true });
              }}
              theme={theme}
            />
          </View>

          <View style={[st.divider, { backgroundColor: theme.hairline }]} />

          {/* Animations master toggle */}
          <View style={st.row}>
            <View style={st.ic}><Icon.tick size={16} color={theme.text3} /></View>
            <View style={st.rowBody}>
              <Text style={[st.rowTitle, { color: theme.text }]}>Animations</Text>
              <Text style={[st.rowSub, { color: theme.text3 }]}>Completion effects & playful motion</Text>
            </View>
            <Switch
              value={s.animations !== false}
              onChange={(v) => {
                set('animations', v);
                if (s.haptics !== false) selectionFeedback(s);
              }}
              theme={theme}
            />
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
          {onOpenRating && (
            <>
              <View style={[st.divider, { backgroundColor: theme.hairline }]} />
              <ActionRow
                icon={<Icon.star size={18} color={theme.text3} />}
                label="Rate HiTasky"
                theme={theme}
                onPress={onOpenRating}
              />
            </>
          )}
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

      <View style={{ height: 140 }} />

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
    backBtn: {
      width: 32,
      height: 32,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: t.hairline2,
      backgroundColor: t.surface2,
      alignItems: 'center',
      justifyContent: 'center',
    },
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
    sortChip: {
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: 'transparent',
      backgroundColor: t.surface2,
    },
    sortChipText: {
      fontSize: 12.5,
      fontFamily: FONT.sansSemi,
    },
    swatchOn: { borderWidth: 2.5, borderColor: '#fff' },
    footer: { marginTop: 26, marginLeft: 4, flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
    dangerRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 17, borderTopColor: t.hairline, borderTopWidth: 1 },
    dangerText: { flex: 1, fontFamily: FONT.sansSemi, fontSize: 15.5, color: '#C2503A' },
  });
}
