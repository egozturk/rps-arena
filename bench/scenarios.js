// scenarios.js — benchmark senaryolarının TEK kaynağı (runner + testler + Proje 1 aynı tanımı kullanır)
'use strict';
const http = require('node:http');

const JSON_BODY = JSON.stringify({
  ok: true,
  ts: 1752096000000,
  user: { id: 42, name: 'Rich Kid', role: 'builder', premium: true },
  items: Array.from({ length: 24 }, (_, i) => ({
    id: i + 1, sku: `SKU-${1000 + i}`, price: 19.9 + i, stock: 100 - i, tags: ['a', 'b'],
  })),
});

const BIG_BODY = Buffer.alloc(64 * 1024, 'x');

const scenarios = [
  {
    id: 'S1',
    name: 'Düz metin (13B)',
    why: "PR'ın kendi benchmark'ına en yakın senaryo",
    createServer() {
      return http.createServer((req, res) => {
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('Hello, world!');
      });
    },
  },
  {
    id: 'S2',
    name: 'JSON API (~1KB)',
    why: 'Gerçek API yanıtlarının en yaygın şekli',
    createServer() {
      return http.createServer((req, res) => {
        res.writeHead(200, {
          'Content-Type': 'application/json; charset=utf-8',
          'Cache-Control': 'no-store',
          'X-Request-Id': 'bench',
        });
        res.end(JSON_BODY);
      });
    },
  },
  {
    id: 'S3',
    name: 'Çok başlık (12 adet + çerez)',
    why: 'Başlık serileştirme optimizasyonunu zorlar',
    createServer() {
      return http.createServer((req, res) => {
        res.writeHead(200, {
          'Content-Type': 'text/plain',
          'Cache-Control': 'private, max-age=0',
          'X-Frame-Options': 'DENY',
          'X-Content-Type-Options': 'nosniff',
          'Referrer-Policy': 'strict-origin-when-cross-origin',
          'Strict-Transport-Security': 'max-age=63072000',
          'X-RateLimit-Limit': '1000',
          'X-RateLimit-Remaining': '997',
          'X-Trace-Id': 'abc123def456',
          'Vary': 'Accept-Encoding',
          'Server-Timing': 'db;dur=12, app;dur=3',
          'Set-Cookie': 'session=s%3Aabc.def; Path=/; HttpOnly; SameSite=Lax',
        });
        res.end('ok');
      });
    },
  },
  {
    id: 'S4',
    name: 'Büyük gövde (64KB)',
    why: 'Gövde ağırlıklıyken başlık kazancı kaybolur mu? (dürüstlük senaryosu)',
    createServer() {
      return http.createServer((req, res) => {
        res.writeHead(200, { 'Content-Type': 'application/octet-stream' });
        res.end(BIG_BODY);
      });
    },
  },
];

module.exports = { scenarios };
