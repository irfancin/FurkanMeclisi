'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import type { OturumKullanici } from '@/types'

const OTURUM_KEY = 'fm_oturum'

export function useAuth() {
  const [kullanici, setKullanici] = useState<OturumKullanici | null>(null)
  const [yukleniyor, setYukleniyor] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const kayitliOturum = localStorage.getItem(OTURUM_KEY)
    if (kayitliOturum) {
      setKullanici(JSON.parse(kayitliOturum))
    }
    setYukleniyor(false)
  }, [])

  const girisYap = (kullaniciData: OturumKullanici) => {
    localStorage.setItem(OTURUM_KEY, JSON.stringify(kullaniciData))
    setKullanici(kullaniciData)
    if (kullaniciData.kullanici_tipi === 'Uye') {
      router.push('/bugun')
    } else {
      router.push('/admin')
    }
  }

  const cikisYap = () => {
    localStorage.removeItem(OTURUM_KEY)
    setKullanici(null)
    router.push('/')
  }

  return { kullanici, yukleniyor, girisYap, cikisYap }
}
