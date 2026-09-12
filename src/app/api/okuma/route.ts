import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

function bugunTR() {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Istanbul' }).format(new Date())
}

// Bugün okudum işareti
export async function POST(req: NextRequest) {
  const { kullanici_id } = await req.json()

  if (!kullanici_id) {
    return NextResponse.json({ hata: 'Eksik parametre.' }, { status: 400 })
  }

  const supabase = await createClient()
  const bugun = bugunTR()

  const { error } = await supabase
    .from('okuma_kayitlari')
    .upsert({ kullanici_id, tarih: bugun }, { onConflict: 'kullanici_id,tarih' })

  if (error) {
    return NextResponse.json({ hata: 'Kayıt sırasında hata oluştu.' }, { status: 500 })
  }

  return NextResponse.json({ basarili: true })
}

// Geri al — yalnızca bugünkü kaydı siler
export async function DELETE(req: NextRequest) {
  const { kullanici_id } = await req.json()

  if (!kullanici_id) {
    return NextResponse.json({ hata: 'Eksik parametre.' }, { status: 400 })
  }

  const supabase = await createClient()
  const bugun = bugunTR()

  const { error } = await supabase
    .from('okuma_kayitlari')
    .delete()
    .eq('kullanici_id', kullanici_id)
    .eq('tarih', bugun)

  if (error) {
    return NextResponse.json({ hata: 'Geri alma sırasında hata oluştu.' }, { status: 500 })
  }

  return NextResponse.json({ basarili: true })
}
