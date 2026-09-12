'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import type { OturumKullanici } from '@/types'

const MENU = [
  { href: '/admin', label: 'Günlük Rapor' },
  { href: '/admin/yonetim', label: 'Yönetim' },
  { href: '/admin/rotasyon', label: 'Tur Başlat' },
  { href: '/admin/raporlar', label: 'Raporlar' },
  { href: '/admin/loglar', label: 'Giriş Logları' },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [kullanici, setKullanici] = useState<OturumKullanici | null>(null)
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    const kayitli = localStorage.getItem('fm_oturum')
    if (!kayitli) { router.replace('/'); return }
    const k: OturumKullanici = JSON.parse(kayitli)
    if (k.kullanici_tipi === 'Uye') { router.replace('/bugun'); return }
    setKullanici(k)
  }, [router])

  const cikis = () => {
    localStorage.removeItem('fm_oturum')
    router.push('/')
  }

  if (!kullanici) return null

  return (
    <div className="min-h-screen flex flex-col">
      {/* Üst bar */}
      <header className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">📖</span>
          <span className="font-semibold text-slate-700">Furkan Meclisi</span>
          <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium">Yönetici</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-500 hidden sm:block">{kullanici.ad_soyad}</span>
          <button onClick={cikis} className="text-xs text-slate-400 hover:text-slate-600 underline">
            Çıkış
          </button>
        </div>
      </header>

      {/* Navigasyon */}
      <nav className="bg-white border-b border-slate-200 overflow-x-auto">
        <div className="flex px-4">
          {MENU.map(item => (
            <Link
              key={item.href}
              href={item.href}
              className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                pathname === item.href
                  ? 'border-emerald-600 text-emerald-700'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              {item.label}
            </Link>
          ))}
        </div>
      </nav>

      {/* İçerik */}
      <main className="flex-1 p-4 max-w-4xl mx-auto w-full">
        {children}
      </main>
    </div>
  )
}
