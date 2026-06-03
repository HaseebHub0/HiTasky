// ============================================================
// PetShop — choose your companion.
//
// Ember the Fox is free. The rest unlock together with HiTasky
// Premium (a one-time Pet Pack). Selecting a pet re-skins the whole
// app instantly. Locked pets still preview live so the unlock feels
// worth it — you can see exactly what you'd get.
// ============================================================
import React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Pet } from './Pet.js';
import { Icon } from './icons.js';
import { Wordmark } from './Wordmark.js';
import { PETS } from '../lib/pets.js';
import { makeTheme, FONT } from '../theme.js';

export function PetShop({ open, theme, mode, currentPet, purchased, onSelect, onClose, onTriggerPaywall }) {
  const { width } = useWindowDimensions();
  const colW = (Math.min(width, 520) - 24 * 2 - 14) / 2;

  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: theme.bg }}>
        {/* header */}
        <View style={[s.head, { borderBottomColor: theme.hairline }]}>
          <View>
            <Text style={{ fontFamily: FONT.sansSemi, fontSize: 12, letterSpacing: 1.9, textTransform: 'uppercase', color: theme.text3 }}>
              Your companion
            </Text>
            <Text style={{ fontFamily: FONT.serifLight, fontSize: 28, color: theme.text, marginTop: 4 }}>
              Pick a pet.
            </Text>
          </View>
          <Pressable onPress={onClose} hitSlop={10} style={[s.close, { backgroundColor: theme.surface2 }]}>
            <Icon.chev size={18} color={theme.text2} />
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
          <Text style={{ fontFamily: FONT.serif, fontSize: 15, lineHeight: 23, color: theme.text2, marginBottom: 20 }}>
            Each friend re-paints the app and reacts to your day in its own way. Tap to try them on.
          </Text>

          <View style={s.grid}>
            {PETS.map((pet) => {
              const locked = !pet.free && !purchased;
              const active = pet.id === currentPet;
              // preview each card in that pet's own palette so the colour sells it
              const petTheme = makeTheme(mode, null, pet.id);
              return (
                <Pressable
                  key={pet.id}
                  onPress={() => (locked ? onTriggerPaywall() : onSelect(pet.id))}
                  style={[
                    s.card,
                    {
                      width: colW,
                      backgroundColor: petTheme.surface,
                      borderColor: active ? petTheme.accent : theme.hairline2,
                      borderWidth: active ? 2 : 1,
                    },
                  ]}
                >
                  {/* preview disc */}
                  <View style={[s.disc, { backgroundColor: petTheme.accentSoft }]}>
                    <Pet petId={pet.id} theme={petTheme} size={72} />
                    {locked && (
                      <View style={[s.lock, { backgroundColor: theme.scrim }]}>
                        <Icon.lock size={20} color="#fff" />
                      </View>
                    )}
                  </View>

                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12 }}>
                    <Text style={{ fontFamily: FONT.serifMedium, fontSize: 19, color: petTheme.text }}>{pet.name}</Text>
                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: petTheme.accent }} />
                  </View>
                  <Text style={{ fontFamily: FONT.sansMedium, fontSize: 12.5, color: petTheme.text3, marginTop: 2 }}>
                    {pet.tagline}
                  </Text>
                  <Text style={{ fontFamily: FONT.sans, fontSize: 12.5, lineHeight: 18, color: petTheme.text2, marginTop: 8 }}>
                    {pet.blurb}
                  </Text>

                  {/* status pill */}
                  <View style={s.pillRow}>
                    {active ? (
                      <View style={[s.pill, { backgroundColor: petTheme.accent }]}>
                        <Icon.tick size={12} color={petTheme.onAccent} />
                        <Text style={{ fontFamily: FONT.sansBold, fontSize: 11.5, color: petTheme.onAccent }}>Active</Text>
                      </View>
                    ) : locked ? (
                      <View style={[s.pill, { backgroundColor: theme.surface2 }]}>
                        <Icon.lock size={11} color={theme.text3} />
                        <Text style={{ fontFamily: FONT.sansBold, fontSize: 11.5, color: theme.text3 }}>Premium</Text>
                      </View>
                    ) : (
                      <View style={[s.pill, { backgroundColor: petTheme.accentSoft }]}>
                        <Text style={{ fontFamily: FONT.sansBold, fontSize: 11.5, color: petTheme.accent }}>Tap to wear</Text>
                      </View>
                    )}
                  </View>
                </Pressable>
              );
            })}
          </View>

          {!purchased && (
            <View style={[s.unlock, { backgroundColor: theme.surface, borderColor: theme.hairline2 }]}>
              <Wordmark theme={theme} size={20} wave={false} />
              <Text style={{ fontFamily: FONT.serif, fontSize: 17, color: theme.text, marginTop: 10, textAlign: 'center' }}>
                Unlock the whole menagerie
              </Text>
              <Text style={{ fontFamily: FONT.sans, fontSize: 13, lineHeight: 20, color: theme.text2, marginTop: 6, textAlign: 'center' }}>
                One small payment adds Ember, Sage, Mochi & Storm — plus every pet that comes later.
              </Text>
              <Pressable onPress={onTriggerPaywall} style={[s.unlockBtn, { backgroundColor: theme.accent }]}>
                <Text style={{ fontFamily: FONT.sansBold, fontSize: 14, color: theme.onAccent }}>Unlock all pets</Text>
              </Pressable>
            </View>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  head: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 56,
    paddingBottom: 18,
    borderBottomWidth: 1,
  },
  close: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '90deg' }] },
  scroll: { paddingHorizontal: 24, paddingTop: 20 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  card: { borderRadius: 22, padding: 14, marginBottom: 0 },
  disc: { height: 96, borderRadius: 16, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  lock: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  pillRow: { marginTop: 12, flexDirection: 'row' },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 6, paddingHorizontal: 11, borderRadius: 100 },
  unlock: { marginTop: 22, borderRadius: 22, borderWidth: 1, padding: 22, alignItems: 'center' },
  unlockBtn: { marginTop: 16, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28 },
});
