'use client'

import { useState, useEffect } from 'react'
import QRCode from 'react-qr-code'

export default function PaylasQR() {
  const [url, setUrl] = useState('')
  const [kopyalandi, setKopyalandi] = useState(false)
  const [acik, setAcik] = useState(false)

  useEffect(() => {
    setUrl(window.location.origin)
  }, [])

  const kopyala = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setKopyalandi(true)
      setTimeout(() => setKopyalandi(false), 2000)
    } catch {
      // clipboard API bazı tarayıcılarda kısıtlı
    }
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <button
        onClick={() => setAcik(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-base">📱</span>
          <span className="font-semibold text-slate-700 text-sm">Uygulamayı Paylaş</span>
        </div>
        <span className="text-slate-400 text-xs">{acik ? '▲' : '▼'}</span>
      </button>

      {acik && (
        <div className="px-4 pb-4 border-t border-slate-100">
          <p className="text-xs text-slate-500 mt-3 mb-4">
            Üyeler bu QR kodu telefon kamerasıyla okutarak uygulamaya erişebilir.<br />
            <strong className="text-slate-700">iOS için:</strong> Safari'de aç → Paylaş butonu → &ldquo;Ana Ekrana Ekle&rdquo; → uygulama gibi kullanılır.
          </p>

          <div className="flex flex-col items-center gap-4">
            {url && (
              <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
                <QRCode value={url} size={180} level="M" />
              </div>
            )}

            <div className="w-full flex items-center gap-2 bg-slate-50 rounded-lg px-3 py-2 border border-slate-200">
              <span className="text-xs text-slate-600 flex-1 truncate">{url || '...'}</span>
              <button
                onClick={kopyala}
                className="text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-3 py-1 rounded-full transition-colors whitespace-nowrap"
              >
                {kopyalandi ? '✓ Kopyalandı' : '📋 Kopyala'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
