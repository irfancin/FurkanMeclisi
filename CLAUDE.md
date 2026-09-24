@AGENTS.md

# Furkan Meclisi — Claude Talimatları

## Proje Özeti
Kur'an hatim grubunu yönetmek için geliştirilmiş mobil-öncelikli web uygulaması.
- **Slogan:** Hatim Kardeşliği
- **Stack:** Next.js 14 (App Router), Supabase, TypeScript, Tailwind CSS
- **Deploy:** Vercel (otomatik CI/CD — main branch → production)
- **Repo:** /home/irfan/FurkanMeclisi
- **Başlatma (local):** `npm run dev` (port 3000)
- **Güncel versiyon:** v1.67 (`VERSIYON` sabiti `src/app/page.tsx`'te)
- **Yapılacaklar:** `yapilacaklar.md` — açık görevler burada takip edilir

---

## Klasör Yapısı

```
FurkanMeclisi/
├── src/
│   ├── app/
│   │   ├── page.tsx              # Giriş sayfası (Üye/Yönetici toggle)
│   │   ├── layout.tsx            # Kök layout
│   │   ├── globals.css
│   │   ├── bugun/page.tsx        # Üye günlük ekranı (Okudum butonu)
│   │   ├── admin/
│   │   │   ├── layout.tsx           # Admin nav (Raporlar / Manuel Kayıt / Yönetim / Tur Başlat / Giriş Logları)
│   │   │   ├── page.tsx             # → /admin/raporlar yönlendirir
│   │   │   ├── raporlar/page.tsx    # Günlük rapor (✍️ hızlı kayıt butonu) + tur matrisi
│   │   │   ├── manuel-kayit/page.tsx# Yönetici adına okuma girişi — üye+tarih+gün seçimi
│   │   │   ├── yonetim/page.tsx     # Grup + üye yönetimi + Excel import
│   │   │   ├── rotasyon/page.tsx    # 3 adımlı tur rotasyonu
│   │   │   └── loglar/page.tsx      # Giriş logları
│   │   └── api/
│   │       ├── giris/route.ts         # Üye PIN + yönetici tel giriş
│   │       ├── giris/gruplar/route.ts
│   │       ├── giris/uyeler/route.ts
│   │       ├── pin-ayarla/route.ts    # İlk giriş kalıcı PIN ayarla
│   │       ├── bugun/route.ts         # Üye günlük veri
│   │       ├── okuma/route.ts         # Okuma kaydet / geri al
│   │       └── admin/
│   │           ├── gruplar/route.ts
│   │           ├── uyeler/route.ts
│   │           ├── uyeler/excel/route.ts
│   │           ├── rapor/route.ts          # Günlük rapor API
│   │           ├── raporlar/route.ts       # Dönem listesi + matris
│   │           ├── rotasyon/route.ts       # Tur rotasyonu
│   │           ├── manuel-kayit/route.ts   # Yönetici adına okuma kaydı (GET: dönem bilgisi / POST: upsert)
│   │           ├── loglar/route.ts
│   │           ├── sablon/route.ts         # Excel şablon indirme
│   │           └── tohum/route.ts          # Seed verisi
│   ├── hooks/useAuth.ts
│   ├── lib/supabase/
│   │   ├── client.ts
│   │   └── server.ts
│   └── types/index.ts
├── supabase/migrations/
│   ├── 001_initial_schema.sql
│   ├── 002_grup_tipi.sql
│   ├── 003_kullanici_grup_nullable.sql
│   ├── 004_add_pin_column.sql
│   ├── 005_normalize_tel_no.sql
│   ├── 006_multi_cuz_atamalari.sql   # donem_atamalari unique: (kullanici+donem+cuz)
│   └── 007_okuma_kayitlari_cuz_no.sql  # okuma_kayitlari.cuz_no + unique güncelleme
├── yapilacaklar.md                    # Açık görevler + tamamlanan geçmiş
└── public/
```

---

## Veritabanı (Supabase)

### Tablolar

| Tablo | Açıklama |
|---|---|
| `gruplar` | `id`, `grup_adi`, `grup_tipi` (Hatim/Zikir) |
| `donemler` | Tur periyotları — `grup_id`, `tur_no`, `baslangic_tarihi`, `bitis_tarihi`; `unique(grup_id, tur_no)` |
| `donem_atamalari` | `kullanici_id × donem_id × cuz_no`; `unique(kullanici_id, donem_id, cuz_no)` — BİR kullanıcının aynı dönemde birden fazla cüzü olabilir (migration 006) |
| `kullanicilar` | `tel_no` (unique, başında 0 yok), `ad_soyad`, `grup_id` (nullable — yönetici/sistem için), `kullanici_tipi` (Uye/Yonetici/Sistem Bakim), `aktif`, `pin` (nullable = ilk giriş yapılmamış) |
| `okuma_kayitlari` | Günlük okuma; `cuz_no` kolonu eklendi (migration 007); `unique(kullanici_id, tarih, cuz_no)` — multi-cüz kullanıcı aynı günde birden fazla kayıt alabilir |
| `giris_loglari` | Giriş zamanı, IP, cihaz |

### Önemli DB Kuralları
- **tel_no:** Başında `0` olmadan saklanır (migration 005 ile normalize edildi) — `0532...` → `532...`
- **tel_no unique:** Migration 008 ile grup bazlı unique — `UNIQUE(tel_no, grup_id) WHERE grup_id IS NOT NULL`; aynı kişi farklı gruplarda aynı tel_no ile kayıtlı olabilir
- **pin:** Artık giriş akışında kullanılmıyor (v1.53 — PIN sistemi kaldırıldı); kolon DB'de duruyor
- **grup_id:** Yönetici ve Sistem Bakım kullanıcılarında NULL olabilir
- **En son dönem sorgusu:** `ORDER BY tur_no DESC LIMIT 1` — aktiflik filtresi yok, her zaman en son tur alınır
- **Tarih formatı:** `sv-SE` locale ile `YYYY-MM-DD` — Türkiye saati: `{ timeZone: 'Europe/Istanbul' }`
- **Zikir okuma kaydı:** `cuz_no = 0` ile `okuma_kayitlari`'na eklenir — "Zikirleri Tamamladım" butonu bu kaydı oluşturur/siler
- **OturumKullanici:** `grup_adi` ve `grup_tipi` alanları eklendi (v1.53); `fm_tum_gruplar` localStorage anahtarı çoklu grup listesini tutar

---

## Giriş Sistemi (v1.53+)

### Üye ve Yönetici Girişi — tek akış
1. Telefon numarası girişi (tek ekran)
2. API tüm aktif kayıtları tel_no ile bulur, grup bilgisi (grup_adi, grup_tipi) ile döner
3. **Tek grup:** Direkt giriş → localStorage → yönlendirme
4. **Çoklu grup:** Grup seçim ekranı (Hatim varsayılan seçili) → seçim → yönlendirme

### Oturum
- `localStorage.fm_oturum` — aktif `OturumKullanici` (`id, ad_soyad, tel_no, grup_id, grup_adi, grup_tipi, kullanici_tipi`)
- `localStorage.fm_tum_gruplar` — çoklu grupta tüm kayıtlar (toggle için); tek grupta bu key yoktur
- `localStorage.fm_son_grup_id` — son seçilen grup ID'si; çıkışta ve `grupDegistir()`'da güncellenir, çıkışta silinmez; sonraki çoklu grup girişinde bu grup biliniyorsa seçim ekranı ATLANIR ve direkt giriş yapılır; bilinmiyorsa seçim ekranı Hatim varsayılanla açılır
- `localStorage.fm_hatirla_tel` — ilk başarılı girişte kaydedilir, çıkışta silinmez; sonraki açılışta telefon formu gösterilmeden otomatik giriş yapılır; numara artık kayıtlı değilse (401) silinir, ağ hatasında korunur
- Üye → `/bugun` (toggle ile grup değiştirilebilir), Yönetici → `/admin`
- Çıkış: `fm_oturum` ve `fm_tum_gruplar` temizlenir; `fm_hatirla_tel` ve `fm_son_grup_id` korunur (sonraki girişte otomatik kullanılır)

---

## İş Kuralları

### Tur Rotasyonu
- Her tur 30 günlük; 30 üye × 1 cüz = 1 hatim
- Yeni tur: bir önceki turun bitiş tarihinden **+16 gün** (15 günlük ara) sonra başlar
- Cüzler rotasyonla dağıtılır (`cuz_no` sıradaki müsait cüz)
- **Zikir gruplarında cüz rotasyonu yapılmaz** (`grup_tipi = 'Zikir'`)

### Üye Kaydı & Tekrar Kontrolü
- Aynı telefon numarası **aynı grup içinde** sadece bir kez olabilir (başka gruplarda olabilir)
- Excel import: pasif kayıtlar unique constraint dışı tutulur
- cüz_no Excel veya formdan girilebilir; yoksa otomatik en küçük müsait cüz atanır

### Raporlar
- **Günlük rapor:** Okumayan (üstte, WA linki + **✍️ Kaydet** butonu) + Okuyan listesi (daraltılmış)
  - ✍️ Kaydet: `/api/okuma` POST ile bugünün tarihine anında kayıt; optimistic UI ile satır Okuyanlar'a geçer
- **Tur matrisi:** Üye × gün grid, çift scroll bar (üst + alt), özet toggle
- KPI kartları: Bugün okuyan sayısı, tur ilerleme %, eksik üyeler

### Manuel Kayıt (v1.67)
- **Ekran:** `/admin/manuel-kayit` — uygulamayı kullanamayan üyeler adına yönetici giriş yapar
- **Akış:** Grup → Üye seç → Dönem/cüz özeti görünür → Tarih (dönem sınırında) → Gün sayısı (slider) → Kaydet
- **Tüm Dönemi Tamamla:** Slider'ı dönem sonuna ayarlayan kısayol butonu
- **API:** `/api/admin/manuel-kayit` — GET: üyenin dönem + cüz bilgisi; POST: `{kullanici_id, tarih_baslangic, gun_sayisi}` — üyenin tüm cüzleri × tarih aralığı upsert, dönem sonu aşımı koruması var

---

## UI/UX Kuralları
- **Renk paleti:** Emerald (üye tarafı) / Blue-600 (yönetici) / Red (çıkış/alarm)
- **Versiyon no:** Login kartı sağ alt köşe, `.text-xs.text-slate-400`
- **Üye toggle:** `rounded-full p-1` pill → aktif: `bg-white shadow-sm`, yönetici aktif: `bg-blue-600 text-white`
- **Admin header:** Logo + "Yönetici" badge + username badge + Çıkış butonu
- **Admin nav:** Tab bar, aktif sekme `border-b-2 border-emerald-600 text-emerald-700`
- **WhatsApp link:** `https://wa.me/90{tel_no}` — tel_no başında 0 yoksa `90` + tel_no
- **Okumayan listesi:** Her zaman görünür, okuyanlar daraltılmış (accordion)
- **Grup formu:** Katlanabilir (accordion)
- **Üye formu:** Katlanabilir; üye listesi üstte (cüz sırasına göre), ilk 5 göster + "Tümünü Gör"
- **Tamamlanan tur sayısı:** Bold koyu yeşil rakam, normal ağırlık etiket

---

## Anti-Pattern'ler

| Yapılmaması Gereken | Doğrusu |
|---|---|
| `aktif = true` filtresi Supabase sorgusunda giriş için | JS'de kontrol et — SQL aktif filtresi bypass sorununa yol açtı |
| `tur_no - 1` ile geçici PIN hesabı | `tur_no` olduğu gibi kullan |
| Telefon tekrar kontrolünü global unique olarak almak | Sadece aynı grup içinde unique — başka gruplarda aynı tel olabilir |
| Blob URL ile dosya indirme wait_for + `visible` state | `attached` state kullan (display:none olabilir) |
| `donemler` sorgusunda aktif/pasif ayrımı | Yoktur — her zaman en son `tur_no` alınır |
| `donem_atamalari`'nda `.single()` veya `.maybeSingle()` kullanmak | Bir kullanıcının birden fazla cüzü olabilir — `.order('cuz_no')` ile tüm satırları al; geçici PIN için `.order('cuz_no', { ascending: true })` ile en küçük cüzü kullan |
| `okuma_kayitlari` sorgusuyla distinct gün saymak | `new Set(rows.map(o => o.tarih)).size` kullan — multi-cüz günde birden fazla satır oluşturur |
| `okuma_kayitlari` upsert'te `onConflict: 'kullanici_id,tarih'` | Yeni constraint: `'kullanici_id,tarih,cuz_no'` |
| `parseCuzlar` sonucunu doğrudan kullanmak | Önce `[...new Set(...)]` ile tekilleştir — duplicate cüz girişi donem_atamalari'nda çift satır oluşturur |
| Düzenleme formunda `autoComplete` bırakmak | `autoComplete="off"` zorunlu — iOS Safari autofill tel_no alanını değiştirip sahte çakışma hatası üretir |
| Giriş telefon alanında `autoComplete="off"` kullanmak | `autoComplete="tel"` kullan — "off" otodolguyu kaldırır ve kullanıcı manuel yazarken tipoyu önleyemez; Playwright otodolgu kullandığından tipoyu görmez |
| Test SQL'inde gerçek telefon numarası kullanmak | `999000000X` gibi açıkça uydurma numaralar kullan — gerçek DB'de aynı numara `aktif=false` ile kayıtlıysa `ON CONFLICT DO NOTHING` yeni kaydı sessizce atlar, eski pasif kayıt kalır |
| Test SQL'inde `ON CONFLICT DO NOTHING` ile `aktif=true` garantilemek | `ON CONFLICT` çakışma varsa güncelleme yapmaz; `UPDATE SET aktif=true WHERE tel_no IN (...)` ekle VEYA temizleme SQL'ini önce çalıştırıp temiz INSERT yap |

---

## Deployment

- **Platform:** Vercel (otomatik deploy, main branch)
- **Ortam değişkenleri:** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- Supabase migrations lokal `supabase/migrations/` altında; production DB'ye manuel veya Supabase dashboard ile uygulanır
