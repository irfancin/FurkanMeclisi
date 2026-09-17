'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import type { OturumKullanici } from '@/types'

const VERSIYON = 'v1.59'

type Adim = 'tel' | 'grup-sec' | 'basarili'

export default function GirisPage() {
  const router = useRouter()
  const [adim, setAdim] = useState<Adim>('tel')
  const [telNo, setTelNo] = useState('')
  const [bulunanlar, setBulunanlar] = useState<OturumKullanici[]>([])
  const [seciliGrupId, setSeciliGrupId] = useState('')
  const [hata, setHata] = useState('')
  const [yukleniyor, setYukleniyor] = useState(false)
  const [basariliHedef, setBasariliHedef] = useState('/bugun')
  const logRef = useRef<string[]>([])
  const [logGoster, setLogGoster] = useState(false)

  const log = (msg: string) => {
    const line = `${new Date().toLocaleTimeString('tr')} ${msg}`
    logRef.current = [...logRef.current, line]
  }

  // Sayfa açılışında mevcut oturum kontrolü
  useEffect(() => {
    const oturum = localStorage.getItem('fm_oturum')
    if (oturum) {
      const u: OturumKullanici = JSON.parse(oturum)
      router.replace(u.kullanici_tipi === 'Uye' ? '/bugun' : '/admin')
    }
  }, [router])

  const telGiris = async (e: React.FormEvent) => {
    e.preventDefault()
    logRef.current = []
    log(`Giriş: "${telNo}" (${telNo.length} karakter)`)
    setHata(''); setYukleniyor(true)

    try {
      log('API çağrılıyor...')
      const res = await fetch('/api/giris', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tel_no: telNo }),
      })
      log(`API yanıtı: HTTP ${res.status}`)

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let d: any
      try {
        d = await res.json()
        log(`JSON OK`)
      } catch {
        setYukleniyor(false)
        setLogGoster(true)
        setHata(`Sunucu yanıtı okunamadı (HTTP ${res.status}).`)
        return
      }

      if (!res.ok) {
        setYukleniyor(false)
        setLogGoster(true)
        setHata(d?.hata ?? `Sunucu hatası (${res.status}).`)
        return
      }

      const kullanicilar: OturumKullanici[] = Array.isArray(d?.kullanicilar) ? d.kullanicilar : []
      log(`Kullanıcı sayısı: ${kullanicilar.length}`)

      if (kullanicilar.length === 1) {
        oturumKaydet(kullanicilar, kullanicilar[0])
      } else if (kullanicilar.length > 1) {
        log('Grup seçim ekranı açılıyor')
        setYukleniyor(false)
        const hatim = kullanicilar.find(k => k.grup_tipi === 'Hatim') ?? kullanicilar[0]
        setBulunanlar(kullanicilar)
        setSeciliGrupId(hatim.grup_id)
        setAdim('grup-sec')
      } else {
        setYukleniyor(false)
        setLogGoster(true)
        setHata('Kullanıcı bulunamadı.')
      }
    } catch (err) {
      log(`Hata: ${err}`)
      setYukleniyor(false)
      setLogGoster(true)
      setHata('Bağlantı hatası. İnternet bağlantınızı kontrol edin.')
    }
  }

  const grupSec = () => {
    const secili = bulunanlar.find(k => k.grup_id === seciliGrupId)
    if (!secili) return
    oturumKaydet(bulunanlar, secili)
  }

  const oturumKaydet = (tumKullanicilar: OturumKullanici[], aktif: OturumKullanici) => {
    try {
      log('localStorage kaydediliyor...')
      localStorage.setItem('fm_oturum', JSON.stringify(aktif))
      const kontrol = localStorage.getItem('fm_oturum')
      if (!kontrol) {
        log('localStorage BAŞARISIZ: getItem null döndü')
        throw new Error('localStorage boş döndü')
      }
      log('localStorage OK')

      if (tumKullanicilar.length > 1) {
        localStorage.setItem('fm_tum_gruplar', JSON.stringify(tumKullanicilar))
      } else {
        localStorage.removeItem('fm_tum_gruplar')
      }

      const hedef = aktif.kullanici_tipi === 'Uye' ? '/bugun' : '/admin'
      log(`Hedef: ${hedef}`)
      setBasariliHedef(hedef)
      setYukleniyor(false)
      setAdim('basarili')
      log('Yönlendirme deneniyor (window.location.href)...')
      window.location.href = hedef
    } catch {
      setYukleniyor(false)
      setLogGoster(true)
      setHata('Tarayıcı hafızasına yazılamadı. Lütfen özel/gizli sekmeyi kapatıp tekrar deneyin.')
    }
  }

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

        {/* ADIM 1 — Telefon numarası */}
        {adim === 'tel' && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-4">
            <h2 className="font-semibold text-slate-700 text-center">Giriş Yap</h2>
            <form onSubmit={telGiris} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Telefon Numarası</label>
                <input
                  type="tel"
                  value={telNo}
                  onChange={e => setTelNo(e.target.value)}
                  placeholder="05XX XXX XX XX"
                  required
                  autoComplete="off"
                  className="w-full border border-slate-300 rounded-xl px-4 py-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              {hata && (
                <p className="text-sm text-red-500 text-center">{hata}</p>
              )}
              <button type="submit" disabled={yukleniyor || telNo.length < 6}
                className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 text-white font-semibold py-3 rounded-xl transition-colors">
                {yukleniyor ? 'Kontrol ediliyor...' : 'Giriş Yap'}
              </button>
            </form>
            <div className="flex items-center justify-between">
              <button onClick={() => setLogGoster(v => !v)}
                className="text-xs text-slate-300 hover:text-slate-400">
                {logGoster ? 'Gizle' : 'Tanı'}
              </button>
              <span className="text-xs text-slate-400 select-none">{VERSIYON}</span>
            </div>
            {logGoster && logRef.current.length > 0 && (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-0.5">
                {logRef.current.map((l, i) => (
                  <p key={i} className="text-xs font-mono text-slate-500">{l}</p>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ADIM 2 — Grup seçimi (çoklu grup) */}
        {adim === 'grup-sec' && (
          <div className="bg-white rounded-2xl shadow-sm border-2 border-emerald-400 p-6 space-y-4">
            <div className="text-center space-y-1">
              <div className="inline-flex items-center justify-center w-10 h-10 bg-emerald-100 rounded-full mb-2">
                <span className="text-xl">👥</span>
              </div>
              <p className="font-bold text-slate-800">Birden fazla grubunuz var</p>
              <p className="text-sm text-slate-600">Hangi grup için giriş yapmak istiyorsunuz?</p>
              <p className="text-xs text-slate-400 font-medium">{bulunanlar[0]?.ad_soyad}</p>
            </div>
            <div className="space-y-2">
              {bulunanlar.map(k => (
                <button
                  key={k.grup_id}
                  onClick={() => setSeciliGrupId(k.grup_id)}
                  className={`w-full px-4 py-3 rounded-xl border-2 text-left font-medium text-sm transition-all ${
                    seciliGrupId === k.grup_id
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                      : 'border-slate-200 text-slate-600 hover:border-slate-300'
                  }`}
                >
                  {k.grup_adi}
                  {k.grup_tipi === 'Hatim' && <span className="ml-2 text-xs text-slate-400">(Hatim)</span>}
                  {k.grup_tipi === 'Zikir' && <span className="ml-2 text-xs text-slate-400">(Zikir)</span>}
                </button>
              ))}
            </div>
            <button onClick={grupSec}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 rounded-xl transition-colors">
              Devam Et
            </button>
            <button onClick={() => { setAdim('tel'); setHata('') }}
              className="w-full text-sm text-slate-400 hover:text-slate-600 py-1">
              ← Geri
            </button>
          </div>
        )}

        {/* ADIM 3 — Giriş başarılı (fallback: oto-yönlendirme çalışmazsa) */}
        {adim === 'basarili' && (
          <div className="bg-white rounded-2xl shadow-sm border-2 border-emerald-400 p-6 space-y-4 text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 bg-emerald-100 rounded-full">
              <span className="text-3xl">✅</span>
            </div>
            <div>
              <p className="font-bold text-emerald-700 text-lg">Giriş Başarılı!</p>
              <p className="text-sm text-slate-500 mt-1">Yönlendirme otomatik gerçekleşmezse aşağıya tıklayın.</p>
            </div>
            <a
              href={basariliHedef}
              className="block w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 rounded-xl transition-colors">
              Ana Sayfaya Git →
            </a>
            {logGoster && logRef.current.length > 0 && (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-0.5 text-left">
                {logRef.current.map((l, i) => (
                  <p key={i} className="text-xs font-mono text-slate-500">{l}</p>
                ))}
              </div>
            )}
          </div>
        )}

      </div>
    </main>
  )
}
