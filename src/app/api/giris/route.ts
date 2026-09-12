import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { tel_no, kullanici_id, pin, cihaz_bilgisi } = body

  const ip = req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? null
  const cihaz = cihaz_bilgisi ?? req.headers.get('user-agent') ?? null

  const supabase = await createClient()

  // ── Yönetici girişi (telefon no ile) ─────────────────────────
  if (tel_no) {
    const temiz = String(tel_no).replace(/\D/g, '')
    const { data: kullanici } = await supabase
      .from('kullanicilar')
      .select('id, ad_soyad, tel_no, grup_id, kullanici_tipi')
      .eq('tel_no', temiz)
      .eq('aktif', true)
      .maybeSingle()

    if (!kullanici) {
      return NextResponse.json({ hata: 'Numaranız kayıtlı değil.' }, { status: 401 })
    }

    await supabase.from('giris_loglari').insert({
      kullanici_id: kullanici.id, ip_adresi: ip, cihaz_bilgisi: cihaz,
    })
    return NextResponse.json({ kullanici })
  }

  // ── Üye girişi (isim seç + PIN) ──────────────────────────────
  if (kullanici_id && pin !== undefined) {
    const { data: kullanici, error: kullaniciHata } = await supabase
      .from('kullanicilar')
      .select('id, ad_soyad, grup_id, kullanici_tipi, pin, aktif')
      .eq('id', kullanici_id)
      .maybeSingle()

    if (kullaniciHata) {
      return NextResponse.json({ hata: `DB hatası: ${kullaniciHata.message}` }, { status: 500 })
    }

    if (!kullanici || !kullanici.aktif) {
      const detay = !kullanici
        ? `kayıt yok (id=${kullanici_id})`
        : `aktif=${kullanici.aktif} (${typeof kullanici.aktif})`
      return NextResponse.json({ hata: `Kullanıcı bulunamadı. [${detay}]` }, { status: 401 })
    }

    const girilenPin = String(pin).padStart(4, '0')

    if (kullanici.pin === null) {
      // İlk giriş — geçici PIN hesapla
      const { data: sonDonem } = await supabase
        .from('donemler')
        .select('id, tur_no')
        .eq('grup_id', kullanici.grup_id)
        .order('tur_no', { ascending: false })
        .limit(1)
        .single()

      if (!sonDonem) {
        return NextResponse.json({ hata: 'Dönem bulunamadı.' }, { status: 401 })
      }

      const { data: grup } = await supabase
        .from('gruplar')
        .select('grup_tipi')
        .eq('id', kullanici.grup_id)
        .single()

      let geciciPin: string

      if ((grup?.grup_tipi ?? 'Hatim') === 'Hatim') {
        const { data: atama } = await supabase
          .from('donem_atamalari')
          .select('cuz_no')
          .eq('kullanici_id', kullanici_id)
          .eq('donem_id', sonDonem.id)
          .maybeSingle()

        if (!atama) {
          return NextResponse.json({ hata: 'Cüz ataması bulunamadı.' }, { status: 401 })
        }
        // Geçici PIN: tur_no 2 hane + cüz_no 2 hane
        // Örn: tur 46, cüz 2 → "4602"
        const turStr = String(sonDonem.tur_no).padStart(2, '0')
        const cuzStr = String(atama.cuz_no).padStart(2, '0')
        geciciPin = turStr + cuzStr
      } else {
        geciciPin = '0000' // Zikir grubu için varsayılan
      }

      if (girilenPin !== geciciPin) {
        return NextResponse.json({ hata: 'PIN hatalı.' }, { status: 401 })
      }

      return NextResponse.json({
        ilk_giris: true,
        kullanici: {
          id: kullanici.id,
          ad_soyad: kullanici.ad_soyad,
          grup_id: kullanici.grup_id,
          kullanici_tipi: kullanici.kullanici_tipi,
        },
      })
    }

    // Normal giriş
    if (girilenPin !== kullanici.pin) {
      return NextResponse.json({ hata: 'PIN hatalı.' }, { status: 401 })
    }

    await supabase.from('giris_loglari').insert({
      kullanici_id: kullanici.id, ip_adresi: ip, cihaz_bilgisi: cihaz,
    })

    return NextResponse.json({
      kullanici: {
        id: kullanici.id,
        ad_soyad: kullanici.ad_soyad,
        grup_id: kullanici.grup_id,
        kullanici_tipi: kullanici.kullanici_tipi,
      },
    })
  }

  return NextResponse.json({ hata: 'Geçersiz istek.' }, { status: 400 })
}
