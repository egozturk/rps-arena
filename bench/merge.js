#!/usr/bin/env node
// merge.js — matrix job'larının tekil koşu dosyalarını results/results.json'a birleştirir
// Kullanım: node bench/merge.js tmp_runs/run-*.json
// Tasarım: her girdi dosyası runner'ın ürettiği tam belgedir ({schemaVersion, runs:[...]}).
// Birleştirme deterministiktir (label'a göre sıralı), sonuç şemadan geçmeden yazılmaz.
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { SCHEMA_VERSION, validateResults } = require('./schema');

const OUT = path.join(__dirname, '..', 'results', 'results.json');

function main() {
  const files = process.argv.slice(2);
  if (files.length === 0) {
    console.error('kullanım: node bench/merge.js <run1.json> [run2.json ...]');
    process.exit(2);
  }

  let doc = { schemaVersion: SCHEMA_VERSION, runs: [] };
  if (fs.existsSync(OUT)) {
    doc = JSON.parse(fs.readFileSync(OUT, 'utf8'));
  }

  const newRuns = [];
  for (const f of files) {
    const d = JSON.parse(fs.readFileSync(f, 'utf8'));
    const errs = validateResults(d);
    if (errs.length) {
      console.error(`ŞEMA HATASI (${f}):`, errs);
      process.exit(1);
    }
    newRuns.push(...d.runs);
  }
  // deterministik sıra: label'a göre (matrix job bitiş sırası önemsizleşir)
  newRuns.sort((a, b) => a.meta.label.localeCompare(b.meta.label, 'en'));
  doc.runs.push(...newRuns);

  const errs = validateResults(doc);
  if (errs.length) {
    console.error('ŞEMA HATASI (birleşik):', errs);
    process.exit(1);
  }
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(doc, null, 2));
  console.log(`✅ ${newRuns.length} koşu eklendi → ${OUT} (toplam ${doc.runs.length})`);
}

main();
