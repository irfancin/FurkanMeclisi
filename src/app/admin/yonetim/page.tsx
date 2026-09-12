'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import * as XLSX from 'xlsx'

interface Grup { id: string; grup_adi: string }
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
  const [grupKayit, setGrupKayit] = useState(false)
  const [grupMesaj, setGrupMesaj] = useState<{ tip: 'ok' | 'hata'; metin: string } | null>(null)

  // Üye formu
  const [uyeForm, setUyeForm] = useState({ ad_soyad: '', tel_no: '', kullanici_tipi: 'Uye' })
  const [duzenleId, setDuzenleId] = useState<string | null>(null)
  const [uyeMesaj, setUyeMesaj] = useState<{ tip: 'ok' | 'hata'; metin: string } | null>(null)
  const [uyeKayit, setUyeKayit] = useState(false)

  // Excel
  const [excelSonuc, setExcelSonuc] = useState<{ eklenen: number; atlanan: number; atlanenlar: string[] } | null>(null)
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
      body: JSON.stringify({ grup_adi: yeniGrupAdi, baslangic_tarihi: yeniGrupTarih, tur_no: Number(yeniGrupTurNo) }),
    })
    const d = await res.json()
    if (!res.ok) {
      setGrupMesaj({ tip: 'hata', metin: d.hata })
    } else {
      setGrupMesaj({ tip: 'ok', metin: `"${yeniGrupAdi}" grubu oluşturuldu.` })
      setYeniGrupAdi('')
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
        ? { id: duzenleId, ...uyeForm, tel_no: tel }
        : { ...uyeForm, tel_no: tel, grup_id: seciliGrup }
      ),
    })
    const d = await res.json()
    if (!res.ok) {
      setUyeMesaj({ tip: 'hata', metin: d.hata })
    } else {
      setUyeMesaj({ tip: 'ok', metin: duzenleId ? 'Güncellendi.' : 'Üye eklendi.' })
      setUyeForm({ ad_soyad: '', tel_no: '', kullanici_tipi: 'Uye' })
      setDuzenleId(null)
      await uyeleriYukle(seciliGrup)
    }
    setUyeKayit(false)
  }

  const duzenlemeBasla = (u: Uye) => {
    setDuzenleId(u.id)
    setUyeForm({ ad_soyad: u.ad_soyad, tel_no: u.tel_no, kullanici_tipi: u.kullanici_tipi })
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
  const excelYukle = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const dosya = e.target.files?.[0]
    if (!dosya || !seciliGrup) return
    setExcelSonuc(null)

    const buffer = await dosya.arrayBuffer()
    const wb = XLSX.read(buffer)
    const ws = wb.Sheets[wb.SheetNames[0]]
    const satirlar = XLSX.utils.sheet_to_json<Record<string, string>>(ws, { defval: '' })

    const uyeListesi = satirlar.map(s => ({
      ad_soyad: String(s['ad_soyad'] ?? s['Ad Soyad'] ?? s['isim'] ?? '').trim(),
      tel_no: String(s['tel_no'] ?? s['Telefon'] ?? s['telefon'] ?? '').trim(),
    })).filter(u => u.ad_soyad && u.tel_no)

    if (uyeListesi.length === 0) {
      setExcelSonuc({ eklenen: 0, atlanan: 0, atlanenlar: ['Dosyada geçerli veri bulunamadı.'] })
      return
    }

    const res = await fetch('/api/admin/uyeler/excel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ grup_id: seciliGrup, uyeler: uyeListesi }),
    })
    const sonuc = await res.json()
    setExcelSonuc(sonuc)
    await uyeleriYukle(seciliGrup)
    if (dosyaRef.current) dosyaRef.current.value = ''
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
                      <span className="text-sm font-medium text-slate-700">{g.grup_adi}</span>
                      <button onClick={() => { setSeciliGrup(g.id); setSekme('uyeler') }}
                        className="text-xs text-emerald-600 hover:underline">Üyeleri gör →</button>
                    </li>
                  ))}
                </ul>
            }
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

          {/* Üye formu */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h2 className="font-semibold text-slate-700 mb-4">
              {duzenleId ? 'Üyeyi Düzenle' : 'Yeni Üye Ekle'}
            </h2>
            <form onSubmit={uyeKaydet} className="space-y-3">
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
                  <button type="button" onClick={() => { setDuzenleId(null); setUyeForm({ ad_soyad: '', tel_no: '', kullanici_tipi: 'Uye' }); setUyeMesaj(null) }}
                    className="px-4 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-600 hover:bg-slate-50">
                    İptal
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* Excel import */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h2 className="font-semibold text-slate-700 mb-1">Excel ile Toplu Üye Ekle</h2>
            <p className="text-xs text-slate-400 mb-3">
              Excel dosyasında <code className="bg-slate-100 px-1 rounded">ad_soyad</code> ve <code className="bg-slate-100 px-1 rounded">tel_no</code> sütunları olmalı.
            </p>
            <input ref={dosyaRef} type="file" accept=".xlsx,.xls,.csv" onChange={excelYukle}
              className="text-sm text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100" />
            {excelSonuc && (
              <div className="mt-3 text-sm bg-slate-50 rounded-lg px-3 py-2">
                <p className="text-emerald-700 font-medium">{excelSonuc.eklenen} üye eklendi</p>
                {excelSonuc.atlanan > 0 && (
                  <p className="text-amber-600">{excelSonuc.atlanan} üye atlandı (zaten kayıtlı)</p>
                )}
              </div>
            )}
          </div>

          {/* Üye listesi */}
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
        </div>
      )}
    </div>
  )
}
