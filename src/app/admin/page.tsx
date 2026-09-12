'use client'

import { useEffect, useState, useCallback } from 'react'

interface Grup { id: string; grup_adi: string }
interface Uye {
  id: string; ad_soyad: string; tel_no: string
  cuz_no: number | null; okudu: boolean
}
interface Rapor {
  donem: { tur_no: number; baslangic_tarihi: string; bitis_tarihi: string }
  uyeler: Uye[]
  okuyanlar: number
  toplam: number
}

function waLink(tel: string) {
  const d = tel.replace(/\D/g, '')
  return `https://wa.me/${d.startsWith('0') ? '9' + d.slice(1) : '90' + d}`
}

function bugunTR() {
  return new Date().toLocaleDateString('tr-TR', {
    timeZone: 'Europe/Istanbul',
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  })
}

export default function AdminRaporPage() {
  const [gruplar, setGruplar] = useState<Grup[]>([])
  const [aktifGrup, setAktifGrup] = useState<string>('')
  const [rapor, setRapor] = useState<Rapor | null>(null)
  const [hata, setHata] = useState('')
  const [yukleniyor, setYukleniyor] = useState(false)

  // Grupları yükle
  useEffect(() => {
    fetch('/api/admin/gruplar')
      .then(r => r.json())
      .then(d => {
        if (d.gruplar?.length) {
          setGruplar(d.gruplar)
          setAktifGrup(d.gruplar[0].id)
        }
      })
  }, [])

  // Seçili grubun raporunu yükle
  const raporYukle = useCallback(async (grup_id: string) => {
    setYukleniyor(true)
    setHata('')
    setRapor(null)
    const res = await fetch(`/api/admin/rapor?grup_id=${grup_id}`)
    const json = await res.json()
    if (!res.ok) setHata(json.hata)
    else setRapor(json)
    setYukleniyor(false)
  }, [])

  useEffect(() => {
    if (aktifGrup) raporYukle(aktifGrup)
  }, [aktifGrup, raporYukle])

  const okumayan = rapor?.uyeler.filter(u => !u.okudu) ?? []
  const okuyan = rapor?.uyeler.filter(u => u.okudu) ?? []

  return (
    <div className="space-y-4 py-4">
      {/* Tarih */}
      <p className="text-sm text-slate-400 capitalize">{bugunTR()}</p>

      {/* Grup sekmeleri */}
      {gruplar.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {gruplar.map(g => (
            <button
              key={g.id}
              onClick={() => setAktifGrup(g.id)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                aktifGrup === g.id
                  ? 'bg-emerald-600 text-white'
                  : 'bg-white border border-slate-200 text-slate-600 hover:border-emerald-400'
              }`}
            >
              {g.grup_adi}
            </button>
          ))}
        </div>
      )}

      {yukleniyor && <p className="text-slate-400 text-sm">Yükleniyor...</p>}

      {hata && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-amber-700 text-sm">
          {hata}
        </div>
      )}

      {rapor && (
        <>
          {/* Özet kartlar */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
              <p className="text-2xl font-bold text-emerald-600">{rapor.okuyanlar}</p>
              <p className="text-xs text-slate-400 mt-1">Okuyan</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
              <p className="text-2xl font-bold text-red-500">{rapor.toplam - rapor.okuyanlar}</p>
              <p className="text-xs text-slate-400 mt-1">Okumayan</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
              <p className="text-2xl font-bold text-slate-700">{rapor.toplam}</p>
              <p className="text-xs text-slate-400 mt-1">Toplam</p>
            </div>
          </div>

          {/* İlerleme çubuğu */}
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-slate-500">{rapor.donem.tur_no}. Tur — Günlük Katılım</span>
              <span className="font-semibold text-slate-700">
                %{rapor.toplam > 0 ? Math.round((rapor.okuyanlar / rapor.toplam) * 100) : 0}
              </span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-3">
              <div
                className="bg-emerald-500 h-3 rounded-full transition-all"
                style={{ width: `${rapor.toplam > 0 ? (rapor.okuyanlar / rapor.toplam) * 100 : 0}%` }}
              />
            </div>
          </div>

          {/* Okumayan listesi — her zaman göster */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-400" />
              <h2 className="font-semibold text-slate-700 text-sm">
                Henüz Okumayan ({okumayan.length} kişi)
              </h2>
            </div>
            {okumayan.length === 0 ? (
              <div className="px-4 py-6 text-center">
                <p className="text-2xl mb-1">🎉</p>
                <p className="text-sm font-medium text-emerald-600">Herkes bugün okudu!</p>
              </div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {okumayan.map(u => (
                  <li key={u.id} className="flex items-center justify-between px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-slate-700">{u.ad_soyad}</p>
                      <p className="text-xs text-slate-400">{u.cuz_no ? `${u.cuz_no}. Cüz` : '—'}</p>
                    </div>
                    <a
                      href={waLink(u.tel_no)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 bg-green-500 hover:bg-green-600 text-white text-xs font-medium px-3 py-1.5 rounded-full transition-colors"
                    >
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                      </svg>
                      Yaz
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Okuyanlar — daraltılmış */}
          {okuyan.length > 0 && (
            <details className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <summary className="px-4 py-3 flex items-center gap-2 cursor-pointer hover:bg-slate-50 list-none">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span className="text-sm font-semibold text-slate-700">Okuyanlar ({okuyan.length} kişi)</span>
                <span className="ml-auto text-slate-400 text-xs">▼</span>
              </summary>
              <ul className="divide-y divide-slate-100 border-t border-slate-100">
                {okuyan.map(u => (
                  <li key={u.id} className="flex items-center justify-between px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-slate-700">{u.ad_soyad}</p>
                      <p className="text-xs text-slate-400">{u.cuz_no ? `${u.cuz_no}. Cüz` : '—'}</p>
                    </div>
                    <span className="text-emerald-500 text-lg">✓</span>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </>
      )}
    </div>
  )
}
