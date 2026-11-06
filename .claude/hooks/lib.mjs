// Helpers shared by the hooks. Claude Code sends a JSON on stdin;
// to block a tool call, the hook exits with code 2 and explains on stderr.
import { readFileSync } from 'node:fs';

// Returns the parsed object, {} when stdin is empty, or null when there is text that is not JSON.
// The BOM (U+FEFF) that Windows sometimes puts at the start is stripped first: without that, JSON.parse
// fails and a guard hook that "allows when in doubt" would let the dangerous command through.
export function readInput(text) {
  let raw = text;
  if (raw === undefined) {
    try { raw = readFileSync(0, 'utf8'); } catch { raw = ''; }
  }
  raw = raw.replace(/^﻿/, '').trim();
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

// Guard hook: unreadable input is a reason to block, never to allow.
export function readInputOrBlock() {
  const e = readInput();
  if (e === null) block('Blocked: the hook could not read the tool call. When in doubt, a guard blocks.');
  return e;
}

export function block(reason) {
  process.stderr.write(`${reason}\n`);
  process.exit(2);
}

export function allow() {
  process.exit(0);
}
