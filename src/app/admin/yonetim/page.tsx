'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import * as XLSX from 'xlsx'

interface GrupDonem {
  tur_no: number
  baslangic_tarihi: string
  bitis_tarihi: string
}
interface Grup {
  id: string
  grup_adi: string
  grup_tipi: 'Hatim' | 'Zikir'
  donem: GrupDonem | null
  oncekiDonem: GrupDonem | null
  uye_sayisi: number
}

function fmtTarih(iso: string) {
  const d = new Date(iso)
  return `${String(d.getDate()).padStart(2,'0')}.${String(d.getMonth()+1).padStart(2,'0')}.${d.getFullYear()}`
}
function fmtTarihUzun(iso: string) {
  return new Date(iso).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })
}
const bugunStr = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Istanbul' }).format(new Date())
interface Uye {
  id: string; ad_soyad: string; tel_no: string
  kullanici_tipi: string; aktif: boolean
  cuz_lar: number[]; tur_no: number | null
}

type Sekme = 'gruplar' | 'uyeler'

export default function YonetimPage() {
  const [sekme, setSekme] = useState<Sekme>('gruplar')
  const [gruplar, setGruplar] = useState<Grup[]>([])
  const [seciliGrup, setSeciliGrup] = useState<string>('')
  const [uyeler, setUyeler] = useState<Uye[]>([])
  const [yukleniyor, setYukleniyor] = useState(false)

  // Grup formu
  const [yeniGrupAdi, setYeniGrupAdi] = useState('')
  const [yeniGrupTarih, setYeniGrupTarih] = useState(
    new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Istanbul' }).format(new Date())
  )
  const [yeniGrupTurNo, setYeniGrupTurNo] = useState('1')
  const [yeniGrupTipi, setYeniGrupTipi] = useState<'Hatim' | 'Zikir'>('Hatim')
  const [grupKayit, setGrupKayit] = useState(false)
  const [grupMesaj, setGrupMesaj] = useState<{ tip: 'ok' | 'hata'; metin: string } | null>(null)
  const [grupFormAcik, setGrupFormAcik] = useState(false)
  const [tohum, setTohum] = useState(false)
  const [tohumSonuc, setTohumSonuc] = useState<{ toplamKayit: number; sonuclar: { grup: string; gun: number; uye: number; eklenen: number }[] } | null>(null)

  // Üye düzenleme formu (edit)
  const [uyeForm, setUyeForm] = useState({ ad_soyad: '', tel_no: '', kullanici_tipi: 'Uye', cuz_no: '' })
  const [duzenleId, setDuzenleId] = useState<string | null>(null)
  const [uyeMesaj, setUyeMesaj] = useState<{ tip: 'ok' | 'hata'; metin: string } | null>(null)
  const [uyeKayit, setUyeKayit] = useState(false)

  // Yeni üye ekleme formu (add) — edit'ten bağımsız
  const [yeniForm, setYeniForm] = useState({ ad_soyad: '', tel_no: '', kullanici_tipi: 'Uye', cuz_no: '' })
  const [yeniFormAcik, setYeniFormAcik] = useState(false)
  const [yeniFormMesaj, setYeniFormMesaj] = useState<{ tip: 'ok' | 'hata'; metin: string } | null>(null)
  const [yeniFormKayit, setYeniFormKayit] = useState(false)
  const [excelAcik, setExcelAcik] = useState(false)
  const [tumUyeGoster, setTumUyeGoster] = useState(false)

  // Excel
  const [excelSonuc, setExcelSonuc] = useState<{
    eklenen: number
    atlanan: number
    atlanenlar: { ad: string; sebep: string }[]
  } | null>(null)
  const [seciliDosya, setSeciliDosya] = useState<File | null>(null)
  const [excelYukleniyor, setExcelYukleniyor] = useState(false)
  const dosyaRef = useRef<HTMLInputElement>(null)

  const gruplariYukle = useCallback(async () => {
    const res = await fetch('/api/admin/gruplar')
    const d = await res.json()
    setGruplar(d.gruplar ?? [])
    if (d.gruplar?.length && !seciliGrup) setSeciliGrup(d.gruplar[0].id)
  }, [seciliGrup])

  const uyeleriYukle = useCallback(async (gid: string) => {
    if (!gid) return
    setYukleniyor(true)
    const res = await fetch(`/api/admin/uyeler?grup_id=${gid}`)
    const d = await res.json()
    setUyeler(d.uyeler ?? [])
    setYukleniyor(false)
  }, [])

  useEffect(() => { gruplariYukle() }, [gruplariYukle])
  useEffect(() => { if (seciliGrup) { uyeleriYukle(seciliGrup); setTumUyeGoster(false) } }, [seciliGrup, uyeleriYukle])

  // --- Grup oluştur ---
  const grupOlustur = async (e: React.FormEvent) => {
    e.preventDefault()
    setGrupKayit(true); setGrupMesaj(null)
    const res = await fetch('/api/admin/gruplar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ grup_adi: yeniGrupAdi, baslangic_tarihi: yeniGrupTarih, tur_no: Number(yeniGrupTurNo), grup_tipi: yeniGrupTipi }),
    })
    const d = await res.json()
    if (!res.ok) {
      setGrupMesaj({ tip: 'hata', metin: d.hata })
    } else {
      setGrupMesaj({ tip: 'ok', metin: `"${yeniGrupAdi}" grubu oluşturuldu.` })
      setYeniGrupAdi('')
      setYeniGrupTipi('Hatim')
      await gruplariYukle()
    }
    setGrupKayit(false)
  }

  const parseCuzlar = (s: string) =>
    s ? [...new Set(s.split(',').map(x => parseInt(x.trim())).filter(n => !isNaN(n) && n >= 1 && n <= 30))] : []

  // --- Yeni üye ekle (POST) ---
  const yeniUyeKaydet = async (e: React.FormEvent) => {
    e.preventDefault()
    setYeniFormKayit(true); setYeniFormMesaj(null)
    const tel = yeniForm.tel_no.replace(/\D/g, '')
    const res = await fetch('/api/admin/uyeler', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ad_soyad: yeniForm.ad_soyad, tel_no: tel,
        kullanici_tipi: yeniForm.kullanici_tipi, grup_id: seciliGrup,
        cuz_lar: parseCuzlar(yeniForm.cuz_no),
      }),
    })
    const d = await res.json()
    if (!res.ok) {
      setYeniFormMesaj({ tip: 'hata', metin: d.hata })
    } else {
      setYeniFormMesaj({ tip: 'ok', metin: 'Üye eklendi.' })
      setYeniForm({ ad_soyad: '', tel_no: '', kullanici_tipi: 'Uye', cuz_no: '' })
      await uyeleriYukle(seciliGrup)
    }
    setYeniFormKayit(false)
  }

  // --- Üye güncelle (PATCH) ---
  const uyeKaydet = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!duzenleId) return
    setUyeKayit(true); setUyeMesaj(null)
    const tel = uyeForm.tel_no.replace(/\D/g, '')
    const res = await fetch('/api/admin/uyeler', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: duzenleId, ad_soyad: uyeForm.ad_soyad, tel_no: tel,
        kullanici_tipi: uyeForm.kullanici_tipi, grup_id: seciliGrup,
        cuz_lar: parseCuzlar(uyeForm.cuz_no),
      }),
    })
    const d = await res.json()
    if (!res.ok) {
      setUyeMesaj({ tip: 'hata', metin: d.hata })
    } else {
      setUyeMesaj({ tip: 'ok', metin: 'Güncellendi.' })
      setDuzenleId(null)
      setUyeForm({ ad_soyad: '', tel_no: '', kullanici_tipi: 'Uye', cuz_no: '' })
      await uyeleriYukle(seciliGrup)
    }
    setUyeKayit(false)
  }

  const duzenlemeBasla = (u: Uye) => {
    setDuzenleId(u.id)
    setUyeForm({ ad_soyad: u.ad_soyad, tel_no: u.tel_no, kullanici_tipi: u.kullanici_tipi, cuz_no: u.cuz_lar.join(', ') })
    setUyeMesaj(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const uyeSil = async (u: Uye) => {
    if (!confirm(`"${u.ad_soyad}" adlı üyeyi pasife almak istediğinize emin misiniz?`)) return
    await fetch('/api/admin/uyeler', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: u.id }),
    })
    await uyeleriYukle(seciliGrup)
  }

  // --- Excel import ---
  const dosyaSec = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSeciliDosya(e.target.files?.[0] ?? null)
    setExcelSonuc(null)
  }

  const excelYukle = async () => {
    if (!seciliDosya || !seciliGrup) return
    setExcelYukleniyor(true)
    setExcelSonuc(null)

    const buffer = await seciliDosya.arrayBuffer()
    const wb = XLSX.read(buffer)
    const ws = wb.Sheets[wb.SheetNames[0]]
    const satirlar = XLSX.utils.sheet_to_json<Record<string, string>>(ws, { defval: '' })

    const uyeListesi = satirlar.map(s => {
      const cuzRaw = s['cuz_no'] ?? s['Cüz No'] ?? s['cuz'] ?? ''
      const cuzNo = parseInt(String(cuzRaw))
      return {
        ad_soyad: String(s['ad_soyad'] ?? s['Ad Soyad'] ?? s['isim'] ?? '').trim(),
        tel_no: String(s['tel_no'] ?? s['Telefon'] ?? s['telefon'] ?? '').trim(),
        cuz_no: !isNaN(cuzNo) && cuzNo >= 1 && cuzNo <= 30 ? cuzNo : undefined,
      }
    }).filter(u => u.ad_soyad)

    if (uyeListesi.length === 0) {
      setExcelSonuc({ eklenen: 0, atlanan: 1, atlanenlar: [{ ad: '—', sebep: 'Dosyada geçerli veri bulunamadı' }] })
      setExcelYukleniyor(false)
      return
    }

    const res = await fetch('/api/admin/uyeler/excel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ grup_id: seciliGrup, uyeler: uyeListesi }),
    })
    const sonuc = await res.json()
    setExcelSonuc(sonuc)
    setSeciliDosya(null)
    if (dosyaRef.current) dosyaRef.current.value = ''
    await uyeleriYukle(seciliGrup)
    setExcelYukleniyor(false)
  }

  const tohumOlustur = async () => {
    if (!confirm('Tüm grupların son dönemindeki her üye için her güne okuma kaydı oluşturulacak. Devam?')) return
    setTohum(true); setTohumSonuc(null)
    const res = await fetch('/api/admin/tohum', { method: 'POST' })
    const d = await res.json()
    if (res.ok) setTohumSonuc(d)
    setTohum(false)
  }

  const aktifUyeler = uyeler
    .filter(u => u.aktif)
    .sort((a, b) => (a.cuz_lar[0] ?? 999) - (b.cuz_lar[0] ?? 999))
  const gosterilecekUyeler = tumUyeGoster ? aktifUyeler : aktifUyeler.slice(0, 5)
  const pasifUyeler = uyeler.filter(u => !u.aktif)

  return (
    <div className="py-4 space-y-4">
      {/* Sekme */}
      <div className="flex gap-2">
        {(['gruplar', 'uyeler'] as Sekme[]).map(s => (
          <button key={s} onClick={() => setSekme(s)}
            className={`px-5 py-2 rounded-full text-sm font-medium transition-colors ${
              sekme === s ? 'bg-emerald-600 text-white' : 'bg-white border border-slate-200 text-slate-600'
            }`}>
            {s === 'gruplar' ? 'Gruplar' : 'Üyeler'}
          </button>
        ))}
      </div>

      {/* ---- GRUPLAR SEKMESİ ---- */}
      {sekme === 'gruplar' && (
        <div className="space-y-4">
          {/* Mevcut gruplar */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100">
              <h2 className="font-semibold text-slate-700">Mevcut Gruplar ({gruplar.length})</h2>
            </div>
            {gruplar.length === 0
              ? <p className="px-4 py-6 text-sm text-slate-400 text-center">Henüz grup yok.</p>
              : <ul className="divide-y divide-slate-100">
                  {gruplar.map(g => (
                    <li key={g.id} className="flex items-center justify-between px-4 py-3">
                      <div className="space-y-1 flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-slate-700">{g.grup_adi}</span>
                          <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                            g.grup_tipi === 'Zikir'
                              ? 'bg-violet-100 text-violet-700'
                              : 'bg-emerald-50 text-emerald-700'
                          }`}>{g.grup_tipi}</span>
                        </div>
                        {g.donem ? (() => {
                          const sonDonem = g.donem!
                          const onceki = g.oncekiDonem
                          const yakinda = sonDonem.baslangic_tarihi > bugunStr
                          const tamamlandi = sonDonem.bitis_tarihi < bugunStr

                          if (yakinda && onceki) {
                            // Yeni tur oluşturulmuş ama başlamadı → önceki tamamlandı
                            return (
                              <p className="text-xs text-slate-400 leading-relaxed">
                                <span className="text-slate-500 font-medium">Tamamlanan Tur:</span> <span className="text-emerald-700 font-bold">{onceki.tur_no}</span> · {fmtTarih(onceki.baslangic_tarihi)} – {fmtTarih(onceki.bitis_tarihi)}
                                <br />
                                <span className="text-emerald-600 font-medium">Yeni Tur Başlangıç:</span> {fmtTarihUzun(sonDonem.baslangic_tarihi)}
                              </p>
                            )
                          } else if (tamamlandi) {
                            return (
                              <p className="text-xs text-slate-400 leading-relaxed">
                                <span className="text-slate-500 font-medium">Tamamlanan Tur:</span> <span className="text-emerald-700 font-bold">{sonDonem.tur_no}</span> · {fmtTarih(sonDonem.baslangic_tarihi)} – {fmtTarih(sonDonem.bitis_tarihi)}
                                <br />
                                <span className="text-amber-500 font-medium">Yeni tur henüz başlatılmadı</span>
                              </p>
                            )
                          } else {
                            return (
                              <p className="text-xs text-slate-400">
                                <span className="text-slate-500 font-medium">Aktif Tur:</span> {sonDonem.tur_no} · {fmtTarih(sonDonem.baslangic_tarihi)} – {fmtTarih(sonDonem.bitis_tarihi)}
                              </p>
                            )
                          }
                        })() : (
                          <p className="text-xs text-slate-300">Dönem yok</p>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0 ml-4">
                        <button onClick={() => { setSeciliGrup(g.id); setSekme('uyeler') }}
                          className="text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors">
                          Üyeleri Gör <span className="text-sm">→</span>
                        </button>
                        <span className="text-xs text-slate-400">{g.uye_sayisi} üye</span>
                      </div>
                    </li>
                  ))}
                </ul>
            }
          </div>

          {/* Okuma verisi oluştur (ilk kurulum için) */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
            <div>
              <p className="text-sm font-semibold text-amber-800">İlk Kurulum — Okuma Verisi Oluştur</p>
              <p className="text-xs text-amber-700 mt-0.5">
                Tüm grupların son dönemi için her üyeye tüm günler okundu olarak işaretlenir.
                Grupları ve üyeleri ekledikten sonra kullanın.
              </p>
            </div>
            <button
              onClick={tohumOlustur}
              disabled={tohum || gruplar.length === 0}
              className="bg-amber-500 hover:bg-amber-600 disabled:bg-amber-300 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              {tohum ? 'Oluşturuluyor...' : 'Tüm Okuma Kayıtlarını Oluştur'}
            </button>
            {tohumSonuc && (
              <div className="text-xs space-y-1">
                <p className="font-semibold text-amber-900">Toplam {tohumSonuc.toplamKayit.toLocaleString('tr-TR')} kayıt oluşturuldu:</p>
                {tohumSonuc.sonuclar.map(s => (
                  <p key={s.grup} className="text-amber-700">
                    • {s.grup}: {s.uye} üye × {s.gun} gün = {s.eklenen} kayıt
                  </p>
                ))}
              </div>
            )}
          </div>

          {/* Yeni grup formu — katlanabilir */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <button
              type="button"
              onClick={() => setGrupFormAcik(a => !a)}
              className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-slate-50 transition-colors"
            >
              <span className="font-semibold text-slate-700">Yeni Grup Oluştur</span>
              <span className={`text-slate-400 text-lg transition-transform duration-200 ${grupFormAcik ? 'rotate-180' : ''}`}>⌄</span>
            </button>
            {grupFormAcik && <div className="px-5 pb-5 border-t border-slate-100 pt-4">
            <form onSubmit={grupOlustur} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Grup Adı</label>
                <input value={yeniGrupAdi} onChange={e => setYeniGrupAdi(e.target.value)}
                  placeholder="Hatim-2" required
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Grup Tipi</label>
                <div className="flex gap-3">
                  {(['Hatim', 'Zikir'] as const).map(tip => (
                    <label key={tip} className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name="grup_tipi"
                        value={tip}
                        checked={yeniGrupTipi === tip}
                        onChange={() => setYeniGrupTipi(tip)}
                        className="accent-emerald-600"
                      />
                      <span className="text-sm text-slate-700">{tip}</span>
                    </label>
                  ))}
                </div>
                {yeniGrupTipi === 'Zikir' && (
                  <p className="text-xs text-violet-600 mt-1">Zikir gruplarında cüz numarası atanmaz ve tur bitiminde rotasyon yapılmaz.</p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Mevcut Tur Numarası</label>
                  <input type="number" min="1" value={yeniGrupTurNo} onChange={e => setYeniGrupTurNo(e.target.value)}
                    required
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Mevcut Tur Başlangıç Tarihi</label>
                  <input type="date" value={yeniGrupTarih} onChange={e => setYeniGrupTarih(e.target.value)}
                    required
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
              </div>
              {grupMesaj && (
                <p className={`text-sm px-3 py-2 rounded-lg ${grupMesaj.tip === 'ok' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
                  {grupMesaj.metin}
                </p>
              )}
              <button type="submit" disabled={grupKayit}
                className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white font-medium py-2.5 rounded-lg text-sm transition-colors">
                {grupKayit ? 'Oluşturuluyor...' : 'Grubu Oluştur'}
              </button>
            </form>
            </div>}
          </div>
        </div>
      )}

      {/* ---- ÜYELER SEKMESİ ---- */}
      {sekme === 'uyeler' && (
        <div className="space-y-4">
          {/* Grup seç */}
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Grup</label>
            <select value={seciliGrup} onChange={e => setSeciliGrup(e.target.value)}
              className="border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500">
              {gruplar.map(g => <option key={g.id} value={g.id}>{g.grup_adi}</option>)}
            </select>
          </div>

          {/* Üye listesi — grup seçiminin hemen altında */}
          {yukleniyor
            ? <p className="text-slate-400 text-sm">Yükleniyor...</p>
            : (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100">
                <h2 className="font-semibold text-slate-700">Aktif Üyeler ({aktifUyeler.length})</h2>
              </div>
              {aktifUyeler.length === 0
                ? <p className="px-4 py-6 text-sm text-slate-400 text-center">Henüz üye yok.</p>
                : <>
                    {/* Kolon başlıkları */}
                    <div className="flex items-center gap-2 px-4 py-1.5 bg-slate-50 border-b border-slate-100">
                      <span className="text-xs font-medium text-slate-400 flex-1">Ad Soyad</span>
                      <span className="text-xs font-medium text-slate-400 w-8 text-center">Cüz</span>
                      <span className="w-14 shrink-0" />
                    </div>
                    <ul className="divide-y divide-slate-100">
                      {gosterilecekUyeler.map(u => (
                        <li key={u.id} className="px-4 py-2">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-slate-700 truncate">{u.ad_soyad}</p>
                              <p className="text-xs text-slate-400">{u.tel_no}</p>
                            </div>
                            <span className="text-xs font-semibold text-emerald-600 text-right shrink-0 min-w-[32px]">
                              {u.cuz_lar.length > 0 ? u.cuz_lar.join(', ') : '—'}
                            </span>
                            <div className="flex gap-1 shrink-0 w-14 justify-end">
                              <button onClick={() => duzenlemeBasla(u)}
                                className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors" title="Düzenle">
                                ✏️
                              </button>
                              <button onClick={() => uyeSil(u)}
                                className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg transition-colors" title="Sil">
                                🗑️
                              </button>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                    {aktifUyeler.length > 5 && (
                      <button
                        onClick={() => setTumUyeGoster(g => !g)}
                        className="w-full px-4 py-2.5 text-xs text-slate-500 hover:text-slate-700 hover:bg-slate-50 border-t border-slate-100 transition-colors flex items-center justify-center gap-1"
                      >
                        {tumUyeGoster
                          ? <>Daha Az Göster <span className="text-slate-400">↑</span></>
                          : <>Tümünü Göster ({aktifUyeler.length} üye) <span className="text-slate-400">↓</span></>
                        }
                      </button>
                    )}
                  </>
              }
              {pasifUyeler.length > 0 && (
                <details className="border-t border-slate-100">
                  <summary className="px-4 py-3 text-xs text-slate-400 cursor-pointer hover:bg-slate-50">
                    Pasif üyeler ({pasifUyeler.length})
                  </summary>
                  <ul className="divide-y divide-slate-100">
                    {pasifUyeler.map(u => (
                      <li key={u.id} className="flex items-center justify-between px-4 py-3 opacity-50">
                        <div>
                          <p className="text-sm text-slate-600">{u.ad_soyad}</p>
                          <p className="text-xs text-slate-400">{u.tel_no}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </div>
          )}

          {/* Düzenleme formu — yalnızca düzenleme modunda görünür */}
          {duzenleId && (
            <div className="bg-blue-50 rounded-xl border border-blue-200 overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3 border-b border-blue-200">
                <span className="font-semibold text-blue-800">✏️ Üyeyi Düzenle</span>
                <button type="button"
                  onClick={() => { setDuzenleId(null); setUyeForm({ ad_soyad: '', tel_no: '', kullanici_tipi: 'Uye', cuz_no: '' }); setUyeMesaj(null) }}
                  className="text-blue-400 hover:text-blue-600 text-xl font-bold w-8 h-8 flex items-center justify-center rounded-full hover:bg-blue-100">
                  ×
                </button>
              </div>
              <div className="px-5 pb-5">
                <form onSubmit={uyeKaydet} className="space-y-3 pt-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Ad Soyad</label>
                      <input value={uyeForm.ad_soyad} onChange={e => setUyeForm(f => ({ ...f, ad_soyad: e.target.value }))}
                        placeholder="Ahmet Yılmaz" required autoComplete="off"
                        className="w-full border border-blue-300 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Telefon No</label>
                      <input value={uyeForm.tel_no} onChange={e => setUyeForm(f => ({ ...f, tel_no: e.target.value }))}
                        placeholder="05XXXXXXXXX" required autoComplete="off"
                        className="w-full border border-blue-300 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
                    </div>
                  </div>
                  {gruplar.find(g => g.id === seciliGrup)?.grup_tipi === 'Hatim' && (
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">
                        Cüz No
                        <span className="text-slate-400 font-normal"> (birden fazlaysa virgülle: 5, 9)</span>
                      </label>
                      <input type="text" value={uyeForm.cuz_no}
                        onChange={e => setUyeForm(f => ({ ...f, cuz_no: e.target.value }))}
                        placeholder="ör: 5 veya 5, 9"
                        className="w-full border border-blue-300 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
                    </div>
                  )}
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Kullanıcı Tipi</label>
                    <select value={uyeForm.kullanici_tipi} onChange={e => setUyeForm(f => ({ ...f, kullanici_tipi: e.target.value }))}
                      className="border border-blue-300 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                      <option value="Uye">Üye</option>
                      <option value="Yonetici">Yönetici</option>
                    </select>
                  </div>
                  {uyeMesaj && (
                    <p className={`text-sm px-3 py-2 rounded-lg ${uyeMesaj.tip === 'ok' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
                      {uyeMesaj.metin}
                    </p>
                  )}
                  <div className="flex gap-2">
                    <button type="submit" disabled={uyeKayit}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-2.5 rounded-lg text-sm transition-colors">
                      {uyeKayit ? 'Kaydediliyor...' : 'Güncelle'}
                    </button>
                    <button type="button"
                      onClick={() => { setDuzenleId(null); setUyeForm({ ad_soyad: '', tel_no: '', kullanici_tipi: 'Uye', cuz_no: '' }); setUyeMesaj(null) }}
                      className="px-4 py-2.5 border border-blue-300 rounded-lg text-sm text-blue-600 hover:bg-blue-100">
                      İptal
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Yeni üye ekleme formu — her zaman mevcut, düzenleme formundan bağımsız */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <button
              type="button"
              onClick={() => setYeniFormAcik(a => !a)}
              className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-slate-50 transition-colors"
            >
              <span className="font-semibold text-slate-700">Yeni Üye Ekle</span>
              <span className={`text-slate-400 text-lg transition-transform duration-200 ${yeniFormAcik ? 'rotate-180' : ''}`}>⌄</span>
            </button>
            {yeniFormAcik && (
              <div className="px-5 pb-5 border-t border-slate-100">
                <form onSubmit={yeniUyeKaydet} className="space-y-3 pt-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Ad Soyad</label>
                      <input value={yeniForm.ad_soyad} onChange={e => setYeniForm(f => ({ ...f, ad_soyad: e.target.value }))}
                        placeholder="Ahmet Yılmaz" required
                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Telefon No</label>
                      <input value={yeniForm.tel_no} onChange={e => setYeniForm(f => ({ ...f, tel_no: e.target.value }))}
                        placeholder="05XXXXXXXXX" required
                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                    </div>
                  </div>
                  {gruplar.find(g => g.id === seciliGrup)?.grup_tipi === 'Hatim' && (
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">
                        Cüz No
                        <span className="text-slate-400 font-normal"> (birden fazlaysa virgülle: 5, 9)</span>
                      </label>
                      <input type="text" value={yeniForm.cuz_no}
                        onChange={e => setYeniForm(f => ({ ...f, cuz_no: e.target.value }))}
                        placeholder="Boş bırakılırsa otomatik"
                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                    </div>
                  )}
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Kullanıcı Tipi</label>
                    <select value={yeniForm.kullanici_tipi} onChange={e => setYeniForm(f => ({ ...f, kullanici_tipi: e.target.value }))}
                      className="border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500">
                      <option value="Uye">Üye</option>
                      <option value="Yonetici">Yönetici</option>
                    </select>
                  </div>
                  {yeniFormMesaj && (
                    <p className={`text-sm px-3 py-2 rounded-lg ${yeniFormMesaj.tip === 'ok' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
                      {yeniFormMesaj.metin}
                    </p>
                  )}
                  <button type="submit" disabled={yeniFormKayit}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white font-medium py-2.5 rounded-lg text-sm transition-colors">
                    {yeniFormKayit ? 'Kaydediliyor...' : 'Üye Ekle'}
                  </button>
                </form>
              </div>
            )}
          </div>

          {/* Excel import — katlanabilir */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <button
              type="button"
              onClick={() => setExcelAcik(a => !a)}
              className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-slate-50 transition-colors"
            >
              <span className="font-semibold text-slate-700">Excel ile Toplu Üye Ekle</span>
              <span className={`text-slate-400 text-lg transition-transform duration-200 ${excelAcik ? 'rotate-180' : ''}`}>⌄</span>
            </button>
            {excelAcik && (
              <div className="px-5 pb-5 border-t border-slate-100 space-y-3 pt-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-slate-400">
                    Sütunlar: <code className="bg-slate-100 px-1 rounded">ad_soyad</code> · <code className="bg-slate-100 px-1 rounded">tel_no</code> · <code className="bg-slate-100 px-1 rounded">cuz_no</code>
                  </p>
                  <a href="/api/admin/sablon" download="uye_sablon.xlsx"
                    className="flex items-center gap-1 text-xs text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1.5 rounded-lg transition-colors shrink-0 ml-3">
                    ⬇ Şablon İndir
                  </a>
                </div>
                <label className="flex items-center gap-3 border-2 border-dashed border-slate-200 hover:border-emerald-400 rounded-xl px-4 py-3 cursor-pointer transition-colors">
                  <span className="text-xl">📂</span>
                  <div className="flex-1 min-w-0">
                    {seciliDosya
                      ? <p className="text-sm font-medium text-slate-700 truncate">{seciliDosya.name}</p>
                      : <p className="text-sm text-slate-400">Dosya seçmek için tıklayın (.xlsx)</p>
                    }
                  </div>
                  <input ref={dosyaRef} type="file" accept=".xlsx,.xls,.csv"
                    onChange={dosyaSec} className="hidden" />
                </label>
                {seciliDosya && !excelYukleniyor && !excelSonuc && (
                  <button onClick={excelYukle}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2.5 rounded-lg text-sm transition-colors">
                    Yükle — {seciliDosya.name}
                  </button>
                )}
                {excelYukleniyor && (
                  <div className="space-y-2">
                    <p className="text-xs text-slate-500">Yükleniyor...</p>
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div className="h-2 bg-emerald-500 rounded-full animate-pulse w-full" />
                    </div>
                  </div>
                )}
                {excelSonuc && (
                  <div className="space-y-2">
                    <div className="flex gap-3">
                      <div className="flex-1 bg-emerald-50 rounded-lg px-3 py-2 text-center">
                        <p className="text-xl font-bold text-emerald-700">{excelSonuc.eklenen}</p>
                        <p className="text-xs text-emerald-600">Eklendi / Güncellendi</p>
                      </div>
                      <div className="flex-1 bg-amber-50 rounded-lg px-3 py-2 text-center">
                        <p className="text-xl font-bold text-amber-600">{excelSonuc.atlanan}</p>
                        <p className="text-xs text-amber-500">Atlandı</p>
                      </div>
                    </div>
                    {excelSonuc.atlanenlar.length > 0 && (
                      <details className="text-xs">
                        <summary className="text-slate-500 cursor-pointer hover:text-slate-700">
                          Atlanan kayıtları göster ({excelSonuc.atlanan})
                        </summary>
                        <ul className="mt-2 space-y-1 max-h-48 overflow-y-auto">
                          {excelSonuc.atlanenlar.map((a, i) => (
                            <li key={i} className="flex justify-between bg-slate-50 rounded px-2 py-1">
                              <span className="font-medium text-slate-700">{a.ad}</span>
                              <span className="text-amber-600 ml-2">{a.sebep}</span>
                            </li>
                          ))}
                        </ul>
                      </details>
                    )}
                    <button onClick={() => { setExcelSonuc(null); setSeciliDosya(null) }}
                      className="w-full text-xs text-slate-400 hover:text-slate-600 py-1">
                      Yeni dosya yükle
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
