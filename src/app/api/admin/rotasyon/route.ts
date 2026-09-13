import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Mevcut tur bilgisini getir
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const grup_id = searchParams.get('grup_id')
  if (!grup_id) return NextResponse.json({ hata: 'Eksik parametre.' }, { status: 400 })

  const supabase = await createClient()

  const { data: grup } = await supabase
    .from('gruplar')
    .select('grup_tipi')
    .eq('id', grup_id)
    .single()

  const { data: donem } = await supabase
    .from('donemler')
    .select('*')
    .eq('grup_id', grup_id)
    .order('tur_no', { ascending: false })
    .limit(1)
    .single()

  if (!donem) return NextResponse.json({ hata: 'Bu grup için dönem bulunamadı.' }, { status: 404 })

  const { count: uye_sayisi } = await supabase
    .from('kullanicilar')
    .select('*', { count: 'exact', head: true })
    .eq('grup_id', grup_id)
    .eq('aktif', true)
    .eq('kullanici_tipi', 'Uye')

  return NextResponse.json({
    donem,
    uye_sayisi: uye_sayisi ?? 0,
    grup_tipi: grup?.grup_tipi ?? 'Hatim',
  })
}

// Yeni tur başlat
export async function POST(req: NextRequest) {
  const { grup_id } = await req.json()
  if (!grup_id) return NextResponse.json({ hata: 'Eksik parametre.' }, { status: 400 })

  const supabase = await createClient()

  const { data: grup } = await supabase
    .from('gruplar')
    .select('grup_tipi')
    .eq('id', grup_id)
    .single()

  const isHatim = (grup?.grup_tipi ?? 'Hatim') === 'Hatim'

  const { data: sonDonem } = await supabase
    .from('donemler')
    .select('*')
    .eq('grup_id', grup_id)
    .order('tur_no', { ascending: false })
    .limit(1)
    .single()

  if (!sonDonem) return NextResponse.json({ hata: 'Dönem bulunamadı.' }, { status: 404 })

  // Yeni dönem tarihleri: bir önceki bitiş + 15 gün
  const yeniBas = new Date(sonDonem.bitis_tarihi)
  yeniBas.setDate(yeniBas.getDate() + 15)
  const yeniBit = new Date(yeniBas)
  yeniBit.setDate(yeniBit.getDate() + 29)

  const yeni_tur_no = sonDonem.tur_no + 1
  const baslangic_tarihi = yeniBas.toISOString().split('T')[0]
  const bitis_tarihi = yeniBit.toISOString().split('T')[0]

  const { data: yeniDonem, error: donemHata } = await supabase
    .from('donemler')
    .insert({ grup_id, tur_no: yeni_tur_no, baslangic_tarihi, bitis_tarihi })
    .select('id')
    .single()

  if (donemHata || !yeniDonem) {
    return NextResponse.json({ hata: 'Yeni dönem oluşturulamadı.' }, { status: 500 })
  }

  const { data: uyeler } = await supabase
    .from('kullanicilar')
    .select('id')
    .eq('grup_id', grup_id)
    .eq('aktif', true)
    .eq('kullanici_tipi', 'Uye')

  if (!uyeler || uyeler.length === 0) {
    return NextResponse.json({ basarili: true, yeni_tur_no, atanan: 0 })
  }

  if (!isHatim) {
    return NextResponse.json({ basarili: true, yeni_tur_no, atanan: 0 })
  }

  const uye_idler = uyeler.map(u => u.id)

  // Önceki dönemdeki TÜM atamalar — çoklu cüz desteği
  const { data: eskiAtamalar } = await supabase
    .from('donem_atamalari')
    .select('kullanici_id, cuz_no')
    .eq('donem_id', sonDonem.id)
    .in('kullanici_id', uye_idler)

  // Her kullanıcı için cüzler listesi (birden fazla olabilir)
  const eskiMap = new Map<string, number[]>()
  for (const a of eskiAtamalar ?? []) {
    if (!eskiMap.has(a.kullanici_id)) eskiMap.set(a.kullanici_id, [])
    eskiMap.get(a.kullanici_id)!.push(a.cuz_no)
  }

  // Her kullanıcının her cüzü için +1 kaydır (30 → 1)
  const yeniAtamalar: { kullanici_id: string; donem_id: string; cuz_no: number }[] = []
  for (const uid of uye_idler) {
    const eskiCuzler = eskiMap.get(uid)
    if (eskiCuzler && eskiCuzler.length > 0) {
      for (const eskiCuz of eskiCuzler) {
        yeniAtamalar.push({
          kullanici_id: uid,
          donem_id: yeniDonem.id,
          cuz_no: (eskiCuz % 30) + 1,
        })
      }
    } else {
      // Atama yoksa tek cüz ver (1)
      yeniAtamalar.push({ kullanici_id: uid, donem_id: yeniDonem.id, cuz_no: 1 })
    }
  }

  await supabase.from('donem_atamalari').insert(yeniAtamalar)

  return NextResponse.json({ basarili: true, yeni_tur_no, atanan: yeniAtamalar.length })
}
