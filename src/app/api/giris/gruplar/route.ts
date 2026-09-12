import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: gruplar } = await supabase
    .from('gruplar')
    .select('id, grup_adi, grup_tipi')
    .order('grup_adi')
  return NextResponse.json({ gruplar: gruplar ?? [] })
}
