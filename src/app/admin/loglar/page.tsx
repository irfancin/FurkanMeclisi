'use client'

import { useEffect, useState } from 'react'

interface Log {
  id: string; giris_zamani: string; ip_adresi: string | null
  cihaz_bilgisi: string | null; ad_soyad: string; tel_no: string
}

function saatFormatla(iso: string) {
  return new Date(iso).toLocaleString('tr-TR', {
    timeZone: 'Europe/Istanbul',
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })
}

function cihazOzetle(ua: string | null): string {
  if (!ua) return '—'
  if (ua.includes('iPhone')) return 'iPhone'
  if (ua.includes('Android')) return 'Android'
  if (ua.includes('iPad')) return 'iPad'
  if (ua.includes('Windows')) return 'Windows'
  if (ua.includes('Mac')) return 'Mac'
  return 'Diğer'
}

export default function LoglarPage() {
  const [loglar, setLoglar] = useState<Log[]>([])
  const [arama, setArama] = useState('')
  const [yukleniyor, setYukleniyor] = useState(true)
  const [genisletilen, setGenisletilen] = useState<string | null>(null)

  useEffect(() => {
    setYukleniyor(true)
    fetch(`/api/admin/loglar${arama ? `?arama=${encodeURIComponent(arama)}` : ''}`)
      .then(r => r.json())
      .then(d => { setLoglar(d.loglar ?? []); setYukleniyor(false) })
  }, [arama])

  // Kişi bazlı gruplama
  const kisiGruplari = loglar.reduce<Record<string, { ad_soyad: string; tel_no: string; loglar: Log[] }>>((acc, l) => {
    if (!acc[l.ad_soyad]) acc[l.ad_soyad] = { ad_soyad: l.ad_soyad, tel_no: l.tel_no, loglar: [] }
    acc[l.ad_soyad].loglar.push(l)
    return acc
  }, {})

  return (
    <div className="py-4 space-y-4">
      <div>
        <h1 className="text-lg font-semibold text-slate-800">Giriş Logları</h1>
        <p className="text-sm text-slate-400 mt-0.5">Son 200 giriş kaydı. Şüpheli durumları takip etmek için kullanın.</p>
      </div>

      <input
        type="text"
        placeholder="Ad soyad ile ara..."
        value={arama}
        onChange={e => setArama(e.target.value)}
        className="w-full max-w-sm border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
      />

      {yukleniyor
        ? <p className="text-slate-400 text-sm">Yükleniyor...</p>
        : Object.keys(kisiGruplari).length === 0
        ? <p className="text-slate-400 text-sm">Kayıt bulunamadı.</p>
        : (
          <div className="space-y-2">
            {Object.values(kisiGruplari).map(k => (
              <div key={k.ad_soyad} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <button
                  onClick={() => setGenisletilen(genisletilen === k.ad_soyad ? null : k.ad_soyad)}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors"
                >
                  <div className="text-left">
                    <p className="text-sm font-medium text-slate-700">{k.ad_soyad}</p>
                    <p className="text-xs text-slate-400">{k.tel_no} · {k.loglar.length} giriş</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400">{saatFormatla(k.loglar[0].giris_zamani)}</span>
                    <span className="text-slate-400">{genisletilen === k.ad_soyad ? '▲' : '▼'}</span>
                  </div>
                </button>

                {genisletilen === k.ad_soyad && (
                  <div className="border-t border-slate-100">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-100">
                          <th className="px-4 py-2 text-left text-slate-500 font-medium">Tarih & Saat</th>
                          <th className="px-4 py-2 text-left text-slate-500 font-medium">Cihaz</th>
                          <th className="px-4 py-2 text-left text-slate-500 font-medium">IP</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {k.loglar.map(l => (
                          <tr key={l.id} className="hover:bg-slate-50">
                            <td className="px-4 py-2 text-slate-600">{saatFormatla(l.giris_zamani)}</td>
                            <td className="px-4 py-2 text-slate-500">{cihazOzetle(l.cihaz_bilgisi)}</td>
                            <td className="px-4 py-2 text-slate-400 font-mono">{l.ip_adresi ?? '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ))}
          </div>
        )
      }
    </div>
  )
}
