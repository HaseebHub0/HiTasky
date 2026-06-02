// ============================================================
// TodayWidget — Android home-screen widget showing today's
// tasks. Rendered by react-native-android-widget in a headless
// context, so it uses only the library's widget primitives and
// plain hex colours (no app theme objects, no SVG).
// ============================================================
import React from 'react';
import { FlexWidget, TextWidget } from 'react-native-android-widget';

const PALETTES = {
  dark: { bg: '#18140F', surface: '#221D17', text: '#F3ECDF', muted: '#7C7264', accent: '#E58A4B' },
  light: { bg: '#F4EEE2', surface: '#FBF6EC', text: '#29231A', muted: '#9A8E79', accent: '#C26A2F' },
};

export function TodayWidget({ tasks = [], dateLabel = '', theme = 'dark' }) {
  const c = PALETTES[theme] || PALETTES.dark;
  const shown = tasks.slice(0, 4);
  const more = tasks.length - shown.length;

  return (
    <FlexWidget
      clickAction="OPEN_APP"
      style={{
        height: 'match_parent',
        width: 'match_parent',
        flexDirection: 'column',
        backgroundColor: c.bg,
        borderRadius: 20,
        padding: 16,
      }}
    >
      {/* header */}
      <FlexWidget style={{ flexDirection: 'row', alignItems: 'center', width: 'match_parent' }}>
        <TextWidget text="👋" style={{ fontSize: 14 }} />
        <TextWidget
          text=" HiTasky"
          style={{ fontSize: 13, color: c.accent, fontFamily: 'serif' }}
        />
        <FlexWidget style={{ flex: 1 }} />
        <TextWidget text={dateLabel} style={{ fontSize: 11, color: c.muted }} />
      </FlexWidget>

      {/* body */}
      {shown.length === 0 ? (
        <FlexWidget style={{ flexDirection: 'column', marginTop: 12 }}>
          <TextWidget text="Nothing pressing." style={{ fontSize: 15, color: c.text }} />
          <TextWidget text="Enjoy the white space." style={{ fontSize: 12, color: c.muted, marginTop: 2 }} />
        </FlexWidget>
      ) : (
        <FlexWidget style={{ flexDirection: 'column', marginTop: 10, width: 'match_parent' }}>
          {shown.map((title, i) => (
            <FlexWidget
              key={String(i)}
              style={{ flexDirection: 'row', alignItems: 'center', width: 'match_parent', marginBottom: 7 }}
            >
              <FlexWidget
                style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: c.accent, marginRight: 9 }}
              />
              <TextWidget
                text={title}
                truncate="END"
                maxLines={1}
                style={{ fontSize: 14, color: c.text }}
              />
            </FlexWidget>
          ))}
          {more > 0 && (
            <TextWidget text={`+${more} more`} style={{ fontSize: 11, color: c.muted, marginTop: 2 }} />
          )}
        </FlexWidget>
      )}
    </FlexWidget>
  );
}
