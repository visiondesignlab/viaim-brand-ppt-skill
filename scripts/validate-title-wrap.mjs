#!/usr/bin/env node
import { existsSync } from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

const file = process.argv[2];
if (!file) {
  console.error('Usage: node scripts/validate-title-wrap.mjs <index.html>');
  process.exit(2);
}

const absoluteFile = path.resolve(file);
if (!existsSync(absoluteFile)) {
  console.error(`TITLE_WRAP_ERROR file_not_found=${absoluteFile}`);
  process.exit(2);
}

async function loadPlaywright() {
  const candidates = [
    createRequire(import.meta.url),
    createRequire(pathToFileURL(path.join(process.cwd(), 'package.json')).href),
  ];
  for (const req of candidates) {
    try {
      const resolved = req.resolve('playwright');
      const mod = await import(pathToFileURL(resolved).href);
      return mod.default || mod;
    } catch {
      // Try the next resolution root.
    }
  }
  return null;
}

const playwright = await loadPlaywright();
if (!playwright?.chromium) {
  console.error('TITLE_WRAP_ERROR playwright_unavailable=1');
  process.exit(2);
}

const systemBrowser = [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
].find(existsSync);

let browser;
try {
  browser = await playwright.chromium.launch({
    args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
    ...(systemBrowser ? { executablePath: systemBrowser } : {}),
  });
} catch (error) {
  console.error(`TITLE_WRAP_ERROR browser_launch=${error.message.split('\n')[0]}`);
  process.exit(2);
}

try {
  const context = await browser.newContext({
    viewport: { width: 1600, height: 900 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  await page.goto(pathToFileURL(absoluteFile).href, { waitUntil: 'domcontentloaded' });
  await Promise.race([
    page.evaluate(() => document.fonts?.ready),
    page.waitForTimeout(2400),
  ]);
  await page.waitForTimeout(500);

  const result = await page.evaluate(() => {
    const titleSelector = [
      'h1', 'h2', 'h3', 'p', 'li',
      '.display', '.display-zh', '.h1-zh', '.h2-zh',
      '.h-hero', '.h-hero-zh', '.h-xl', '.h-xl-zh', '.h-statement',
      '.demo-title', '.image-hero-title',
      '.lead', '.body', '.body-sm', '.t-body', '.t-body-sm',
      '.desc', '.stat-note', '.step-desc', '.layer-desc', '.callout',
    ].join(',');

    const getVisualLines = (root) => {
      const chars = [];
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      let node;
      while ((node = walker.nextNode())) {
        for (let i = 0; i < node.data.length; i += 1) {
          const char = node.data[i];
          if (/\s/u.test(char)) continue;
          const range = document.createRange();
          range.setStart(node, i);
          range.setEnd(node, i + 1);
          const rect = [...range.getClientRects()].find((item) => item.width > 0 && item.height > 0);
          if (rect) chars.push({ char, x: rect.left, y: rect.top + rect.height / 2, h: rect.height });
        }
      }

      const lines = [];
      for (const char of chars) {
        let line = lines.find((candidate) => Math.abs(candidate.y - char.y) <= Math.max(2, char.h * 0.18));
        if (!line) {
          line = { y: char.y, chars: [] };
          lines.push(line);
        }
        line.chars.push(char);
      }

      return lines
        .sort((a, b) => a.y - b.y)
        .map((line) => {
          const text = line.chars.sort((a, b) => a.x - b.x).map((item) => item.char).join('');
          const meaningful = [...text.normalize('NFKC').replace(/[\s\p{P}\p{S}]/gu, '')];
          return { text, meaningful: meaningful.join(''), count: meaningful.length };
        });
    };

    const slides = [...document.querySelectorAll('#deck > section.slide')];
    const orphanLines = [];
    const forbiddenBoundaryLines = [];
    let titleCount = 0;
    let lineCount = 0;

    slides.forEach((slide, slideIndex) => {
      slide.querySelectorAll(titleSelector).forEach((title) => {
        const lines = getVisualLines(title);
        if (!lines.length) return;
        titleCount += 1;
        lineCount += lines.length;
        lines.forEach((line, lineIndex) => {
          const compact = line.text.trim();
          if (/^[、，。；：！？）》】」』·—…%‰°℃℉]/u.test(compact) || /[（《【「『]$/u.test(compact)) {
            forbiddenBoundaryLines.push({
              slide: slideIndex + 1,
              id: slide.dataset.slideId || '',
              line: lineIndex + 1,
              text: line.text,
              title: title.textContent.trim().replace(/\s+/g, ' ').slice(0, 80),
            });
          }
          if (line.count !== 1) return;
          orphanLines.push({
            slide: slideIndex + 1,
            id: slide.dataset.slideId || '',
            line: lineIndex + 1,
            text: line.text,
            meaningful: line.meaningful,
            title: title.textContent.trim().replace(/\s+/g, ' ').slice(0, 80),
          });
        });
      });
    });

    return { slideCount: slides.length, titleCount, lineCount, orphanLines, forbiddenBoundaryLines };
  });

  if (result.orphanLines.length || result.forbiddenBoundaryLines.length) {
    console.error(`TITLE_WRAP_ERROR orphan_lines=${result.orphanLines.length} clreq_boundaries=${result.forbiddenBoundaryLines.length}`);
    for (const orphan of result.orphanLines) {
      console.error(`- Slide ${orphan.slide}${orphan.id ? ` (${orphan.id})` : ''}: line ${orphan.line} "${orphan.text}" in title "${orphan.title}"`);
    }
    for (const boundary of result.forbiddenBoundaryLines) {
      console.error(`- Slide ${boundary.slide}${boundary.id ? ` (${boundary.id})` : ''}: CLReq boundary line ${boundary.line} "${boundary.text}" in text "${boundary.title}"`);
    }
    process.exitCode = 1;
  } else {
    console.log(`TITLE_WRAP_OK slides=${result.slideCount} text_blocks=${result.titleCount} lines=${result.lineCount} orphan_lines=0 clreq_boundaries=0 viewport=1600x900`);
  }
} finally {
  await browser.close();
}
