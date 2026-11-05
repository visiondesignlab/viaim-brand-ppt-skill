import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');
const failures = [];
const expect = (condition, message) => { if (!condition) failures.push(message); };

const templateA = read('assets/template.html');
const templateB = read('assets/template-swiss.html');
const skill = read('SKILL.md');
const themeA = read('references/themes.md');
const themeB = read('references/themes-swiss.md');
const brandColors = read('references/brand-colors.md');
const chineseType = read('references/chinese-typesetting.md');
const logoReadme = read('assets/logo/README.md');
const deckPath = process.argv[2] ? path.resolve(process.argv[2]) : null;
const deck = deckPath ? fs.readFileSync(deckPath, 'utf8') : null;

const palette = [
  ['signal-fog', '#F2F1F1', '242,241,241'],
  ['blank-state', '#FFFFFF', '255,255,255'],
  ['vision-orange', '#FF3B0F', '255,59,15'],
  ['neutral-ash', '#666666', '102,102,102'],
  ['silent-black', '#000000', '0,0,0'],
];

const inspectPalette = (content, label) => {
  for (const [name, hex, rgb] of palette) {
    expect(content.includes(`--brand-${name}:${hex};`), `${label} missing ${name} hex token`);
    expect(content.includes(`--brand-${name}-rgb:${rgb};`), `${label} missing ${name} RGB token`);
  }
};

expect(/^name: viaim-brand-ppt-skill$/m.test(skill), 'SKILL name is not viaim-brand-ppt-skill');
inspectPalette(templateA, 'Style A');
inspectPalette(templateB, 'Style B');
if (deck) inspectPalette(deck, 'Generated deck');

expect(templateA.includes('--brand:var(--brand-vision-orange);'), 'Style A brand alias is not Vision Orange');
expect(templateA.includes('--brand-on:var(--brand-blank-state);'), 'Style A brand-on alias is not Blank State');
expect(templateB.includes('--accent:var(--brand-vision-orange);'), 'Style B accent alias is not Vision Orange');
expect(templateB.includes('--accent-on:var(--brand-blank-state);'), 'Style B accent-on alias is not Blank State');
expect(templateB.includes('--surface:var(--brand-blank-state);'), 'Style B surface alias is not Blank State');
for (const [content, label] of [[templateA, 'Style A'], [templateB, 'Style B']]) {
  expect(content.includes('--accent-ink:var(--brand-silent-black);'), `${label} small-text accent role is missing`);
  expect(content.includes('--accent-display:var(--brand-vision-orange);'), `${label} display accent role is missing`);
  expect(content.includes('--accent-on-text:var(--brand-blank-state);'), `${label} accent-surface text role is missing`);
  expect(content.includes("powerPreference:'low-power'"), `${label} WebGL low-power preference is missing`);
  expect(content.includes('document.hidden'), `${label} hidden-page rendering guard is missing`);
  expect(content.includes('1000/30'), `${label} WebGL 30fps cap is missing`);
}
expect(templateB.includes('1000/24'), 'Style B ASCII 24fps cap is missing');
expect(themeA.includes('viaim 五色品牌主题'), 'Style A theme does not declare five-color system');
expect(themeB.includes('viaim 五色品牌主题'), 'Style B theme does not declare five-color system');
expect(brandColors.includes('172 C / Orange 021 U'), 'Brand color Pantone reference is missing');
expect(skill.includes('references/chinese-typesetting.md'), 'SKILL does not route to Chinese typesetting rules');
expect(chineseType.includes('https://www.w3.org/TR/clreq/'), 'CLReq source is missing');
expect(chineseType.includes('https://github.com/aaranxu/chinese-copywriting-guidelines'), 'Chinese copywriting source is missing');

for (const [content, label] of [[templateA, 'Style A'], [templateB, 'Style B'], ...(deck ? [[deck, 'Generated deck']] : [])]) {
  expect(content.includes('font-weight:500!important'), `${label} heading weight must be 500`);
  expect(content.includes('--title-line-height:1.3;'), `${label} title line-height token must be 1.3`);
  expect(content.includes('line-height:var(--title-line-height)!important'), `${label} title line-height guard is missing`);
  expect(content.includes('font-style:normal!important'), `${label} no-italic guard is missing`);
  expect(content.includes('font-synthesis-style:none'), `${label} synthetic italics guard is missing`);
  expect(!/font-style\s*:\s*italic/i.test(content), `${label} contains italic styling`);
  expect(content.includes('line-break:strict'), `${label} CLReq strict line-break baseline is missing`);
  expect(content.includes('text-autospace:normal'), `${label} Chinese/Western autospace baseline is missing`);
}

if (deck) {
  expect(!/background\s*:\s*var\(--(?:accent|brand)\)[^{};]*;[^{}]*color\s*:\s*(?:var\(--ink\)|#0a0a0[ab]?|#000000)/i.test(deck), 'Generated deck contains explicit black text on Vision Orange');
}

const forbiddenLegacyHex = ['#' + 'FF3F0F', '#002FA7', '#FFD500', '#C5E803', '#FF6B35'];
for (const legacy of forbiddenLegacyHex) {
  for (const [content, label] of [[templateA, 'Style A'], [templateB, 'Style B'], [themeA, 'Style A theme'], [themeB, 'Style B theme'], ...(deck ? [[deck, 'Generated deck']] : [])]) {
    expect(!content.toUpperCase().includes(legacy), `${label} contains legacy color ${legacy}`);
  }
}
expect(logoReadme.includes('母版包含品牌填充色'), 'Logo reference must document the immutable source fill');

function luminance(hex) {
  const channels = hex.match(/[0-9a-f]{2}/gi).map((value) => Number.parseInt(value, 16) / 255);
  const linear = channels.map((value) => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}
function contrast(a, b) {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
}

const whiteOnOrange = contrast('FFFFFF', 'FF3B0F');
expect(whiteOnOrange < 4.5, 'Blank State on Vision Orange unexpectedly passes normal-text AA; review documented rule');

if (failures.length) {
  console.error(`BRAND_THEME_ERROR count=${failures.length}`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`BRAND_THEME_OK palette=5 vision_orange=#FF3B0F signal_fog=#F2F1F1 blank_state=#FFFFFF neutral_ash=#666666 silent_black=#000000 title_weight=500 title_line_height=130% accent_roles=ink/display/on effects_caps=webgl30/ascii24 white_on_orange=${whiteOnOrange.toFixed(2)}`);
