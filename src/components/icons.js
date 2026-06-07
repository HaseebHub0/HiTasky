// ============================================================
// Icon set + nib brand mark, drawn with react-native-svg.
// Faithful to the web design system.
// ============================================================
import React from 'react';
import { Image } from 'react-native';
import Svg, { Path, Rect, Circle, G, Ellipse } from 'react-native-svg';
import { useAppTheme } from '../lib/useTheme.js';


const S = (props) => <Svg {...props} />;

export const Icon = {
  plus: ({ size = 22, color = '#fff' }) => (
    <S width={size} height={size} viewBox="0 0 22 22">
      <Path d="M11 4v14M4 11h14" stroke={color} strokeWidth={2.1} strokeLinecap="round" />
    </S>
  ),
  tick: ({ size = 15, color = '#fff' }) => (
    <S width={size} height={size} viewBox="0 0 15 15">
      <Path d="M3 8l3 3 6-7" stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </S>
  ),
  chev: ({ size = 16, color = '#999' }) => (
    <S width={size} height={size} viewBox="0 0 16 16">
      <Path d="M6 3.5L10.5 8 6 12.5" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </S>
  ),
  chevLeft: ({ size = 16, color = '#999' }) => (
    <S width={size} height={size} viewBox="0 0 16 16">
      <Path d="M10 3.5L5.5 8 10 12.5" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </S>
  ),
  send: ({ size = 20, color = '#fff' }) => (
    <S width={size} height={size} viewBox="0 0 20 20">
      <Path d="M10 16V4M5 9l5-5 5 5" stroke={color} strokeWidth={2.1} strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </S>
  ),
  cal: ({ size = 16, color = '#999' }) => (
    <S width={size} height={size} viewBox="0 0 18 18">
      <Rect x={2.5} y={3.5} width={13} height={12} rx={2.5} stroke={color} strokeWidth={1.6} fill="none" />
      <Path d="M2.5 7h13M6 1.8v3M12 1.8v3" stroke={color} strokeWidth={1.6} strokeLinecap="round" fill="none" />
    </S>
  ),
  sun: ({ size = 18, color = '#999' }) => (
    <S width={size} height={size} viewBox="0 0 20 20">
      <Circle cx={10} cy={10} r={3.6} stroke={color} strokeWidth={1.6} fill="none" />
      <Path
        d="M10 1.5v2.2M10 16.3v2.2M1.5 10h2.2M16.3 10h2.2M4 4l1.6 1.6M14.4 14.4L16 16M16 4l-1.6 1.6M5.6 14.4L4 16"
        stroke={color}
        strokeWidth={1.6}
        strokeLinecap="round"
        fill="none"
      />
    </S>
  ),
  moon: ({ size = 18, color = '#999' }) => (
    <S width={size} height={size} viewBox="0 0 20 20">
      <Path d="M16.2 12.6A6.6 6.6 0 117.4 3.8a5.2 5.2 0 008.8 8.8z" stroke={color} strokeWidth={1.6} strokeLinejoin="round" fill="none" />
    </S>
  ),
  haptic: ({ size = 18, color = '#999' }) => (
    <S width={size} height={size} viewBox="0 0 20 20">
      <Rect x={6.5} y={3} width={7} height={14} rx={2.2} stroke={color} strokeWidth={1.6} fill="none" />
      <Path d="M3 7v6M17 7v6" stroke={color} strokeWidth={1.6} strokeLinecap="round" opacity={0.7} fill="none" />
    </S>
  ),
  sound: ({ size = 18, color = '#999' }) => (
    <S width={size} height={size} viewBox="0 0 20 20">
      <Path d="M4 7.5h3l4-3v11l-4-3H4z" stroke={color} strokeWidth={1.6} strokeLinejoin="round" fill="none" />
      <Path d="M14 7a4 4 0 010 6" stroke={color} strokeWidth={1.6} strokeLinecap="round" opacity={0.8} fill="none" />
    </S>
  ),
  shield: ({ size = 18, color = '#999' }) => (
    <S width={size} height={size} viewBox="0 0 20 20">
      <Path
        d="M10 2.2l6 2.4v4.6c0 3.8-2.6 6.6-6 8.2-3.4-1.6-6-4.4-6-8.2V4.6z"
        stroke={color}
        strokeWidth={1.6}
        strokeLinejoin="round"
        fill="none"
      />
    </S>
  ),
  download: ({ size = 18, color = '#999' }) => (
    <S width={size} height={size} viewBox="0 0 20 20">
      <Path d="M10 2.5v9M6 8l4 4 4-4M3.5 16h13" stroke={color} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </S>
  ),
  upload: ({ size = 18, color = '#999' }) => (
    <S width={size} height={size} viewBox="0 0 20 20">
      <Path d="M10 12.5v-9M6 7l4-4 4 4M3.5 16h13" stroke={color} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </S>
  ),
  trash: ({ size = 18, color = '#999' }) => (
    <S width={size} height={size} viewBox="0 0 20 20">
      <Path
        d="M3.5 5.5h13M8 5V3.5h4V5M5 5.5l.8 11h8.4l.8-11M8.5 8.5v5M11.5 8.5v5"
        stroke={color}
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </S>
  ),
  today: ({ size = 22, color = '#999' }) => (
    <S width={size} height={size} viewBox="0 0 20 20">
      <Circle cx={10} cy={10} r={7.5} stroke={color} strokeWidth={1.6} fill="none" />
      <Path d="M10 5.5V10l3 1.8" stroke={color} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </S>
  ),
  lists: ({ size = 22, color = '#999' }) => (
    <S width={size} height={size} viewBox="0 0 20 20">
      <Path d="M7 5.5h9M7 10h9M7 14.5h9" stroke={color} strokeWidth={1.6} strokeLinecap="round" fill="none" />
      <Circle cx={3.5} cy={5.5} r={1.1} fill={color} />
      <Circle cx={3.5} cy={10} r={1.1} fill={color} />
      <Circle cx={3.5} cy={14.5} r={1.1} fill={color} />
    </S>
  ),
  list: ({ size = 22, color = '#999' }) => (
    <S width={size} height={size} viewBox="0 0 20 20">
      <Path d="M7 5.5h9M7 10h9M7 14.5h9" stroke={color} strokeWidth={1.6} strokeLinecap="round" fill="none" />
      <Circle cx={3.5} cy={5.5} r={1.1} fill={color} />
      <Circle cx={3.5} cy={10} r={1.1} fill={color} />
      <Circle cx={3.5} cy={14.5} r={1.1} fill={color} />
    </S>
  ),
  book: ({ size = 22, color = '#999' }) => (
    <S width={size} height={size} viewBox="0 0 20 20">
      <Path d="M4 3h12a2 2 0 012 2v10a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2z" stroke={color} strokeWidth={1.6} fill="none" />
      <Path d="M7 3v14M10 6h4M10 10h4" stroke={color} strokeWidth={1.6} strokeLinecap="round" fill="none" />
    </S>
  ),
  home: ({ size = 22, color = '#999' }) => (
    <S width={size} height={size} viewBox="0 0 20 20">
      <Path d="M3 9.5L10 3.5l7 6V16a1.5 1.5 0 01-1.5 1.5H4.5A1.5 1.5 0 013 16V9.5z" stroke={color} strokeWidth={1.6} strokeLinejoin="round" fill="none" />
      <Path d="M7.5 17.5v-5h5v5" stroke={color} strokeWidth={1.6} fill="none" />
    </S>
  ),
  briefcase: ({ size = 22, color = '#999' }) => (
    <S width={size} height={size} viewBox="0 0 20 20">
      <Rect x={2.5} y={5.5} width={15} height={10} rx={2} stroke={color} strokeWidth={1.6} fill="none" />
      <Path d="M6.5 5.5V3.5a1.5 1.5 0 011.5-1.5h4a1.5 1.5 0 011.5 1.5v2" stroke={color} strokeWidth={1.6} fill="none" />
    </S>
  ),
  heart: ({ size = 22, color = '#999' }) => (
    <S width={size} height={size} viewBox="0 0 20 20">
      <Path d="M10 16.5l-6.5-6a4.2 4.2 0 010-6 4.2 4.2 0 016 0l.5.5.5-.5a4.2 4.2 0 016 0 4.2 4.2 0 010 6z" stroke={color} strokeWidth={1.6} strokeLinejoin="round" fill="none" />
    </S>
  ),
  star: ({ size = 22, color = '#999' }) => (
    <S width={size} height={size} viewBox="0 0 20 20">
      <Path d="M10 2.5l2.2 4.6 5 .7-3.6 3.5.8 5-4.4-2.3-4.4 2.3.8-5-3.6-3.5 5-.7z" stroke={color} strokeWidth={1.6} strokeLinejoin="round" fill="none" />
    </S>
  ),
  doneTab: ({ size = 22, color = '#999' }) => (
    <S width={size} height={size} viewBox="0 0 20 20">
      <Circle cx={10} cy={10} r={7.5} stroke={color} strokeWidth={1.6} fill="none" />
      <Path d="M6.5 10.2l2.4 2.3 4.6-5" stroke={color} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </S>
  ),
  gear: ({ size = 22, color = '#999' }) => (
    <S width={size} height={size} viewBox="0 0 20 20">
      <Circle cx={10} cy={10} r={2.6} stroke={color} strokeWidth={1.6} fill="none" />
      <Path
        d="M10 1.8v2.3M10 15.9v2.3M3.2 6l2 1.1M14.8 12.9l2 1.1M3.2 14l2-1.1M14.8 7.1l2-1.1"
        stroke={color}
        strokeWidth={1.6}
        strokeLinecap="round"
        fill="none"
      />
    </S>
  ),
  sliders: ({ size = 22, color = '#999' }) => (
    <S width={size} height={size} viewBox="0 0 20 20">
      <Path d="M3 5h14M3 10h14M3 15h14" stroke={color} strokeWidth={1.5} strokeLinecap="round" fill="none" />
      <Circle cx={7} cy={5} r={2} fill={color} />
      <Circle cx={13} cy={10} r={2} fill={color} />
      <Circle cx={9} cy={15} r={2} fill={color} />
    </S>
  ),
  hand: ({ size = 14, color = '#E58A4B' }) => (
    <S width={size} height={size} viewBox="0 0 16 16">
      <Path d="M8 2v6M5 9V5.5M11 9V5.5M5 9c0 3 1.3 5 3 5s3-2 3-5" stroke={color} strokeWidth={1.5} strokeLinecap="round" fill="none" />
    </S>
  ),
  search: ({ size = 20, color = '#999' }) => (
    <S width={size} height={size} viewBox="0 0 20 20">
      <Circle cx={9} cy={9} r={6} stroke={color} strokeWidth={1.7} fill="none" />
      <Path d="M13.5 13.5L17 17" stroke={color} strokeWidth={1.7} strokeLinecap="round" />
    </S>
  ),
  bell: ({ size = 18, color = '#999' }) => (
    <S width={size} height={size} viewBox="0 0 20 20">
      <Path d="M10 3a4.5 4.5 0 014.5 4.5c0 4 1.5 5.5 1.5 5.5H4s1.5-1.5 1.5-5.5A4.5 4.5 0 0110 3z" stroke={color} strokeWidth={1.6} strokeLinejoin="round" fill="none" />
      <Path d="M8.4 16a1.8 1.8 0 003.2 0" stroke={color} strokeWidth={1.6} strokeLinecap="round" fill="none" />
    </S>
  ),
  grip: ({ size = 16, color = '#999' }) => (
    <S width={size} height={size} viewBox="0 0 16 16">
      <G fill={color}>
        <Circle cx={6} cy={4} r={1.3} />
        <Circle cx={10} cy={4} r={1.3} />
        <Circle cx={6} cy={8} r={1.3} />
        <Circle cx={10} cy={8} r={1.3} />
        <Circle cx={6} cy={12} r={1.3} />
        <Circle cx={10} cy={12} r={1.3} />
      </G>
    </S>
  ),
  lock: ({ size = 16, color = '#999' }) => (
    <S width={size} height={size} viewBox="0 0 20 20">
      <Rect x={4} y={9} width={12} height={8.5} rx={2.4} stroke={color} strokeWidth={1.7} fill="none" />
      <Path d="M6.6 9V6.8a3.4 3.4 0 016.8 0V9" stroke={color} strokeWidth={1.7} strokeLinecap="round" fill="none" />
    </S>
  ),
  paw: ({ size = 18, color = '#999' }) => (
    <S width={size} height={size} viewBox="0 0 20 20">
      <G fill={color}>
        <Ellipse cx={10} cy={13} rx={4} ry={3.4} />
        <Circle cx={5.4} cy={9.2} r={1.7} />
        <Circle cx={9} cy={6.8} r={1.8} />
        <Circle cx={13} cy={7.2} r={1.8} />
        <Circle cx={15.2} cy={10} r={1.6} />
      </G>
    </S>
  ),
  pin: ({ size = 18, color = '#999', fill = 'none' }) => (
    <S width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M16 12V4a1 1 0 00-1-1H9a1 1 0 00-1 1v8l-2 3v1a1 1 0 001 1h4v4l1 1 1-1v-4h4a1 1 0 001-1v-1l-2-3z"
        stroke={color}
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill={fill}
      />
    </S>
  ),
};

// HiTasky brand mark — the waving hand, drawn as vector (matches the
// launcher icon in assets/icon.png). Renders crisply at any size.
export function HandMark({ size = 24, color = '#E58A4B' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 120 120">
      <G transform="rotate(-9 60 62)">
        <G fill="none" stroke={color} strokeWidth={5} strokeLinecap="round">
          <Path d="M97 30 q11 9 0 22" opacity={0.9} />
          <Path d="M106 23 q17 14 0 36" opacity={0.5} />
        </G>
        <G fill={color}>
          <Rect x={45} y={84} width={32} height={22} rx={11} />
          <Rect x={37} y={50} width={48} height={44} rx={18} />
          <Rect x={44} y={24} width={11.5} height={40} rx={5.75} />
          <Rect x={56} y={17} width={11.5} height={47} rx={5.75} />
          <Rect x={68} y={21} width={11.5} height={43} rx={5.75} />
          <Rect x={79.5} y={30} width={10.5} height={34} rx={5.25} />
          <G transform="rotate(-38 36 64)">
            <Rect x={30} y={50} width={11.5} height={28} rx={5.75} />
          </G>
        </G>
      </G>
    </Svg>
  );
}

// abstract nib brand mark — diamond + slit or brand hand logo image
export function NibMark({ size = 22, color }) {
  let theme;
  try {
    theme = useAppTheme();
  } catch (e) {
    theme = { mode: 'dark' };
  }
  const isBrandLogo = !color || color === theme.accent || color === theme.text3;
  if (isBrandLogo) {
    const source = require('../../assets/3.png');
    return (
      <Image
        source={source}
        style={{ width: size, height: size }}
        resizeMode="contain"
      />
    );
  }
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M12 2 L20 12 L12 22 L4 12 Z" fill={color} opacity={0.18} />
      <Path d="M12 2 L20 12 L12 22 L4 12 Z" stroke={color} strokeWidth={1.6} strokeLinejoin="round" fill="none" />
      <Path d="M12 9 V17" stroke={color} strokeWidth={1.6} strokeLinecap="round" />
      <Circle cx={12} cy={13.6} r={1.5} fill={color} />
    </Svg>
  );
}
