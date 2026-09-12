'use client'

import { useEffect, useState, useCallback, useRef } from 'react'

interface Grup { id: string; grup_adi: string }
interface Donem { id: string; tur_no: number; baslangic_tarihi: string; bitis_tarihi: string }
interface KPI {
  bugun_okuyan: number; toplam_aktif_uye: number
  aktif_tur: number; bu_ay_biten: number
  en_uzun_seri: { kisi: string; gun: number }
}
interface MatrisSatir {
  kullanici_id: string; ad_soyad: string; cuz_no: number | null; toplam: number
  gunler: { tarih: string; okudu: boolean }[]
}
interface Tur { id: string; tur_no: number; baslangic_tarihi: string; bitis_tarihi: string; uye_sayisi: number; tamamlanma_yuzdesi: number }

type Sekme = 'kpi' | 'matris' | 'turlar'

function tarihKisa(iso: string) {
  return new Date(iso).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })
}
function tarihUzun(iso: string) {
  return new Date(iso).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })
}

export default function RaporlarPage() {
  const [sekme, setSekme] = useState<Sekme>('kpi')
  const [gruplar, setGruplar] = useState<Grup[]>([])
  const [seciliGrup, setSeciliGrup] = useState('')
  const [kpi, setKpi] = useState<KPI | null>(null)
  const [donemler, setDonemler] = useState<Donem[]>([])
  const [seciliDonem, setSeciliDonem] = useState('')
  const [matris, setMatris] = useState<{ gunler: string[]; satirlar: MatrisSatir[] } | null>(null)
  const [turlar, setTurlar] = useState<Tur[]>([])
  const [yukleniyor, setYukleniyor] = useState(false)
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

  useEffect(() => {
    fetch('/api/admin/gruplar').then(r => r.json()).then(d => {
      setGruplar(d.gruplar ?? [])
      if (d.gruplar?.length) setSeciliGrup(d.gruplar[0].id)
    })
    fetch('/api/admin/raporlar?tip=kpi').then(r => r.json()).then(setKpi)
  }, [])

  // Grup değişince dönem listesini ve geçmiş turları yükle
  useEffect(() => {
    if (!seciliGrup) return
    // Matris dropdown için tüm dönemler
    fetch(`/api/admin/raporlar?tip=donemler&grup_id=${seciliGrup}`)
      .then(r => r.json()).then(d => {
        const liste: Donem[] = d.donemler ?? []
        setDonemler(liste)
        if (liste.length) setSeciliDonem(liste[0].id)
      })
    // Geçmiş turlar sekmesi için
    fetch(`/api/admin/raporlar?tip=turlar&grup_id=${seciliGrup}`)
      .then(r => r.json()).then(d => setTurlar(d.turlar ?? []))
  }, [seciliGrup])

  const matrisYukle = useCallback(async () => {
    if (!seciliGrup || !seciliDonem) return
    setYukleniyor(true)
    const res = await fetch(`/api/admin/raporlar?tip=matris&grup_id=${seciliGrup}&donem_id=${seciliDonem}`)
    const d = await res.json()
    setMatris(d.gunler ? { gunler: d.gunler, satirlar: d.satirlar } : null)
    setYukleniyor(false)
  }, [seciliGrup, seciliDonem])

  useEffect(() => { if (sekme === 'matris') matrisYukle() }, [sekme, matrisYukle])

  return (
    <div className="py-4 space-y-4">
      {/* Sekme */}
      <div className="flex gap-2 flex-wrap">
        {([['kpi', 'KPI Kartları'], ['matris', 'Tur Matrisi'], ['turlar', 'Geçmiş Turlar']] as [Sekme, string][]).map(([s, l]) => (
          <button key={s} onClick={() => setSekme(s)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${sekme === s ? 'bg-emerald-600 text-white' : 'bg-white border border-slate-200 text-slate-600'}`}>
            {l}
          </button>
        ))}
      </div>

      {/* ---- KPI ---- */}
      {sekme === 'kpi' && kpi && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <p className="text-xs text-slate-400 mb-1">Bugün Okuma Oranı</p>
              <p className="text-2xl font-bold text-emerald-600">
                {kpi.toplam_aktif_uye > 0 ? Math.round((kpi.bugun_okuyan / kpi.toplam_aktif_uye) * 100) : 0}%
              </p>
              <p className="text-xs text-slate-400 mt-1">{kpi.bugun_okuyan} / {kpi.toplam_aktif_uye} kişi</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <p className="text-xs text-slate-400 mb-1">Aktif Tur Sayısı</p>
              <p className="text-2xl font-bold text-slate-700">{kpi.aktif_tur}</p>
              <p className="text-xs text-slate-400 mt-1">şu an devam eden</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <p className="text-xs text-slate-400 mb-1">Bu Ay Biten Turlar</p>
              <p className="text-2xl font-bold text-slate-700">{kpi.bu_ay_biten}</p>
              <p className="text-xs text-slate-400 mt-1">tamamlanan hatim</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <p className="text-xs text-slate-400 mb-1">En Uzun Seri</p>
              <p className="text-2xl font-bold text-amber-500">{kpi.en_uzun_seri.gun} gün</p>
              <p className="text-xs text-slate-500 mt-1 truncate">{kpi.en_uzun_seri.kisi || '—'}</p>
            </div>
          </div>
        </div>
      )}

      {/* ---- MATRİS ---- */}
      {sekme === 'matris' && (
        <div className="space-y-2">
          <div className="flex gap-2 flex-wrap items-end">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-0.5">Grup</label>
              <select value={seciliGrup} onChange={e => setSeciliGrup(e.target.value)}
                className="border border-slate-300 rounded-lg px-2 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500">
                {gruplar.map(g => <option key={g.id} value={g.id}>{g.grup_adi}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-0.5">Tur</label>
              <select value={seciliDonem} onChange={e => setSeciliDonem(e.target.value)}
                className="border border-slate-300 rounded-lg px-2 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500">
                {donemler.map(d => <option key={d.id} value={d.id}>{d.tur_no}. Tur</option>)}
              </select>
            </div>
            <button onClick={matrisYukle}
              className="bg-emerald-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-emerald-700">
              Göster
            </button>
          </div>

          {yukleniyor && <p className="text-slate-400 text-sm">Yükleniyor...</p>}

          {matris && (
            <div className="bg-white rounded-xl border border-slate-200">
              {/* Üst scroll bar */}
              <div
                ref={topScrollRef}
                onScroll={onTopScroll}
                className="overflow-x-auto"
                style={{ height: 12 }}
              >
                <div style={{ width: tableScrollWidth || '100%', height: 1 }} />
              </div>
              <div
                ref={el => {
                  (tableScrollRef as React.MutableRefObject<HTMLDivElement | null>).current = el
                  if (el) setTableScrollWidth(el.scrollWidth)
                }}
                onScroll={onTableScroll}
                className="overflow-auto"
                style={{ maxHeight: 'calc(100vh - 230px)' }}
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
                          {g.okudu
                            ? <span className="text-emerald-500">✓</span>
                            : <span className="text-slate-200">–</span>
                          }
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

      {/* ---- TAMAMLANAN TURLAR ---- */}
      {sekme === 'turlar' && (
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Grup</label>
            <select value={seciliGrup} onChange={e => setSeciliGrup(e.target.value)}
              className="border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500">
              {gruplar.map(g => <option key={g.id} value={g.id}>{g.grup_adi}</option>)}
            </select>
          </div>

          {turlar.length === 0
            ? <p className="text-slate-400 text-sm">Henüz tamamlanan tur yok.</p>
            : (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <ul className="divide-y divide-slate-100">
                {turlar.map(t => (
                  <li key={t.id} className="px-4 py-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-700">{t.tur_no}. Tur</p>
                      <p className="text-xs text-slate-400">
                        {tarihUzun(t.baslangic_tarihi)} – {tarihUzun(t.bitis_tarihi)}
                      </p>
                      <p className="text-xs text-slate-400">{t.uye_sayisi} üye</p>
                    </div>
                    <div className="text-right">
                      <p className={`text-lg font-bold ${t.tamamlanma_yuzdesi === 100 ? 'text-emerald-600' : t.tamamlanma_yuzdesi >= 70 ? 'text-amber-500' : 'text-red-500'}`}>
                        %{t.tamamlanma_yuzdesi}
                      </p>
                      <p className="text-xs text-slate-400">tamamlama</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
