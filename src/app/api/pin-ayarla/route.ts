import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const { kullanici_id, yeni_pin } = await req.json()

  if (!kullanici_id || yeni_pin === undefined) {
    return NextResponse.json({ hata: 'Eksik parametre.' }, { status: 400 })
  }

  const pinStr = String(yeni_pin).padStart(4, '0')
  if (!/^\d{4}$/.test(pinStr)) {
    return NextResponse.json({ hata: 'PIN 4 haneli rakamdan oluşmalıdır.' }, { status: 400 })
  }

  const supabase = await createClient()

  const { error } = await supabase
    .from('kullanicilar')
    .update({ pin: pinStr })
    .eq('id', kullanici_id)

  if (error) {
    return NextResponse.json({ hata: 'PIN kaydedilemedi.' }, { status: 500 })
  }

  const ip = req.headers.get('x-forwarded-for') ?? null
  await supabase.from('giris_loglari').insert({
    kullanici_id, ip_adresi: ip, cihaz_bilgisi: null,
  })

  return NextResponse.json({ basarili: true })
}
