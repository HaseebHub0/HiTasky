// ============================================================
// TodayWidget — Android home-screen widget showing today's
// tasks. Rendered by react-native-android-widget in a headless
// context, so it uses only the library's widget primitives and
// plain hex colours (no app theme objects, no SVG).
// ============================================================
import React from 'react';
import { FlexWidget, TextWidget } from 'react-native-android-widget';

export function TodayWidget({ tasks = [], dateLabel = '', colors, pet = '' }) {
  const c = colors || { bg: '#18140F', surface: '#221D17', text: '#F3ECDF', muted: '#7C7264', accent: '#E58A4B' };
  const shown = tasks.slice(0, 4);
  const more = tasks.length - shown.length;

  return (
    <FlexWidget
      style={{
        height: 'match_parent',
        width: 'match_parent',
        flexDirection: 'column',
        backgroundColor: c.bg,
        borderRadius: 28, // Android 12+ style
        padding: 20,
      }}
    >
      {/* header */}
      <FlexWidget style={{ flexDirection: 'row', alignItems: 'center', width: 'match_parent', marginBottom: 12 }}>
        <TextWidget text={pet} style={{ fontSize: 18 }} />
        <FlexWidget style={{ flex: 1 }} />
        <TextWidget text={dateLabel} style={{ fontSize: 12, color: c.muted }} />
      </FlexWidget>

      {/* body */}
      {shown.length === 0 ? (
        <FlexWidget clickAction="OPEN_APP" style={{ flexDirection: 'column', flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <TextWidget text="All done!" style={{ fontSize: 18, color: c.text, fontFamily: 'serif' }} />
          <TextWidget text="Enjoy the white space." style={{ fontSize: 13, color: c.muted, marginTop: 4 }} />
        </FlexWidget>
      ) : (
        <FlexWidget style={{ flexDirection: 'column', flex: 1, width: 'match_parent' }}>
          {shown.map((task, i) => (
            <FlexWidget
              key={task.id}
              style={{ flexDirection: 'row', alignItems: 'center', width: 'match_parent', marginBottom: 12 }}
            >
              <FlexWidget
                clickAction="CUSTOM"
                clickActionData={{ action: 'COMPLETE', id: task.id }}
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 12,
                  borderWidth: 2,
                  borderColor: c.accent,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: 12,
                }}
              />
              <FlexWidget clickAction="OPEN_APP" style={{ flex: 1 }}>
                <TextWidget
                  text={task.title}
                  truncate="END"
                  maxLines={1}
                  style={{ fontSize: 15, color: c.text }}
                />
              </FlexWidget>
            </FlexWidget>
          ))}
          {more > 0 && (
            <FlexWidget clickAction="OPEN_APP" style={{ marginTop: 4 }}>
              <TextWidget text={`+${more} more`} style={{ fontSize: 12, color: c.muted }} />
            </FlexWidget>
          )}
        </FlexWidget>
      )}
    </FlexWidget>
  );
}
