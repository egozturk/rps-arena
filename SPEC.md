# SPEC — Proje 2: RPS Arena

## Amaç
Node.js sürümlerini (ileride: PR'lı nightly'ler dahil) sabit HTTP senaryolarında düzenli
olarak benchmark'layıp sonuçları herkese açık, canlı bir sayfada yayınlayan tek kişilik,
tamamen otomatik ve ücretsiz altyapı. "Duyum yok, ölçüm var" ilkesinin ürünleşmiş hâli.

## Mimari
```
rps-arena/
├── SPEC.md                  # bu belge
├── README.md                # kurulum + katkı rehberi
├── package.json
├── bench/
│   ├── scenarios.js         # 4 senaryonun sunucu tanımları (tek kaynak)
│   ├── runner.js            # ısınma + N koşu + medyan; results/*.json üretir
│   └── schema.js            # sonuç JSON şeması + doğrulayıcı
├── test/
│   ├── unit.test.js         # medyan, şema, senaryo tanımları (node:test)
│   └── smoke.test.js        # 2 sn'lik gerçek koşu → şema doğrulaması
├── results/
│   └── results.json         # birikimli sonuç veritabanı (commit'lenir)
├── site/
│   └── index.html           # dashboard — results.json'u okur, grafikler (tek dosya)
└── .github/workflows/bench.yml  # cron: haftalık koş + commit + Pages deploy
```

## Senaryolar (Proje 1 ile AYNI tanımlar — tek kaynaktan)
S1 düz metin 13B · S2 JSON ~1KB · S3 çok başlık (12+çerez) · S4 büyük gövde 64KB

## Runner Protokolü
- autocannon: connections=100, duration=10s, pipelining=1
- Senaryo başına: 5s ısınma (atılır) + 3 ölçüm → medyan RPS, medyan p99 gecikme
- Çıktı kaydı: `{ meta: {node, os, cpu, date, commit}, entries: [{scenario, runs, median_rps, p99_ms}] }`
- results.json birikimli: her koşu `runs[]` dizisine eklenir → dashboard zaman serisi çizebilir

## Dashboard
- Tek HTML dosyası, bağımlılık CDN'siz (grafikler el yazması SVG/div bar)
- Seri tasarım sistemi (koyu tema, mevcut palet)
- Görünümler: (1) son koşu — senaryo bazında sürüm karşılaştırma barları,
  (2) zaman serisi — sürümler geldikçe RPS eğrisi, (3) ortam künyesi
- results.json fetch edilir; dosya yoksa örnek veriyle "demo modu" (bozuk sayfa YOK)

## CI (GitHub Actions)
- cron: haftalık (pazartesi 06:00 UTC) + elle tetikleme (workflow_dispatch)
- adımlar: checkout → setup-node (matrix: [22, 24, 26]) → npm ci → npm test →
  node bench/runner.js --append → commit results.json → Pages deploy
- Actions runner'ları paylaşımlı donanımdır → README'de "mutlak değil GÖRELİ kıyas" notu

## Test Stratejisi (sürekli)
- Birim: medyan (tek/çift/karışık), şema doğrulayıcı (eksik alan reddi), senaryo tanım bütünlüğü
- Duman: gerçek sunucu + 2 sn gerçek autocannon koşusu → çıktı şemadan geçer
- `npm test` tek komut; CI'da her koşuda zorunlu — test geçmeden benchmark koşulmaz

## Kabul Kriterleri
- [ ] `npm test` yeşil (birim + duman)
- [ ] `node bench/runner.js` gerçek koşu yapıp geçerli results.json üretiyor
- [ ] Dashboard gerçek results.json ile ve dosyasız (demo) modda düzgün render oluyor
- [ ] Workflow YAML'ı sözdizimi doğrulamasından geçmiş
- [ ] README: 5 dakikada kur-çalıştır + Pages açma adımları
