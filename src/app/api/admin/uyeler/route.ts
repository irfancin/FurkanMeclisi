import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

function bugunTR() {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Istanbul' }).format(new Date())
}

// Grupta aktif dönem için en küçük müsait cüz numarası
async function musaitCuzBul(supabase: Awaited<ReturnType<typeof import('@/lib/supabase/server').createClient>>, donem_id: string): Promise<number | null> {
  const { data } = await supabase
    .from('donem_atamalari')
    .select('cuz_no')
    .eq('donem_id', donem_id)
  const atananlar = new Set((data ?? []).map(a => a.cuz_no))
  for (let i = 1; i <= 30; i++) {
    if (!atananlar.has(i)) return i
  }
  return null
}

// Grup üyelerini listele
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const grup_id = searchParams.get('grup_id')
  if (!grup_id) return NextResponse.json({ hata: 'Eksik parametre.' }, { status: 400 })

  const supabase = await createClient()
  const bugun = bugunTR()

  const { data: uyeler } = await supabase
    .from('kullanicilar')
    .select('id, ad_soyad, tel_no, kullanici_tipi, aktif, created_at')
    .eq('grup_id', grup_id)
    .order('ad_soyad')

  // Aktif dönem
  const { data: donem } = await supabase
    .from('donemler')
    .select('id, tur_no')
    .eq('grup_id', grup_id)
    .lte('baslangic_tarihi', bugun)
    .gte('bitis_tarihi', bugun)
    .maybeSingle()

  // Cüz atamaları
  let atamaMap = new Map<string, number>()
  if (donem) {
    const { data: atamalar } = await supabase
      .from('donem_atamalari')
      .select('kullanici_id, cuz_no')
      .eq('donem_id', donem.id)
    atamaMap = new Map((atamalar ?? []).map(a => [a.kullanici_id, a.cuz_no]))
  }

  const liste = (uyeler ?? []).map(u => ({
    ...u,
    cuz_no: atamaMap.get(u.id) ?? null,
    tur_no: donem?.tur_no ?? null,
  }))

  return NextResponse.json({ uyeler: liste })
}

// Yeni üye ekle
export async function POST(req: NextRequest) {
  const { tel_no, ad_soyad, grup_id, kullanici_tipi = 'Uye', cuz_no } = await req.json()
  if (!tel_no || !ad_soyad || !grup_id) {
    return NextResponse.json({ hata: 'Tüm alanlar zorunlu.' }, { status: 400 })
  }

  const supabase = await createClient()

  // Telefon no tekrar kontrolü (aktif kullanıcılar)
  const { data: mevcut } = await supabase
    .from('kullanicilar')
    .select('id, ad_soyad, gruplar(grup_adi)')
    .eq('tel_no', tel_no)
    .eq('aktif', true)
    .maybeSingle()

  if (mevcut) {
    const grupAdi = (mevcut as { gruplar?: { grup_adi?: string } }).gruplar?.grup_adi ?? 'başka bir grupta'
    return NextResponse.json({
      hata: `Bu telefon numarası ${grupAdi} grubunda ${(mevcut as { ad_soyad: string }).ad_soyad} olarak kayıtlı.`
    }, { status: 409 })
  }

  // Kullanıcıyı ekle
  const { data: yeniUye, error } = await supabase
    .from('kullanicilar')
    .insert({ tel_no, ad_soyad, grup_id, kullanici_tipi })
    .select('id')
    .single()

  if (error || !yeniUye) {
    return NextResponse.json({ hata: 'Üye eklenemedi.' }, { status: 500 })
  }

  // Aktif dönemde cüz ataması yap (yalnızca Hatim grubundaki Uye için)
  if (kullanici_tipi === 'Uye') {
    const { data: grup } = await supabase
      .from('gruplar')
      .select('grup_tipi')
      .eq('id', grup_id)
      .single()

    if ((grup?.grup_tipi ?? 'Hatim') === 'Hatim') {
      const bugun = bugunTR()
      const { data: donem } = await supabase
        .from('donemler')
        .select('id')
        .eq('grup_id', grup_id)
        .lte('baslangic_tarihi', bugun)
        .gte('bitis_tarihi', bugun)
        .maybeSingle()

      if (donem) {
        // Gelen cüz_no geçerliyse ve müsaitse onu kullan, değilse otomatik ata
        const istenen = cuz_no && Number.isInteger(Number(cuz_no)) ? Number(cuz_no) : null
        let atanacak: number | null = null

        if (istenen && istenen >= 1 && istenen <= 30) {
          const { data: mevcut } = await supabase
            .from('donem_atamalari')
            .select('id')
            .eq('donem_id', donem.id)
            .eq('cuz_no', istenen)
            .maybeSingle()
          atanacak = mevcut ? await musaitCuzBul(supabase, donem.id) : istenen
        } else {
          atanacak = await musaitCuzBul(supabase, donem.id)
        }

        if (atanacak) {
          await supabase.from('donem_atamalari').insert({
            kullanici_id: yeniUye.id,
            donem_id: donem.id,
            cuz_no: atanacak,
          })
        }
      }
    }
  }

  return NextResponse.json({ basarili: true })
}

// Üye güncelle
export async function PATCH(req: NextRequest) {
  const { id, ad_soyad, tel_no, kullanici_tipi } = await req.json()
  if (!id) return NextResponse.json({ hata: 'Eksik parametre.' }, { status: 400 })

  const supabase = await createClient()

  // Telefon değişiyorsa tekrar kontrolü
  if (tel_no) {
    const { data: mevcut } = await supabase
      .from('kullanicilar')
      .select('id, ad_soyad, gruplar(grup_adi)')
      .eq('tel_no', tel_no)
      .eq('aktif', true)
      .neq('id', id)
      .maybeSingle()

    if (mevcut) {
      const grupAdi = (mevcut as { gruplar?: { grup_adi?: string } }).gruplar?.grup_adi ?? 'başka bir grupta'
      return NextResponse.json({
        hata: `Bu telefon numarası ${grupAdi} grubunda ${(mevcut as { ad_soyad: string }).ad_soyad} olarak kayıtlı.`
      }, { status: 409 })
    }
  }

  const guncelleme: Record<string, string> = {}
  if (ad_soyad) guncelleme.ad_soyad = ad_soyad
  if (tel_no) guncelleme.tel_no = tel_no
  if (kullanici_tipi) guncelleme.kullanici_tipi = kullanici_tipi

  const { error } = await supabase.from('kullanicilar').update(guncelleme).eq('id', id)
  if (error) return NextResponse.json({ hata: 'Güncelleme başarısız.' }, { status: 500 })

  return NextResponse.json({ basarili: true })
}

// Üye sil (soft delete)
export async function DELETE(req: NextRequest) {
  const { id } = await req.json()
  if (!id) return NextResponse.json({ hata: 'Eksik parametre.' }, { status: 400 })

  const supabase = await createClient()
  const { error } = await supabase.from('kullanicilar').update({ aktif: false }).eq('id', id)
  if (error) return NextResponse.json({ hata: 'Silme işlemi başarısız.' }, { status: 500 })

  return NextResponse.json({ basarili: true })
}
