// smoke.test.js — runner'ı GERÇEK autocannon koşusuyla uçtan uca test eder (kısa süreli)
'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { validateResults } = require('../bench/schema');

test('duman: runner S1 üzerinde gerçek koşu yapar ve geçerli JSON üretir', () => {
  const out = path.join(os.tmpdir(), `arena-smoke-${Date.now()}.json`);
  execFileSync(process.execPath, [
    path.join(__dirname, '..', 'bench', 'runner.js'),
    '--label', 'smoke-test', '--out', out,
  ], {
    env: {
      ...process.env,
      BENCH_DURATION: '2', BENCH_WARMUP: '0', BENCH_RUNS: '2',
      BENCH_CONNECTIONS: '10', BENCH_ONLY: 'S1',
    },
    stdio: 'pipe',
    timeout: 120_000,
  });
  const doc = JSON.parse(fs.readFileSync(out, 'utf8'));
  assert.deepStrictEqual(validateResults(doc), []);
  assert.strictEqual(doc.runs.length, 1);
  const e = doc.runs[0].entries[0];
  assert.strictEqual(e.scenario, 'S1');
  assert.strictEqual(e.runs_rps.length, 2);
  assert.ok(e.median_rps > 100, `medyan RPS makul olmalı, gelen: ${e.median_rps}`);
  fs.unlinkSync(out);
});

test('duman: --append ikinci koşuyu aynı dosyaya ekler', () => {
  const out = path.join(os.tmpdir(), `arena-append-${Date.now()}.json`);
  const run = (label) => execFileSync(process.execPath, [
    path.join(__dirname, '..', 'bench', 'runner.js'),
    '--label', label, '--out', out, '--append',
  ], {
    env: {
      ...process.env,
      BENCH_DURATION: '1', BENCH_WARMUP: '0', BENCH_RUNS: '1',
      BENCH_CONNECTIONS: '5', BENCH_ONLY: 'S1',
    },
    stdio: 'pipe',
    timeout: 120_000,
  });
  run('append-1');
  run('append-2');
  const doc = JSON.parse(fs.readFileSync(out, 'utf8'));
  assert.deepStrictEqual(validateResults(doc), []);
  assert.strictEqual(doc.runs.length, 2);
  assert.strictEqual(doc.runs[0].meta.label, 'append-1');
  assert.strictEqual(doc.runs[1].meta.label, 'append-2');
  fs.unlinkSync(out);
});
