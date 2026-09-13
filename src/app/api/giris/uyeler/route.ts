import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const grup_id = searchParams.get('grup_id')
  if (!grup_id) return NextResponse.json({ uyeler: [] })

  const supabase = await createClient()

  const [{ data: uyeler }, { data: donem }] = await Promise.all([
    supabase
      .from('kullanicilar')
      .select('id, ad_soyad')
      .eq('grup_id', grup_id)
      .eq('aktif', true)
      .eq('kullanici_tipi', 'Uye')
      .order('ad_soyad'),
    supabase
      .from('donemler')
      .select('id')
      .eq('grup_id', grup_id)
      .order('tur_no', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  // Cüz atamaları — kullanıcı başına birden fazla olabilir
  const cuzMap = new Map<string, number[]>()
  if (donem) {
    const { data: atamalar } = await supabase
      .from('donem_atamalari')
      .select('kullanici_id, cuz_no')
      .eq('donem_id', donem.id)
      .order('cuz_no')
    for (const a of atamalar ?? []) {
      if (!cuzMap.has(a.kullanici_id)) cuzMap.set(a.kullanici_id, [])
      cuzMap.get(a.kullanici_id)!.push(a.cuz_no)
    }
  }

  const liste = (uyeler ?? []).map(u => ({
    ...u,
    cuz_lar: cuzMap.get(u.id) ?? [],
  }))

  return NextResponse.json({ uyeler: liste })
}
