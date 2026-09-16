import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { tel_no, cihaz_bilgisi } = body

  const ip = req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? null
  const cihaz = cihaz_bilgisi ?? req.headers.get('user-agent') ?? null

  const supabase = await createClient()

  if (!tel_no) {
    return NextResponse.json({ hata: 'Telefon numarası gerekli.' }, { status: 400 })
  }

  const temiz = String(tel_no).replace(/\D/g, '').replace(/^0+/, '')

  const { data: kayitlar } = await supabase
    .from('kullanicilar')
    .select('id, ad_soyad, tel_no, grup_id, kullanici_tipi')
    .eq('tel_no', temiz)
    .eq('aktif', true)

  if (!kayitlar || kayitlar.length === 0) {
    return NextResponse.json({ hata: 'Numaranız kayıtlı değil.' }, { status: 401 })
  }

  // Grup bilgilerini çek
  const grupIdler = [...new Set(kayitlar.map(k => k.grup_id).filter(Boolean))]
  const { data: gruplar } = grupIdler.length > 0
    ? await supabase.from('gruplar').select('id, grup_adi, grup_tipi').in('id', grupIdler)
    : { data: [] }

  const grupMap = new Map((gruplar ?? []).map(g => [g.id, g]))

  const kullanicilar = kayitlar.map(k => ({
    id: k.id,
    ad_soyad: k.ad_soyad,
    tel_no: k.tel_no,
    grup_id: k.grup_id ?? '',
    grup_adi: grupMap.get(k.grup_id)?.grup_adi ?? '',
    grup_tipi: grupMap.get(k.grup_id)?.grup_tipi ?? null,
    kullanici_tipi: k.kullanici_tipi,
  }))

  await supabase.from('giris_loglari').insert({
    kullanici_id: kullanicilar[0].id, ip_adresi: ip, cihaz_bilgisi: cihaz,
  })

  return NextResponse.json({ kullanicilar })
}
