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

  // Aktif dönemi ara
  const { data: donem } = await supabase
    .from('donemler')
    .select('*')
    .eq('grup_id', grup_id)
    .lte('baslangic_tarihi', bugun)
    .gte('bitis_tarihi', bugun)
    .single()

  // Tur arası: aktif dönem yok, en son dönemi getir
  if (!donem) {
    const { data: sonDonem } = await supabase
      .from('donemler')
      .select('*')
      .eq('grup_id', grup_id)
      .order('tur_no', { ascending: false })
      .limit(1)
      .single()

    if (!sonDonem) {
      return NextResponse.json({ hata: 'Bu grup için dönem bulunamadı.' }, { status: 404 })
    }

    const yeniBas = new Date(sonDonem.bitis_tarihi)
    yeniBas.setDate(yeniBas.getDate() + 15)

    const { count: uye_sayisi } = await supabase
      .from('kullanicilar')
      .select('*', { count: 'exact', head: true })
      .eq('grup_id', grup_id)
      .eq('aktif', true)
      .eq('kullanici_tipi', 'Uye')

    return NextResponse.json({
      donem: sonDonem,
      aktif: false,
      sonraki_bas: yeniBas.toISOString().split('T')[0],
      uyeler: [],
      okuyanlar: 0,
      toplam: uye_sayisi ?? 0,
      gun_no: 30,
      toplam_gun: 30,
      eksik_top3: [],
    })
  }

  // Aktif dönem var
  const { data: uyeler } = await supabase
    .from('kullanicilar')
    .select('id, ad_soyad, tel_no')
    .eq('grup_id', grup_id)
    .eq('aktif', true)
    .eq('kullanici_tipi', 'Uye')
    .order('ad_soyad')

  if (!uyeler || uyeler.length === 0) {
    return NextResponse.json({ donem, aktif: true, uyeler: [], okuyanlar: 0, toplam: 0, gun_no: 1, toplam_gun: 30, eksik_top3: [] })
  }

  const uye_idler = uyeler.map(u => u.id)

  // Cüz atamaları — kullanici başına birden fazla olabilir
  const { data: atamalar } = await supabase
    .from('donem_atamalari')
    .select('kullanici_id, cuz_no')
    .in('kullanici_id', uye_idler)
    .eq('donem_id', donem.id)
    .order('cuz_no')

  // Bugünkü okuma kayıtları (cüz bazlı)
  const { data: bugun_okumalar } = await supabase
    .from('okuma_kayitlari')
    .select('kullanici_id, cuz_no')
    .in('kullanici_id', uye_idler)
    .eq('tarih', bugun)

  // Set: "kullanici_id_cuz_no" → bugün okundu mu?
  const okunanSet = new Set((bugun_okumalar ?? []).map(o => `${o.kullanici_id}_${o.cuz_no}`))

  // Liste: her (kullanıcı × cüz) çifti için bir satır
  const uyeMap = new Map(uyeler.map(u => [u.id, u]))
  const liste = (atamalar ?? []).map(a => {
    const u = uyeMap.get(a.kullanici_id)!
    return {
      id: a.kullanici_id,
      ad_soyad: u.ad_soyad,
      tel_no: u.tel_no,
      cuz_no: a.cuz_no,
      okudu: okunanSet.has(`${a.kullanici_id}_${a.cuz_no}`),
    }
  })

  const basMs = new Date(donem.baslangic_tarihi).getTime()
  const bugunMs = new Date(bugun).getTime()
  const gun_no = Math.min(Math.floor((bugunMs - basMs) / (1000 * 60 * 60 * 24)) + 1, 30)
  const gecen_gun = Math.max(gun_no, 1)

  // Eksik gün hesabı: kullanıcı bazlı, distinct tarih sayısına göre
  const { data: tumOkumalar } = await supabase
    .from('okuma_kayitlari')
    .select('kullanici_id, tarih')
    .in('kullanici_id', uye_idler)
    .gte('tarih', donem.baslangic_tarihi)
    .lte('tarih', bugun)

  // Her kullanıcı için distinct okunan gün sayısı
  const okumaTarihPerUser = new Map<string, Set<string>>()
  for (const o of tumOkumalar ?? []) {
    if (!okumaTarihPerUser.has(o.kullanici_id)) okumaTarihPerUser.set(o.kullanici_id, new Set())
    okumaTarihPerUser.get(o.kullanici_id)!.add(o.tarih)
  }

  const eksik_top3 = uyeler
    .map(u => ({
      ad_soyad: u.ad_soyad,
      eksik_gun: gecen_gun - (okumaTarihPerUser.get(u.id)?.size ?? 0),
    }))
    .filter(u => u.eksik_gun > 0)
    .sort((a, b) => b.eksik_gun - a.eksik_gun)
    .slice(0, 3)

  return NextResponse.json({
    donem,
    aktif: true,
    uyeler: liste,
    okuyanlar: okunanSet.size,
    toplam: liste.length,
    gun_no,
    toplam_gun: 30,
    eksik_top3,
  })
}
