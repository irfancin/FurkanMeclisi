import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

function bugunTR() {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Istanbul' }).format(new Date())
}

export async function POST(req: NextRequest) {
  const { grup_id, uyeler } = await req.json()
  // uyeler: Array<{ ad_soyad: string; tel_no: string }>

  if (!grup_id || !Array.isArray(uyeler) || uyeler.length === 0) {
    return NextResponse.json({ hata: 'Eksik parametre.' }, { status: 400 })
  }

  const supabase = await createClient()
  const bugun = bugunTR()

  // Aktif dönem
  const { data: donem } = await supabase
    .from('donemler')
    .select('id')
    .eq('grup_id', grup_id)
    .lte('baslangic_tarihi', bugun)
    .gte('bitis_tarihi', bugun)
    .maybeSingle()

  // Mevcut cüz atamaları
  let atananCuzler: number[] = []
  if (donem) {
    const { data } = await supabase
      .from('donem_atamalari')
      .select('cuz_no')
      .eq('donem_id', donem.id)
    atananCuzler = (data ?? []).map(a => a.cuz_no)
  }
  const atananSet = new Set(atananCuzler)

  let eklenen = 0
  let atlanan = 0
  const atlanenlar: string[] = []

  for (const uye of uyeler) {
    const tel = String(uye.tel_no).replace(/\D/g, '')
    const ad = String(uye.ad_soyad).trim()
    if (!tel || !ad) { atlanan++; continue }

    // Tekrar kontrolü
    const { data: mevcut } = await supabase
      .from('kullanicilar')
      .select('id')
      .eq('tel_no', tel)
      .eq('aktif', true)
      .maybeSingle()

    if (mevcut) { atlanan++; atlanenlar.push(ad); continue }

    // Üye ekle
    const { data: yeni, error } = await supabase
      .from('kullanicilar')
      .insert({ tel_no: tel, ad_soyad: ad, grup_id, kullanici_tipi: 'Uye' })
      .select('id')
      .single()

    if (error || !yeni) { atlanan++; continue }

    // Cüz ataması
    if (donem) {
      let cuz_no: number | null = null
      for (let i = 1; i <= 30; i++) {
        if (!atananSet.has(i)) { cuz_no = i; break }
      }
      if (cuz_no) {
        await supabase.from('donem_atamalari').insert({
          kullanici_id: yeni.id,
          donem_id: donem.id,
          cuz_no,
        })
        atananSet.add(cuz_no)
      }
    }
    eklenen++
  }

  return NextResponse.json({ eklenen, atlanan, atlanenlar })
}
