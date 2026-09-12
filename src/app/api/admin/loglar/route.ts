import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const arama = searchParams.get('arama') ?? ''

  const supabase = await createClient()

  let sorgu = supabase
    .from('giris_loglari')
    .select('id, giris_zamani, ip_adresi, cihaz_bilgisi, kullanicilar(id, ad_soyad, tel_no)')
    .order('giris_zamani', { ascending: false })
    .limit(200)

  const { data, error } = await sorgu

  if (error) return NextResponse.json({ hata: 'Loglar alınamadı.' }, { status: 500 })

  const loglar = (data ?? [])
    .filter(l => {
      if (!arama) return true
      const ad = (l.kullanicilar as { ad_soyad?: string } | null)?.ad_soyad?.toLowerCase() ?? ''
      return ad.includes(arama.toLowerCase())
    })
    .map(l => ({
      id: l.id,
      giris_zamani: l.giris_zamani,
      ip_adresi: l.ip_adresi,
      cihaz_bilgisi: l.cihaz_bilgisi,
      kullanici_id: (l.kullanicilar as { id?: string } | null)?.id ?? '',
      ad_soyad: (l.kullanicilar as { ad_soyad?: string } | null)?.ad_soyad ?? '',
      tel_no: (l.kullanicilar as { tel_no?: string } | null)?.tel_no ?? '',
    }))

  return NextResponse.json({ loglar })
}
