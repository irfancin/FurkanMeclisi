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
  uye_sayisi: number
}
interface Uye {
  id: string; ad_soyad: string; tel_no: string
  kullanici_tipi: string; aktif: boolean
  cuz_no: number | null; tur_no: number | null
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
  const [tohum, setTohum] = useState(false)
  const [tohumSonuc, setTohumSonuc] = useState<{ toplamKayit: number; sonuclar: { grup: string; gun: number; uye: number; eklenen: number }[] } | null>(null)

  // Üye formu
  const [uyeForm, setUyeForm] = useState({ ad_soyad: '', tel_no: '', kullanici_tipi: 'Uye', cuz_no: '' })
  const [duzenleId, setDuzenleId] = useState<string | null>(null)
  const [uyeMesaj, setUyeMesaj] = useState<{ tip: 'ok' | 'hata'; metin: string } | null>(null)
  const [uyeKayit, setUyeKayit] = useState(false)
  const [uyeFormAcik, setUyeFormAcik] = useState(false)
  const [excelAcik, setExcelAcik] = useState(false)

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
  useEffect(() => { if (seciliGrup) uyeleriYukle(seciliGrup) }, [seciliGrup, uyeleriYukle])

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

  // --- Üye kaydet (ekle / güncelle) ---
  const uyeKaydet = async (e: React.FormEvent) => {
    e.preventDefault()
    setUyeKayit(true); setUyeMesaj(null)
    const tel = uyeForm.tel_no.replace(/\D/g, '')

    const res = await fetch('/api/admin/uyeler', {
      method: duzenleId ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(duzenleId
        ? { id: duzenleId, ad_soyad: uyeForm.ad_soyad, tel_no: tel, kullanici_tipi: uyeForm.kullanici_tipi }
        : {
            ad_soyad: uyeForm.ad_soyad,
            tel_no: tel,
            kullanici_tipi: uyeForm.kullanici_tipi,
            grup_id: seciliGrup,
            cuz_no: uyeForm.cuz_no ? parseInt(uyeForm.cuz_no) : undefined,
          }
      ),
    })
    const d = await res.json()
    if (!res.ok) {
      setUyeMesaj({ tip: 'hata', metin: d.hata })
    } else {
      setUyeMesaj({ tip: 'ok', metin: duzenleId ? 'Güncellendi.' : 'Üye eklendi.' })
      setUyeForm({ ad_soyad: '', tel_no: '', kullanici_tipi: 'Uye', cuz_no: '' })
      setDuzenleId(null)
      await uyeleriYukle(seciliGrup)
    }
    setUyeKayit(false)
  }

  const duzenlemeBasla = (u: Uye) => {
    setDuzenleId(u.id)
    setUyeForm({ ad_soyad: u.ad_soyad, tel_no: u.tel_no, kullanici_tipi: u.kullanici_tipi, cuz_no: String(u.cuz_no ?? '') })
    setUyeMesaj(null)
    setUyeFormAcik(true)
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

  const aktifUyeler = uyeler.filter(u => u.aktif)
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
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-slate-700">{g.grup_adi}</span>
                          <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                            g.grup_tipi === 'Zikir'
                              ? 'bg-violet-100 text-violet-700'
                              : 'bg-emerald-50 text-emerald-700'
                          }`}>{g.grup_tipi}</span>
                        </div>
                        {g.donem ? (
                          <p className="text-xs text-slate-400">
                            {g.donem.tur_no}. Tur · Başlangıç:{' '}
                            {new Date(g.donem.baslangic_tarihi).toLocaleDateString('tr-TR', {
                              day: 'numeric', month: 'long', year: 'numeric'
                            })}
                            {' '}· {g.uye_sayisi} üye
                          </p>
                        ) : (
                          <p className="text-xs text-slate-300">Dönem yok</p>
                        )}
                      </div>
                      <button onClick={() => { setSeciliGrup(g.id); setSekme('uyeler') }}
                        className="text-xs text-emerald-600 hover:underline shrink-0 ml-3">Üyeleri gör →</button>
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

          {/* Yeni grup formu */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h2 className="font-semibold text-slate-700 mb-4">Yeni Grup Oluştur</h2>
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
                : <ul className="divide-y divide-slate-100">
                    {aktifUyeler.map(u => (
                      <li key={u.id} className="flex items-center justify-between px-4 py-3">
                        <div>
                          <p className="text-sm font-medium text-slate-700">{u.ad_soyad}</p>
                          <p className="text-xs text-slate-400">
                            {u.tel_no}
                            {u.cuz_no ? ` · ${u.cuz_no}. Cüz` : ''}
                            {u.kullanici_tipi !== 'Uye' ? ` · ${u.kullanici_tipi}` : ''}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => duzenlemeBasla(u)}
                            className="text-xs text-blue-600 hover:underline">Düzenle</button>
                          <button onClick={() => uyeSil(u)}
                            className="text-xs text-red-500 hover:underline">Sil</button>
                        </div>
                      </li>
                    ))}
                  </ul>
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

          {/* Üye formu — katlanabilir */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <button
              type="button"
              onClick={() => { setUyeFormAcik(a => !a); if (duzenleId) { setDuzenleId(null); setUyeForm({ ad_soyad: '', tel_no: '', kullanici_tipi: 'Uye', cuz_no: '' }); setUyeMesaj(null) } }}
              className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-slate-50 transition-colors"
            >
              <span className="font-semibold text-slate-700">
                {duzenleId ? 'Üyeyi Düzenle' : 'Yeni Üye Ekle'}
              </span>
              <span className={`text-slate-400 text-lg transition-transform duration-200 ${uyeFormAcik ? 'rotate-180' : ''}`}>⌄</span>
            </button>
            {uyeFormAcik && (
              <div className="px-5 pb-5 border-t border-slate-100">
                <form onSubmit={uyeKaydet} className="space-y-3 pt-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Ad Soyad</label>
                      <input value={uyeForm.ad_soyad} onChange={e => setUyeForm(f => ({ ...f, ad_soyad: e.target.value }))}
                        placeholder="Ahmet Yılmaz" required
                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Telefon No</label>
                      <input value={uyeForm.tel_no} onChange={e => setUyeForm(f => ({ ...f, tel_no: e.target.value }))}
                        placeholder="05XXXXXXXXX" required
                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                    </div>
                  </div>
                  {!duzenleId && gruplar.find(g => g.id === seciliGrup)?.grup_tipi === 'Hatim' && (
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">
                        Cüz No <span className="text-slate-400 font-normal">(1–30, boş bırakılırsa otomatik atanır)</span>
                      </label>
                      <input
                        type="number" min="1" max="30"
                        value={uyeForm.cuz_no}
                        onChange={e => setUyeForm(f => ({ ...f, cuz_no: e.target.value }))}
                        placeholder="Otomatik"
                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  )}
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Kullanıcı Tipi</label>
                    <select value={uyeForm.kullanici_tipi} onChange={e => setUyeForm(f => ({ ...f, kullanici_tipi: e.target.value }))}
                      className="border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500">
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
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white font-medium py-2.5 rounded-lg text-sm transition-colors">
                      {uyeKayit ? 'Kaydediliyor...' : duzenleId ? 'Güncelle' : 'Üye Ekle'}
                    </button>
                    {duzenleId && (
                      <button type="button" onClick={() => { setDuzenleId(null); setUyeForm({ ad_soyad: '', tel_no: '', kullanici_tipi: 'Uye', cuz_no: '' }); setUyeMesaj(null) }}
                        className="px-4 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-600 hover:bg-slate-50">
                        İptal
                      </button>
                    )}
                  </div>
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
