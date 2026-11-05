#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const masterPath = path.join(root, 'assets/logo/viaim-logo-master.svg');
const expectedHash = 'b9fd8b1b3c5f70e32fd9c4744dfc9c88d8b93834bc2f353aeb599b68239f6da0';
const failures = [];
const expect = (condition, message) => { if (!condition) failures.push(message); };

const master = fs.readFileSync(masterPath);
const svg = master.toString('utf8');
const hash = crypto.createHash('sha256').update(master).digest('hex');
expect(hash === expectedHash, `master hash changed: ${hash}`);
expect(/<svg\s+width="118"\s+height="32"\s+viewBox="0 0 118 32"/.test(svg), 'master dimensions or viewBox changed');
expect((svg.match(/<path\b/g) || []).length === 7, 'master path count changed');
expect(!/<(?:g|path)[^>]+transform=/i.test(svg), 'master geometry contains a transform');

const templateA = fs.readFileSync(path.join(root, 'assets/template.html'), 'utf8');
const templateB = fs.readFileSync(path.join(root, 'assets/template-swiss.html'), 'utf8');
for (const [content, label] of [[templateA, 'Style A'], [templateB, 'Style B']]) {
  expect(content.includes('aspect-ratio:118 / 32'), `${label} logo aspect-ratio guard is missing`);
  expect(content.includes('-webkit-mask:url("images/viaim-logo-master.svg")'), `${label} logo mask does not use the master`);
}

const deckPath = process.argv[2] ? path.resolve(process.argv[2]) : null;
if (deckPath) {
  const deck = fs.readFileSync(deckPath, 'utf8');
  expect(deck.includes('aspect-ratio:118 / 32'), 'Generated deck logo aspect-ratio guard is missing');
  expect(deck.includes('-webkit-mask:url("images/viaim-logo-master.svg")'), 'Generated deck logo does not use its copied master');
  const copiedPath = path.join(path.dirname(deckPath), 'images/viaim-logo-master.svg');
  expect(fs.existsSync(copiedPath), 'Generated deck logo master copy is missing');
  if (fs.existsSync(copiedPath)) {
    const copiedHash = crypto.createHash('sha256').update(fs.readFileSync(copiedPath)).digest('hex');
    expect(copiedHash === expectedHash, `Generated deck logo copy changed: ${copiedHash}`);
  }
}

if (failures.length) {
  console.error(`LOGO_ERROR count=${failures.length}`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log(`LOGO_OK sha256=${expectedHash} viewBox=0_0_118_32 paths=7 transform=none resize=proportional recolor=brand_tokens_only`);
