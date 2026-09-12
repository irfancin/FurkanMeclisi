export type KullaniciTipi = 'Uye' | 'Yonetici' | 'Sistem Bakim'

export type GrupTipi = 'Hatim' | 'Zikir'

export interface Grup {
  id: string
  grup_adi: string
  grup_tipi: GrupTipi
  created_at: string
}

export interface Donem {
  id: string
  grup_id: string
  tur_no: number
  baslangic_tarihi: string
  bitis_tarihi: string
  created_at: string
}

export interface Kullanici {
  id: string
  tel_no: string
  ad_soyad: string
  grup_id: string
  kullanici_tipi: KullaniciTipi
  aktif: boolean
  created_at: string
}

export interface DonemAtamasi {
  id: string
  kullanici_id: string
  donem_id: string
  cuz_no: number
  created_at: string
}

export interface OkumaKaydi {
  id: string
  kullanici_id: string
  tarih: string
  okunma_saati: string
}

export interface GirisLogu {
  id: string
  kullanici_id: string
  giris_zamani: string
  ip_adresi: string | null
  cihaz_bilgisi: string | null
}

export interface OturumKullanici {
  id: string
  ad_soyad: string
  tel_no: string
  grup_id: string
  kullanici_tipi: KullaniciTipi
}
