# Değişiklik Geçmişi

## v1.78 — 2026-10-05

### Günlük Rapor — Okuyanlar Listesine Saat ve Sıralama Eklendi

**Motivasyon:** Yönetici yanlış üye adına okuma kaydı girdiğinde "en son kimi kaydettim?"
sorusunu yanıtlayabilmek için okuyanlar listesine kayıt saati ve sıralama toggle'ı eklendi.

**Değişiklikler:**

`src/app/api/admin/rapor/route.ts`
- `bugun_okumalar` sorgusuna `okunma_saati` alanı eklendi
- `okunmaSaatiMap` ile her `kullanici_id_cuz_no` çiftine kayıt saati eşlendi
- `liste` içindeki her satıra `okunma_saati` alanı eklendi

`src/app/admin/raporlar/page.tsx`
- `GunlukUye` interface'e `okunma_saati` alanı eklendi
- `saatTR()` yardımcı fonksiyonu eklendi (Istanbul timezone, HH:mm)
- `okuyanSiralama` state'i eklendi: `'cuz'` (varsayılan) | `'saat'`
- `okuyanSirali` türetildi: cüz sırası artan, saat sırası azalan (en son kaydedilen üstte)
- Okuyanlar başlığına **Cüz ⇅ / Saat ⇅** toggle butonları eklendi
- Her satırda kayıt saati `HH:mm` formatında gösterilir
- Optimistic UI (`✍️ Kaydet`) `okunma_saati: new Date().toISOString()` ile güncellendi

---

## 2026-10-01 — Bildirim Sistemi Araştırması

Okumayan üyelere otomatik hatırlatma göndermek için teknik seçenekler araştırıldı.
Araştırma sonuçları PDF rapor olarak belgelendi.

**Değerlendirilen seçenekler:**
- Web Push Notifications (Service Worker + VAPID) — ücretsiz, Android'de tam çalışıyor
- WhatsApp Business API (Meta resmi) — ~1 TL/ay, en yüksek erişim oranı
- Telegram Bot — ücretsiz, Telegram kurulu olması gerekiyor
- SMS / Netgsm — ~63 TL/ay
- Twilio Voice (otomatik arama) — ~2.940 TL/ay, uygun değil

**Karar:** Henüz uygulamaya geçilmedi. İki aşamalı yaklaşım planlandı:
1. Web Push + Vercel Cron (kısa vadeli, ücretsiz)
2. WhatsApp Business API (uzun vadeli, en etkili)

**Belgeler:**
- `docs/FurkanMeclisi_Bildirim_Arastirma.pdf` — detaylı karşılaştırma raporu
- `rapor_pdf_bildirim_arastirma.py` — PDF oluşturucu script

---

## v1.77 — 2026-10-25

### Tur Matrisi — Varsayılan Tur Seçimi Düzeltmesi

**Sorun:** Dönem dropdown'u `tur_no DESC` sıralamasıyla geldiğinden en yeni (henüz başlamamış)
tura varsayılan olarak atlıyordu. 4. Tur 2026-11-09'da başlayacağından hiç kaydı yoktu;
matris boş görünüyordu.

**Düzeltme:** `src/app/admin/raporlar/page.tsx`
- Grup değişince dönem listesi yüklenirken bugünün tarihiyle aktif dönem aranır
- Aktif dönem bulunursa seçilir; yoksa en son geçmiş dönem; ikisi de yoksa liste[0]
- Dropdown seçeneklerinde tarih aralığı gösterilir: `3. Tur ● (09-26 – 10-25)`
- Aktif tur `●` ile işaretlenir

---

## v1.74–v1.76 — 2026-10-25

### Tur Matrisi — Zikir Grubu Desteği

**Sorun:** Zikir grubunda Tur Matrisi tüm üyeleri listelemiyor ve/veya okunan günleri göstermiyordu.

**Kök Neden (v1.74):** `raporlar/route.ts` matris endpoint'i `donem_atamalari` sorguluyor,
Zikir için bu tablo boş olduğundan fallback'te üyeler `cuz_no=null` ile oluşturuluyordu.
Oysa okuma kayıtları `cuz_no=0` ile saklanır → anahtar uyuşmazlığı.

**Düzeltmeler:**
- **v1.74** — `rapor/route.ts` ile aynı `isZikir` pattern'i eklendi: Zikir grubunda
  `donem_atamalari` atlanır, aktif üyeler `kullanicilar` tablosundan `cuz_no=0` ile alınır
- **v1.75** — Zikir eşleştirmesi `cuz_no`'dan bağımsız: sadece `kullanici_id + tarih` key'i
- **v1.76** — DB tarih filtresi Zikir için kaldırıldı; tüm okuma kayıtları çekilip `gunSet`
  ile bellekte filtreleniyor (donem tarihi format uyumsuzluğu riski bertaraf edildi);
  günler listesi timezone kaymasına karşı UTC öğlen saati (`T12:00:00Z`) bazlı hesaplandı

**Gerçek sorun** Tanı butonu ile tespit edildi: 179 kayıt mevcuttu, tarih uyuşmazlığı yoktu.
Asıl neden `v1.77`'deki dropdown sorunundan kaynaklanıyordu.

---

## v1.71 — 2026-09-26

### Zikir Grubu Düzeltmeleri

**Sorun 1: Günlük Rapor — Negatif "Bugün Okumayan" (-12)**

Zikir gruplarında `donem_atamalari` tablosunda kayıt bulunmaz (cüz ataması yapılmaz).
`rapor/route.ts` toplam üye sayısını `liste.length` ile hesaplıyordu; `liste` ise
`donem_atamalari`'ndan oluşturuluyordu. Bu nedenle:
- `toplam = 0` → "Toplam Üye: 0"
- `okuyanlar = 12` (okuma_kayitlari'ndan — doğru)
- `0 - 12 = -12` → "Bugün Okumayan: -12"

**Düzeltme:** `src/app/api/admin/rapor/route.ts`
- Grup tipi DB'den çekilir (`gruplar.grup_tipi`)
- Zikir grubunda `liste` doğrudan `kullanicilar` tablosundan, `cuz_no=0` ile oluşturulur
- `toplam = uyeler.length` (gerçek üye sayısı)

---

**Sorun 2: Manuel Kayıt — "Bu üyenin dönem ataması bulunamadı."**

`manuel-kayit/route.ts` POST handler, `donem_atamalari`'nda kayıt bulunmaması durumunda
hata döndürüyordu. Zikir üyeleri için bu tablo her zaman boştur.

Aynı şekilde GET handler `cuz_lar: []` döndürdüğünden ekranda "Toplam 0 kayıt" yazıyordu.

**Düzeltme:** `src/app/api/admin/manuel-kayit/route.ts`
- POST: `donem_atamalari` boşsa grup tipi kontrol edilir; Zikir ise `cuz_no=0` kullanılır
- GET: `zikir: true` bayrağı yanıta eklenir

**Frontend:** `src/app/admin/manuel-kayit/page.tsx`
- `zikir: true` geldiğinde "Cüz: X" yerine "Zikir" gösterilir
- Özet satırında "Toplam N kayıt" doğru hesaplanır (Zikir = `gunSayisi × 1`)

---

## v1.70 — 2026-09-24

- Üye silme düzeltmesi
- Manuel Kayıt sayfası eklendi

## v1.69 — 2026-09-24

- Android geri tuşu düzeltmesi: `router.replace` + `fm_cikis` flag
