import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const { tel_no } = await req.json()

  if (!tel_no) {
    return NextResponse.json({ hata: 'Telefon numarası gerekli.' }, { status: 400 })
  }

  const supabase = await createClient()

  const { data: kullanici, error } = await supabase
    .from('kullanicilar')
    .select('id, ad_soyad, tel_no, grup_id, kullanici_tipi')
    .eq('tel_no', tel_no)
    .eq('aktif', true)
    .single()

  if (error || !kullanici) {
    return NextResponse.json(
      { hata: 'Numaranız kayıtlı değil. Yöneticinizle iletişime geçin.' },
      { status: 404 }
    )
  }

  // Giriş logu kaydet
  const ip = req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? null
  const cihaz = req.headers.get('user-agent') ?? null

  await supabase.from('giris_loglari').insert({
    kullanici_id: kullanici.id,
    ip_adresi: ip,
    cihaz_bilgisi: cihaz,
  })

  return NextResponse.json({ kullanici })
}
