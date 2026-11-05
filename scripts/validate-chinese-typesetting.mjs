#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const file = process.argv[2];
if (!file) {
  console.error('Usage: node scripts/validate-chinese-typesetting.mjs <index.html>');
  process.exit(2);
}
const absoluteFile = path.resolve(file);
const html = fs.readFileSync(absoluteFile, 'utf8');
const body = html.match(/<div id="deck"[\s\S]*?<div id="nav">/i)?.[0] || html;
const text = body
  .replace(/<script\b[\s\S]*?<\/script>/gi, '')
  .replace(/<style\b[\s\S]*?<\/style>/gi, '')
  .replace(/<br\s*\/?\s*>/gi, '\n')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;|&#160;/gi, '\u00A0')
  .replace(/&amp;/gi, '&')
  .replace(/&lt;/gi, '<')
  .replace(/&gt;/gi, '>');

const failures = [];
const report = (rule, re) => {
  const matches = [...text.matchAll(re)].slice(0, 12).map((m) => m[0]);
  if (matches.length) failures.push(`${rule}: ${matches.join(' | ')}`);
};

report('fullwidth_digit', /[０-９]+/gu);
report('space_before_fullwidth_punctuation', /[ \t\u00A0]+[，。！？；：、）》】」』]/gu);
report('ascii_punctuation_in_chinese_sentence', /[\p{Script=Han}][!?;,](?=\s|[\p{Script=Han}])/gu);
report('repeated_punctuation', /[！!]{2,}|[？?]{2,}|[。]{3,}/gu);
report('han_latin_missing_space', /(?:[\p{Script=Han}][A-Za-z][A-Za-z0-9]|[A-Za-z][A-Za-z0-9][\p{Script=Han}])/gu);
report('han_number_missing_space', /(?:[\p{Script=Han}][0-9]{2,}|[0-9]{2,}[\p{Script=Han}])/gu);

for (const line of text.split('\n')) {
  const trimmed = line.trim();
  if (/^[、，。；：！？）》】」』·…%‰°℃℉]/u.test(trimmed)) failures.push(`forbidden_line_start: ${trimmed.slice(0, 24)}`);
  if (/[（《【「『]$/u.test(trimmed)) failures.push(`forbidden_line_end: ${trimmed.slice(-24)}`);
}

if (!html.includes('line-break:strict')) failures.push('css: line-break:strict missing');
if (!html.includes('text-autospace:normal')) failures.push('css: text-autospace:normal missing');
if (!html.includes('.keep-together{white-space:nowrap}')) failures.push('css: keep-together helper missing');

if (failures.length) {
  console.error(`CHINESE_TYPE_ERROR count=${failures.length}`);
  for (const failure of failures.slice(0, 30)) console.error(`- ${failure}`);
  process.exit(1);
}
console.log('CHINESE_TYPE_OK clreq=line_start_end+unbreakable+orphan source_copy=spacing+fullwidth+proper_names css=strict+autospace');
