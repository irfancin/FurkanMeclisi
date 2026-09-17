'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import type { OturumKullanici } from '@/types'

const VERSIYON = 'v1.62'

type Adim = 'tel' | 'grup-sec'

export default function GirisPage() {
  const router = useRouter()
  const [adim, setAdim] = useState<Adim>('tel')
  const [telNo, setTelNo] = useState('')
  const [bulunanlar, setBulunanlar] = useState<OturumKullanici[]>([])
  const [seciliGrupId, setSeciliGrupId] = useState('')
  const [hata, setHata] = useState('')
  const [yukleniyor, setYukleniyor] = useState(false)

  useEffect(() => {
    const oturum = localStorage.getItem('fm_oturum')
    if (oturum) {
      const u: OturumKullanici = JSON.parse(oturum)
      router.replace(u.kullanici_tipi === 'Uye' ? '/bugun' : '/admin')
    }
  }, [router])

  const telGiris = async (e: React.FormEvent) => {
    e.preventDefault()
    setHata(''); setYukleniyor(true)

    try {
      const res = await fetch('/api/giris', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tel_no: telNo }),
      })

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let d: any
      try { d = await res.json() } catch {
        setYukleniyor(false)
        setHata(`Sunucu yanıtı okunamadı (HTTP ${res.status}).`)
        return
      }

      if (!res.ok) {
        setYukleniyor(false)
        setHata(d?.hata ?? `Sunucu hatası (${res.status}).`)
        return
      }

      const kullanicilar: OturumKullanici[] = Array.isArray(d?.kullanicilar) ? d.kullanicilar : []

      if (kullanicilar.length === 1) {
        oturumKaydet(kullanicilar, kullanicilar[0])
      } else if (kullanicilar.length > 1) {
        setYukleniyor(false)
        const sonGrupId = localStorage.getItem('fm_son_grup_id')
        const sonGrup = sonGrupId ? kullanicilar.find(k => k.grup_id === sonGrupId) : null
        const varsayilan = sonGrup ?? kullanicilar.find(k => k.grup_tipi === 'Hatim') ?? kullanicilar[0]
        setBulunanlar(kullanicilar)
        setSeciliGrupId(varsayilan.grup_id)
        setAdim('grup-sec')
      } else {
        setYukleniyor(false)
        setHata('Kullanıcı bulunamadı. Tekrar deneyin.')
      }
    } catch {
      setYukleniyor(false)
      setHata('Bağlantı hatası. İnternet bağlantınızı kontrol edin.')
    }
  }

  const grupSec = () => {
    const secili = bulunanlar.find(k => k.grup_id === seciliGrupId)
    if (!secili) return
    oturumKaydet(bulunanlar, secili)
  }

  const oturumKaydet = (tumKullanicilar: OturumKullanici[], aktif: OturumKullanici) => {
    localStorage.setItem('fm_oturum', JSON.stringify(aktif))
    if (tumKullanicilar.length > 1) {
      localStorage.setItem('fm_tum_gruplar', JSON.stringify(tumKullanicilar))
    } else {
      localStorage.removeItem('fm_tum_gruplar')
    }
    window.location.href = aktif.kullanici_tipi === 'Uye' ? '/bugun' : '/admin'
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
                  autoComplete="tel"
                  className="w-full border border-slate-300 rounded-xl px-4 py-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              {hata && <p className="text-sm text-red-500 text-center">{hata}</p>}
              <button type="submit" disabled={yukleniyor || telNo.length < 10}
                className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 text-white font-semibold py-3 rounded-xl transition-colors">
                {yukleniyor ? 'Kontrol ediliyor...' : 'Giriş Yap'}
              </button>
            </form>
            <div className="flex justify-end">
              <span className="text-xs text-slate-400 select-none">{VERSIYON}</span>
            </div>
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

      </div>
    </main>
  )
}
