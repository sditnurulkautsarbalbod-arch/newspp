import { NextResponse } from 'next/server'
import * as XLSX from 'xlsx'

export async function GET() {
  try {
    // Create template workbook
    const data = [
      {
        'NIPD': '2024001',
        'Nama': 'Contoh Nama Siswa',
        'Kelas': '1A',
        'Jenis Kelamin': 'L',
        'Alamat': 'Jl. Contoh No. 123',
        'Nama Orang Tua': 'Nama Orang Tua',
        'No Telepon': '08123456789',
      },
      {
        'NIPD': '2024002',
        'Nama': 'Contoh Siswa 2',
        'Kelas': '1B',
        'Jenis Kelamin': 'P',
        'Alamat': 'Jl. Contoh No. 456',
        'Nama Orang Tua': 'Nama Orang Tua 2',
        'No Telepon': '08987654321',
      },
    ]

    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Template Siswa')

    // Set column widths
    ws['!cols'] = [
      { wch: 12 }, // NIPD
      { wch: 25 }, // Nama
      { wch: 8 },  // Kelas
      { wch: 15 }, // Jenis Kelamin
      { wch: 30 }, // Alamat
      { wch: 25 }, // Nama Orang Tua
      { wch: 15 }, // No Telepon
    ]

    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="template-siswa.xlsx"',
      },
    })
  } catch (error) {
    console.error('Template error:', error)
    return NextResponse.json({ error: 'Failed to generate template' }, { status: 500 })
  }
}
