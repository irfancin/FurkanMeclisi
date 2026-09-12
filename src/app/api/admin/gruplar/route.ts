import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()

  const { data: gruplar, error } = await supabase
    .from('gruplar')
    .select('id, grup_adi')
    .order('grup_adi')

  if (error) {
    return NextResponse.json({ hata: 'Gruplar alınamadı.' }, { status: 500 })
  }

  return NextResponse.json({ gruplar })
}
