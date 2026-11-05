#!/usr/bin/env node
import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const defaultSource = path.resolve(scriptDir, '../assets/logo/viaim-logo-master.svg');
const palette = new Map([
  ['F2F1F1', 'signal-fog'],
  ['FFFFFF', 'blank-state'],
  ['FF3B0F', 'vision-orange'],
  ['666666', 'neutral-ash'],
  ['000000', 'silent-black'],
]);

function usage() {
  console.error(`Usage:
  node scripts/export-logo-png.mjs [options]

Creates transparent, high-resolution PNG derivatives from the immutable SVG master.
The SVG paths and 118:32 aspect ratio are never changed.

Options:
  --source <file.svg>       Default: assets/logo/viaim-logo-master.svg
  --output <file.png>       Exact output path for one color
  --output-dir <directory>  Default: assets/logo/png
  --color <hex>             One of the five brand colors; default: #FF3B0F
  --width <pixels>          Default: 2360; minimum: 1180
  --all-colors              Export all five brand colors
  --force                   Replace exact existing outputs
  --help                    Show this message

Required runtime environment:
  RUNTIME_NODE_MODULES (or locally installed Playwright)`);
}

function parseArgs(argv) {
  const options = {
    source: defaultSource,
    output: '',
    outputDir: '',
    color: 'FF3B0F',
    width: 2360,
    allColors: false,
    force: false,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--help') { usage(); process.exit(0); }
    if (arg === '--all-colors') options.allColors = true;
    else if (arg === '--force') options.force = true;
    else if (['--source', '--output', '--output-dir', '--color', '--width'].includes(arg)) {
      const value = argv[++i];
      if (!value) throw new Error(`${arg} requires a value.`);
      if (arg === '--source') options.source = value;
      if (arg === '--output') options.output = value;
      if (arg === '--output-dir') options.outputDir = value;
      if (arg === '--color') options.color = value.replace(/^#/, '').toUpperCase();
      if (arg === '--width') options.width = Number(value);
    } else if (!['--all-colors', '--force'].includes(arg)) {
      throw new Error(`Unknown option: ${arg}`);
    }
  }
  if (!palette.has(options.color)) throw new Error(`--color must be one of: ${[...palette.keys()].map((value) => `#${value}`).join(', ')}`);
  if (!Number.isInteger(options.width) || options.width < 1180 || options.width > 9440) {
    throw new Error('--width must be an integer between 1180 and 9440. Default: 2360.');
  }
  if (options.output && options.allColors) throw new Error('--output cannot be combined with --all-colors. Use --output-dir.');
  if (options.output && path.extname(options.output).toLowerCase() !== '.png') throw new Error('--output must end in .png.');
  return options;
}

function requireCandidates() {
  const candidates = [createRequire(import.meta.url)];
  if (process.env.RUNTIME_NODE_MODULES) {
    candidates.unshift(createRequire(path.join(process.env.RUNTIME_NODE_MODULES, '__viaim_logo_runtime__.cjs')));
  }
  candidates.push(createRequire(path.join(process.cwd(), 'package.json')));
  return candidates;
}

async function loadPlaywright() {
  for (const req of requireCandidates()) {
    try {
      const resolved = req.resolve('playwright');
      const mod = await import(pathToFileURL(resolved).href);
      const candidate = mod.default || mod;
      if (candidate.chromium) return candidate;
    } catch {
      // Try the next resolution root.
    }
  }
  throw new Error('Playwright is unavailable. In Codex, call load_workspace_dependencies and set RUNTIME_NODE_MODULES.');
}

async function ensureOutput(output, force) {
  if (!existsSync(output)) return;
  if (!force) throw new Error(`Output already exists: ${output}. Pass --force to replace this exact file.`);
  await fs.rm(output, { force: true });
}

async function renderLogo({ browser, svg, color, width, output }) {
  const height = Math.round(width * 32 / 118);
  const colored = svg.replace(/#FF3B0F/gi, `#${color}`);
  if (colored === svg && color !== 'FF3B0F') throw new Error('The master SVG does not contain the expected #FF3B0F fill token.');
  const context = await browser.newContext({
    viewport: { width: Math.max(width, 1280), height: Math.max(height, 720) },
    deviceScaleFactor: 1,
  });
  try {
    const page = await context.newPage();
    await page.setContent(`<!doctype html><meta charset="utf-8"><style>html,body{margin:0;padding:0;background:transparent;overflow:hidden}svg{display:block;width:${width}px!important;height:${height}px!important}</style>${colored}`);
    const logo = page.locator('svg');
    const box = await logo.boundingBox();
    if (!box || Math.round(box.width) !== width || Math.round(box.height) !== height) throw new Error('Rendered logo dimensions do not match the requested 118:32 output.');
    await logo.screenshot({ path: output, type: 'png', omitBackground: true, animations: 'disabled', scale: 'css' });
  } finally {
    await context.close();
  }
  return { height };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const source = path.resolve(options.source);
  if (!existsSync(source)) throw new Error(`Logo SVG not found: ${source}`);
  const svg = await fs.readFile(source, 'utf8');
  if (!/viewBox=["']0 0 118 32["']/.test(svg)) throw new Error('Logo master must keep viewBox="0 0 118 32".');
  const sourceSha256 = crypto.createHash('sha256').update(svg).digest('hex');
  const expectedSha256 = 'b9fd8b1b3c5f70e32fd9c4744dfc9c88d8b93834bc2f353aeb599b68239f6da0';
  if (sourceSha256 !== expectedSha256) throw new Error(`Logo master SHA-256 changed: ${sourceSha256}`);

  const outputDir = path.resolve(options.outputDir || path.join(path.dirname(source), 'png'));
  await fs.mkdir(outputDir, { recursive: true });
  const colors = options.allColors ? [...palette.keys()] : [options.color];
  const outputs = colors.map((color) => {
    const filename = `viaim-logo-${palette.get(color)}-${options.width}x${Math.round(options.width * 32 / 118)}.png`;
    return { color, output: path.resolve(options.output || path.join(outputDir, filename)) };
  });
  for (const item of outputs) await ensureOutput(item.output, options.force);

  const playwright = await loadPlaywright();
  const systemBrowser = [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser',
  ].find(existsSync);
  const browser = await playwright.chromium.launch({
    args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
    ...(systemBrowser ? { executablePath: systemBrowser } : {}),
  });
  try {
    for (const item of outputs) {
      const { height } = await renderLogo({ browser, svg, color: item.color, width: options.width, output: item.output });
      console.log(`LOGO_PNG_HD_OK width=${options.width} height=${height} scale=${options.width / 118}x color=#${item.color} transparent=true aspect=118:32 source_sha256=${sourceSha256} output=${item.output}`);
    }
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(`LOGO_PNG_HD_ERROR ${error.message}`);
  process.exitCode = 1;
});
