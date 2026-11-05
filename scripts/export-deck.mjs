#!/usr/bin/env node
import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

function usage() {
  console.error(`Usage:
  node scripts/export-deck.mjs <index.html> [options]

Creates a native, editable PowerPoint directly from the HTML deck.
Keynote is not used anywhere in the conversion path.

Options:
  --output <file.pptx>         Exact output path
  --output-dir <directory>     Default: beside index.html
  --name <base-name>           Default: source folder name
  --width <pixels>             Default: 1600
  --height <pixels>            Default: 900
  --wait-ms <milliseconds>     Default: 1000
  --logo-scale <number>        Logo PNG pixel density; default: 8, minimum: 4
  --keep-media                 Keep extracted image/SVG layers
  --force                      Replace the exact output file
  --help                       Show this message

Required runtime environment:
  RUNTIME_NODE, RUNTIME_NODE_MODULES, RUNTIME_BIN_DIR`);
}

function parseArgs(argv) {
  if (!argv.length || argv.includes('--help')) {
    usage();
    process.exit(argv.includes('--help') ? 0 : 2);
  }
  const options = {
    source: argv[0],
    output: '',
    outputDir: '',
    name: '',
    width: 1600,
    height: 900,
    waitMs: 1000,
    logoScale: 8,
    keepMedia: false,
    force: false,
  };
  for (let i = 1; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--keep-media') options.keepMedia = true;
    else if (arg === '--force') options.force = true;
    else if (['--output', '--output-dir', '--name', '--width', '--height', '--wait-ms', '--logo-scale', '--format'].includes(arg)) {
      const value = argv[++i];
      if (!value) throw new Error(`${arg} requires a value.`);
      if (arg === '--output') options.output = value;
      if (arg === '--output-dir') options.outputDir = value;
      if (arg === '--name') options.name = value;
      if (arg === '--width') options.width = Number(value);
      if (arg === '--height') options.height = Number(value);
      if (arg === '--wait-ms') options.waitMs = Number(value);
      if (arg === '--logo-scale') options.logoScale = Number(value);
      if (arg === '--format' && value.toLowerCase() !== 'pptx') throw new Error('Native export supports --format pptx only. Keynote opens the same PPTX directly.');
    } else {
      throw new Error(`Unknown option: ${arg}`);
    }
  }
  for (const key of ['width', 'height', 'waitMs']) {
    if (!Number.isFinite(options[key]) || options[key] <= 0) throw new Error(`--${key} must be a positive number.`);
  }
  if (!Number.isFinite(options.logoScale) || options.logoScale < 4 || options.logoScale > 20) {
    throw new Error('--logo-scale must be between 4 and 20. The default is 8.');
  }
  if (Math.abs(options.width / options.height - 16 / 9) > 0.001) {
    throw new Error('Export viewport must remain 16:9. Use dimensions such as 1600x900 or 1920x1080.');
  }
  if (options.output && path.extname(options.output).toLowerCase() !== '.pptx') {
    throw new Error('--output must end in .pptx.');
  }
  return options;
}

function sanitizeName(value) {
  return String(value || '')
    .normalize('NFKC')
    .replace(/[\\/:*?"<>|\u0000-\u001F]/g, '-')
    .replace(/\s+/g, ' ')
    .replace(/[. ]+$/g, '')
    .trim() || 'viaim-brand-deck';
}

function requireCandidates() {
  const out = [createRequire(import.meta.url)];
  if (process.env.RUNTIME_NODE_MODULES) {
    out.unshift(createRequire(path.join(process.env.RUNTIME_NODE_MODULES, '__viaim_runtime__.cjs')));
  }
  out.push(createRequire(path.join(process.cwd(), 'package.json')));
  return out;
}

async function loadPackage(name) {
  for (const req of requireCandidates()) {
    try {
      const resolved = req.resolve(name);
      const mod = await import(pathToFileURL(resolved).href);
      return mod.default && !mod.Presentation ? mod.default : mod;
    } catch {
      // Try the next resolution root.
    }
  }
  throw new Error(`${name} is unavailable. In Codex, call load_workspace_dependencies and run with RUNTIME_NODE, RUNTIME_NODE_MODULES, and RUNTIME_BIN_DIR.`);
}

async function ensureOutput(target, force) {
  if (!existsSync(target)) return;
  if (!force) throw new Error(`Output already exists: ${target}. Pass --force to replace this exact file.`);
  await fs.rm(target, { recursive: true, force: true });
}

async function startStaticServer(source) {
  const root = path.dirname(source);
  const entryName = path.basename(source);
  const mime = new Map([
    ['.html', 'text/html; charset=utf-8'], ['.js', 'text/javascript; charset=utf-8'],
    ['.mjs', 'text/javascript; charset=utf-8'], ['.css', 'text/css; charset=utf-8'],
    ['.json', 'application/json; charset=utf-8'], ['.svg', 'image/svg+xml'],
    ['.png', 'image/png'], ['.jpg', 'image/jpeg'], ['.jpeg', 'image/jpeg'],
    ['.webp', 'image/webp'], ['.gif', 'image/gif'], ['.woff', 'font/woff'], ['.woff2', 'font/woff2'],
  ]);
  const server = createServer(async (request, response) => {
    try {
      const requestUrl = new URL(request.url || '/', 'http://127.0.0.1');
      const relative = decodeURIComponent(requestUrl.pathname).replace(/^\/+/, '') || entryName;
      let target = path.resolve(root, relative);
      if (!(target === root || target.startsWith(`${root}${path.sep}`))) {
        response.writeHead(403).end('Forbidden');
        return;
      }
      const stat = await fs.stat(target);
      if (stat.isDirectory()) target = path.join(target, 'index.html');
      const data = await fs.readFile(target);
      response.writeHead(200, {
        'Content-Type': mime.get(path.extname(target).toLowerCase()) || 'application/octet-stream',
        'Cache-Control': 'no-store',
      });
      response.end(data);
    } catch {
      response.writeHead(404).end('Not found');
    }
  });
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const address = server.address();
  const port = typeof address === 'object' && address ? address.port : 0;
  return {
    url: `http://127.0.0.1:${port}/${encodeURIComponent(entryName)}`,
    close: () => new Promise((resolve) => server.close(resolve)),
  };
}

function parseCssColor(value, opacity = 1) {
  if (!value || value === 'transparent') return null;
  const rgb = value.match(/^rgba?\(\s*([\d.]+)[, ]+\s*([\d.]+)[, ]+\s*([\d.]+)(?:\s*[,/]\s*([\d.]+))?\s*\)$/i);
  const hex = value.match(/^#([0-9a-f]{6})([0-9a-f]{2})?$/i);
  let r;
  let g;
  let b;
  let alpha = 1;
  if (rgb) {
    r = Number(rgb[1]); g = Number(rgb[2]); b = Number(rgb[3]);
    if (rgb[4] !== undefined) alpha = Number(rgb[4]);
  } else if (hex) {
    r = parseInt(hex[1].slice(0, 2), 16);
    g = parseInt(hex[1].slice(2, 4), 16);
    b = parseInt(hex[1].slice(4, 6), 16);
    if (hex[2]) alpha = parseInt(hex[2], 16) / 255;
  } else {
    return null;
  }
  alpha = Math.max(0, Math.min(1, alpha * opacity));
  if (alpha < 0.01) return null;
  const base = `#${[r, g, b].map((n) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0')).join('').toUpperCase()}`;
  return alpha >= 0.995 ? base : `${base}/${Math.round(alpha * 100)}`;
}

function noteText(note) {
  if (!note || typeof note !== 'object') return '';
  const lines = [];
  if (note.title) lines.push(note.title);
  if (note.section) lines.push(`章节：${note.section}`);
  if (Number.isFinite(note.minutes)) lines.push(`建议时长：${note.minutes} 分钟`);
  if (note.purpose) lines.push('', `页面目的：${note.purpose}`);
  if (Array.isArray(note.talk) && note.talk.length) lines.push('', '讲述要点：', ...note.talk.filter(Boolean).map((item) => `• ${item}`));
  const optional = [
    ['转场', note.transition], ['提示', note.cue], ['互动', note.interaction],
    ['表达', note.delivery], ['翻页', note.advance], ['备用', note.fallback], ['读音', note.pronunciation],
  ].filter(([, value]) => typeof value === 'string' && value.trim());
  if (optional.length) lines.push('', ...optional.map(([label, value]) => `${label}：${value}`));
  return lines.join('\n').trim();
}

function chooseTypeface(item) {
  const family = String(item.fontFamily || '').toLowerCase();
  const weight = Number(item.fontWeight) || 400;
  if (/mono|menlo|courier|plex/.test(family)) return 'Courier New';
  const serif = /serif|song|宋体|playfair/.test(family) && !/sans/.test(family);
  const base = serif ? 'Noto Serif SC' : 'Noto Sans SC';
  if (weight >= 600) return `${base} SemiBold`;
  if (weight >= 500) return `${base} Medium`;
  if (weight <= 300) return `${base} Light`;
  return base;
}

function lineStyle(cssStyle) {
  if (cssStyle === 'dashed') return 'dashed';
  if (cssStyle === 'dotted') return 'dotted';
  return 'solid';
}

async function collectDeckModels({ source, mediaDir, width, height, waitMs, logoScale }) {
  const playwright = await loadPackage('playwright');
  if (!playwright?.chromium) throw new Error('Playwright Chromium is unavailable.');
  const server = await startStaticServer(source);
  const systemBrowser = [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser',
  ].find(existsSync);
  let browser;
  try {
    browser = await playwright.chromium.launch({
      args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
      ...(systemBrowser ? { executablePath: systemBrowser } : {}),
    });
    const context = await browser.newContext({
      viewport: { width, height }, deviceScaleFactor: 1, reducedMotion: 'reduce',
    });
    const page = await context.newPage();
    await page.addInitScript(() => {
      try { localStorage.setItem('viaim-brand-ppt-low-power', '1'); } catch { /* localStorage may be unavailable before origin assignment. */ }
    });
    const pageErrors = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));
    await page.goto(server.url, { waitUntil: 'domcontentloaded' });
    await Promise.race([page.evaluate(() => document.fonts?.ready), page.waitForTimeout(5000)]);
    await page.waitForTimeout(Math.min(waitMs, 1400));
    await page.addStyleTag({ content: `
      html,body{width:100%!important;height:100%!important;overflow:hidden!important}
      #deck{transition:none!important}
      #nav,#hint,#ppt-presenter-btn,#ppt-presenter,#ppt-dialog,#ppt-presenter-overview{display:none!important}
    ` });
    const deckMeta = await page.evaluate(() => ({
      slides: [...document.querySelectorAll('#deck > section.slide, #deck > .slide')].map((slide, index) => ({
        index, id: slide.dataset.slideId || `slide-${index + 1}`,
      })),
      notes: Array.isArray(window.__SPEAKER_NOTES__) ? window.__SPEAKER_NOTES__ : [],
    }));
    if (!deckMeta.slides.length) throw new Error('No #deck > section.slide pages were found.');
    await fs.mkdir(mediaDir, { recursive: true });
    const noteById = new Map(deckMeta.notes.map((note) => [note?.id, note]));
    const models = [];
    for (const slideMeta of deckMeta.slides) {
      await page.evaluate((index) => {
        document.body.classList.remove('overview', 'ppt-presenter-open', 'ppt-audience', 'ppt-preview');
        if (typeof window.go === 'function') window.go(index, { force: true });
        window.dispatchEvent(new Event('resize'));
      }, slideMeta.index);
      await page.waitForTimeout(waitMs);
      await page.evaluate((index) => {
        if (document.getAnimations) document.getAnimations().forEach((animation) => { try { animation.finish(); } catch { animation.cancel(); } });
        const slide = [...document.querySelectorAll('#deck > section.slide, #deck > .slide')][index];
        slide?.querySelectorAll('[data-anim]').forEach((element) => {
          element.style.opacity = '1';
          element.style.transform = 'none';
        });
      }, slideMeta.index);
      await page.waitForTimeout(80);
      const model = await page.evaluate((index) => {
        const slide = [...document.querySelectorAll('#deck > section.slide, #deck > .slide')][index];
        const slideRect = slide.getBoundingClientRect();
        const viewport = { width: innerWidth, height: innerHeight };
        const visibleRect = (rect) => rect.width > 0.5 && rect.height > 0.5 && rect.right > 0 && rect.bottom > 0 && rect.left < viewport.width && rect.top < viewport.height;
        const local = (rect) => ({
          left: rect.left - slideRect.left, top: rect.top - slideRect.top,
          width: rect.width, height: rect.height,
        });
        const visible = (element) => {
          const style = getComputedStyle(element);
          const rect = element.getBoundingClientRect();
          return style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity || 1) > 0.005 && visibleRect(rect);
        };
        const label = (element, prefix) => {
          const id = element.id ? `-${element.id}` : '';
          const cls = String(element.className || '').replace(/[^\w-]+/g, '-').replace(/^-|-$/g, '').slice(0, 48);
          return `${prefix}-${element.tagName.toLowerCase()}${id}${cls ? `-${cls}` : ''}`.slice(0, 120);
        };
        const colorVisible = (value) => value && value !== 'transparent' && !/rgba?\(\s*0\s*,\s*0\s*,\s*0\s*,\s*0\s*\)/.test(value);
        const pseudoFrame = (element, style) => {
          const parent = element.getBoundingClientRect();
          const number = (value) => {
            const parsed = parseFloat(value);
            return Number.isFinite(parsed) ? parsed : null;
          };
          const left = number(style.left);
          const right = number(style.right);
          const top = number(style.top);
          const bottom = number(style.bottom);
          let pseudoWidth = number(style.width);
          let pseudoHeight = number(style.height);
          if (pseudoWidth === null && left !== null && right !== null) pseudoWidth = parent.width - left - right;
          if (pseudoHeight === null && top !== null && bottom !== null) pseudoHeight = parent.height - top - bottom;
          if (pseudoWidth === null && left === 0 && right === 0) pseudoWidth = parent.width;
          if (pseudoHeight === null && top === 0 && bottom === 0) pseudoHeight = parent.height;
          if (pseudoWidth === null || pseudoHeight === null || pseudoWidth <= 0.5 || pseudoHeight <= 0.5) return null;
          const offsetLeft = left !== null ? left : (right !== null ? parent.width - right - pseudoWidth : 0);
          const offsetTop = top !== null ? top : (bottom !== null ? parent.height - bottom - pseudoHeight : 0);
          const rect = {
            left: parent.left + offsetLeft, top: parent.top + offsetTop,
            width: pseudoWidth, height: pseudoHeight,
            right: parent.left + offsetLeft + pseudoWidth,
            bottom: parent.top + offsetTop + pseudoHeight,
          };
          return visibleRect(rect) ? local(rect) : null;
        };
        const shapes = [];
        const borders = [];
        const elements = [slide, ...slide.querySelectorAll('*')];
        elements.forEach((element, elementIndex) => {
          if (!visible(element) || element.matches('script,style,link,meta,br,img,svg,canvas,.brand-logo')) return;
          const style = getComputedStyle(element);
          const rect = element.getBoundingClientRect();
          const frame = local(rect);
          if (element !== slide && colorVisible(style.backgroundColor)) {
            const radius = Math.max(...[
              style.borderTopLeftRadius, style.borderTopRightRadius,
              style.borderBottomLeftRadius, style.borderBottomRightRadius,
            ].map((value) => parseFloat(value) || 0));
            shapes.push({
              name: label(element, `fill-${elementIndex}`), frame,
              color: style.backgroundColor, opacity: Number(style.opacity || 1),
              radius, ellipse: radius >= Math.min(frame.width, frame.height) * 0.45,
            });
          }
          const sides = [
            ['top', style.borderTopWidth, style.borderTopStyle, style.borderTopColor],
            ['right', style.borderRightWidth, style.borderRightStyle, style.borderRightColor],
            ['bottom', style.borderBottomWidth, style.borderBottomStyle, style.borderBottomColor],
            ['left', style.borderLeftWidth, style.borderLeftStyle, style.borderLeftColor],
          ];
          sides.forEach(([side, widthValue, borderStyle, borderColor]) => {
            const lineWidth = parseFloat(widthValue) || 0;
            if (lineWidth < 0.5 || borderStyle === 'none' || !colorVisible(borderColor)) return;
            borders.push({ name: `${label(element, `line-${elementIndex}`)}-${side}`, frame, side, width: lineWidth, style: borderStyle, color: borderColor, opacity: Number(style.opacity || 1) });
          });
          ['::before', '::after'].forEach((pseudoName) => {
            const pseudo = getComputedStyle(element, pseudoName);
            if (!pseudo || pseudo.content === 'none' || pseudo.display === 'none' || pseudo.visibility === 'hidden') return;
            const pseudoRect = pseudoFrame(element, pseudo);
            if (!pseudoRect) return;
            const pseudoOpacity = Number(pseudo.opacity || 1) * Number(style.opacity || 1);
            if (colorVisible(pseudo.backgroundColor)) {
              const radius = Math.max(...[
                pseudo.borderTopLeftRadius, pseudo.borderTopRightRadius,
                pseudo.borderBottomLeftRadius, pseudo.borderBottomRightRadius,
              ].map((value) => parseFloat(value) || 0));
              shapes.push({
                name: `${label(element, `pseudo-${elementIndex}`)}-${pseudoName.slice(2)}`,
                frame: pseudoRect, color: pseudo.backgroundColor, opacity: pseudoOpacity,
                radius, ellipse: radius >= Math.min(pseudoRect.width, pseudoRect.height) * 0.45,
              });
            }
            const pseudoSides = [
              ['top', pseudo.borderTopWidth, pseudo.borderTopStyle, pseudo.borderTopColor],
              ['right', pseudo.borderRightWidth, pseudo.borderRightStyle, pseudo.borderRightColor],
              ['bottom', pseudo.borderBottomWidth, pseudo.borderBottomStyle, pseudo.borderBottomColor],
              ['left', pseudo.borderLeftWidth, pseudo.borderLeftStyle, pseudo.borderLeftColor],
            ];
            pseudoSides.forEach(([side, widthValue, borderStyle, borderColor]) => {
              const lineWidth = parseFloat(widthValue) || 0;
              if (lineWidth < 0.5 || borderStyle === 'none' || !colorVisible(borderColor)) return;
              borders.push({
                name: `${label(element, `pseudo-line-${elementIndex}`)}-${pseudoName.slice(2)}-${side}`,
                frame: pseudoRect, side, width: lineWidth, style: borderStyle,
                color: borderColor, opacity: pseudoOpacity,
              });
            });
          });
        });

        const patternElements = [...slide.querySelectorAll('.dot-mat,.ring-mat,.cross-mat')].filter(visible).map((element, patternIndex) => {
          const style = getComputedStyle(element);
          return {
            name: label(element, `pattern-${patternIndex}`), frame: local(element.getBoundingClientRect()),
            pattern: element.classList.contains('cross-mat') ? 'diagonalCross' : (element.classList.contains('ring-mat') ? 'openDiamond' : 'dotGrid'),
            color: style.color, opacity: Number(style.opacity || 1),
          };
        });

        const mediaCandidates = [...slide.querySelectorAll('img,svg,canvas:not(.ascii-bg):not(.bg),.brand-logo')].filter(visible);
        const mediaSet = new Set(mediaCandidates);
        const media = mediaCandidates.filter((element) => {
          let ancestor = element.parentElement;
          while (ancestor && ancestor !== slide) {
            if (mediaSet.has(ancestor)) return false;
            ancestor = ancestor.parentElement;
          }
          return true;
        }).map((element, mediaIndex) => {
          const mediaId = `ppt-media-${index}-${mediaIndex}`;
          element.setAttribute('data-ppt-media-id', mediaId);
          return {
            mediaId, name: label(element, `media-${mediaIndex}`), frame: local(element.getBoundingClientRect()),
            alt: element.getAttribute('alt') || element.getAttribute('aria-label') || element.getAttribute('data-lucide') || 'Visual layer',
            isBrandLogo: element.matches('.brand-logo') || Boolean(element.closest('.brand-logo')),
          };
        });

        const text = [];
        const walker = document.createTreeWalker(slide, NodeFilter.SHOW_TEXT);
        let node;
        let textIndex = 0;
        while ((node = walker.nextNode())) {
          if (!node.data || !node.data.trim()) continue;
          const parent = node.parentElement;
          if (!parent || !visible(parent) || parent.closest('svg,canvas,script,style')) continue;
          const style = getComputedStyle(parent);
          const chars = [];
          for (let i = 0; i < node.data.length; i += 1) {
            if (/\r|\n/.test(node.data[i])) continue;
            const range = document.createRange();
            range.setStart(node, i); range.setEnd(node, i + 1);
            const rect = [...range.getClientRects()].find((candidate) => candidate.width > 0 && candidate.height > 0);
            if (rect && visibleRect(rect)) chars.push({ index: i, rect });
          }
          const lines = [];
          chars.forEach((char) => {
            let line = lines.find((candidate) => Math.abs(candidate.top - char.rect.top) <= Math.max(2, char.rect.height * 0.18));
            if (!line) { line = { top: char.rect.top, chars: [] }; lines.push(line); }
            line.chars.push(char);
          });
          lines.sort((a, b) => a.top - b.top).forEach((line) => {
            const ordered = line.chars.sort((a, b) => a.index - b.index);
            const start = ordered[0].index;
            const end = ordered[ordered.length - 1].index + 1;
            let value = node.data.slice(start, end).replace(/\s+/g, ' ').trim();
            if (!value) return;
            if (style.textTransform === 'uppercase') value = value.toUpperCase();
            if (style.textTransform === 'lowercase') value = value.toLowerCase();
            const left = Math.min(...ordered.map((item) => item.rect.left));
            const top = Math.min(...ordered.map((item) => item.rect.top));
            const right = Math.max(...ordered.map((item) => item.rect.right));
            const bottom = Math.max(...ordered.map((item) => item.rect.bottom));
            text.push({
              name: label(parent, `text-${textIndex++}`), value,
              frame: local({ left, top, right, bottom, width: right - left, height: bottom - top }),
              fontFamily: style.fontFamily, fontSize: parseFloat(style.fontSize) || 16,
              fontWeight: style.fontWeight, fontStyle: style.fontStyle,
              color: style.color, opacity: Number(style.opacity || 1),
              underline: style.textDecorationLine.includes('underline'),
            });
          });
        }
        const slideStyle = getComputedStyle(slide);
        return {
          index,
          id: slide.dataset.slideId || `slide-${index + 1}`,
          title: (slide.querySelector('h1,h2,h3')?.textContent || `Slide ${index + 1}`).trim().replace(/\s+/g, ' '),
          classes: [...slide.classList],
          background: slideStyle.backgroundColor,
          hasAsciiPattern: Boolean(slide.querySelector('canvas.ascii-bg')),
          shapes, borders, patterns: patternElements, media, text,
        };
      }, slideMeta.index);
      for (let mediaIndex = 0; mediaIndex < model.media.length; mediaIndex += 1) {
        const item = model.media[mediaIndex];
        const suffix = item.isBrandLogo ? '-logo-hd' : '';
        const mediaPath = path.join(mediaDir, `slide-${String(slideMeta.index + 1).padStart(2, '0')}-media-${String(mediaIndex + 1).padStart(2, '0')}${suffix}.png`);
        if (item.isBrandLogo) {
          const captureId = await page.evaluate(({ mediaId, scale }) => {
            const sourceElement = document.querySelector(`[data-ppt-media-id="${mediaId}"]`);
            if (!sourceElement) throw new Error(`Logo element not found: ${mediaId}`);
            const sourceRect = sourceElement.getBoundingClientRect();
            const wrapper = document.createElement('div');
            const clone = sourceElement.cloneNode(true);
            const id = `ppt-logo-hd-${mediaId}`;
            wrapper.id = id;
            Object.assign(wrapper.style, {
              position: 'fixed', left: '0', top: '0', zIndex: '2147483647',
              width: `${Math.ceil(sourceRect.width * scale)}px`,
              height: `${Math.ceil(sourceRect.height * scale)}px`,
              overflow: 'hidden', background: 'transparent', pointerEvents: 'none',
            });
            clone.removeAttribute('data-ppt-media-id');
            clone.style.setProperty('display', 'block', 'important');
            clone.style.setProperty('position', 'static', 'important');
            clone.style.setProperty('width', '100%', 'important');
            clone.style.setProperty('height', '100%', 'important');
            clone.style.setProperty('max-width', 'none', 'important');
            clone.style.setProperty('max-height', 'none', 'important');
            clone.style.setProperty('transform', 'none', 'important');
            clone.style.setProperty('aspect-ratio', '118 / 32', 'important');
            wrapper.appendChild(clone);
            document.body.appendChild(wrapper);
            return id;
          }, { mediaId: item.mediaId, scale: logoScale });
          try {
            await page.locator(`#${captureId}`).screenshot({
              path: mediaPath, type: 'png', omitBackground: true, animations: 'disabled', scale: 'css',
            });
          } finally {
            await page.evaluate((id) => document.getElementById(id)?.remove(), captureId);
          }
        } else {
          await page.locator(`[data-ppt-media-id="${item.mediaId}"]`).screenshot({
            path: mediaPath, type: 'png', omitBackground: true, animations: 'disabled', scale: 'css',
          });
        }
        item.path = mediaPath;
      }
      model.note = noteById.get(model.id) || deckMeta.notes[slideMeta.index] || null;
      models.push(model);
      console.log(`DOM_PROGRESS ${slideMeta.index + 1}/${deckMeta.slides.length} text=${model.text.length} shapes=${model.shapes.length + model.borders.length} media=${model.media.length}`);
    }
    if (pageErrors.length) throw new Error(`Browser page errors:\n${[...new Set(pageErrors)].join('\n')}`);
    return models;
  } finally {
    if (browser) await browser.close();
    await server.close();
  }
}

function addLine(slide, item) {
  const { frame } = item;
  let position;
  if (item.side === 'top') position = { left: frame.left, top: frame.top, width: frame.width, height: 0 };
  if (item.side === 'right') position = { left: frame.left + frame.width, top: frame.top, width: 0, height: frame.height };
  if (item.side === 'bottom') position = { left: frame.left, top: frame.top + frame.height, width: frame.width, height: 0 };
  if (item.side === 'left') position = { left: frame.left, top: frame.top, width: 0, height: frame.height };
  const color = parseCssColor(item.color, item.opacity);
  if (!position || !color) return false;
  slide.shapes.add({
    geometry: 'line', name: item.name, position,
    fill: 'none', line: { style: lineStyle(item.style), fill: color, width: Math.max(0.5, item.width) },
  });
  return true;
}

async function buildEditablePptx({ models, output, width, height }) {
  const artifactTool = await loadPackage('@oai/artifact-tool');
  const { Presentation, PresentationFile } = artifactTool;
  if (!Presentation?.create || !PresentationFile?.exportPptx) throw new Error('@oai/artifact-tool presentation API is unavailable.');
  const presentation = Presentation.create({ slideSize: { width, height } });
  const stats = { slides: models.length, text: 0, shapes: 0, images: 0, logos: 0, notes: 0 };
  for (const model of models) {
    const slide = presentation.slides.add();
    slide.background.fill = parseCssColor(model.background) || (model.classes.includes('dark') ? '#000000' : '#FFFFFF');
    if (model.hasAsciiPattern) {
      const patternColor = model.classes.includes('accent') ? '#FFFFFF/18' : '#FF3B0F/16';
      slide.shapes.add({
        geometry: 'rect', name: `editable-ascii-pattern-${model.index + 1}`,
        position: { left: 0, top: 0, width, height }, line: { style: 'solid', fill: 'none', width: 0 },
        fill: { type: 'solid', color: '#FFFFFF/0', pattern: { type: 'percent10', color: patternColor } },
      });
      stats.shapes += 1;
    }
    for (const item of model.shapes) {
      const color = parseCssColor(item.color, item.opacity);
      if (!color || item.frame.width < 0.5 || item.frame.height < 0.5) continue;
      slide.shapes.add({
        geometry: item.ellipse ? 'ellipse' : (item.radius > 0.5 ? 'roundRect' : 'rect'),
        name: item.name, position: item.frame, fill: color,
        line: { style: 'solid', fill: 'none', width: 0 },
        ...(item.radius > 0.5 && !item.ellipse ? { borderRadius: Math.min(item.radius, Math.min(item.frame.width, item.frame.height) / 2) } : {}),
      });
      stats.shapes += 1;
    }
    for (const item of model.patterns) {
      const color = parseCssColor(item.color, item.opacity) || '#FF3B0F/25';
      slide.shapes.add({
        geometry: 'rect', name: item.name, position: item.frame,
        fill: { type: 'solid', color: '#FFFFFF/0', pattern: { type: item.pattern, color } },
        line: { style: 'solid', fill: 'none', width: 0 },
      });
      stats.shapes += 1;
    }
    for (const item of model.borders) if (addLine(slide, item)) stats.shapes += 1;
    for (const item of model.media) {
      const bytes = new Uint8Array(await fs.readFile(item.path));
      slide.images.add({
        blob: bytes, contentType: 'image/png', alt: item.alt,
        fit: 'contain', position: item.frame,
      });
      stats.images += 1;
      if (item.isBrandLogo) stats.logos += 1;
    }
    for (const item of model.text) {
      const color = parseCssColor(item.color, item.opacity);
      if (!color || !item.value) continue;
      const fontSize = Math.max(8, item.fontSize);
      const textBox = slide.shapes.add({
        geometry: 'textbox', name: item.name,
        position: {
          left: Math.max(0, item.frame.left - 1),
          top: Math.max(0, item.frame.top - fontSize * 0.06),
          width: Math.min(width - item.frame.left + 1, Math.max(item.frame.width + fontSize * 0.45, 8)),
          height: Math.min(height - item.frame.top, Math.max(item.frame.height + fontSize * 0.35, fontSize * 1.25)),
        },
        fill: 'none', line: { style: 'solid', fill: 'none', width: 0 },
      });
      textBox.text = item.value;
      textBox.text.style = {
        fontSize, typeface: chooseTypeface(item),
        bold: Number(item.fontWeight) >= 650,
        italic: false, underline: item.underline ? 'sng' : undefined,
        color, alignment: 'left', verticalAlignment: 'top',
        wrap: 'none', autoFit: 'none',
        insets: { top: 0, right: 0, bottom: 0, left: 0 },
      };
      stats.text += 1;
    }
    const notes = noteText(model.note);
    if (notes) {
      slide.speakerNotes.textFrame.setText(notes);
      slide.speakerNotes.setVisible(true);
      stats.notes += 1;
    }
  }
  const pptx = await PresentationFile.exportPptx(presentation);
  await pptx.save(output);
  await fs.rm(`${output}.inspect.ndjson`, { force: true });
  return stats;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const source = path.resolve(options.source);
  if (!existsSync(source)) throw new Error(`Source HTML not found: ${source}`);
  if (path.extname(source).toLowerCase() !== '.html') throw new Error('Source must be an .html deck.');
  const outputDir = path.resolve(options.outputDir || path.dirname(source));
  await fs.mkdir(outputDir, { recursive: true });
  const defaultName = path.basename(path.dirname(source)) || path.basename(source, '.html');
  const baseName = sanitizeName(options.name || defaultName);
  const output = path.resolve(options.output || path.join(outputDir, `${baseName}-editable.pptx`));
  await ensureOutput(output, options.force);
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'viaim-brand-ppt-native-'));
  const mediaDir = options.keepMedia ? path.join(outputDir, `${baseName}-editable-media`) : path.join(tempRoot, 'media');
  if (options.keepMedia) await ensureOutput(mediaDir, options.force);
  try {
    const models = await collectDeckModels({
      source, mediaDir, width: options.width, height: options.height, waitMs: options.waitMs, logoScale: options.logoScale,
    });
    const stats = await buildEditablePptx({ models, output, width: options.width, height: options.height });
    console.log([
      'PPTX_EDITABLE_OK', `slides=${stats.slides}`, `notes=${stats.notes}`,
      `text_boxes=${stats.text}`, `native_shapes=${stats.shapes}`, `image_objects=${stats.images}`,
      `logo_png_objects=${stats.logos}`, `logo_png_scale=${options.logoScale}x`,
      'full_slide_rasters=0', 'keynote_handoff=none', `output=${output}`,
    ].join(' '));
  } finally {
    await fs.rm(tempRoot, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(`PPTX_EDITABLE_ERROR ${error.message}`);
  process.exitCode = 1;
});
