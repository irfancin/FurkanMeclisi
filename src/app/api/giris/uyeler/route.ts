import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const grup_id = searchParams.get('grup_id')
  if (!grup_id) return NextResponse.json({ uyeler: [] })

  const supabase = await createClient()
  const { data: uyeler } = await supabase
    .from('kullanicilar')
    .select('id, ad_soyad')
    .eq('grup_id', grup_id)
    .eq('aktif', true)
    .eq('kullanici_tipi', 'Uye')
    .order('ad_soyad')

  return NextResponse.json({ uyeler: uyeler ?? [] })
}
