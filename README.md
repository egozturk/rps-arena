# ⚡ RPS Arena

Node.js sürümlerini sabit HTTP senaryolarında **otomatik ve düzenli** benchmark'layıp
sonuçları canlı bir panoda yayınlar. Tek kişilik, tamamen ücretsiz altyapı:
GitHub Actions koşar, sonuçlar repo'ya commit'lenir, GitHub Pages yayınlar.

> İlke: **duyum yok, ölçüm var.** Bir Rich Kids of AI projesi.

## 5 dakikada çalıştır

```bash
npm ci          # bağımlılıklar (tek bağımlılık: autocannon)
npm test        # 18 test — geçmeden benchmark koşma
npm run bench   # 4 senaryo x 3 koşu, sonuç: results/results.json
```

Panoyu görmek için: `site/index.html` dosyasını tarayıcıda aç
(results.json'u bulamazsa demo verisiyle açılır, sayfa asla boş kalmaz).

## Senaryolar

| ID | Senaryo | Neden var? |
|----|---------|-----------|
| S1 | Düz metin 13B | Node çekirdeğinin kendi benchmark'ına en yakın şekil |
| S2 | JSON ~1KB | Gerçek API'lerin en yaygın yanıtı |
| S3 | 12 başlık + çerez | Başlık serileştirme yolunu zorlar |
| S4 | 64KB gövde | Gövde ağır basınca fark kayboluyor mu? (dürüstlük senaryosu) |

Protokol: senaryo başına 5 sn ısınma (atılır) + 10 sn'lik 3 ölçüm koşusu → **medyan** RPS
ve medyan p99 gecikme. autocannon, 100 bağlantı, pipelining 1.

## Otomasyon (GitHub Actions)

`.github/workflows/bench.yml` her pazartesi 06:00 UTC'de (ve elle tetiklenince):

1. Node 22 / 24 / 26 matrisinde sırayla koşar (`max-parallel: 1` — yazma yarışı yok)
2. Önce `npm test` — test geçmeden benchmark yok
3. Sonuçları `results/results.json`'a ekleyip commit'ler
4. Panoyu GitHub Pages'e dağıtır

Kurulum: repo'yu GitHub'a push'la → Settings → Pages → Source: **GitHub Actions** → Actions
sekmesinden workflow'u bir kez elle tetikle. Bitti.

## Dürüstlük notları (okumadan alıntılama)

- GitHub Actions runner'ları **paylaşımlı donanımdır**: mutlak RPS değerleri koşudan koşuya
  oynar. Bu panonun değeri mutlak sayılarda değil, **aynı koşudaki sürümler arası GÖRELİ
  farkta** ve uzun vadeli eğilimdedir.
- Yük üreteci ve sunucu aynı makinede çalışır — gerçek ağ gecikmesi yoktur.
- Tek makine, tek işletim sistemi: sonuçlar Linux-x64 içindir.

## Yapı

```
bench/scenarios.js   # senaryoların tek kaynağı
bench/runner.js      # ısınma + N koşu + medyan + şema doğrulama
bench/schema.js      # sonuç şeması, doğrulayıcı, istatistik yardımcıları
test/                # 18 test: birim (medyan/şema/senaryo) + duman (gerçek koşu)
results/results.json # birikimli sonuç veritabanı (commit'lenir)
site/index.html      # tek dosyalık canlı pano
```

## Katkı

Yeni senaryo önerisi → `bench/scenarios.js`'e ekle, `npm test` yeşilse PR at.
Senaryonun "neden var?" satırı boşsa PR reddedilir — her ölçümün bir hikâyesi olmalı.
