// unit.test.js — medyan, şema doğrulayıcı ve senaryo bütünlüğü testleri
'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const http = require('node:http');
const { median, validateRun, validateResults, SCHEMA_VERSION } = require('../bench/schema');
const { scenarios } = require('../bench/scenarios');

// ---------- median ----------
test('median: tek eleman', () => assert.strictEqual(median([7]), 7));
test('median: tek sayıda eleman', () => assert.strictEqual(median([3, 1, 2]), 2));
test('median: çift sayıda eleman', () => assert.strictEqual(median([4, 1, 3, 2]), 2.5));
test('median: sıralanmamış girdiyi bozmaz', () => {
  const arr = [9, 1, 5];
  median(arr);
  assert.deepStrictEqual(arr, [9, 1, 5]);
});
test('median: boş dizi fırlatır', () => assert.throws(() => median([])));
test('median: dizi olmayan girdi fırlatır', () => assert.throws(() => median('x')));

// ---------- şema ----------
function validRun() {
  return {
    meta: {
      label: 'node-v22.0.0', node: 'v22.0.0', date: new Date().toISOString(),
      cpu: 'test-cpu', cores: 2, platform: 'linux-x64',
    },
    entries: [
      { scenario: 'S1', name: 'x', runs_rps: [100, 110, 105], median_rps: 105, p99_ms: 12 },
    ],
  };
}
test('şema: geçerli koşu geçer', () => assert.deepStrictEqual(validateRun(validRun()), []));
test('şema: label eksikse reddeder', () => {
  const r = validRun(); delete r.meta.label;
  assert.ok(validateRun(r).length > 0);
});
test('şema: negatif rps reddedilir', () => {
  const r = validRun(); r.entries[0].runs_rps = [100, -5];
  assert.ok(validateRun(r).some((e) => e.includes('runs_rps')));
});
test('şema: bozuk scenario id reddedilir', () => {
  const r = validRun(); r.entries[0].scenario = 'X1';
  assert.ok(validateRun(r).some((e) => e.includes('scenario')));
});
test('şema: boş entries reddedilir', () => {
  const r = validRun(); r.entries = [];
  assert.ok(validateRun(r).length > 0);
});
test('şema: results dosyası — yanlış sürüm reddedilir', () => {
  const errs = validateResults({ schemaVersion: 999, runs: [validRun()] });
  assert.ok(errs.some((e) => e.includes('schemaVersion')));
});
test('şema: results dosyası — geçerli belge geçer', () => {
  const errs = validateResults({ schemaVersion: SCHEMA_VERSION, runs: [validRun()] });
  assert.deepStrictEqual(errs, []);
});

// ---------- senaryolar ----------
test('senaryolar: id benzersiz ve S# formatında', () => {
  const ids = scenarios.map((s) => s.id);
  assert.strictEqual(new Set(ids).size, ids.length);
  for (const id of ids) assert.match(id, /^S\d+$/);
});
test('senaryolar: her sunucu 200 döner ve gövde üretir', async () => {
  for (const sc of scenarios) {
    const server = sc.createServer();
    await new Promise((res) => server.listen(0, '127.0.0.1', res));
    const { port } = server.address();
    const resp = await fetch(`http://127.0.0.1:${port}/`);
    const body = Buffer.from(await resp.arrayBuffer());
    assert.strictEqual(resp.status, 200, `${sc.id} 200 dönmeli`);
    assert.ok(body.length > 0, `${sc.id} gövde üretmeli`);
    await new Promise((res) => server.close(res));
  }
});
test('senaryolar: S4 gerçekten 64KB döner', async () => {
  const sc = scenarios.find((s) => s.id === 'S4');
  const server = sc.createServer();
  await new Promise((res) => server.listen(0, '127.0.0.1', res));
  const { port } = server.address();
  const resp = await fetch(`http://127.0.0.1:${port}/`);
  const body = Buffer.from(await resp.arrayBuffer());
  assert.strictEqual(body.length, 64 * 1024);
  await new Promise((res) => server.close(res));
});
