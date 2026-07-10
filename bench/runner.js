#!/usr/bin/env node
// runner.js — senaryoları koşar, medyan RPS + p99 üretir, şemadan geçirip results.json'a yazar
'use strict';
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const autocannon = require('autocannon');
const { scenarios } = require('./scenarios');
const { SCHEMA_VERSION, median, validateRun, validateResults } = require('./schema');

// --- yapılandırma (env ile ezilebilir: testler kısa koşar) ---
const CFG = {
  connections: intEnv('BENCH_CONNECTIONS', 100),
  duration: intEnv('BENCH_DURATION', 10),
  warmup: intEnv('BENCH_WARMUP', 5),
  runs: intEnv('BENCH_RUNS', 3),
  only: (process.env.BENCH_ONLY || '').split(',').filter(Boolean),
};
function intEnv(k, d) { const v = parseInt(process.env[k], 10); return Number.isFinite(v) ? v : d; }

function argValue(flag) {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

function fire(url, seconds) {
  return autocannon({ url, connections: CFG.connections, duration: seconds, pipelining: 1 });
}

async function benchScenario(sc) {
  const server = sc.createServer();
  await new Promise((res) => server.listen(0, '127.0.0.1', res));
  const { port } = server.address();
  const url = `http://127.0.0.1:${port}/`;
  try {
    if (CFG.warmup > 0) await fire(url, CFG.warmup); // ısınma — sonucu atılır
    const rpsRuns = [];
    const p99Runs = [];
    for (let i = 0; i < CFG.runs; i++) {
      const r = await fire(url, CFG.duration);
      if (r.errors > 0 || r.non2xx > 0) {
        throw new Error(`${sc.id}: hatalı koşu (errors=${r.errors}, non2xx=${r.non2xx})`);
      }
      rpsRuns.push(r.requests.average);
      p99Runs.push(r.latency.p99);
    }
    return {
      scenario: sc.id,
      name: sc.name,
      runs_rps: rpsRuns.map((v) => Math.round(v)),
      median_rps: Math.round(median(rpsRuns)),
      p99_ms: median(p99Runs),
    };
  } finally {
    await new Promise((res) => server.close(res));
  }
}

async function main() {
  const label = argValue('--label') || `node-${process.version}`;
  const outPath = argValue('--out') || path.join(__dirname, '..', 'results', 'results.json');
  const append = process.argv.includes('--append');

  const list = CFG.only.length ? scenarios.filter((s) => CFG.only.includes(s.id)) : scenarios;
  if (list.length === 0) throw new Error(`BENCH_ONLY eşleşmedi: ${CFG.only}`);

  console.log(`RPS Arena · ${label} · ${list.length} senaryo · ${CFG.runs} koşu x ${CFG.duration}s (ısınma ${CFG.warmup}s)`);
  const entries = [];
  for (const sc of list) {
    process.stdout.write(`  ${sc.id} ${sc.name} ... `);
    const e = await benchScenario(sc);
    entries.push(e);
    console.log(`${e.median_rps} rps (p99 ${e.p99_ms}ms)`);
  }

  const run = {
    meta: {
      label,
      node: process.version,
      date: new Date().toISOString(),
      cpu: os.cpus()[0]?.model || 'unknown',
      cores: os.cpus().length,
      platform: `${os.platform()}-${os.arch()}`,
    },
    entries,
  };

  const runErrs = validateRun(run);
  if (runErrs.length) {
    console.error('ŞEMA HATASI (koşu):', runErrs);
    process.exit(1);
  }

  let doc = { schemaVersion: SCHEMA_VERSION, runs: [] };
  if (append && fs.existsSync(outPath)) {
    doc = JSON.parse(fs.readFileSync(outPath, 'utf8'));
  }
  doc.runs.push(run);

  const docErrs = validateResults(doc);
  if (docErrs.length) {
    console.error('ŞEMA HATASI (dosya):', docErrs);
    process.exit(1);
  }

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(doc, null, 2));
  console.log(`✅ yazıldı: ${outPath} (toplam ${doc.runs.length} koşu kaydı)`);
}

if (require.main === module) {
  main().catch((e) => { console.error('HATA:', e.message); process.exit(1); });
}

module.exports = { benchScenario, CFG };
