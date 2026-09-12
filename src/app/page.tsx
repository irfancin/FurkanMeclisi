'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

function telFormatla(deger: string) {
  const rakamlar = deger.replace(/\D/g, '').slice(0, 11)
  if (rakamlar.length <= 4) return rakamlar
  if (rakamlar.length <= 7) return `${rakamlar.slice(0, 4)} ${rakamlar.slice(4)}`
  if (rakamlar.length <= 9) return `${rakamlar.slice(0, 4)} ${rakamlar.slice(4, 7)} ${rakamlar.slice(7)}`
  return `${rakamlar.slice(0, 4)} ${rakamlar.slice(4, 7)} ${rakamlar.slice(7, 9)} ${rakamlar.slice(9)}`
}

export default function GirisPage() {
  const [tel, setTel] = useState('')
  const [yukleniyor, setYukleniyor] = useState(false)
  const [hata, setHata] = useState('')
  const router = useRouter()

  useEffect(() => {
    const oturum = localStorage.getItem('fm_oturum')
    if (oturum) {
      const kullanici = JSON.parse(oturum)
      router.replace(kullanici.kullanici_tipi === 'Uye' ? '/bugun' : '/admin')
    }
  }, [router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setHata('')
    const telTemiz = tel.replace(/\D/g, '')
    if (telTemiz.length < 10) {
      setHata('Geçerli bir telefon numarası girin.')
      return
    }
    setYukleniyor(true)
    try {
      const res = await fetch('/api/giris', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tel_no: telTemiz }),
      })
      const veri = await res.json()
      if (!res.ok) {
        setHata(veri.hata)
        return
      }
      localStorage.setItem('fm_oturum', JSON.stringify(veri.kullanici))
      router.push(veri.kullanici.kullanici_tipi === 'Uye' ? '/bugun' : '/admin')
    } catch {
      setHata('Bağlantı hatası. Lütfen tekrar deneyin.')
    } finally {
      setYukleniyor(false)
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-sm">

        {/* Logo / Başlık */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-600 rounded-2xl mb-4">
            <span className="text-3xl">📖</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-800">Furkan Meclisi</h1>
          <p className="text-slate-500 mt-1 text-sm">Hatim Takip</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Telefon Numarası
          </label>
          <input
            type="tel"
            inputMode="numeric"
            placeholder="05XX XXX XX XX"
            value={tel}
            onChange={e => setTel(telFormatla(e.target.value))}
            className="w-full border border-slate-300 rounded-xl px-4 py-3 text-lg tracking-wider text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            autoComplete="tel"
          />

          {hata && (
            <p className="mt-3 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
              {hata}
            </p>
          )}

          <button
            type="submit"
            disabled={yukleniyor}
            className="mt-4 w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white font-semibold py-3 rounded-xl transition-colors"
          >
            {yukleniyor ? 'Giriş yapılıyor...' : 'Giriş Yap'}
          </button>
        </form>

        <p className="text-center text-xs text-slate-400 mt-6">
          Numaranız kayıtlı değilse yöneticinizle iletişime geçin.
        </p>
      </div>
    </main>
  )
}
