import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

function bugunTR() {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Istanbul' }).format(new Date())
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const grup_id = searchParams.get('grup_id')

  if (!grup_id) {
    return NextResponse.json({ hata: 'Eksik parametre.' }, { status: 400 })
  }

  const supabase = await createClient()
  const bugun = bugunTR()

  // Aktif dönemi bul
  const { data: donem } = await supabase
    .from('donemler')
    .select('*')
    .eq('grup_id', grup_id)
    .lte('baslangic_tarihi', bugun)
    .gte('bitis_tarihi', bugun)
    .single()

  if (!donem) {
    return NextResponse.json({ hata: 'Bu grup için aktif dönem bulunamadı.' }, { status: 404 })
  }

  // Grubun aktif üyeleri + cüz atamaları
  const { data: uyeler } = await supabase
    .from('kullanicilar')
    .select('id, ad_soyad, tel_no')
    .eq('grup_id', grup_id)
    .eq('aktif', true)
    .eq('kullanici_tipi', 'Uye')
    .order('ad_soyad')

  if (!uyeler || uyeler.length === 0) {
    return NextResponse.json({ donem, uyeler: [], okuyanlar: 0 })
  }

  // Bugünkü okuma kayıtları (bu gruptaki üyeler için)
  const uye_idler = uyeler.map(u => u.id)

  const { data: bugun_okumalar } = await supabase
    .from('okuma_kayitlari')
    .select('kullanici_id')
    .in('kullanici_id', uye_idler)
    .eq('tarih', bugun)

  const okuyanSet = new Set((bugun_okumalar ?? []).map(o => o.kullanici_id))

  // Cüz atamaları
  const { data: atamalar } = await supabase
    .from('donem_atamalari')
    .select('kullanici_id, cuz_no')
    .in('kullanici_id', uye_idler)
    .eq('donem_id', donem.id)

  const atamaMap = new Map((atamalar ?? []).map(a => [a.kullanici_id, a.cuz_no]))

  const liste = uyeler.map(u => ({
    id: u.id,
    ad_soyad: u.ad_soyad,
    tel_no: u.tel_no,
    cuz_no: atamaMap.get(u.id) ?? null,
    okudu: okuyanSet.has(u.id),
  }))

  return NextResponse.json({
    donem,
    uyeler: liste,
    okuyanlar: okuyanSet.size,
    toplam: liste.length,
  })
}
