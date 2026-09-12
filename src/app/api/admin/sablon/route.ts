import { NextResponse } from 'next/server'
import * as XLSX from 'xlsx'

export async function GET() {
  const ornekData = [
    { ad_soyad: 'Ahmet Yilmaz', tel_no: '05001112233' },
    { ad_soyad: 'Fatma Kaya', tel_no: '05334445566' },
    { ad_soyad: 'Mehmet Demir', tel_no: '05557778899' },
  ]

  const ws = XLSX.utils.json_to_sheet(ornekData, {
    header: ['ad_soyad', 'tel_no'],
  })

  // Sütun başlıklarını Türkçe yaz (A1/B1 hücrelerini override et)
  ws['A1'] = { v: 'ad_soyad', t: 's' }
  ws['B1'] = { v: 'tel_no', t: 's' }

  // Sütun genişlikleri
  ws['!cols'] = [{ wch: 30 }, { wch: 16 }]

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Uyeler')

  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })

  return new NextResponse(buf, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="uye_sablon.xlsx"',
    },
  })
}
