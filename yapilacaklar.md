# Furkan Meclisi — Yapılacaklar

## Açık Görevler

*Şu an açık görev yok.*

---

## Tamamlanan Görevler

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
