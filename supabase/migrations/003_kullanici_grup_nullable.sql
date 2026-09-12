-- Yönetici/Sistem kullanıcıları için grup_id zorunluluğunu kaldır
ALTER TABLE kullanicilar ALTER COLUMN grup_id DROP NOT NULL;
