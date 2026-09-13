-- okuma_kayitlari tablosuna cuz_no kolonu ekle
-- Mevcut kayıtları donem_atamalari ile eşleştirerek cuz_no doldur
-- Sonra unique kısıtı (kullanici_id, tarih) → (kullanici_id, tarih, cuz_no) olarak güncelle

ALTER TABLE okuma_kayitlari
  ADD COLUMN IF NOT EXISTS cuz_no INTEGER;

-- Mevcut kayıtlar için cuz_no'yu dönem atamasından bul
UPDATE okuma_kayitlari ok
SET cuz_no = (
  SELECT da.cuz_no
  FROM donem_atamalari da
  JOIN donemler d ON da.donem_id = d.id
  WHERE da.kullanici_id = ok.kullanici_id
    AND ok.tarih >= d.baslangic_tarihi
    AND ok.tarih <= d.bitis_tarihi
  LIMIT 1
);

ALTER TABLE okuma_kayitlari
  DROP CONSTRAINT IF EXISTS okuma_kayitlari_kullanici_id_tarih_key;

ALTER TABLE okuma_kayitlari
  ADD CONSTRAINT okuma_kayitlari_kullanici_id_tarih_cuz_no_key
  UNIQUE (kullanici_id, tarih, cuz_no);
