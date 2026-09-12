import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Türkiye saatiyle bugünün tarihi (YYYY-MM-DD)
function bugunTR() {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Istanbul' }).format(new Date())
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const kullanici_id = searchParams.get('kullanici_id')
  const grup_id = searchParams.get('grup_id')

  if (!kullanici_id || !grup_id) {
    return NextResponse.json({ hata: 'Eksik parametre.' }, { status: 400 })
  }

  const supabase = await createClient()
  const bugun = bugunTR()

  // Bugünü kapsayan aktif dönemi bul
  const { data: donem } = await supabase
    .from('donemler')
    .select('*')
    .eq('grup_id', grup_id)
    .lte('baslangic_tarihi', bugun)
    .gte('bitis_tarihi', bugun)
    .single()

  if (!donem) {
    return NextResponse.json({ hata: 'Grubunuz için aktif bir dönem bulunamadı.' }, { status: 404 })
  }

  // Cüz atamasını bul
  const { data: atama } = await supabase
    .from('donem_atamalari')
    .select('cuz_no')
    .eq('kullanici_id', kullanici_id)
    .eq('donem_id', donem.id)
    .single()

  // Bu tur içindeki toplam okuma sayısı
  const { count: okuma_sayisi } = await supabase
    .from('okuma_kayitlari')
    .select('*', { count: 'exact', head: true })
    .eq('kullanici_id', kullanici_id)
    .gte('tarih', donem.baslangic_tarihi)
    .lte('tarih', donem.bitis_tarihi)

  // Bugün okuma kaydı var mı?
  const { data: bugun_kaydi } = await supabase
    .from('okuma_kayitlari')
    .select('okunma_saati')
    .eq('kullanici_id', kullanici_id)
    .eq('tarih', bugun)
    .maybeSingle()

  return NextResponse.json({
    donem,
    cuz_no: atama?.cuz_no ?? null,
    okuma_sayisi: okuma_sayisi ?? 0,
    bugun_okundu: !!bugun_kaydi,
    bugun_okunma_saati: bugun_kaydi?.okunma_saati ?? null,
  })
}
