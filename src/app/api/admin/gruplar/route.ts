import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()

  const { data: gruplar, error } = await supabase
    .from('gruplar')
    .select('id, grup_adi, grup_tipi')
    .order('grup_adi')

  if (error) {
    return NextResponse.json({ hata: 'Gruplar alınamadı.' }, { status: 500 })
  }

  return NextResponse.json({ gruplar })
}

export async function POST(req: NextRequest) {
  const { grup_adi, baslangic_tarihi, tur_no = 1, grup_tipi = 'Hatim' } = await req.json()

  if (!grup_adi || !baslangic_tarihi) {
    return NextResponse.json({ hata: 'Grup adı ve başlangıç tarihi gerekli.' }, { status: 400 })
  }

  if (!['Hatim', 'Zikir'].includes(grup_tipi)) {
    return NextResponse.json({ hata: 'Geçersiz grup tipi.' }, { status: 400 })
  }

  const supabase = await createClient()

  // Grup oluştur
  const { data: grup, error: grupHata } = await supabase
    .from('gruplar')
    .insert({ grup_adi, grup_tipi })
    .select('id')
    .single()

  if (grupHata) {
    const mesaj = grupHata.code === '23505'
      ? 'Bu grup adı zaten mevcut.'
      : 'Grup oluşturulamadı.'
    return NextResponse.json({ hata: mesaj }, { status: 400 })
  }

  // Bitiş tarihi = başlangıç + 29 gün
  const baslangic = new Date(baslangic_tarihi)
  const bitis = new Date(baslangic)
  bitis.setDate(bitis.getDate() + 29)
  const bitis_tarihi = bitis.toISOString().split('T')[0]

  // İlk dönemi oluştur
  await supabase.from('donemler').insert({
    grup_id: grup.id,
    tur_no: Number(tur_no),
    baslangic_tarihi,
    bitis_tarihi,
  })

  return NextResponse.json({ grup_id: grup.id, basarili: true })
}
