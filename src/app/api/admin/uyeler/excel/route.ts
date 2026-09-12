import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

function bugunTR() {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Istanbul' }).format(new Date())
}

export async function POST(req: NextRequest) {
  const { grup_id, uyeler } = await req.json()
  // uyeler: Array<{ ad_soyad: string; tel_no: string; cuz_no?: number }>

  if (!grup_id || !Array.isArray(uyeler) || uyeler.length === 0) {
    return NextResponse.json({ hata: 'Eksik parametre.' }, { status: 400 })
  }

  const supabase = await createClient()
  const bugun = bugunTR()

  // Grubun tipi
  const { data: grup } = await supabase
    .from('gruplar')
    .select('grup_tipi')
    .eq('id', grup_id)
    .single()
  const isHatim = (grup?.grup_tipi ?? 'Hatim') === 'Hatim'

  // Aktif dönem
  const { data: donem } = await supabase
    .from('donemler')
    .select('id')
    .eq('grup_id', grup_id)
    .lte('baslangic_tarihi', bugun)
    .gte('bitis_tarihi', bugun)
    .maybeSingle()

  // Mevcut cüz atamaları (Hatim grubuysa)
  let atananCuzler: number[] = []
  if (donem && isHatim) {
    const { data } = await supabase
      .from('donem_atamalari')
      .select('cuz_no')
      .eq('donem_id', donem.id)
    atananCuzler = (data ?? []).map(a => a.cuz_no)
  }
  const atananSet = new Set(atananCuzler)

  let eklenen = 0
  const atlanenlar: { ad: string; sebep: string }[] = []
  const excelTelSet = new Set<string>() // Excel içi tekrar tespiti

  for (const uye of uyeler) {
    const tel = String(uye.tel_no).replace(/\D/g, '')
    const ad = String(uye.ad_soyad).trim()

    if (!ad) { atlanenlar.push({ ad: '(isimsiz satır)', sebep: 'Ad soyad boş' }); continue }
    if (!tel) { atlanenlar.push({ ad, sebep: 'Telefon numarası boş' }); continue }

    // Excel içinde aynı numara tekrarı
    if (excelTelSet.has(tel)) {
      atlanenlar.push({ ad, sebep: `Tel. no listede tekrarlıyor (${tel})` }); continue
    }
    excelTelSet.add(tel)

    // DB'de kayıtlı mı? (aktif veya pasif — tel_no unique constraint herkese geçerli)
    const { data: mevcut } = await supabase
      .from('kullanicilar')
      .select('id, ad_soyad, aktif, gruplar(grup_adi)')
      .eq('tel_no', tel)
      .maybeSingle()

    if (mevcut) {
      const grupAdi = (mevcut as { gruplar?: { grup_adi?: string } }).gruplar?.grup_adi ?? 'başka grupta'
      const durum = (mevcut as { aktif: boolean }).aktif ? '' : ' (pasif kayıt)'
      atlanenlar.push({ ad, sebep: `Zaten kayıtlı — ${grupAdi}${durum}` }); continue
    }

    // Üye ekle
    const { data: yeni, error } = await supabase
      .from('kullanicilar')
      .insert({ tel_no: tel, ad_soyad: ad, grup_id, kullanici_tipi: 'Uye' })
      .select('id')
      .single()

    if (error || !yeni) {
      atlanenlar.push({ ad, sebep: error?.message ?? 'Veritabanı hatası' }); continue
    }

    // Cüz ataması (yalnızca Hatim grubu)
    if (donem && isHatim) {
      // Excel'den gelen cüz no geçerliyse onu kullan, çakışıyorsa otomatik ata
      const istenenCuz = uye.cuz_no && Number.isInteger(Number(uye.cuz_no))
        ? Number(uye.cuz_no)
        : null

      let cuz_no: number | null = null

      if (istenenCuz && istenenCuz >= 1 && istenenCuz <= 30 && !atananSet.has(istenenCuz)) {
        cuz_no = istenenCuz
      } else {
        // İstenen cüz boş veya çakışıyor → ilk müsait cüzü ata
        for (let i = 1; i <= 30; i++) {
          if (!atananSet.has(i)) { cuz_no = i; break }
        }
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

  return NextResponse.json({ eklenen, atlanan: atlanenlar.length, atlanenlar })
}
