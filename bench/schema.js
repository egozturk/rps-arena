// schema.js — sonuç JSON şeması, doğrulayıcı ve istatistik yardımcıları
'use strict';

const SCHEMA_VERSION = 1;

/** Sayı dizisinin medyanı. Boş dizi -> hata (sessiz yanlış sonuç yok). */
function median(values) {
  if (!Array.isArray(values) || values.length === 0) {
    throw new Error('median: boş ya da geçersiz dizi');
  }
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

/** Tek koşu kaydını doğrular. Dönen: hata mesajları dizisi (boşsa geçerli). */
function validateRun(run) {
  const errs = [];
  const need = (cond, msg) => { if (!cond) errs.push(msg); };
  need(run && typeof run === 'object', 'run bir nesne olmalı');
  if (!run || typeof run !== 'object') return errs;

  const m = run.meta;
  need(m && typeof m === 'object', 'meta eksik');
  if (m) {
    need(typeof m.label === 'string' && m.label.length > 0, 'meta.label eksik');
    need(typeof m.node === 'string' && m.node.startsWith('v'), 'meta.node "vX.Y.Z" olmalı');
    need(typeof m.date === 'string' && !Number.isNaN(Date.parse(m.date)), 'meta.date ISO olmalı');
    need(typeof m.cpu === 'string', 'meta.cpu eksik');
    need(Number.isInteger(m.cores) && m.cores > 0, 'meta.cores pozitif tamsayı olmalı');
    need(typeof m.platform === 'string', 'meta.platform eksik');
  }

  need(Array.isArray(run.entries) && run.entries.length > 0, 'entries boş olamaz');
  if (Array.isArray(run.entries)) {
    for (const e of run.entries) {
      need(typeof e.scenario === 'string' && /^S\d+$/.test(e.scenario), `geçersiz scenario: ${e && e.scenario}`);
      need(Array.isArray(e.runs_rps) && e.runs_rps.length >= 1, `${e && e.scenario}: runs_rps eksik`);
      if (Array.isArray(e.runs_rps)) {
        need(e.runs_rps.every((v) => Number.isFinite(v) && v > 0), `${e.scenario}: runs_rps pozitif sayı olmalı`);
      }
      need(Number.isFinite(e.median_rps) && e.median_rps > 0, `${e && e.scenario}: median_rps geçersiz`);
      need(Number.isFinite(e.p99_ms) && e.p99_ms >= 0, `${e && e.scenario}: p99_ms geçersiz`);
    }
  }
  return errs;
}

/** Birikimli sonuç dosyasını doğrular. */
function validateResults(doc) {
  const errs = [];
  if (!doc || typeof doc !== 'object') return ['results bir nesne olmalı'];
  if (doc.schemaVersion !== SCHEMA_VERSION) errs.push(`schemaVersion ${SCHEMA_VERSION} olmalı`);
  if (!Array.isArray(doc.runs)) { errs.push('runs dizi olmalı'); return errs; }
  doc.runs.forEach((r, i) => {
    for (const e of validateRun(r)) errs.push(`runs[${i}]: ${e}`);
  });
  return errs;
}

module.exports = { SCHEMA_VERSION, median, validateRun, validateResults };
