-- Furkan Meclisi — Hatim Takip Uygulaması
-- İlk şema migrasyonu

-- Gruplar
create table gruplar (
  id uuid primary key default gen_random_uuid(),
  grup_adi text unique not null,
  created_at timestamptz default now()
);

-- Bir grubun 30 günlük turları (geçmiş turlar saklanır, üzerine yazılmaz)
create table donemler (
  id uuid primary key default gen_random_uuid(),
  grup_id uuid references gruplar(id) not null,
  tur_no int not null,
  baslangic_tarihi date not null,
  bitis_tarihi date not null,
  created_at timestamptz default now(),
  unique (grup_id, tur_no)
);

-- Kullanıcılar
create table kullanicilar (
  id uuid primary key default gen_random_uuid(),
  tel_no text unique not null,
  ad_soyad text not null,
  grup_id uuid references gruplar(id) not null,
  kullanici_tipi text not null default 'Uye'
    check (kullanici_tipi in ('Uye','Yonetici','Sistem Bakim')),
  aktif boolean default true,
  created_at timestamptz default now()
);

-- Bir kullanıcının, bir turdaki cüz ataması
create table donem_atamalari (
  id uuid primary key default gen_random_uuid(),
  kullanici_id uuid references kullanicilar(id) not null,
  donem_id uuid references donemler(id) not null,
  cuz_no int not null check (cuz_no between 1 and 30),
  created_at timestamptz default now(),
  unique (kullanici_id, donem_id)
);

-- Günlük okuma kayıtları
create table okuma_kayitlari (
  id uuid primary key default gen_random_uuid(),
  kullanici_id uuid references kullanicilar(id) not null,
  tarih date not null,
  okunma_saati timestamptz default now(),
  unique (kullanici_id, tarih)
);

-- Kullanıcı bazlı giriş logları
create table giris_loglari (
  id uuid primary key default gen_random_uuid(),
  kullanici_id uuid references kullanicilar(id) not null,
  giris_zamani timestamptz default now(),
  ip_adresi text,
  cihaz_bilgisi text
);

-- İndeksler
create index idx_donemler_grup_id on donemler(grup_id);
create index idx_kullanicilar_grup_id on kullanicilar(grup_id);
create index idx_kullanicilar_tel_no on kullanicilar(tel_no);
create index idx_donem_atamalari_kullanici on donem_atamalari(kullanici_id);
create index idx_donem_atamalari_donem on donem_atamalari(donem_id);
create index idx_okuma_kayitlari_kullanici on okuma_kayitlari(kullanici_id);
create index idx_okuma_kayitlari_tarih on okuma_kayitlari(tarih);
create index idx_giris_loglari_kullanici on giris_loglari(kullanici_id);
