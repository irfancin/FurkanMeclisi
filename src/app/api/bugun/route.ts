import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

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

  // Aktif dönemi ara
  const { data: donem } = await supabase
    .from('donemler')
    .select('*')
    .eq('grup_id', grup_id)
    .lte('baslangic_tarihi', bugun)
    .gte('bitis_tarihi', bugun)
    .single()

  // Tüm dönemleri getir (önceki tur için)
  const { data: tumDonemler } = await supabase
    .from('donemler')
    .select('id, tur_no, baslangic_tarihi, bitis_tarihi')
    .eq('grup_id', grup_id)
    .order('tur_no', { ascending: false })
    .limit(3)

  const hedefDonem = donem ?? (tumDonemler?.[0] ?? null)
  if (!hedefDonem) {
    return NextResponse.json({ hata: 'Grubunuz için dönem bulunamadı.' }, { status: 404 })
  }

  const aktif = !!donem

  // Sonraki tur başlangıcı (tur arası için)
  let sonraki_bas: string | null = null
  if (!aktif) {
    const d = new Date(hedefDonem.bitis_tarihi)
    d.setDate(d.getDate() + 15)
    sonraki_bas = d.toISOString().split('T')[0]
  }

  // Cüz ataması — aktif veya son dönem için
  const { data: atama } = await supabase
    .from('donem_atamalari')
    .select('cuz_no')
    .eq('kullanici_id', kullanici_id)
    .eq('donem_id', hedefDonem.id)
    .single()

  // Bu dönemdeki toplam okuma sayısı
  const { count: okuma_sayisi } = await supabase
    .from('okuma_kayitlari')
    .select('*', { count: 'exact', head: true })
    .eq('kullanici_id', kullanici_id)
    .gte('tarih', hedefDonem.baslangic_tarihi)
    .lte('tarih', hedefDonem.bitis_tarihi)

  // Bugün okuma kaydı (sadece aktif dönemde anlamlı)
  const { data: bugun_kaydi } = aktif
    ? await supabase
        .from('okuma_kayitlari')
        .select('okunma_saati')
        .eq('kullanici_id', kullanici_id)
        .eq('tarih', bugun)
        .maybeSingle()
    : { data: null }

  // Önceki dönem bilgisi
  const oncekiDonemler = (tumDonemler ?? []).filter(d => d.id !== hedefDonem.id)
  const oncekiDonem = oncekiDonemler[0] ?? null

  let onceki_cuz_no: number | null = null
  let onceki_okuma_sayisi = 0

  if (oncekiDonem) {
    const { data: oncekiAtama } = await supabase
      .from('donem_atamalari')
      .select('cuz_no')
      .eq('kullanici_id', kullanici_id)
      .eq('donem_id', oncekiDonem.id)
      .maybeSingle()

    onceki_cuz_no = oncekiAtama?.cuz_no ?? null

    const { count: oncekiOkuma } = await supabase
      .from('okuma_kayitlari')
      .select('*', { count: 'exact', head: true })
      .eq('kullanici_id', kullanici_id)
      .gte('tarih', oncekiDonem.baslangic_tarihi)
      .lte('tarih', oncekiDonem.bitis_tarihi)

    onceki_okuma_sayisi = oncekiOkuma ?? 0
  }

  return NextResponse.json({
    donem: hedefDonem,
    aktif,
    sonraki_bas,
    cuz_no: atama?.cuz_no ?? null,
    okuma_sayisi: okuma_sayisi ?? 0,
    bugun_okundu: !!bugun_kaydi,
    bugun_okunma_saati: bugun_kaydi?.okunma_saati ?? null,
    onceki_donem: oncekiDonem,
    onceki_cuz_no,
    onceki_okuma_sayisi,
  })
}
