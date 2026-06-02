// Generates HiTasky logo PNGs from a single vector source.
// Run: node scripts/gen-logo.js [--preview]
const fs = require('fs');
const path = require('path');
const { Resvg } = require('@resvg/resvg-js');

const CHARCOAL = '#18140F';
const EMBER = '#E58A4B';
const CREAM = '#F3ECDF';

// ---- the waving-hand mark, drawn in a 120x120 art box ----
// A friendly raised hand (palm + 4 fingers + thumb) with two wave arcs.
function mark(fill) {
  return `
  <g transform="rotate(-9 60 62)">
    <!-- wave motion arcs -->
    <g fill="none" stroke="${fill}" stroke-width="5" stroke-linecap="round" opacity="0.9">
      <path d="M97 30 q11 9 0 22" />
      <path d="M106 23 q17 14 0 36" opacity="0.55" />
    </g>
    <g fill="${fill}">
      <!-- wrist / cuff -->
      <rect x="45" y="84" width="32" height="22" rx="11" />
      <!-- palm -->
      <rect x="37" y="50" width="48" height="44" rx="18" />
      <!-- fingers -->
      <rect x="44" y="24" width="11.5" height="40" rx="5.75" />
      <rect x="56" y="17" width="11.5" height="47" rx="5.75" />
      <rect x="68" y="21" width="11.5" height="43" rx="5.75" />
      <rect x="79.5" y="30" width="10.5" height="34" rx="5.25" />
      <!-- thumb -->
      <g transform="rotate(-38 36 64)">
        <rect x="30" y="50" width="11.5" height="28" rx="5.75" />
      </g>
    </g>
  </g>`;
}

// full square icon: charcoal field + centered ember mark
function iconSVG({ bg = CHARCOAL, fg = EMBER, size = 1024, scale = 0.56, rounded = false } = {}) {
  const box = 120;
  const target = size * scale;
  const s = target / box;
  const offset = (size - target) / 2;
  const bgEl = bg === 'none'
    ? ''
    : rounded
      ? `<rect width="${size}" height="${size}" rx="${size * 0.22}" fill="${bg}"/>`
      : `<rect width="${size}" height="${size}" fill="${bg}"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    ${bgEl}
    <g transform="translate(${offset} ${offset}) scale(${s})">${mark(fg)}</g>
  </svg>`;
}

// splash / wordmark lockup: mark above "HiTasky"
function lockupSVG({ bg = CHARCOAL, size = 1024 } = {}) {
  const markTarget = size * 0.32;
  const s = markTarget / 120;
  const markX = (size - markTarget) / 2;
  const markY = size * 0.26;
  const bgEl = bg === 'none' ? '' : `<rect width="${size}" height="${size}" fill="${bg}"/>`;
  const cy = size * 0.66;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    ${bgEl}
    <g transform="translate(${markX} ${markY}) scale(${s})">${mark(EMBER)}</g>
    <text x="50%" y="${cy}" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif"
      font-size="${size * 0.12}" letter-spacing="-1">
      <tspan fill="${EMBER}" font-style="italic">Hi</tspan><tspan fill="${CREAM}">Tasky</tspan>
    </text>
  </svg>`;
}

function solidSVG(color, size = 1024) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><rect width="${size}" height="${size}" fill="${color}"/></svg>`;
}

// Play Store feature graphic — 1024x500, mark + wordmark + tagline
function featureSVG() {
  const W = 1024, H = 500;
  const markT = 150, s = markT / 120;
  const mx = 150, my = (H - markT) / 2 - 6;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
    <rect width="${W}" height="${H}" fill="${CHARCOAL}"/>
    <circle cx="${mx + markT / 2}" cy="${H / 2}" r="150" fill="${EMBER}" opacity="0.10"/>
    <g transform="translate(${mx} ${my}) scale(${s})">${mark(EMBER)}</g>
    <text x="${mx + markT + 56}" y="${H / 2 - 6}" font-family="Georgia, serif" font-size="86" letter-spacing="-2">
      <tspan fill="${EMBER}" font-style="italic">Hi</tspan><tspan fill="${CREAM}">Tasky</tspan>
    </text>
    <text x="${mx + markT + 60}" y="${H / 2 + 52}" font-family="-apple-system,Segoe UI,Roboto,sans-serif"
      font-size="30" fill="#B8AE9D">A calm, private to-do app · offline, no ads</text>
  </svg>`;
}

function render(svg, size, out) {
  const r = new Resvg(svg, { fitTo: { mode: 'width', value: size }, background: 'rgba(0,0,0,0)' });
  fs.writeFileSync(out, r.render().asPng());
  console.log('wrote', path.basename(out), size + 'px');
}

function renderRaw(svg, width, out) {
  const r = new Resvg(svg, { fitTo: { mode: 'width', value: width } });
  fs.writeFileSync(out, r.render().asPng());
  console.log('wrote', path.basename(out));
}

const preview = process.argv.includes('--preview');
const dir = preview ? path.join(__dirname, '..', 'assets', '_logo_preview') : path.join(__dirname, '..', 'assets');
fs.mkdirSync(dir, { recursive: true });

const store = process.argv.includes('--store');

if (store) {
  const sdir = path.join(__dirname, '..', 'store');
  fs.mkdirSync(sdir, { recursive: true });
  render(iconSVG(), 512, path.join(sdir, 'play-icon-512.png'));
  renderRaw(featureSVG(), 1024, path.join(sdir, 'feature-graphic-1024x500.png'));
} else if (preview) {
  render(iconSVG({ rounded: true }), 512, path.join(dir, 'icon-dark.png'));
  render(iconSVG({ bg: CREAM, fg: '#C26A2F', rounded: true }), 512, path.join(dir, 'icon-light.png'));
  render(lockupSVG(), 512, path.join(dir, 'lockup.png'));
} else {
  // app icon (full-bleed square, iOS masks corners itself)
  render(iconSVG(), 1024, path.join(dir, 'icon.png'));
  render(iconSVG({ bg: CREAM, fg: '#C26A2F' }), 64, path.join(dir, 'favicon.png'));
  // android adaptive: solid bg + ember foreground (kept inside safe zone) + monochrome
  render(solidSVG(CHARCOAL), 1024, path.join(dir, 'android-icon-background.png'));
  render(iconSVG({ bg: 'none', fg: EMBER, scale: 0.46 }), 1024, path.join(dir, 'android-icon-foreground.png'));
  render(iconSVG({ bg: 'none', fg: CREAM, scale: 0.46 }), 1024, path.join(dir, 'android-icon-monochrome.png'));
  // splash
  render(lockupSVG(), 1024, path.join(dir, 'splash-icon.png'));
}
