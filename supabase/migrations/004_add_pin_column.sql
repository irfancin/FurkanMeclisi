-- kullanicilar tablosuna pin kolonu ekle
-- NULL = henüz PIN belirlenmemiş (ilk giriş geçici PIN ile)
alter table kullanicilar add column if not exists pin text;
