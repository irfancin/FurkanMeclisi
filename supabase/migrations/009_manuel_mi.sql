-- okuma_kayitlari tablosuna manuel_mi kolonu ekle
-- true: yönetici adına girildi (✍️ Kaydet veya Manuel Kayıt ekranı)
-- false (varsayılan): üye kendi kaydetti

ALTER TABLE okuma_kayitlari
  ADD COLUMN IF NOT EXISTS manuel_mi boolean DEFAULT false;
