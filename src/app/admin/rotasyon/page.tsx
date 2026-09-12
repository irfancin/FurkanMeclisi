'use client'

import { useEffect, useState, useCallback } from 'react'

interface Grup { id: string; grup_adi: string }
interface DonemBilgi {
  donem: {
    tur_no: number
    baslangic_tarihi: string
    bitis_tarihi: string
  }
  uye_sayisi: number
  grup_tipi: 'Hatim' | 'Zikir'
}

function tarihFormatla(iso: string) {
  return new Date(iso).toLocaleDateString('tr-TR', {
    day: 'numeric', month: 'long', year: 'numeric'
  })
}

type Adim = 'bilgi' | 'onay' | 'tamam'

export default function RotasyonPage() {
  const [gruplar, setGruplar] = useState<Grup[]>([])
  const [seciliGrup, setSeciliGrup] = useState<string>('')
  const [donemBilgi, setDonemBilgi] = useState<DonemBilgi | null>(null)
  const [hata, setHata] = useState('')
  const [adim, setAdim] = useState<Adim>('bilgi')
  const [sonuc, setSonuc] = useState<{ yeni_tur_no: number; atanan: number } | null>(null)
  const [islem, setIslem] = useState(false)

  useEffect(() => {
    fetch('/api/admin/gruplar')
      .then(r => r.json())
      .then(d => {
        setGruplar(d.gruplar ?? [])
        if (d.gruplar?.length) setSeciliGrup(d.gruplar[0].id)
      })
  }, [])

  const donemBilgiYukle = useCallback(async (grup_id: string) => {
    setHata('')
    setDonemBilgi(null)
    setAdim('bilgi')
    const res = await fetch(`/api/admin/rotasyon?grup_id=${grup_id}`)
    const d = await res.json()
    if (!res.ok) setHata(d.hata)
    else setDonemBilgi(d)
  }, [])

  useEffect(() => {
    if (seciliGrup) donemBilgiYukle(seciliGrup)
  }, [seciliGrup, donemBilgiYukle])

  const turBaslat = async () => {
    setIslem(true)
    const res = await fetch('/api/admin/rotasyon', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ grup_id: seciliGrup }),
    })
    const d = await res.json()
    setIslem(false)
    if (!res.ok) {
      setHata(d.hata)
      setAdim('bilgi')
    } else {
      setSonuc({ yeni_tur_no: d.yeni_tur_no, atanan: d.atanan })
      setAdim('tamam')
    }
  }

  const { yeniBasStr, yeniBitStr, araBasStr, araBitStr } = donemBilgi
    ? (() => {
        const araBas = new Date(donemBilgi.donem.bitis_tarihi)
        araBas.setDate(araBas.getDate() + 1)
        const araBit = new Date(donemBilgi.donem.bitis_tarihi)
        araBit.setDate(araBit.getDate() + 15)
        const yeniBas = new Date(donemBilgi.donem.bitis_tarihi)
        yeniBas.setDate(yeniBas.getDate() + 16)
        const yeniBit = new Date(yeniBas)
        yeniBit.setDate(yeniBit.getDate() + 29)
        return {
          yeniBasStr: tarihFormatla(yeniBas.toISOString()),
          yeniBitStr: tarihFormatla(yeniBit.toISOString()),
          araBasStr: tarihFormatla(araBas.toISOString()),
          araBitStr: tarihFormatla(araBit.toISOString()),
        }
      })()
    : { yeniBasStr: '', yeniBitStr: '', araBasStr: '', araBitStr: '' }

  return (
    <div className="py-4 max-w-lg space-y-4">
      <div>
        <h1 className="text-lg font-semibold text-slate-800">Tur Rotasyonu</h1>
        <p className="text-sm text-slate-400 mt-0.5">
          Bir grubun mevcut turu kapanıp yeni tur açılır; cüz numaraları 1 artırılır (30 → 1).
        </p>
      </div>

      {/* Grup seç */}
      <div>
        <label className="block text-xs font-medium text-slate-500 mb-1">Grup</label>
        <select
          value={seciliGrup}
          onChange={e => { setSeciliGrup(e.target.value); setAdim('bilgi') }}
          className="border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          {gruplar.map(g => <option key={g.id} value={g.id}>{g.grup_adi}</option>)}
        </select>
      </div>

      {hata && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-600 text-sm">{hata}</div>
      )}

      {/* ADIM 1 — Mevcut tur bilgisi */}
      {adim === 'bilgi' && donemBilgi && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
          <div>
            <p className="text-xs text-slate-400 uppercase tracking-wide mb-3">Mevcut Tur</p>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="bg-slate-50 rounded-lg p-3">
                <p className="text-2xl font-bold text-slate-700">{donemBilgi.donem.tur_no}</p>
                <p className="text-xs text-slate-400">Tur No</p>
              </div>
              <div className="bg-slate-50 rounded-lg p-3">
                <p className="text-2xl font-bold text-emerald-600">{donemBilgi.uye_sayisi}</p>
                <p className="text-xs text-slate-400">Aktif Üye</p>
              </div>
              <div className="bg-slate-50 rounded-lg p-3">
                <p className="text-2xl font-bold text-slate-700">{donemBilgi.donem.tur_no + 1}</p>
                <p className="text-xs text-slate-400">Sonraki Tur</p>
              </div>
            </div>
          </div>

          <div className="text-sm text-slate-500 space-y-1.5">
            <p>
              <span className="text-slate-400">Mevcut dönem:</span>{' '}
              {tarihFormatla(donemBilgi.donem.baslangic_tarihi)} – {tarihFormatla(donemBilgi.donem.bitis_tarihi)}
            </p>
            <p>
              <span className="text-amber-400">⏸ Ara:</span>{' '}
              {araBasStr} – {araBitStr}
              <span className="text-xs text-slate-400 ml-1">(15 gün)</span>
            </p>
            <p>
              <span className="text-emerald-500">▶ Yeni dönem:</span>{' '}
              {yeniBasStr} – {yeniBitStr}
            </p>
            {donemBilgi.grup_tipi === 'Zikir' && (
              <p className="text-xs bg-violet-50 text-violet-700 rounded-lg px-3 py-2 mt-1">
                Bu bir Zikir grubudur — cüz numarası rotasyonu yapılmaz.
              </p>
            )}
          </div>

          <button
            onClick={() => setAdim('onay')}
            className="w-full bg-amber-500 hover:bg-amber-600 text-white font-semibold py-3 rounded-xl transition-colors"
          >
            Yeni Tur Başlat →
          </button>
        </div>
      )}

      {/* ADIM 2 — Onay */}
      {adim === 'onay' && donemBilgi && (
        <div className="bg-white rounded-xl border border-amber-200 p-5 space-y-4">
          <div className="flex items-start gap-3">
            <span className="text-2xl">⚠️</span>
            <div>
              <p className="font-semibold text-slate-800">Emin misiniz?</p>
              <p className="text-sm text-slate-500 mt-1">
                <strong>{gruplar.find(g => g.id === seciliGrup)?.grup_adi}</strong> grubu için{' '}
                <strong>{donemBilgi.donem.tur_no}. Tur</strong> kapatılacak,{' '}
                <strong>{donemBilgi.donem.tur_no + 1}. Tur</strong> açılacak.
              </p>
              <p className="text-sm text-slate-500 mt-1">
                {donemBilgi.grup_tipi === 'Hatim'
                  ? `${donemBilgi.uye_sayisi} üyenin cüz numarası 1 artırılacak (30 → 1).`
                  : `${donemBilgi.uye_sayisi} üye için yeni dönem açılacak (cüz rotasyonu yok).`}
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={turBaslat}
              disabled={islem}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white font-semibold py-3 rounded-xl transition-colors"
            >
              {islem ? 'İşleniyor...' : 'Evet, Yeni Tur Başlat'}
            </button>
            <button
              onClick={() => setAdim('bilgi')}
              disabled={islem}
              className="flex-1 border border-slate-300 text-slate-600 font-medium py-3 rounded-xl hover:bg-slate-50 transition-colors"
            >
              Vazgeç
            </button>
          </div>
        </div>
      )}

      {/* ADIM 3 — Tamamlandı */}
      {adim === 'tamam' && sonuc && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 text-center space-y-3">
          <div className="text-4xl">✅</div>
          <p className="font-semibold text-emerald-800 text-lg">
            {sonuc.yeni_tur_no}. Tur başlatıldı!
          </p>
          <p className="text-sm text-emerald-600">
            {sonuc.atanan} üyenin cüz numarası güncellendi.
          </p>
          <button
            onClick={() => donemBilgiYukle(seciliGrup)}
            className="mt-2 text-sm text-emerald-700 underline hover:no-underline"
          >
            Tur bilgisini yenile
          </button>
        </div>
      )}
    </div>
  )
}
