import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Geçici debug endpoint — Zikir okuma kayıtlarını teşhis eder
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const grup_id = searchParams.get('grup_id')

  if (!grup_id) return NextResponse.json({ hata: 'grup_id gerekli' }, { status: 400 })

  const supabase = await createClient()

  // 1. Grup bilgisi
  const { data: grup } = await supabase
    .from('gruplar')
    .select('id, grup_adi, grup_tipi')
    .eq('id', grup_id)
    .single()

  // 2. Aktif üyeler
  const { data: uyeler } = await supabase
    .from('kullanicilar')
    .select('id, ad_soyad, aktif, kullanici_tipi')
    .eq('grup_id', grup_id)
    .eq('aktif', true)
    .eq('kullanici_tipi', 'Uye')

  const uye_idler = (uyeler ?? []).map(u => u.id)

  // 3. Dönemler
  const { data: donemler } = await supabase
    .from('donemler')
    .select('id, tur_no, baslangic_tarihi, bitis_tarihi')
    .eq('grup_id', grup_id)
    .order('tur_no', { ascending: false })

  // 4. Bu üyelerin TÜM okuma kayıtları (tarih filtresi yok)
  const { data: okumalar, error: okumaHata } = uye_idler.length > 0
    ? await supabase
        .from('okuma_kayitlari')
        .select('kullanici_id, tarih, cuz_no')
        .in('kullanici_id', uye_idler)
        .order('tarih', { ascending: false })
        .limit(20)
    : { data: [], error: null }

  // 5. Toplam okuma sayısı
  const { count: toplamOkuma } = uye_idler.length > 0
    ? await supabase
        .from('okuma_kayitlari')
        .select('*', { count: 'exact', head: true })
        .in('kullanici_id', uye_idler)
    : { count: 0 }

  // 6. Donem_atamalari var mı?
  const { count: atamaSayisi } = donemler?.[0]
    ? await supabase
        .from('donem_atamalari')
        .select('*', { count: 'exact', head: true })
        .eq('donem_id', donemler[0].id)
    : { count: 0 }

  return NextResponse.json({
    grup,
    uye_sayisi: uye_idler.length,
    uyeler: (uyeler ?? []).map(u => ({ id: u.id.slice(0, 8) + '...', ad_soyad: u.ad_soyad })),
    donemler,
    toplam_okuma_kaydi: toplamOkuma ?? 0,
    son_20_okuma: okumalar ?? [],
    okuma_sorgu_hatasi: okumaHata?.message ?? null,
    son_donem_atama_sayisi: atamaSayisi ?? 0,
  })
}
