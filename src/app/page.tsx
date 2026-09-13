'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

const VERSIYON = 'v1.50'

interface Grup { id: string; grup_adi: string }
interface Uye { id: string; ad_soyad: string }
type Adim = 'secim' | 'pin' | 'pin-ayarla' | 'yonetici'
type GirisTipi = 'uye' | 'yonetici'

export default function GirisPage() {
  const router = useRouter()
  const [adim, setAdim] = useState<Adim>('secim')
  const [girisTipi, setGirisTipi] = useState<GirisTipi>('uye')

  // Grup + üye seçimi
  const [gruplar, setGruplar] = useState<Grup[]>([])
  const [uyeler, setUyeler] = useState<Uye[]>([])
  const [seciliGrup, setSeciliGrup] = useState('')
  const [seciliUye, setSeciliUye] = useState('')

  // PIN
  const [pin, setPin] = useState('')
  const [yeniPin, setYeniPin] = useState('')
  const [yeniPinOnay, setYeniPinOnay] = useState('')
  const [geciciKullanici, setGeciciKullanici] = useState<{
    id: string; ad_soyad: string; grup_id: string; kullanici_tipi: string
  } | null>(null)

  // Yönetici
  const [telNo, setTelNo] = useState('')

  const [hata, setHata] = useState('')
  const [yukleniyor, setYukleniyor] = useState(false)

  // Oturum kontrolü
  useEffect(() => {
    const oturum = localStorage.getItem('fm_oturum')
    if (oturum) {
      const u = JSON.parse(oturum)
      router.replace(u.kullanici_tipi === 'Uye' ? '/bugun' : '/admin')
    }
  }, [router])

  // Grupları yükle
  useEffect(() => {
    fetch('/api/giris/gruplar')
      .then(r => r.json())
      .then(d => setGruplar(d.gruplar ?? []))
  }, [])

  // Üyeleri yükle
  useEffect(() => {
    if (!seciliGrup) { setUyeler([]); setSeciliUye(''); return }
    fetch(`/api/giris/uyeler?grup_id=${seciliGrup}`)
      .then(r => r.json())
      .then(d => { setUyeler(d.uyeler ?? []); setSeciliUye('') })
  }, [seciliGrup])

  const girisTipDegistir = (tip: GirisTipi) => {
    setGirisTipi(tip)
    setHata('')
    if (tip === 'yonetici') setAdim('yonetici')
    else setAdim('secim')
  }

  const devam = () => {
    if (!seciliGrup || !seciliUye) { setHata('Grup ve adınızı seçin.'); return }
    setHata(''); setAdim('pin')
  }

  const pinGir = async (e: React.FormEvent) => {
    e.preventDefault()
    setHata(''); setYukleniyor(true)
    const res = await fetch('/api/giris', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kullanici_id: seciliUye, pin }),
    })
    const d = await res.json()
    setYukleniyor(false)
    if (!res.ok) { setHata(d.hata); return }
    if (d.ilk_giris) {
      setGeciciKullanici(d.kullanici)
      setPin(''); setAdim('pin-ayarla')
    } else {
      localStorage.setItem('fm_oturum', JSON.stringify(d.kullanici))
      router.replace('/bugun')
    }
  }

  const pinAyarla = async (e: React.FormEvent) => {
    e.preventDefault()
    setHata('')
    if (yeniPin !== yeniPinOnay) { setHata('PIN kodları eşleşmiyor.'); return }
    if (!/^\d{4}$/.test(yeniPin)) { setHata('PIN 4 haneli rakamdan oluşmalıdır.'); return }
    setYukleniyor(true)
    const res = await fetch('/api/pin-ayarla', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kullanici_id: geciciKullanici!.id, yeni_pin: yeniPin }),
    })
    const d = await res.json()
    setYukleniyor(false)
    if (!res.ok) { setHata(d.hata); return }
    localStorage.setItem('fm_oturum', JSON.stringify(geciciKullanici))
    router.replace('/bugun')
  }

  const yoneticiGiris = async (e: React.FormEvent) => {
    e.preventDefault()
    setHata(''); setYukleniyor(true)
    const res = await fetch('/api/giris', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tel_no: telNo.replace(/\D/g, '') }),
    })
    const d = await res.json()
    setYukleniyor(false)
    if (!res.ok) { setHata(d.hata); return }
    localStorage.setItem('fm_oturum', JSON.stringify(d.kullanici))
    router.replace(d.kullanici.kullanici_tipi === 'Uye' ? '/bugun' : '/admin')
  }

  const uyeAdi = uyeler.find(u => u.id === seciliUye)?.ad_soyad ?? ''

  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-4">

        {/* Başlık */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-600 rounded-2xl mb-3">
            <span className="text-3xl">📖</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-800">Furkan Meclisi</h1>
          <p className="text-slate-400 text-sm">Hatim Kardeşliği</p>
        </div>

        {/* Toggle: Üye / Yönetici */}
        {(adim === 'secim' || adim === 'yonetici') && (
          <div className="flex bg-slate-100 rounded-full p-1">
            <button
              onClick={() => girisTipDegistir('uye')}
              className={`flex-1 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                girisTipi === 'uye'
                  ? 'bg-white text-slate-800 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Üye
            </button>
            <button
              onClick={() => girisTipDegistir('yonetici')}
              className={`flex-1 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                girisTipi === 'yonetici'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Yönetici
            </button>
          </div>
        )}

        {/* ADIM 1 — Grup + İsim */}
        {adim === 'secim' && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-4">
            <h2 className="font-semibold text-slate-700 text-center">Grubunuzu ve Adınızı Seçin</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Grup</label>
                <select value={seciliGrup} onChange={e => setSeciliGrup(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl px-4 py-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500">
                  <option value="">Grup seçin...</option>
                  {gruplar.map(g => <option key={g.id} value={g.id}>{g.grup_adi}</option>)}
                </select>
              </div>
              {uyeler.length > 0 && (
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Ad Soyad</label>
                  <select value={seciliUye} onChange={e => setSeciliUye(e.target.value)}
                    className="w-full border border-slate-300 rounded-xl px-4 py-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500">
                    <option value="">Adınızı seçin...</option>
                    {uyeler.map(u => <option key={u.id} value={u.id}>{u.ad_soyad}</option>)}
                  </select>
                </div>
              )}
            </div>
            {hata && <p className="text-sm text-red-500 text-center">{hata}</p>}
            <button onClick={devam} disabled={!seciliGrup || !seciliUye}
              className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 text-white font-semibold py-3 rounded-xl transition-colors">
              Devam →
            </button>
            <div className="flex justify-end">
              <span className="text-xs text-slate-400 select-none">{VERSIYON}</span>
            </div>
          </div>
        )}

        {/* ADIM 2 — PIN */}
        {adim === 'pin' && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-4">
            <div className="flex items-center gap-2">
              <button onClick={() => { setAdim('secim'); setPin(''); setHata('') }}
                className="text-slate-500 hover:text-slate-700 text-2xl font-bold w-10 h-10 flex items-center justify-center">←</button>
              <div>
                <p className="font-semibold text-slate-700">PIN Kodu</p>
                <p className="text-xs text-slate-400">{uyeAdi}</p>
              </div>
            </div>
            <form onSubmit={pinGir} className="space-y-3">
              <div>
                <input
                  type="text" inputMode="numeric" maxLength={4}
                  value={pin}
                  onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  placeholder="••••"
                  required
                  className="w-full border border-slate-300 rounded-xl px-4 py-4 text-slate-800 text-center text-3xl tracking-[0.5em] focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <p className="text-xs text-slate-400 mt-2 text-center leading-relaxed">
                  İlk girişte: <span className="font-medium">(tur no) + (cüz no)</span>
                  <br />Örn: 46. tur, 2. cüz → <span className="font-mono font-medium">4602</span>
                </p>
              </div>
              {hata && <p className="text-sm text-red-500 text-center">{hata}</p>}
              <button type="submit" disabled={yukleniyor || pin.length < 4}
                className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 text-white font-semibold py-3 rounded-xl transition-colors">
                {yukleniyor ? 'Kontrol ediliyor...' : 'Giriş Yap'}
              </button>
            </form>
          </div>
        )}

        {/* ADIM 3 — Kalıcı PIN Belirle (ilk giriş) */}
        {adim === 'pin-ayarla' && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-4">
            <div className="text-center space-y-1">
              <div className="text-2xl">🔐</div>
              <h2 className="font-semibold text-slate-700">Kalıcı PIN Belirleyin</h2>
              <p className="text-xs text-slate-500 leading-relaxed">
                <span className="font-medium">Doğum yılınızı</span> (örn: 1985)<br />
                veya telefon numaranızın <span className="font-medium">son 4 rakamını</span> girin.
              </p>
            </div>
            <form onSubmit={pinAyarla} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Yeni PIN</label>
                <input
                  type="text" inputMode="numeric" maxLength={4}
                  value={yeniPin}
                  onChange={e => setYeniPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  placeholder="••••" required
                  className="w-full border border-slate-300 rounded-xl px-4 py-4 text-slate-800 text-center text-3xl tracking-[0.5em] focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">PIN Tekrar</label>
                <input
                  type="text" inputMode="numeric" maxLength={4}
                  value={yeniPinOnay}
                  onChange={e => setYeniPinOnay(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  placeholder="••••" required
                  className="w-full border border-slate-300 rounded-xl px-4 py-4 text-slate-800 text-center text-3xl tracking-[0.5em] focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              {hata && <p className="text-sm text-red-500 text-center">{hata}</p>}
              <button type="submit" disabled={yukleniyor || yeniPin.length < 4 || yeniPinOnay.length < 4}
                className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 text-white font-semibold py-3 rounded-xl transition-colors">
                {yukleniyor ? 'Kaydediliyor...' : 'PIN Kaydet ve Giriş Yap'}
              </button>
            </form>
          </div>
        )}

        {/* YÖNETİCİ GİRİŞİ */}
        {adim === 'yonetici' && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-4">
            <h2 className="font-semibold text-slate-700 text-center">Yönetici Girişi</h2>
            <form onSubmit={yoneticiGiris} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Telefon Numarası</label>
                <input type="tel" value={telNo}
                  onChange={e => setTelNo(e.target.value)}
                  placeholder="05XX XXX XX XX" required
                  className="w-full border border-blue-300 rounded-xl px-4 py-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-blue-50/30"
                />
              </div>
              {hata && <p className="text-sm text-red-500">{hata}</p>}
              <button type="submit" disabled={yukleniyor}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-3 rounded-xl transition-colors">
                {yukleniyor ? 'Giriş yapılıyor...' : 'Giriş Yap'}
              </button>
            </form>
            <div className="flex justify-end">
              <span className="text-xs text-slate-400 select-none">{VERSIYON}</span>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
