import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

function bugunTR() {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Istanbul' }).format(new Date())
}

// Grupta dönem içinde atanmamış ilk cüzü bul
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

  const { data: uyeler } = await supabase
    .from('kullanicilar')
    .select('id, ad_soyad, tel_no, kullanici_tipi, aktif, created_at')
    .eq('grup_id', grup_id)
    .order('ad_soyad')

  // En son dönem
  const { data: donem } = await supabase
    .from('donemler')
    .select('id, tur_no')
    .eq('grup_id', grup_id)
    .order('tur_no', { ascending: false })
    .limit(1)
    .maybeSingle()

  // Cüz atamaları — kullanıcı başına birden fazla olabilir
  const atamaMap = new Map<string, number[]>()
  if (donem) {
    const { data: atamalar } = await supabase
      .from('donem_atamalari')
      .select('kullanici_id, cuz_no')
      .eq('donem_id', donem.id)
      .order('cuz_no')
    for (const a of atamalar ?? []) {
      if (!atamaMap.has(a.kullanici_id)) atamaMap.set(a.kullanici_id, [])
      atamaMap.get(a.kullanici_id)!.push(a.cuz_no)
    }
  }

  const liste = (uyeler ?? []).map(u => ({
    ...u,
    cuz_lar: atamaMap.get(u.id) ?? [],
    tur_no: donem?.tur_no ?? null,
  }))

  return NextResponse.json({ uyeler: liste })
}

// Yeni üye ekle
export async function POST(req: NextRequest) {
  const { tel_no, ad_soyad, grup_id, kullanici_tipi = 'Uye', cuz_lar } = await req.json()
  if (!tel_no || !ad_soyad || !grup_id) {
    return NextResponse.json({ hata: 'Tüm alanlar zorunlu.' }, { status: 400 })
  }

  const supabase = await createClient()

  const { data: mevcut } = await supabase
    .from('kullanicilar')
    .select('id, ad_soyad, gruplar(grup_adi)')
    .eq('tel_no', tel_no)
    .eq('grup_id', grup_id)
    .eq('aktif', true)
    .maybeSingle()

  if (mevcut) {
    const grupAdi = (mevcut as { gruplar?: { grup_adi?: string } }).gruplar?.grup_adi ?? 'başka bir grupta'
    return NextResponse.json({
      hata: `Bu telefon numarası ${grupAdi} grubunda ${(mevcut as { ad_soyad: string }).ad_soyad} olarak kayıtlı.`
    }, { status: 409 })
  }

  const { data: yeniUye, error } = await supabase
    .from('kullanicilar')
    .insert({ tel_no, ad_soyad, grup_id, kullanici_tipi })
    .select('id')
    .single()

  if (error || !yeniUye) {
    return NextResponse.json({ hata: 'Üye eklenemedi.' }, { status: 500 })
  }

  // Cüz ataması (yalnızca Hatim grubundaki Uye için)
  if (kullanici_tipi === 'Uye') {
    const { data: grup } = await supabase
      .from('gruplar')
      .select('grup_tipi')
      .eq('id', grup_id)
      .single()

    if ((grup?.grup_tipi ?? 'Hatim') === 'Hatim') {
      const { data: donem } = await supabase
        .from('donemler')
        .select('id')
        .eq('grup_id', grup_id)
        .order('tur_no', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (donem) {
        const istenenCuzler: number[] = Array.isArray(cuz_lar)
          ? cuz_lar.filter((n: number) => Number.isInteger(n) && n >= 1 && n <= 30)
          : []

        if (istenenCuzler.length > 0) {
          // Talep edilen cüzleri ata (müsait olanları)
          const { data: mevcutAtamalar } = await supabase
            .from('donem_atamalari')
            .select('cuz_no')
            .eq('donem_id', donem.id)
          const atananSet = new Set((mevcutAtamalar ?? []).map(a => a.cuz_no))

          for (const cuz of istenenCuzler) {
            if (!atananSet.has(cuz)) {
              await supabase.from('donem_atamalari').insert({
                kullanici_id: yeniUye.id,
                donem_id: donem.id,
                cuz_no: cuz,
              })
              atananSet.add(cuz)
            }
          }
        } else {
          // Otomatik: ilk müsait cüzü ata
          const atanacak = await musaitCuzBul(supabase, donem.id)
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
  }

  return NextResponse.json({ basarili: true })
}

// Üye güncelle
export async function PATCH(req: NextRequest) {
  const { id, ad_soyad, tel_no, kullanici_tipi, cuz_lar, grup_id } = await req.json()
  if (!id) return NextResponse.json({ hata: 'Eksik parametre.' }, { status: 400 })

  const supabase = await createClient()

  if (tel_no) {
    const { data: mevcut } = await supabase
      .from('kullanicilar')
      .select('id, ad_soyad, gruplar(grup_adi)')
      .eq('tel_no', tel_no)
      .eq('grup_id', grup_id)
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

  // Cüz güncellemesi — tam değiştirme (mevcut cüzleri sil, yenilerini ekle)
  if (cuz_lar !== undefined && grup_id) {
    const cuzListesi: number[] = Array.isArray(cuz_lar)
      ? cuz_lar.filter((n: number) => Number.isInteger(n) && n >= 1 && n <= 30)
      : []

    const { data: donem } = await supabase
      .from('donemler')
      .select('id')
      .eq('grup_id', grup_id)
      .order('tur_no', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (donem) {
      // Mevcut atamaları sil
      await supabase
        .from('donem_atamalari')
        .delete()
        .eq('kullanici_id', id)
        .eq('donem_id', donem.id)

      // Yeni atamaları ekle
      if (cuzListesi.length > 0) {
        await supabase.from('donem_atamalari').insert(
          cuzListesi.map(cuz_no => ({ kullanici_id: id, donem_id: donem.id, cuz_no }))
        )
      }
    }
  }

  return NextResponse.json({ basarili: true })
}

// Üye sil (soft delete)
export async function DELETE(req: NextRequest) {
  const { id } = await req.json()
  if (!id) return NextResponse.json({ hata: 'Eksik parametre.' }, { status: 400 })

  const supabase = await createClient()
  const bugun = bugunTR()

  // Aktif dönem bilgisi için önce grup_id al
  const { data: kullanici } = await supabase
    .from('kullanicilar')
    .select('grup_id')
    .eq('id', id)
    .maybeSingle()

  const { error } = await supabase.from('kullanicilar').update({ aktif: false }).eq('id', id)
  if (error) return NextResponse.json({ hata: 'Silme işlemi başarısız.' }, { status: 500 })

  if (kullanici?.grup_id) {
    const { data: aktifDonem } = await supabase
      .from('donemler')
      .select('id, bitis_tarihi')
      .eq('grup_id', kullanici.grup_id)
      .lte('baslangic_tarihi', bugun)
      .gte('bitis_tarihi', bugun)
      .maybeSingle()

    if (aktifDonem) {
      // Cüz atamasını serbest bırak
      await supabase
        .from('donem_atamalari')
        .delete()
        .eq('kullanici_id', id)
        .eq('donem_id', aktifDonem.id)

      // Henüz okunmamış (gelecek tarihli) kayıtları sil; geçmiş okuma geçmişi korunur
      await supabase
        .from('okuma_kayitlari')
        .delete()
        .eq('kullanici_id', id)
        .gt('tarih', bugun)
        .lte('tarih', aktifDonem.bitis_tarihi)
    }
  }

  return NextResponse.json({ basarili: true })
}
