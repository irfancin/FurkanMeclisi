import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Sonraki tur cüz listesini simüle eder — DB'ye hiçbir şey yazmaz
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const grup_id = searchParams.get('grup_id')
  if (!grup_id) return NextResponse.json({ hata: 'Eksik parametre.' }, { status: 400 })

  const supabase = await createClient()

  const { data: grup } = await supabase
    .from('gruplar')
    .select('grup_adi, grup_tipi')
    .eq('id', grup_id)
    .single()

  if (!grup) return NextResponse.json({ hata: 'Grup bulunamadı.' }, { status: 404 })

  if (grup.grup_tipi === 'Zikir') {
    return NextResponse.json({ hata: 'Zikir gruplarında cüz rotasyonu yapılmaz.' }, { status: 400 })
  }

  const { data: sonDonem } = await supabase
    .from('donemler')
    .select('id, tur_no, bitis_tarihi')
    .eq('grup_id', grup_id)
    .order('tur_no', { ascending: false })
    .limit(1)
    .single()

  if (!sonDonem) return NextResponse.json({ hata: 'Dönem bulunamadı.' }, { status: 404 })

  // Yeni tur tarihleri (aynı mantık: bitiş + 15 gün başlangıç, +29 gün bitiş)
  const yeniBas = new Date(sonDonem.bitis_tarihi)
  yeniBas.setDate(yeniBas.getDate() + 15)
  const yeniBit = new Date(yeniBas)
  yeniBit.setDate(yeniBit.getDate() + 29)

  // Aktif üyeler
  const { data: uyeler } = await supabase
    .from('kullanicilar')
    .select('id, ad_soyad')
    .eq('grup_id', grup_id)
    .eq('aktif', true)
    .eq('kullanici_tipi', 'Uye')

  const uyeMap = new Map<string, string>()
  for (const u of uyeler ?? []) uyeMap.set(u.id, u.ad_soyad)
  const aktifIdler = new Set(uyeMap.keys())

  // Mevcut dönem atamaları
  const { data: atamalar } = await supabase
    .from('donem_atamalari')
    .select('kullanici_id, cuz_no')
    .eq('donem_id', sonDonem.id)

  // Rotasyonu simüle et: (cuz_no % 30) + 1, pasif üyeleri atla
  const yeniAtamalar: { cuz_no: number; ad_soyad: string }[] = []
  for (const a of atamalar ?? []) {
    if (!aktifIdler.has(a.kullanici_id)) continue
    yeniAtamalar.push({
      cuz_no: (a.cuz_no % 30) + 1,
      ad_soyad: uyeMap.get(a.kullanici_id) ?? '—',
    })
  }
  yeniAtamalar.sort((a, b) => a.cuz_no - b.cuz_no)

  return NextResponse.json({
    grup_adi: grup.grup_adi,
    yeni_tur_no: sonDonem.tur_no + 1,
    baslangic_tarihi: yeniBas.toISOString().split('T')[0],
    bitis_tarihi: yeniBit.toISOString().split('T')[0],
    atamalar: yeniAtamalar,
  })
}
