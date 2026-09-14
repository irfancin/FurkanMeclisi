'use client'

import { useEffect, useState, useCallback, useRef } from 'react'

interface Grup { id: string; grup_adi: string }
interface Donem { id: string; tur_no: number; baslangic_tarihi: string; bitis_tarihi: string }
interface MatrisSatir {
  kullanici_id: string; ad_soyad: string; cuz_no: number | null; toplam: number
  gunler: { tarih: string; okudu: boolean }[]
}
interface GunlukUye {
  id: string; ad_soyad: string; tel_no: string; cuz_no: number | null; okudu: boolean
}
interface Rapor {
  donem: { tur_no: number; baslangic_tarihi: string; bitis_tarihi: string }
  aktif?: boolean
  sonraki_bas?: string
  uyeler: GunlukUye[]
  okuyanlar: number
  toplam: number
  gun_no: number
  toplam_gun: number
  eksik_top3: { ad_soyad: string; eksik_gun: number }[]
}

function tarihTR(iso: string) {
  return new Date(iso).toLocaleDateString('tr-TR', {
    day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Istanbul'
  })
}

type Sekme = 'gunluk' | 'matris'

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

function bugunKisa() {
  return new Date().toLocaleDateString('tr-TR', {
    timeZone: 'Europe/Istanbul',
    day: 'numeric', month: 'long'
  })
}

export default function RaporlarPage() {
  const [sekme, setSekme] = useState<Sekme>('gunluk')
  const [gruplar, setGruplar] = useState<Grup[]>([])
  const [seciliGrup, setSeciliGrup] = useState('')

  // Günlük rapor
  const [rapor, setRapor] = useState<Rapor | null>(null)
  const [raporYukleniyor, setRaporYukleniyor] = useState(false)
  const [raporHata, setRaporHata] = useState('')

  // Matris
  const [donemler, setDonemler] = useState<Donem[]>([])
  const [seciliDonem, setSeciliDonem] = useState('')
  const [matris, setMatris] = useState<{ gunler: string[]; satirlar: MatrisSatir[] } | null>(null)
  const [matrisYukleniyor, setMatrisYukleniyor] = useState(false)
  const [ozetGoster, setOzetGoster] = useState(false)
  const [kopyalandi, setKopyalandi] = useState(false)
  const topScrollRef = useRef<HTMLDivElement>(null)
  const tableScrollRef = useRef<HTMLDivElement>(null)
  const [tableScrollWidth, setTableScrollWidth] = useState(0)

  const onTopScroll = () => {
    if (tableScrollRef.current && topScrollRef.current)
      tableScrollRef.current.scrollLeft = topScrollRef.current.scrollLeft
  }
  const onTableScroll = () => {
    if (tableScrollRef.current && topScrollRef.current)
      topScrollRef.current.scrollLeft = tableScrollRef.current.scrollLeft
  }

  // Grupları yükle
  useEffect(() => {
    fetch('/api/admin/gruplar').then(r => r.json()).then(d => {
      setGruplar(d.gruplar ?? [])
      if (d.gruplar?.length) setSeciliGrup(d.gruplar[0].id)
    })
  }, [])

  // Günlük rapor yükle
  const raporYukle = useCallback(async (grup_id: string) => {
    if (!grup_id) return
    setRaporYukleniyor(true); setRaporHata(''); setRapor(null)
    const res = await fetch(`/api/admin/rapor?grup_id=${grup_id}`)
    const json = await res.json()
    if (!res.ok) setRaporHata(json.hata)
    else setRapor(json)
    setRaporYukleniyor(false)
  }, [])

  // Grup değişince dönemleri ve günlük raporu yükle
  useEffect(() => {
    if (!seciliGrup) return
    raporYukle(seciliGrup)
    fetch(`/api/admin/raporlar?tip=donemler&grup_id=${seciliGrup}`)
      .then(r => r.json()).then(d => {
        const liste: Donem[] = d.donemler ?? []
        setDonemler(liste)
        if (liste.length) setSeciliDonem(liste[0].id)
      })
  }, [seciliGrup, raporYukle])

  const matrisYukle = useCallback(async () => {
    if (!seciliGrup || !seciliDonem) return
    setMatrisYukleniyor(true)
    const res = await fetch(`/api/admin/raporlar?tip=matris&grup_id=${seciliGrup}&donem_id=${seciliDonem}`)
    const d = await res.json()
    setMatris(d.gunler ? { gunler: d.gunler, satirlar: d.satirlar } : null)
    setMatrisYukleniyor(false)
  }, [seciliGrup, seciliDonem])

  useEffect(() => { if (sekme === 'matris') matrisYukle() }, [sekme, matrisYukle])

  const okumayan = rapor?.uyeler.filter(u => !u.okudu) ?? []
  const okuyan = rapor?.uyeler.filter(u => u.okudu) ?? []

  const hatirlatmaKopyala = async () => {
    const grupAdi = gruplar.find(g => g.id === seciliGrup)?.grup_adi ?? 'Furkan Meclisi'
    const liste = okumayan.map(u => `• ${u.ad_soyad}${u.cuz_no ? ` (Cüz: ${u.cuz_no})` : ''}`).join('\n')
    const metin = `📖 Furkan Meclisi — ${grupAdi}\nBugün (${bugunKisa()}) henüz okuma girişi yapmayanlar:\n${liste}\nLütfen okumalarınızı tamamlayıp giriş yapınız 🤲`
    await navigator.clipboard.writeText(metin)
    setKopyalandi(true)
    setTimeout(() => setKopyalandi(false), 2000)
  }

  return (
    <div className="py-2 space-y-3">

      {/* Sekme + inline kontroller */}
      <div className="flex items-center gap-2 flex-wrap">
        {([['gunluk', 'Günlük Rapor'], ['matris', 'Tur Matrisi']] as [Sekme, string][]).map(([s, l]) => (
          <button key={s} onClick={() => setSekme(s)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${sekme === s ? 'bg-emerald-600 text-white' : 'bg-white border border-slate-200 text-slate-600'}`}>
            {l}
          </button>
        ))}

        {sekme === 'matris' && (<>
          <span className="text-slate-300 select-none">|</span>
          <select value={seciliGrup} onChange={e => setSeciliGrup(e.target.value)}
            className="border border-sky-300 rounded-full px-3 py-1.5 text-xs text-sky-800 bg-sky-50 focus:outline-none focus:ring-2 focus:ring-sky-400">
            {gruplar.map(g => <option key={g.id} value={g.id}>{g.grup_adi}</option>)}
          </select>
          <select value={seciliDonem} onChange={e => setSeciliDonem(e.target.value)}
            className="border border-sky-300 rounded-full px-3 py-1.5 text-xs text-sky-800 bg-sky-50 focus:outline-none focus:ring-2 focus:ring-sky-400">
            {donemler.map(d => <option key={d.id} value={d.id}>{d.tur_no}. Tur</option>)}
          </select>
          <button onClick={matrisYukle}
            className="bg-sky-500 text-white px-3 py-1.5 rounded-full text-xs font-medium hover:bg-sky-600 transition-colors">
            Göster
          </button>
          {matris && (
            <button onClick={() => setOzetGoster(o => !o)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors border ${ozetGoster ? 'bg-slate-700 text-white border-slate-700' : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50'}`}>
              {ozetGoster ? '📋 Detay' : '📋 Özet'}
            </button>
          )}
        </>)}
      </div>

      {/* ---- GÜNLÜK RAPOR ---- */}
      {sekme === 'gunluk' && (
        <div className="space-y-4">
          <p className="text-sm text-slate-400 capitalize">{bugunTR()}</p>

          {/* Grup seç */}
          {gruplar.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              {gruplar.map(g => (
                <button key={g.id} onClick={() => setSeciliGrup(g.id)}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    seciliGrup === g.id ? 'bg-emerald-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:border-emerald-400'
                  }`}>
                  {g.grup_adi}
                </button>
              ))}
            </div>
          )}

          {raporYukleniyor && <p className="text-slate-400 text-sm">Yükleniyor...</p>}
          {raporHata && <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-amber-700 text-sm">{raporHata}</div>}

          {/* Tur arası durumu */}
          {rapor && rapor.aktif === false && (
            <div className="space-y-3">
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 text-center">
                <p className="text-2xl mb-2">⏸</p>
                <p className="font-semibold text-amber-800">{rapor.donem.tur_no}. Tur tamamlandı</p>
                {rapor.sonraki_bas && (
                  <p className="text-sm text-amber-600 mt-1">
                    Yeni tur: {tarihTR(rapor.sonraki_bas)}
                  </p>
                )}
              </div>
              <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
                <p className="text-2xl font-bold text-slate-700">{rapor.toplam}</p>
                <p className="text-xs text-slate-400 mt-1">Toplam Üye</p>
              </div>
            </div>
          )}

          {rapor && rapor.aktif !== false && (<>
            {/* KPI kartlar — 2x2 grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
                <p className="text-2xl font-bold text-emerald-600">{rapor.okuyanlar}</p>
                <p className="text-xs text-slate-400 mt-1">Bugün Okuyan</p>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
                <p className="text-2xl font-bold text-red-500">{rapor.toplam - rapor.okuyanlar}</p>
                <p className="text-xs text-slate-400 mt-1">Bugün Okumayan</p>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
                <p className="text-2xl font-bold text-slate-700">{rapor.toplam}</p>
                <p className="text-xs text-slate-400 mt-1">Toplam Üye</p>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
                <p className="text-2xl font-bold text-blue-600">
                  {rapor.gun_no}<span className="text-base font-normal text-slate-400">/{rapor.toplam_gun}</span>
                </p>
                <p className="text-xs text-slate-400 mt-1">{rapor.donem.tur_no}. Tur — Günü</p>
              </div>
            </div>

            {/* En çok eksik — top 3 */}
            {rapor.eksik_top3.length > 0 && (
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                  <h2 className="font-semibold text-slate-700 text-sm">En Çok Eksik (Bu Tur)</h2>
                </div>
                <ul className="divide-y divide-slate-50">
                  {rapor.eksik_top3.map((u, i) => (
                    <li key={u.ad_soyad} className="flex items-center justify-between px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-400 w-4">{i + 1}.</span>
                        <span className="text-sm font-medium text-slate-700">{u.ad_soyad}</span>
                      </div>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                        u.eksik_gun >= 10 ? 'bg-red-100 text-red-600' :
                        u.eksik_gun >= 5  ? 'bg-amber-100 text-amber-700' :
                                            'bg-slate-100 text-slate-600'
                      }`}>
                        {u.eksik_gun} gün eksik
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* İlerleme çubuğu */}
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-slate-500">{rapor.donem.tur_no}. Tur — Günlük Katılım</span>
                <span className="font-semibold text-slate-700">
                  %{rapor.toplam > 0 ? Math.round((rapor.okuyanlar / rapor.toplam) * 100) : 0}
                </span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-3">
                <div className="bg-emerald-500 h-3 rounded-full transition-all"
                  style={{ width: `${rapor.toplam > 0 ? (rapor.okuyanlar / rapor.toplam) * 100 : 0}%` }} />
              </div>
            </div>

            {/* Okumayan listesi */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-400" />
                <h2 className="font-semibold text-slate-700 text-sm">Henüz Okumayan ({okumayan.length} kişi)</h2>
                {okumayan.length > 0 && (
                  <button onClick={hatirlatmaKopyala}
                    className="ml-auto flex items-center gap-1.5 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-700 text-xs font-medium px-3 py-1 rounded-full transition-colors">
                    {kopyalandi ? '✅ Kopyalandı!' : '📋 Hatırlatma Metnini Kopyala'}
                  </button>
                )}
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
                      <a href={waLink(u.tel_no)} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1.5 bg-green-500 hover:bg-green-600 text-white text-xs font-medium px-3 py-1.5 rounded-full transition-colors">
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

            {/* Okuyanlar */}
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
          </>)}
        </div>
      )}

      {/* ---- TUR MATRİSİ ---- */}
      {sekme === 'matris' && (
        <div className="space-y-2">
          {matrisYukleniyor && <p className="text-slate-400 text-sm">Yükleniyor...</p>}

          {matris && ozetGoster && (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium text-slate-500">Üye</th>
                    <th className="px-3 py-2 text-center font-medium text-slate-500">Cüz</th>
                    <th className="px-3 py-2 text-center font-medium text-slate-500">Okunan Gün</th>
                    <th className="px-4 py-2 text-center font-medium text-slate-500">Oran</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {matris.satirlar.map(s => {
                    const oran = Math.round((s.toplam / matris.gunler.length) * 100)
                    return (
                      <tr key={s.kullanici_id} className="hover:bg-slate-50">
                        <td className="px-4 py-2 font-medium text-slate-700">{s.ad_soyad}</td>
                        <td className="px-3 py-2 text-center text-emerald-600 font-medium">{s.cuz_no ?? '—'}</td>
                        <td className="px-3 py-2 text-center text-slate-600">{s.toplam}</td>
                        <td className="px-4 py-2 text-center">
                          <span className={`font-semibold px-2 py-0.5 rounded-full ${oran >= 80 ? 'bg-emerald-100 text-emerald-700' : oran >= 50 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-600'}`}>
                            %{oran}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {matris && !ozetGoster && (
            <div className="bg-white rounded-xl border border-slate-200">
              <div ref={topScrollRef} onScroll={onTopScroll} className="overflow-x-auto" style={{ height: 12 }}>
                <div style={{ width: tableScrollWidth || '100%', height: 1 }} />
              </div>
              <div
                ref={el => {
                  (tableScrollRef as React.MutableRefObject<HTMLDivElement | null>).current = el
                  if (el) setTableScrollWidth(el.scrollWidth)
                }}
                onScroll={onTableScroll}
                className="overflow-auto"
                style={{ maxHeight: 'calc(100vh - 200px)' }}
              >
                <table className="text-xs min-w-max">
                  <thead className="sticky top-0 z-10 bg-white">
                    <tr className="border-b border-slate-100">
                      <th className="sticky left-0 bg-white px-3 py-2 text-left text-slate-500 font-medium min-w-32">Üye</th>
                      <th className="px-2 py-2 text-slate-400 font-medium">Cüz</th>
                      {matris.gunler.map((g, i) => (
                        <th key={g} className="px-1.5 py-2 text-slate-400 font-medium text-center min-w-7">{i + 1}</th>
                      ))}
                      <th className="px-3 py-2 text-slate-500 font-medium">Toplam</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {matris.satirlar.map(s => (
                      <tr key={s.kullanici_id} className="hover:bg-slate-50">
                        <td className="sticky left-0 bg-white px-3 py-2 font-medium text-slate-700 whitespace-nowrap">{s.ad_soyad}</td>
                        <td className="px-2 py-2 text-slate-400 text-center">{s.cuz_no ?? '—'}</td>
                        {s.gunler.map(g => (
                          <td key={g.tarih} className="px-1.5 py-2 text-center">
                            {g.okudu ? <span className="text-emerald-500">✓</span> : <span className="text-slate-200">–</span>}
                          </td>
                        ))}
                        <td className="px-3 py-2 text-center font-semibold text-slate-600">{s.toplam}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
