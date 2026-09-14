# Furkan Meclisi — Test Senaryosu

## Kurulum SQL'i

Aşağıdaki SQL'i **Supabase → SQL Editor**'de çalıştır.

```sql
-- ============================================================
-- FURKAN MECLİSİ — TEST VERİSİ
-- ============================================================

-- 1. Test grubu
INSERT INTO gruplar (id, grup_adi)
VALUES ('00000000-0000-0000-0000-000000000001', 'Test Grubu')
ON CONFLICT (grup_adi) DO NOTHING;

-- 2. Aktif dönem (bugünden başlayan 30 günlük tur)
INSERT INTO donemler (id, grup_id, tur_no, baslangic_tarihi, bitis_tarihi)
VALUES (
  '00000000-0000-0000-0000-000000000010',
  '00000000-0000-0000-0000-000000000001',
  1,
  CURRENT_DATE,
  CURRENT_DATE + INTERVAL '29 days'
)
ON CONFLICT (grup_id, tur_no) DO NOTHING;

-- 3. Kullanıcılar (1 yönetici + 3 üye + 1 çift cüzlü üye)
INSERT INTO kullanicilar (id, tel_no, ad_soyad, grup_id, kullanici_tipi, aktif)
VALUES
  ('00000000-0000-0000-0000-000000000101', '5001112233', 'Test Yönetici', '00000000-0000-0000-0000-000000000001', 'Yonetici', true),
  ('00000000-0000-0000-0000-000000000102', '5002223344', 'Ahmet Yılmaz',  '00000000-0000-0000-0000-000000000001', 'Uye',      true),
  ('00000000-0000-0000-0000-000000000103', '5003334455', 'Fatma Kaya',    '00000000-0000-0000-0000-000000000001', 'Uye',      true),
  ('00000000-0000-0000-0000-000000000104', '5004445566', 'Mehmet Demir',  '00000000-0000-0000-0000-000000000001', 'Uye',      true),
  ('00000000-0000-0000-0000-000000000105', '5005556677', 'Zeynep Arslan', '00000000-0000-0000-0000-000000000001', 'Uye',      true)
ON CONFLICT (tel_no) DO NOTHING;

-- 4. Cüz atamaları
INSERT INTO donem_atamalari (kullanici_id, donem_id, cuz_no)
VALUES
  ('00000000-0000-0000-0000-000000000102', '00000000-0000-0000-0000-000000000010', 5),
  ('00000000-0000-0000-0000-000000000103', '00000000-0000-0000-0000-000000000010', 12),
  ('00000000-0000-0000-0000-000000000104', '00000000-0000-0000-0000-000000000010', 18),
  ('00000000-0000-0000-0000-000000000105', '00000000-0000-0000-0000-000000000010', 7),
  ('00000000-0000-0000-0000-000000000105', '00000000-0000-0000-0000-000000000010', 21)
ON CONFLICT (kullanici_id, donem_id, cuz_no) DO NOTHING;

-- 5. Sadece Ahmet bugün okudu
INSERT INTO okuma_kayitlari (kullanici_id, tarih, cuz_no)
VALUES ('00000000-0000-0000-0000-000000000102', CURRENT_DATE, 5)
ON CONFLICT (kullanici_id, tarih, cuz_no) DO NOTHING;
```

---

## Kullanıcı Bilgileri

| Ad Soyad | Telefon | Rol | Cüz | Geçici PIN | Durum |
|---|---|---|---|---|---|
| Test Yönetici | `5001112233` | Yönetici | — | — | Admin girişi |
| Ahmet Yılmaz | `5002223344` | Üye | 5 | `0105` | Bugün okudu ✅ |
| Fatma Kaya | `5003334455` | Üye | 12 | `0112` | Okumadı ❌ |
| Mehmet Demir | `5004445566` | Üye | 18 | `0118` | Okumadı ❌ |
| Zeynep Arslan | `5005556677` | Üye | 7 ve 21 | `0107` | Okumadı ❌ (çift cüz) |

> **Geçici PIN formatı:** `tur_no (2 hane) + en küçük cüz_no (2 hane)`  
> Örnek: Tur 1, Cüz 5 → `0105`

---

## Test Senaryoları

### 1. Yönetici Girişi
- Telefon: `5001112233` → Admin paneline yönlendirilmeli

### 2. Günlük Rapor — Hatırlatma Butonu
- Admin → Raporlar → Günlük Rapor
- **Beklenen:** "Henüz Okumayan (3 kişi)" başlığında `📋 Hatırlatma Metnini Kopyala` butonu görünmeli
- Butona tıkla → `✅ Kopyalandı!` geri bildirimi 2 sn gösterilmeli
- Panoya kopyalanan metin:
  ```
  📖 Furkan Meclisi — Test Grubu
  Bugün (...) henüz okuma girişi yapmayanlar:
  • Fatma Kaya (Cüz: 12)
  • Mehmet Demir (Cüz: 18)
  • Zeynep Arslan (Cüz: 7)
  • Zeynep Arslan (Cüz: 21)
  Lütfen okumalarınızı tamamlayıp giriş yapınız 🤲
  ```

### 3. Tek Cüzlü Üye Girişi (Fatma)
- Listeden "Fatma Kaya (Cüz: 12)" seç → PIN: `0112`
- **Beklenen:** Bugün ekranında tek cüz kartı, "Okudum" butonu

### 4. Çift Cüzlü Üye Girişi (Zeynep)
- Listeden "Zeynep Arslan (Cüz: 7)" seç → PIN: `0107`
- **Beklenen:** Bugün ekranında 2 ayrı mini kart (Cüz 7 + Cüz 21) + "Hepsini Okudum" butonu
- Cüz 7'yi oku → sadece o kart yeşile dönmeli, Cüz 21 beklemede kalmalı

### 5. Herkes Okuyunca
- Fatma, Mehmet ve Zeynep (her iki cüzü) okuma girişi yaptıktan sonra
- **Beklenen:** Raporda `🎉 Herkes bugün okudu!` mesajı, hatırlatma butonu görünmemeli

---

## Temizleme SQL'i

Test bitince verileri kaldırmak için:

```sql
DELETE FROM okuma_kayitlari  WHERE kullanici_id LIKE '00000000-0000-0000-0000-0000000001__';
DELETE FROM donem_atamalari  WHERE kullanici_id LIKE '00000000-0000-0000-0000-0000000001__';
DELETE FROM kullanicilar     WHERE id           LIKE '00000000-0000-0000-0000-0000000001__';
DELETE FROM donemler         WHERE id = '00000000-0000-0000-0000-000000000010';
DELETE FROM gruplar          WHERE id = '00000000-0000-0000-0000-000000000001';
```
