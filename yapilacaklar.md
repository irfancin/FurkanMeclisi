# Furkan Meclisi — Yapılacaklar

## Açık Görevler

*Şu an açık görev yok.*

---

## Tamamlanan Görevler

### 2026-09-24 — Yönetici Adına Manuel Okuma Kaydı (v1.67)

- [x] **Günlük raporda ✍️ Kaydet butonu:** Okumayan üyelerin her satırına hızlı giriş butonu eklendi; mevcut `/api/okuma` POST kullanıyor; optimistic UI ile satır anında Okuyanlar'a geçer
- [x] **Manuel Kayıt ekranı (`/admin/manuel-kayit`):** Grup → Üye seç → tarih + gün sayısı slider → Tüm Dönemi Tamamla kısayolu → kaydet öncesi özet → başarı bildirimi
- [x] **Manuel Kayıt API (`/api/admin/manuel-kayit`):** GET dönem+cüz bilgisi; POST çoklu gün × çoklu cüz upsert; dönem bitiş tarihi koruması
- [x] **Admin menüsüne ✍️ Manuel Kayıt sekmesi eklendi** (Raporlar'ın hemen yanına)
- [x] Commit: `04188b0` / versiyon sabiti: `03e4603`

### 2026-09-13 — Çoklu Cüz Desteği (v1.50)

- [x] Migration 006: `donem_atamalari` unique constraint güncellendi (kullanici+donem+cuz)
- [x] Migration 007: `okuma_kayitlari.cuz_no` kolonu eklendi
- [x] `/api/bugun` → `cuzler[]` array döndürüyor
- [x] `/api/okuma` → `cuz_no` parametresi zorunlu
- [x] `/api/admin/uyeler` → `cuz_lar: number[]` PATCH/GET/POST
- [x] `/api/admin/rotasyon` → multi-cüz rotation (her cüz bağımsız +1)
- [x] `/api/admin/tohum` → (kullanici × cüz) × tarih
- [x] `/api/admin/rapor` → (kullanici × cüz) bazlı liste
- [x] `/api/admin/raporlar` matris → uid_tarih_cuz_no anahtar
- [x] `bugun/page.tsx` → tek cüz eski tasarım; çoklu → mini kart + "Hepsini Okudum"
- [x] `yonetim/page.tsx` → virgüllü cüz girişi, `cuz_lar` array

### 2026-09-14 — Test Senaryosu

- [x] `test_senaryosu.md` oluşturuldu — kurulum SQL + 5 kullanıcı + 5 senaryo + temizleme SQL
- [x] **aktif=false sorunu:** `ON CONFLICT DO NOTHING` gerçek kullanıcı kaydını atlamıştı; tel numaraları `999000000X` formatına güncellendi
- [x] Commit: `3ba5744`

### 2026-09-17 — Zikir Grubu + Tel No Güncellemeleri (v1.53–1.54)

- [x] **DB: tel_no unique constraint** global → grup bazlı (migration 008): aynı kişi Hatim+Zikir gruplarında ayrı kayıtla bulunabilir
- [x] **DB: Zikir üyeleri tel_no güncellendi** — test numaraları Hatim grubundaki gerçek numaralarla eşleştirildi (ad_soyad bazlı JOIN)
- [x] **DB: Ayşegül Hallaç çift kayıt çözüldü** — Hatim-3'te 10 ve 13. cüz ayrı kayıtlardaydı; 13. cüz doğru kayda taşındı, yanlış kayıt pasif yapıldı
- [x] **Giriş sistemi yenilendi (v1.53):** PIN sistemi kaldırıldı → tek ekran tel_no girişi; çoklu grupta üye için Hatim varsayılan grup seçim ekranı
- [x] **Bugun sayfası: grup toggle** — Hatim+Zikir üyeleri /bugun'da üstteki toggle ile grup değiştirebilir; son seçilen localStorage'da hatırlanır
- [x] **Zikir ekranı:** Aktif dönemde "🤲 Zikirleri Tamamladım" butonu (cuz_no=0); ara dönemde "Tur Tamamlandı" mesajı (v1.54)
- [x] **DB: Zikir 4. Tur dönemi** tur_no 6→4 güncellendi (26 Eylül–25 Ekim 2026, 30 gün)

### 2026-09-14 — Hatırlatma Butonu (v1.52)

- [x] **Toplu hatırlatma:** Okumayanlar başlığına `📋 Hatırlatma Metnini Kopyala` butonu eklendi
  - Grup adı + tarih + okumayan liste (cüz no ile) + dua mesajı formatında panoya kopyalar
  - 2 sn boyunca `✅ Kopyalandı!` geri bildirimi gösterir
  - Commit: `07b994e`

### 2026-09-14 — Bugfix Serisi

- [x] **Q4 fix:** Düzenleme ve yeni üye ekleme formları bağımsızlaştırıldı (mavi kart + accordion)
- [x] **AutoComplete fix:** Düzenleme formunda iOS autofill devre dışı (`autoComplete="off"`)
- [x] **Login listesi:** Dropdown'a cüz no eklendi — "Hatice Bozkurt (Cüz: 13)" formatı
- [x] **Geçici PIN fix:** Çok cüzlü kullanıcıda `.maybeSingle()` → `ORDER BY cuz_no ASC` (en küçük cüz)
- [x] **parseCuzlar dedup:** `Set` ile duplicate cüz numarası girişi engellendi
