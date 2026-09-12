import { NextResponse } from 'next/server'
import * as XLSX from 'xlsx'

export async function GET() {
  const ornekData = [
    { ad_soyad: 'Ahmet Yilmaz', tel_no: '05001112233', cuz_no: 1 },
    { ad_soyad: 'Fatma Kaya', tel_no: '05334445566', cuz_no: 2 },
    { ad_soyad: 'Mehmet Demir', tel_no: '05557778899', cuz_no: 3 },
  ]

  const ws = XLSX.utils.json_to_sheet(ornekData, {
    header: ['ad_soyad', 'tel_no', 'cuz_no'],
  })

  ws['A1'] = { v: 'ad_soyad', t: 's' }
  ws['B1'] = { v: 'tel_no', t: 's' }
  ws['C1'] = { v: 'cuz_no', t: 's' }

  // Sütun genişlikleri
  ws['!cols'] = [{ wch: 30 }, { wch: 16 }, { wch: 10 }]

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
