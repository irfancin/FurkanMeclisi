'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import type { OturumKullanici } from '@/types'

interface CuzDurumu {
  cuz_no: number
  okunan_gun: number
  bugun_okundu: boolean
  bugun_okunma_saati: string | null
}

interface OncekiDonem {
  id: string; tur_no: number; baslangic_tarihi: string; bitis_tarihi: string
}

interface BugunVerisi {
  donem: { id: string; tur_no: number; baslangic_tarihi: string; bitis_tarihi: string }
  aktif: boolean
  sonraki_bas: string | null
  cuzler: CuzDurumu[]
  onceki_donem: OncekiDonem | null
  onceki_cuzler: { cuz_no: number; okunan_gun: number }[]
}

function saatFormatla(iso: string) {
  return new Date(iso).toLocaleTimeString('tr-TR', {
    hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Istanbul',
  })
}

function tarihTR(iso: string) {
  return new Date(iso).toLocaleDateString('tr-TR', {
    day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Istanbul',
  })
}

export default function BugunPage() {
  const [kullanici, setKullanici] = useState<OturumKullanici | null>(null)
  const [veri, setVeri] = useState<BugunVerisi | null>(null)
  const [hata, setHata] = useState('')
  const [yukleniyor, setYukleniyor] = useState(true)
  const [islemYapiliyor, setIslemYapiliyor] = useState<number | 'hepsi' | null>(null)
  const router = useRouter()

  const veriYukle = useCallback(async (k: OturumKullanici) => {
    const res = await fetch(`/api/bugun?kullanici_id=${k.id}&grup_id=${k.grup_id}`)
    const json = await res.json()
    if (!res.ok) setHata(json.hata)
    else setVeri(json)
    setYukleniyor(false)
  }, [])

  useEffect(() => {
    const kayitli = localStorage.getItem('fm_oturum')
    if (!kayitli) { router.replace('/'); return }
    const k: OturumKullanici = JSON.parse(kayitli)
    if (k.kullanici_tipi !== 'Uye') { router.replace('/admin'); return }
    setKullanici(k)
    veriYukle(k)
  }, [router, veriYukle])

  const okudum = async (cuz_no: number) => {
    if (!kullanici) return
    setIslemYapiliyor(cuz_no)
    await fetch('/api/okuma', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kullanici_id: kullanici.id, cuz_no }),
    })
    await veriYukle(kullanici)
    setIslemYapiliyor(null)
  }

  const hepsiniOku = async () => {
    if (!kullanici || !veri) return
    setIslemYapiliyor('hepsi')
    const okunmayanlar = veri.cuzler.filter(c => !c.bugun_okundu)
    for (const c of okunmayanlar) {
      await fetch('/api/okuma', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kullanici_id: kullanici.id, cuz_no: c.cuz_no }),
      })
    }
    await veriYukle(kullanici)
    setIslemYapiliyor(null)
  }

  const geriAl = async (cuz_no: number) => {
    if (!kullanici || !confirm('Bu cüzün bugünkü okuma kaydını geri almak istiyor musunuz?')) return
    setIslemYapiliyor(cuz_no)
    await fetch('/api/okuma', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kullanici_id: kullanici.id, cuz_no }),
    })
    await veriYukle(kullanici)
    setIslemYapiliyor(null)
  }

  const cikis = () => {
    localStorage.removeItem('fm_oturum')
    router.push('/')
  }

  if (yukleniyor) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-slate-400">Yükleniyor...</p>
      </main>
    )
  }

  const cokluCuz = (veri?.cuzler?.length ?? 0) > 1
  const hepsiOkundu = veri?.cuzler.every(c => c.bugun_okundu) ?? false
  const hicOkunmadi = veri?.cuzler.every(c => !c.bugun_okundu) ?? true

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-4">

        {/* Üst bar */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 uppercase tracking-wide">Hoş geldin</p>
            <p className="font-semibold text-slate-700">{kullanici?.ad_soyad}</p>
          </div>
          <button onClick={cikis} className="text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 px-3 py-1 rounded-full transition-colors">
            Çıkış
          </button>
        </div>

        {hata ? (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 text-center">
            <p className="text-amber-700 font-medium">{hata}</p>
            <p className="text-amber-500 text-sm mt-1">Yöneticinizle iletişime geçin.</p>
          </div>
        ) : veri ? (
          <>
            {/* TUR ARASI */}
            {!veri.aktif ? (
              <>
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 text-center">
                  <p className="text-3xl mb-2">⏸</p>
                  <p className="font-semibold text-amber-800">{veri.donem.tur_no}. Tur Tamamlandı</p>
                  <p className="text-sm text-amber-600 mt-1">Ara dönem — dinlenme zamanı!</p>
                  {veri.sonraki_bas && (
                    <p className="text-xs text-amber-500 mt-2 font-medium">
                      Yeni tur: {tarihTR(veri.sonraki_bas)}
                    </p>
                  )}
                </div>

                {/* Tamamlanan turun özeti */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                  <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-3">
                    {veri.donem.tur_no}. Tur Özetiniz
                  </p>
                  {veri.cuzler.length === 0 ? (
                    <p className="text-sm text-slate-400 text-center py-2">Cüz ataması bulunamadı.</p>
                  ) : cokluCuz ? (
                    <div className="space-y-3">
                      {veri.cuzler.map(c => (
                        <div key={c.cuz_no} className="bg-slate-50 rounded-xl p-3">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs text-slate-400">{c.cuz_no}. Cüz</span>
                            <span className="text-sm font-bold text-slate-700">{c.okunan_gun}<span className="text-xs font-normal text-slate-400">/30</span></span>
                          </div>
                          <div className="w-full bg-slate-200 rounded-full h-1.5">
                            <div className="bg-emerald-500 h-1.5 rounded-full"
                              style={{ width: `${(c.okunan_gun / 30) * 100}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-2 gap-3 mb-4">
                        <div className="bg-slate-50 rounded-xl p-3 text-center">
                          <p className="text-2xl font-bold text-emerald-600">{veri.cuzler[0]?.cuz_no ?? '—'}</p>
                          <p className="text-xs text-slate-400 mt-1">Okuduğunuz Cüz</p>
                        </div>
                        <div className="bg-slate-50 rounded-xl p-3 text-center">
                          <p className="text-2xl font-bold text-slate-700">{veri.cuzler[0]?.okunan_gun ?? 0}<span className="text-sm font-normal text-slate-400">/30</span></p>
                          <p className="text-xs text-slate-400 mt-1">Okunan Gün</p>
                        </div>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2">
                        <div className="bg-emerald-500 h-2 rounded-full"
                          style={{ width: `${((veri.cuzler[0]?.okunan_gun ?? 0) / 30) * 100}%` }} />
                      </div>
                      <p className="text-xs text-slate-400 text-right mt-1">
                        %{Math.round(((veri.cuzler[0]?.okunan_gun ?? 0) / 30) * 100)} tamamlandı
                      </p>
                    </>
                  )}
                </div>
              </>
            ) : (
              <>
                {/* AKTİF TUR — tek cüz */}
                {!cokluCuz ? (
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-xs font-medium text-slate-400 uppercase tracking-wide">Güncel Tur</span>
                      <span className="bg-emerald-100 text-emerald-700 text-xs font-semibold px-3 py-1 rounded-full">
                        {veri.donem.tur_no}. Tur
                      </span>
                    </div>
                    <div className="text-center py-4">
                      <p className="text-xs text-slate-400 mb-1">Bu Turdaki Cüzünüz</p>
                      <p className="text-7xl font-bold text-emerald-600">{veri.cuzler[0]?.cuz_no ?? '—'}</p>
                      <p className="text-sm text-slate-400 mt-1">
                        {veri.cuzler[0] ? `${veri.cuzler[0].cuz_no}. Cüz` : 'Atama bekleniyor'}
                      </p>
                    </div>
                    <div className="mt-2">
                      <div className="flex justify-between text-xs text-slate-400 mb-1">
                        <span>Bu Turdaki İlerleme</span>
                        <span className="font-semibold text-slate-600">{veri.cuzler[0]?.okunan_gun ?? 0} / 30 gün</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-3">
                        <div className="bg-emerald-500 h-3 rounded-full transition-all duration-500"
                          style={{ width: `${((veri.cuzler[0]?.okunan_gun ?? 0) / 30) * 100}%` }} />
                      </div>
                    </div>
                  </div>
                ) : (
                  /* AKTİF TUR — çoklu cüz */
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-xs font-medium text-slate-400 uppercase tracking-wide">Güncel Tur</span>
                      <span className="bg-emerald-100 text-emerald-700 text-xs font-semibold px-3 py-1 rounded-full">
                        {veri.donem.tur_no}. Tur
                      </span>
                    </div>
                    <div className="space-y-3">
                      {veri.cuzler.map(c => (
                        <div key={c.cuz_no} className="bg-slate-50 rounded-xl p-3">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-semibold text-emerald-700">{c.cuz_no}. Cüz</span>
                            <span className="text-xs text-slate-400">{c.okunan_gun} / 30 gün</span>
                          </div>
                          <div className="w-full bg-slate-200 rounded-full h-1.5">
                            <div className="bg-emerald-500 h-1.5 rounded-full transition-all duration-500"
                              style={{ width: `${(c.okunan_gun / 30) * 100}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Okuma butonları */}
                {veri.cuzler.length === 0 ? (
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 text-center">
                    <p className="text-slate-400 text-sm">Cüz ataması bekleniyor.</p>
                  </div>
                ) : !cokluCuz ? (
                  /* Tek cüz — mevcut tasarım */
                  veri.cuzler[0].bugun_okundu ? (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 text-center">
                      <div className="text-3xl mb-2">✅</div>
                      <p className="font-semibold text-emerald-700">Bugün okundu olarak işaretlendin</p>
                      {veri.cuzler[0].bugun_okunma_saati && (
                        <p className="text-emerald-500 text-sm mt-1">Saat: {saatFormatla(veri.cuzler[0].bugun_okunma_saati)}</p>
                      )}
                      <button onClick={() => geriAl(veri.cuzler[0].cuz_no)} disabled={islemYapiliyor !== null}
                        className="mt-4 text-xs text-slate-400 hover:text-slate-600 underline disabled:opacity-50">
                        Geri al
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => okudum(veri.cuzler[0].cuz_no)}
                      disabled={islemYapiliyor !== null}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white font-bold py-5 rounded-2xl text-lg shadow-sm transition-colors">
                      {islemYapiliyor !== null ? 'Kaydediliyor...' : '📖 Bugün Okudum'}
                    </button>
                  )
                ) : (
                  /* Çoklu cüz — her cüz için ayrı buton + Hepsini Okudum */
                  <div className="space-y-2">
                    {veri.cuzler.map(c => (
                      <div key={c.cuz_no}>
                        {c.bugun_okundu ? (
                          <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 flex items-center justify-between">
                            <div>
                              <span className="font-semibold text-emerald-700 text-sm">{c.cuz_no}. Cüz</span>
                              <span className="text-emerald-500 text-xs ml-2">✅ Okundu</span>
                              {c.bugun_okunma_saati && (
                                <span className="text-emerald-400 text-xs ml-1">{saatFormatla(c.bugun_okunma_saati)}</span>
                              )}
                            </div>
                            <button onClick={() => geriAl(c.cuz_no)} disabled={islemYapiliyor !== null}
                              className="text-xs text-slate-400 hover:text-slate-600 underline disabled:opacity-50 ml-2 shrink-0">
                              Geri al
                            </button>
                          </div>
                        ) : (
                          <button onClick={() => okudum(c.cuz_no)}
                            disabled={islemYapiliyor !== null}
                            className="w-full bg-white hover:bg-emerald-50 disabled:bg-slate-100 border-2 border-emerald-300 hover:border-emerald-500 text-emerald-700 font-semibold py-3 rounded-xl text-sm transition-colors flex items-center justify-between px-4">
                            <span>📖 {c.cuz_no}. Cüz Okudum</span>
                            {islemYapiliyor === c.cuz_no && <span className="text-xs text-slate-400">Kaydediliyor...</span>}
                          </button>
                        )}
                      </div>
                    ))}

                    {/* Hepsini Okudum kısayolu */}
                    {!hepsiOkundu && hicOkunmadi && (
                      <button onClick={hepsiniOku}
                        disabled={islemYapiliyor !== null}
                        className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white font-bold py-4 rounded-xl text-base shadow-sm transition-colors mt-1">
                        {islemYapiliyor === 'hepsi' ? 'Kaydediliyor...' : '📚 Hepsini Okudum'}
                      </button>
                    )}

                    {hepsiOkundu && (
                      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-center">
                        <p className="text-sm font-semibold text-emerald-700">🎉 Tüm cüzler okundu!</p>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

            {/* Önceki tur özeti */}
            {veri.onceki_donem && veri.onceki_cuzler.length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-100 p-4">
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-3">
                  {veri.onceki_donem.tur_no}. Tur — Geçmiş
                </p>
                {veri.onceki_cuzler.length === 1 ? (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-slate-500">{veri.onceki_cuzler[0].cuz_no}</p>
                      <p className="text-xs text-slate-400 mt-0.5">Okunan Cüz</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-slate-500">
                        {veri.onceki_cuzler[0].okunan_gun}<span className="text-sm font-normal text-slate-300">/30</span>
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">Okunan Gün</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {veri.onceki_cuzler.map(c => (
                      <div key={c.cuz_no} className="flex items-center justify-between text-sm">
                        <span className="text-slate-500 font-medium">{c.cuz_no}. Cüz</span>
                        <span className="text-slate-400">{c.okunan_gun}<span className="text-xs">/30 gün</span></span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        ) : null}
      </div>
    </main>
  )
}
