-- Grup tipi alanı (Hatim / Zikir)
-- Zikir gruplarında cüz rotasyonu yapılmaz.
ALTER TABLE gruplar
  ADD COLUMN IF NOT EXISTS grup_tipi TEXT NOT NULL DEFAULT 'Hatim'
    CHECK (grup_tipi IN ('Hatim', 'Zikir'));
