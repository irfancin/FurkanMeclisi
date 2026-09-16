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

  // Grup tipini belirle
  const { data: grup } = await supabase
    .from('gruplar')
    .select('grup_tipi, grup_adi')
    .eq('id', grup_id)
    .single()

  // ── ZİKİR GRUBU ───────────────────────────────────────────────
  if (grup?.grup_tipi === 'Zikir') {
    const { data: zikirDonem } = await supabase
      .from('donemler')
      .select('*')
      .eq('grup_id', grup_id)
      .lte('baslangic_tarihi', bugun)
      .gte('bitis_tarihi', bugun)
      .single()

    const { data: zikirTumDonemler } = await supabase
      .from('donemler')
      .select('id, tur_no, baslangic_tarihi, bitis_tarihi')
      .eq('grup_id', grup_id)
      .order('tur_no', { ascending: false })
      .limit(1)

    const zikirHedef = zikirDonem ?? (zikirTumDonemler?.[0] ?? null)
    const zikirAktif = !!zikirDonem

    if (!zikirHedef) {
      return NextResponse.json({ hata: 'Grubunuz için dönem bulunamadı.' }, { status: 404 })
    }

    if (!zikirAktif) {
      const d = new Date(zikirHedef.bitis_tarihi)
      d.setDate(d.getDate() + 15)
      return NextResponse.json({
        grup_tipi: 'Zikir',
        aktif: false,
        donem: zikirHedef,
        sonraki_bas: d.toISOString().split('T')[0],
      })
    }

    const { data: kayit } = await supabase
      .from('okuma_kayitlari')
      .select('okunma_saati')
      .eq('kullanici_id', kullanici_id)
      .eq('tarih', bugun)
      .eq('cuz_no', 0)
      .maybeSingle()

    return NextResponse.json({
      grup_tipi: 'Zikir',
      aktif: true,
      donem: zikirHedef,
      bugun_tamamlandi: !!kayit,
      bugun_tamamlanma_saati: (kayit as { okunma_saati?: string } | null)?.okunma_saati ?? null,
    })
  }

  // ── HATİM GRUBU ───────────────────────────────────────────────
  const { data: donem } = await supabase
    .from('donemler')
    .select('*')
    .eq('grup_id', grup_id)
    .lte('baslangic_tarihi', bugun)
    .gte('bitis_tarihi', bugun)
    .single()

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

  let sonraki_bas: string | null = null
  if (!aktif) {
    const d = new Date(hedefDonem.bitis_tarihi)
    d.setDate(d.getDate() + 15)
    sonraki_bas = d.toISOString().split('T')[0]
  }

  const { data: atamalar } = await supabase
    .from('donem_atamalari')
    .select('cuz_no')
    .eq('kullanici_id', kullanici_id)
    .eq('donem_id', hedefDonem.id)
    .order('cuz_no')

  const cuz_listesi = (atamalar ?? []).map(a => a.cuz_no as number)

  const { data: donem_okumalar } = await supabase
    .from('okuma_kayitlari')
    .select('cuz_no, tarih, okunma_saati')
    .eq('kullanici_id', kullanici_id)
    .gte('tarih', hedefDonem.baslangic_tarihi)
    .lte('tarih', hedefDonem.bitis_tarihi)

  const bugun_okumalar = aktif ? (donem_okumalar ?? []).filter(o => o.tarih === bugun) : []

  const cuzler = cuz_listesi.map(cuz_no => {
    const okunan_gun = (donem_okumalar ?? []).filter(o => o.cuz_no === cuz_no).length
    const bugun_kaydi = bugun_okumalar.find(o => o.cuz_no === cuz_no) ?? null
    return {
      cuz_no,
      okunan_gun,
      bugun_okundu: !!bugun_kaydi,
      bugun_okunma_saati: (bugun_kaydi as { okunma_saati?: string } | null)?.okunma_saati ?? null,
    }
  })

  const oncekiDonemler = (tumDonemler ?? []).filter(d => d.id !== hedefDonem.id)
  const oncekiDonem = oncekiDonemler[0] ?? null
  let onceki_cuzler: { cuz_no: number; okunan_gun: number }[] = []

  if (oncekiDonem) {
    const { data: oncekiAtamalar } = await supabase
      .from('donem_atamalari')
      .select('cuz_no')
      .eq('kullanici_id', kullanici_id)
      .eq('donem_id', oncekiDonem.id)
      .order('cuz_no')

    const { data: oncekiOkumalar } = await supabase
      .from('okuma_kayitlari')
      .select('cuz_no')
      .eq('kullanici_id', kullanici_id)
      .gte('tarih', oncekiDonem.baslangic_tarihi)
      .lte('tarih', oncekiDonem.bitis_tarihi)

    onceki_cuzler = (oncekiAtamalar ?? []).map(a => ({
      cuz_no: a.cuz_no as number,
      okunan_gun: (oncekiOkumalar ?? []).filter(o => o.cuz_no === a.cuz_no).length,
    }))
  }

  return NextResponse.json({
    grup_tipi: 'Hatim',
    donem: hedefDonem,
    aktif,
    sonraki_bas,
    cuzler,
    onceki_donem: oncekiDonem,
    onceki_cuzler,
  })
}
