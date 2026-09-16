-- tel_no unique constraint: global → grup bazlı
-- Aynı kişi hem Zikir hem Hatim grubunda olabilir

-- Global unique constraint kaldır
ALTER TABLE kullanicilar DROP CONSTRAINT IF EXISTS kullanicilar_tel_no_key;

-- Grup bazlı unique: aynı tel_no aynı grup içinde tekrar edemez
CREATE UNIQUE INDEX IF NOT EXISTS kullanicilar_tel_no_grup_uidx
ON kullanicilar (tel_no, grup_id)
WHERE grup_id IS NOT NULL;

-- Yönetici/sistem bakım (grup_id NULL) için global unique koru
CREATE UNIQUE INDEX IF NOT EXISTS kullanicilar_tel_no_null_uidx
ON kullanicilar (tel_no)
WHERE grup_id IS NULL;
