'use client'

import { useEffect, useState, useCallback } from 'react'

interface Grup { id: string; grup_adi: string }
interface Uye  { id: string; ad_soyad: string; cuz_lar: number[] }
interface DonemBilgi {
  donem: { id: string; tur_no: number; baslangic_tarihi: string; bitis_tarihi: string }
  cuz_lar: number[]
  okunan_gun: number
  bugun: string
  zikir?: boolean
}

function bugunIstanbul(): string {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Istanbul' }).format(new Date())
}

function tarihTR(iso: string) {
  return new Date(iso).toLocaleDateString('tr-TR', {
    day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Istanbul',
  })
}

// İki tarih arasındaki gün sayısı (dahil)
function gunFarki(bas: string, son: string): number {
  const a = new Date(bas).getTime()
  const b = new Date(son).getTime()
  return Math.max(0, Math.floor((b - a) / 86400000) + 1)
}

export default function ManuelKayitPage() {
  const [gruplar, setGruplar]           = useState<Grup[]>([])
  const [seciliGrup, setSeciliGrup]     = useState('')
  const [uyeler, setUyeler]             = useState<Uye[]>([])
  const [seciliUye, setSeciliUye]       = useState('')
  const [donemBilgi, setDonemBilgi]     = useState<DonemBilgi | null>(null)
  const [donemYukleniyor, setDonemYukleniyor] = useState(false)
  const [donemHata, setDonemHata]       = useState('')

  const [tarih, setTarih]               = useState(bugunIstanbul())
  const [gunSayisi, setGunSayisi]       = useState(1)

  const [kayitYukleniyor, setKayitYukleniyor] = useState(false)
  const [sonuc, setSonuc]               = useState<{ kaydedilen_gun: number; kaydedilen_cuz: number } | null>(null)
  const [hata, setHata]                 = useState('')

  // Grupları yükle
  useEffect(() => {
    fetch('/api/admin/gruplar').then(r => r.json()).then(d => {
      const liste: Grup[] = d.gruplar ?? []
      setGruplar(liste)
      if (liste.length) setSeciliGrup(liste[0].id)
    })
  }, [])

  // Grup değişince üyeleri yükle
  useEffect(() => {
    if (!seciliGrup) return
    setSeciliUye('')
    setUyeler([])
    setDonemBilgi(null)
    fetch(`/api/admin/uyeler?grup_id=${seciliGrup}`)
      .then(r => r.json())
      .then(d => {
        const liste: Uye[] = (d.uyeler ?? [])
          .filter((u: Uye & { aktif?: boolean }) => u.aktif !== false)
          .sort((a: Uye, b: Uye) => a.ad_soyad.localeCompare(b.ad_soyad, 'tr'))
        setUyeler(liste)
      })
  }, [seciliGrup])

  // Üye değişince dönem bilgisini yükle
  const donemYukle = useCallback(async (uye_id: string) => {
    if (!uye_id) return
    setDonemYukleniyor(true)
    setDonemHata('')
    setDonemBilgi(null)
    setSonuc(null)
    setHata('')
    setGunSayisi(1)
    setTarih(bugunIstanbul())
    const res = await fetch(`/api/admin/manuel-kayit?kullanici_id=${uye_id}`)
    const json = await res.json()
    if (!res.ok) setDonemHata(json.hata ?? 'Dönem yüklenemedi.')
    else setDonemBilgi(json)
    setDonemYukleniyor(false)
  }, [])

  useEffect(() => {
    if (seciliUye) donemYukle(seciliUye)
  }, [seciliUye, donemYukle])

  // Tarih değişince gün sayısını sınırla
  useEffect(() => {
    if (!donemBilgi) return
    const max = gunFarki(tarih, donemBilgi.donem.bitis_tarihi)
    if (gunSayisi > max) setGunSayisi(Math.max(1, max))
  }, [tarih, donemBilgi, gunSayisi])

  const maxGun = donemBilgi
    ? gunFarki(tarih, donemBilgi.donem.bitis_tarihi)
    : 1

  const tumDonemiTamamla = () => {
    if (!donemBilgi) return
    setGunSayisi(maxGun)
  }

  const kayitGir = async () => {
    if (!seciliUye || !donemBilgi) return
    setKayitYukleniyor(true)
    setHata('')
    setSonuc(null)

    const res = await fetch('/api/admin/manuel-kayit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        kullanici_id: seciliUye,
        tarih_baslangic: tarih,
        gun_sayisi: gunSayisi,
      }),
    })
    const json = await res.json()
    if (!res.ok) setHata(json.hata ?? 'Kayıt sırasında hata oluştu.')
    else {
      setSonuc({ kaydedilen_gun: json.kaydedilen_gun, kaydedilen_cuz: json.kaydedilen_cuz })
      // Dönem bilgisini yenile
      donemYukle(seciliUye)
    }
    setKayitYukleniyor(false)
  }

  const seciliUyeAdi = uyeler.find(u => u.id === seciliUye)?.ad_soyad ?? ''

  return (
    <div className="space-y-4 py-2">
      <div>
        <h1 className="text-lg font-semibold text-slate-800">✍️ Manuel Okuma Kaydı</h1>
        <p className="text-sm text-slate-400 mt-0.5">
          Uygulamayı kullanamayan üyeler adına okuma girişi yapın.
        </p>
      </div>

      {/* Grup seçimi */}
      {gruplar.length > 1 && (
        <div className="flex gap-2 flex-wrap">
          {gruplar.map(g => (
            <button key={g.id} onClick={() => setSeciliGrup(g.id)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                seciliGrup === g.id
                  ? 'bg-emerald-600 text-white'
                  : 'bg-white border border-slate-200 text-slate-600 hover:border-emerald-400'
              }`}>
              {g.grup_adi}
            </button>
          ))}
        </div>
      )}

      {/* Form kartı */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">

        {/* Üye seçimi */}
        <div className="p-4 border-b border-slate-100">
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
            Üye Seç
          </label>
          <select
            value={seciliUye}
            onChange={e => setSeciliUye(e.target.value)}
            className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-700 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-400"
          >
            <option value="">— Üye seçin —</option>
            {uyeler.map(u => (
              <option key={u.id} value={u.id}>
                {u.ad_soyad}{u.cuz_lar?.length ? ` (Cüz: ${u.cuz_lar.join(', ')})` : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Dönem yükleniyor */}
        {donemYukleniyor && (
          <div className="p-4 text-sm text-slate-400">Dönem bilgisi yükleniyor...</div>
        )}

        {/* Dönem hatası */}
        {donemHata && (
          <div className="p-4 bg-red-50 text-red-600 text-sm">{donemHata}</div>
        )}

        {/* Dönem bilgisi ve kayıt formu */}
        {donemBilgi && !donemYukleniyor && (
          <>
            {/* Dönem özeti */}
            <div className="px-4 py-3 bg-emerald-50 border-b border-emerald-100 flex items-center justify-between gap-2">
              <div>
                <p className="text-xs font-semibold text-emerald-700">
                  {donemBilgi.donem.tur_no}. Tur
                </p>
                <p className="text-xs text-emerald-600">
                  {tarihTR(donemBilgi.donem.baslangic_tarihi)} — {tarihTR(donemBilgi.donem.bitis_tarihi)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-emerald-600">
                  {donemBilgi.zikir
                    ? <><span className="font-semibold">Zikir</span></>
                    : <>Cüz: <span className="font-semibold">{donemBilgi.cuz_lar.join(', ') || '—'}</span></>
                  }
                </p>
                <p className="text-xs text-emerald-600">
                  Okunan: <span className="font-semibold">{donemBilgi.okunan_gun} gün</span>
                </p>
              </div>
            </div>

            {/* Tarih seçimi */}
            <div className="p-4 border-b border-slate-100">
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                Başlangıç Tarihi
              </label>
              <input
                type="date"
                value={tarih}
                min={donemBilgi.donem.baslangic_tarihi}
                max={donemBilgi.donem.bitis_tarihi}
                onChange={e => setTarih(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-700 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-400"
              />
            </div>

            {/* Gün sayısı */}
            <div className="p-4 border-b border-slate-100">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Gün Sayısı
                </label>
                <span className="text-sm font-bold text-emerald-600">
                  {gunSayisi} gün
                </span>
              </div>
              <input
                type="range"
                min={1}
                max={maxGun}
                value={gunSayisi}
                onChange={e => setGunSayisi(Number(e.target.value))}
                className="w-full accent-emerald-600"
              />
              <div className="flex justify-between text-xs text-slate-400 mt-1">
                <span>1 gün</span>
                <span>{maxGun} gün (dönem sonu)</span>
              </div>

              {/* Tüm Dönemi Tamamla kısayolu */}
              {maxGun > 1 && (
                <button
                  onClick={tumDonemiTamamla}
                  className="mt-3 w-full flex items-center justify-center gap-2 bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-700 text-sm font-medium py-2 rounded-xl transition-colors"
                >
                  🗓️ Tüm Dönemi Tamamla
                  <span className="text-xs font-normal text-purple-500">({maxGun} gün)</span>
                </button>
              )}
            </div>

            {/* Özet + Kaydet */}
            <div className="p-4 space-y-3">
              {/* Özet satırı */}
              <div className="bg-slate-50 rounded-xl p-3 text-sm text-slate-600 space-y-1">
                <p>
                  <span className="font-medium text-slate-800">{seciliUyeAdi}</span> adına,
                </p>
                <p>
                  <span className="font-medium">{tarihTR(tarih)}</span> tarihinden itibaren{' '}
                  <span className="font-medium text-emerald-700">{gunSayisi} günlük</span> okuma kaydı girilecek.
                </p>
                <p className="text-xs text-slate-400">
                  {donemBilgi.zikir
                    ? <>Zikir · Toplam {gunSayisi} kayıt</>
                    : <>Cüz: {donemBilgi.cuz_lar.join(', ')} · Toplam {gunSayisi * donemBilgi.cuz_lar.length} kayıt</>
                  }
                </p>
              </div>

              {/* Hata */}
              {hata && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-red-600 text-sm">
                  {hata}
                </div>
              )}

              {/* Başarı */}
              {sonuc && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-sm">
                  <p className="font-semibold text-emerald-700">✅ Kayıt tamamlandı!</p>
                  <p className="text-emerald-600 text-xs mt-1">
                    {sonuc.kaydedilen_gun} günlük · {sonuc.kaydedilen_cuz} cüz · toplam {sonuc.kaydedilen_gun * sonuc.kaydedilen_cuz} kayıt girildi.
                  </p>
                </div>
              )}

              <button
                onClick={kayitGir}
                disabled={kayitYukleniyor || !seciliUye}
                className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold py-3 rounded-xl text-sm transition-colors"
              >
                {kayitYukleniyor ? '⏳ Kaydediliyor...' : '✅ Kaydet'}
              </button>
            </div>
          </>
        )}

        {/* Üye seçilmedi boş durum */}
        {!seciliUye && !donemYukleniyor && (
          <div className="p-8 text-center text-slate-400 text-sm">
            Kayıt girmek istediğiniz üyeyi seçin
          </div>
        )}
      </div>
    </div>
  )
}
