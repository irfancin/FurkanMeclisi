import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Tüm grupların son dönemi için okuma kayıtları oluştur
export async function POST() {
  const supabase = await createClient()

  // Tüm grupları al
  const { data: gruplar } = await supabase
    .from('gruplar')
    .select('id, grup_adi')

  if (!gruplar || gruplar.length === 0) {
    return NextResponse.json({ hata: 'Hiç grup bulunamadı.' }, { status: 404 })
  }

  let toplamKayit = 0
  const sonuclar: { grup: string; gun: number; uye: number; eklenen: number }[] = []

  for (const grup of gruplar) {
    // Grubun son dönemi
    const { data: donem } = await supabase
      .from('donemler')
      .select('id, baslangic_tarihi, bitis_tarihi, tur_no')
      .eq('grup_id', grup.id)
      .order('tur_no', { ascending: false })
      .limit(1)
      .single()

    if (!donem) continue

    // Grubun aktif üyeleri
    const { data: uyeler } = await supabase
      .from('kullanicilar')
      .select('id')
      .eq('grup_id', grup.id)
      .eq('aktif', true)
      .eq('kullanici_tipi', 'Uye')

    if (!uyeler || uyeler.length === 0) continue

    // Dönem tarih aralığı
    const bas = new Date(donem.baslangic_tarihi)
    const bit = new Date(donem.bitis_tarihi)
    const tarihler: string[] = []
    for (const d = new Date(bas); d <= bit; d.setDate(d.getDate() + 1)) {
      tarihler.push(d.toISOString().split('T')[0])
    }

    // Kayıtları oluştur
    const kayitlar = uyeler.flatMap(u =>
      tarihler.map(tarih => ({ kullanici_id: u.id, tarih }))
    )

    // Mevcut kayıtları çek, sadece eksik olanları ekle
    const { data: mevcutlar } = await supabase
      .from('okuma_kayitlari')
      .select('kullanici_id, tarih')
      .in('kullanici_id', uyeler.map(u => u.id))
      .gte('tarih', donem.baslangic_tarihi)
      .lte('tarih', donem.bitis_tarihi)

    const mevcutSet = new Set((mevcutlar ?? []).map(m => `${m.kullanici_id}_${m.tarih}`))
    const yeniKayitlar = kayitlar.filter(k => !mevcutSet.has(`${k.kullanici_id}_${k.tarih}`))

    if (yeniKayitlar.length === 0) {
      sonuclar.push({ grup: grup.grup_adi, gun: tarihler.length, uye: uyeler.length, eklenen: 0 })
      continue
    }

    const { error } = await supabase
      .from('okuma_kayitlari')
      .insert(yeniKayitlar)

    if (!error) {
      toplamKayit += yeniKayitlar.length
      sonuclar.push({
        grup: grup.grup_adi,
        gun: tarihler.length,
        uye: uyeler.length,
        eklenen: yeniKayitlar.length,
      })
    }
  }

  return NextResponse.json({ basarili: true, toplamKayit, sonuclar })
}
