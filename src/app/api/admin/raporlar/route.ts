import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

function bugunTR() {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Istanbul' }).format(new Date())
}

function buAyBaslangic() {
  const now = new Date(new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Istanbul' }).format(new Date()))
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
}

// En uzun kesintisiz okuma serisi
function enUzunSeri(tarihler: string[]): number {
  if (!tarihler.length) return 0
  const sirali = [...tarihler].sort()
  let maks = 1, simdiki = 1
  for (let i = 1; i < sirali.length; i++) {
    const fark = (new Date(sirali[i]).getTime() - new Date(sirali[i - 1]).getTime()) / 86400000
    if (fark === 1) { simdiki++; maks = Math.max(maks, simdiki) }
    else simdiki = 1
  }
  return maks
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const tip = searchParams.get('tip') // kpi | matris | turlar
  const grup_id = searchParams.get('grup_id')
  const donem_id = searchParams.get('donem_id')

  const supabase = await createClient()
  const bugun = bugunTR()

  // --- KPI ---
  if (tip === 'kpi') {
    // Bugün toplam okuma oranı
    const { count: bugun_okuyan } = await supabase
      .from('okuma_kayitlari')
      .select('*', { count: 'exact', head: true })
      .eq('tarih', bugun)

    const { count: toplam_aktif_uye } = await supabase
      .from('kullanicilar')
      .select('*', { count: 'exact', head: true })
      .eq('aktif', true)
      .eq('kullanici_tipi', 'Uye')

    // Aktif tur sayısı
    const { count: aktif_tur } = await supabase
      .from('donemler')
      .select('*', { count: 'exact', head: true })
      .lte('baslangic_tarihi', bugun)
      .gte('bitis_tarihi', bugun)

    // Bu ay biten turlar
    const { count: bu_ay_biten } = await supabase
      .from('donemler')
      .select('*', { count: 'exact', head: true })
      .gte('bitis_tarihi', buAyBaslangic())
      .lt('bitis_tarihi', bugun)

    // En uzun seri sahibi
    const { data: tumOkumalar } = await supabase
      .from('okuma_kayitlari')
      .select('kullanici_id, tarih')

    const { data: tumUyeler } = await supabase
      .from('kullanicilar')
      .select('id, ad_soyad')
      .eq('aktif', true)
      .eq('kullanici_tipi', 'Uye')

    let enUzunKisi = ''
    let enUzunGun = 0

    if (tumOkumalar && tumUyeler) {
      const uyelMap = new Map(tumUyeler.map(u => [u.id, u.ad_soyad]))
      const okumaGruplari = new Map<string, string[]>()
      for (const o of tumOkumalar) {
        if (!okumaGruplari.has(o.kullanici_id)) okumaGruplari.set(o.kullanici_id, [])
        okumaGruplari.get(o.kullanici_id)!.push(o.tarih)
      }
      for (const [uid, tarihler] of okumaGruplari) {
        const seri = enUzunSeri(tarihler)
        if (seri > enUzunGun) { enUzunGun = seri; enUzunKisi = uyelMap.get(uid) ?? '' }
      }
    }

    return NextResponse.json({
      bugun_okuyan: bugun_okuyan ?? 0,
      toplam_aktif_uye: toplam_aktif_uye ?? 0,
      aktif_tur: aktif_tur ?? 0,
      bu_ay_biten: bu_ay_biten ?? 0,
      en_uzun_seri: { kisi: enUzunKisi, gun: enUzunGun },
    })
  }

  // --- GEÇMİŞ TUR MATRİSİ ---
  if (tip === 'matris' && grup_id && donem_id) {
    const { data: donem } = await supabase
      .from('donemler')
      .select('*')
      .eq('id', donem_id)
      .single()

    if (!donem) return NextResponse.json({ hata: 'Dönem bulunamadı.' }, { status: 404 })

    const { data: atamalar } = await supabase
      .from('donem_atamalari')
      .select('kullanici_id, cuz_no, kullanicilar(ad_soyad)')
      .eq('donem_id', donem_id)

    const uye_idler = (atamalar ?? []).map(a => a.kullanici_id)

    const { data: okumalar } = await supabase
      .from('okuma_kayitlari')
      .select('kullanici_id, tarih')
      .in('kullanici_id', uye_idler)
      .gte('tarih', donem.baslangic_tarihi)
      .lte('tarih', donem.bitis_tarihi)

    const okumaSet = new Set((okumalar ?? []).map(o => `${o.kullanici_id}_${o.tarih}`))

    // 30 günlük tarih listesi
    const gunler: string[] = []
    const bas = new Date(donem.baslangic_tarihi)
    for (let i = 0; i < 30; i++) {
      const t = new Date(bas)
      t.setDate(t.getDate() + i)
      gunler.push(t.toISOString().split('T')[0])
    }

    const satirlar = (atamalar ?? []).map(a => ({
      kullanici_id: a.kullanici_id,
      ad_soyad: (a.kullanicilar as unknown as { ad_soyad: string } | null)?.ad_soyad ?? '',
      cuz_no: a.cuz_no,
      gunler: gunler.map(g => ({ tarih: g, okudu: okumaSet.has(`${a.kullanici_id}_${g}`) })),
      toplam: gunler.filter(g => okumaSet.has(`${a.kullanici_id}_${g}`)).length,
    })).sort((a, b) => a.cuz_no - b.cuz_no)

    return NextResponse.json({ donem, gunler, satirlar })
  }

  // --- TÜM DÖNEMLER (matris dropdown için) ---
  if (tip === 'donemler' && grup_id) {
    const { data: donemler } = await supabase
      .from('donemler')
      .select('id, tur_no, baslangic_tarihi, bitis_tarihi')
      .eq('grup_id', grup_id)
      .order('tur_no', { ascending: false })
    return NextResponse.json({ donemler: donemler ?? [] })
  }

  // --- TAMAMLANAN TURLAR ---
  if (tip === 'turlar' && grup_id) {
    const { data: donemler } = await supabase
      .from('donemler')
      .select('*')
      .eq('grup_id', grup_id)
      .lt('bitis_tarihi', bugun)
      .order('tur_no', { ascending: false })

    if (!donemler?.length) return NextResponse.json({ turlar: [] })

    const turlar = await Promise.all(donemler.map(async d => {
      const { data: atamalar } = await supabase
        .from('donem_atamalari')
        .select('kullanici_id')
        .eq('donem_id', d.id)

      const uye_sayisi = atamalar?.length ?? 0
      const mumkun_okuma = uye_sayisi * 30

      const uye_idler = (atamalar ?? []).map(a => a.kullanici_id)
      const { count: gerceklesen } = await supabase
        .from('okuma_kayitlari')
        .select('*', { count: 'exact', head: true })
        .in('kullanici_id', uye_idler)
        .gte('tarih', d.baslangic_tarihi)
        .lte('tarih', d.bitis_tarihi)

      const tamamlanma = mumkun_okuma > 0
        ? Math.round(((gerceklesen ?? 0) / mumkun_okuma) * 100)
        : 0

      return {
        ...d,
        uye_sayisi,
        tamamlanma_yuzdesi: tamamlanma,
      }
    }))

    return NextResponse.json({ turlar })
  }

  return NextResponse.json({ hata: 'Geçersiz tip.' }, { status: 400 })
}
