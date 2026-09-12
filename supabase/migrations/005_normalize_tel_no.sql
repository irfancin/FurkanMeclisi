-- Telefon numaralarının başındaki 0 rakamını kaldır
-- 05321234567 → 5321234567
UPDATE kullanicilar
SET tel_no = SUBSTRING(tel_no, 2)
WHERE tel_no LIKE '0%';
