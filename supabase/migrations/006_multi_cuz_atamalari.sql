-- Çoklu cüz atama desteği
-- donem_atamalari: unique(kullanici_id, donem_id) → unique(kullanici_id, donem_id, cuz_no)
-- Böylece bir kullanıcı aynı dönemde birden fazla cüz okuyabilir.

ALTER TABLE donem_atamalari
  DROP CONSTRAINT IF EXISTS donem_atamalari_kullanici_id_donem_id_key;

ALTER TABLE donem_atamalari
  ADD CONSTRAINT donem_atamalari_kullanici_id_donem_id_cuz_no_key
  UNIQUE (kullanici_id, donem_id, cuz_no);
