import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const source = await readFile(new URL('../src/evidenceApi.ts', import.meta.url), 'utf8');

test('browser evidence writer is explicitly external-only', () => {
  assert.match(source, /export function insertExternalCommuteObservations/);
  assert.match(source, /external_institutional_import/);
});

test('Relay Rider-originated evidence is rejected before browser POST', () => {
  assert.match(source, /source_system/);
  assert.match(source, /relay_rider/);
  assert.match(source, /server-side projection/i);
});

test('legacy call site remains guarded during compatibility window', () => {
  assert.match(source, /insertCommuteObservations/);
  assert.match(source, /insertExternalCommuteObservations/);
});
