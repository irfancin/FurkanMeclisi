import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Istanbul tarihini YYYY-MM-DD olarak döndürür
function bugunTR() {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Istanbul' }).format(new Date())
}

// Tarihe n gün ekler, YYYY-MM-DD döndürür
function tarihEkle(tarih: string, gun: number): string {
  const d = new Date(tarih)
  d.setDate(d.getDate() + gun)
  return d.toISOString().split('T')[0]
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { kullanici_id, tarih_baslangic, gun_sayisi } = body as {
    kullanici_id: string
    tarih_baslangic: string
    gun_sayisi: number
  }

  if (!kullanici_id || !tarih_baslangic || !gun_sayisi) {
    return NextResponse.json({ hata: 'Eksik parametre.' }, { status: 400 })
  }
  if (gun_sayisi < 1 || gun_sayisi > 30) {
    return NextResponse.json({ hata: 'Gün sayısı 1-30 arasında olmalıdır.' }, { status: 400 })
  }

  const supabase = await createClient()

  // Kullanıcının grubunu bul
  const { data: kullanici } = await supabase
    .from('kullanicilar')
    .select('grup_id')
    .eq('id', kullanici_id)
    .single()

  if (!kullanici) {
    return NextResponse.json({ hata: 'Kullanıcı bulunamadı.' }, { status: 404 })
  }

  // Başlangıç tarihine göre aktif dönemi bul
  const { data: donem } = await supabase
    .from('donemler')
    .select('id, baslangic_tarihi, bitis_tarihi')
    .eq('grup_id', kullanici.grup_id)
    .lte('baslangic_tarihi', tarih_baslangic)
    .gte('bitis_tarihi', tarih_baslangic)
    .single()

  if (!donem) {
    return NextResponse.json({ hata: 'Seçilen tarihte aktif dönem bulunamadı.' }, { status: 404 })
  }

  // Üyenin bu dönemdeki tüm cüzlerini al
  const { data: atamalar } = await supabase
    .from('donem_atamalari')
    .select('cuz_no')
    .eq('kullanici_id', kullanici_id)
    .eq('donem_id', donem.id)

  let cuzListesi: { cuz_no: number }[] = atamalar ?? []
  if (cuzListesi.length === 0) {
    // Zikir grubunda donem_atamalari kullanılmaz; cuz_no=0 ile kaydedilir
    const { data: grup } = await supabase
      .from('gruplar').select('grup_tipi').eq('id', kullanici.grup_id).single()
    if (grup?.grup_tipi === 'Zikir') {
      cuzListesi = [{ cuz_no: 0 }]
    } else {
      return NextResponse.json({ hata: 'Bu üyenin dönem ataması bulunamadı.' }, { status: 404 })
    }
  }

  // Kayıt tarihlerini oluştur (dönem sonunu aşma)
  const tarihler: string[] = []
  for (let i = 0; i < gun_sayisi; i++) {
    const tarih = tarihEkle(tarih_baslangic, i)
    if (tarih > donem.bitis_tarihi) break
    tarihler.push(tarih)
  }

  if (tarihler.length === 0) {
    return NextResponse.json({ hata: 'Dönem bitiş tarihi aşıldı.' }, { status: 400 })
  }

  // (kullanici_id × cuz_no × tarih) kombinasyonlarını upsert et
  const kayitlar = tarihler.flatMap(tarih =>
    cuzListesi.map(a => ({
      kullanici_id,
      cuz_no: a.cuz_no,
      tarih,
    }))
  )

  const { error } = await supabase
    .from('okuma_kayitlari')
    .upsert(kayitlar, { onConflict: 'kullanici_id,tarih,cuz_no' })

  if (error) {
    return NextResponse.json({ hata: 'Kayıt sırasında hata oluştu.' }, { status: 500 })
  }

  return NextResponse.json({
    basarili: true,
    kaydedilen_gun: tarihler.length,
    kaydedilen_cuz: cuzListesi.length,
    toplam_kayit: kayitlar.length,
  })
}

// Üyenin aktif dönemini ve cüzlerini döndürür (form için)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const kullanici_id = searchParams.get('kullanici_id')

  if (!kullanici_id) {
    return NextResponse.json({ hata: 'Eksik parametre.' }, { status: 400 })
  }

  const supabase = await createClient()
  const bugun = bugunTR()

  const { data: kullanici } = await supabase
    .from('kullanicilar')
    .select('grup_id, ad_soyad')
    .eq('id', kullanici_id)
    .single()

  if (!kullanici) {
    return NextResponse.json({ hata: 'Kullanıcı bulunamadı.' }, { status: 404 })
  }

  // Aktif dönem (bugün itibarıyla)
  const { data: donem } = await supabase
    .from('donemler')
    .select('id, tur_no, baslangic_tarihi, bitis_tarihi')
    .eq('grup_id', kullanici.grup_id)
    .lte('baslangic_tarihi', bugun)
    .gte('bitis_tarihi', bugun)
    .single()

  if (!donem) {
    return NextResponse.json({ hata: 'Aktif dönem bulunamadı.' }, { status: 404 })
  }

  // Cüz atamaları
  const { data: atamalar } = await supabase
    .from('donem_atamalari')
    .select('cuz_no')
    .eq('kullanici_id', kullanici_id)
    .eq('donem_id', donem.id)
    .order('cuz_no')

  // Zikir grubu kontrolü — cüz ataması olmayanlarda grup tipini kontrol et
  let isZikir = false
  if (!atamalar || atamalar.length === 0) {
    const { data: grup } = await supabase
      .from('gruplar').select('grup_tipi').eq('id', kullanici.grup_id).single()
    isZikir = grup?.grup_tipi === 'Zikir'
  }

  // Bugüne kadar kaç gün okundu (distinct tarih)
  const { data: okunanlar } = await supabase
    .from('okuma_kayitlari')
    .select('tarih')
    .eq('kullanici_id', kullanici_id)
    .gte('tarih', donem.baslangic_tarihi)
    .lte('tarih', donem.bitis_tarihi)

  const okunanGunler = new Set((okunanlar ?? []).map(o => o.tarih))

  return NextResponse.json({
    donem,
    cuz_lar: (atamalar ?? []).map(a => a.cuz_no),
    okunan_gun: okunanGunler.size,
    bugun,
    zikir: isZikir,
  })
}
