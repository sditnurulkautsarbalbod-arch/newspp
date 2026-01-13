import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'

const BULAN_INDONESIA = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
]

// Helper function to get month number for comparison (July=1 in school year)
function getSchoolMonthOrder(bulan: number, tahun: number, tahunAjaranMulai: number): number {
  if (bulan >= 7) {
    return (bulan - 7) + (tahun - tahunAjaranMulai) * 12
  } else {
    return (bulan + 5) + (tahun - tahunAjaranMulai - 1) * 12
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const tahunAjaranId = searchParams.get('tahunAjaranId')
    const kelasId = searchParams.get('kelasId')
    const siswaId = searchParams.get('siswaId')
    const type = searchParams.get('type') || 'pdf'
    const tab = searchParams.get('tab') || 'bulanan'

    if (!tahunAjaranId) {
      return NextResponse.json({ error: 'Tahun ajaran diperlukan' }, { status: 400 })
    }

    // Get tahun ajaran
    const tahunAjaran = await prisma.tahunAjaran.findUnique({
      where: { id: tahunAjaranId }
    })

    if (!tahunAjaran) {
      return NextResponse.json({ error: 'Tahun ajaran tidak ditemukan' }, { status: 404 })
    }

    // Build where clause
    const where: any = { tahunAjaranId }
    if (siswaId) {
      where.siswaId = siswaId
    } else if (kelasId) {
      where.siswa = { kelasId }
    }

    // Filter by category
    if (tab === 'bulanan') {
      where.jenisTagihan = { kategori: 'BULANAN' }
    } else {
      where.jenisTagihan = { kategori: 'SEKALI_BAYAR' }
    }

    // Fetch tagihan with related data including histori for pindah masuk/keluar filter
    const tagihan = await prisma.tagihan.findMany({
      where,
      include: {
        siswa: { 
          select: { 
            nama: true, 
            nipd: true, 
            kelasNama: true,
            histori: {
              where: {
                tipeAksi: { in: ['PINDAH_MASUK', 'PINDAH_KELUAR'] },
                tahunAjaranId: tahunAjaranId
              },
              orderBy: { tanggalAksi: 'desc' }
            }
          } 
        },
        jenisTagihan: { select: { nama: true, kategori: true } },
        pembayaran: { select: { jumlahBayar: true, tanggalBayar: true } }
      },
      orderBy: [
        { siswa: { kelasNama: 'asc' } },
        { siswa: { nama: 'asc' } },
        { bulan: 'asc' }
      ]
    })

    // Filter out tagihan based on pindah masuk/keluar dates
    const filteredTagihan = tagihan.filter(t => {
      // Only filter monthly tagihan (BULANAN)
      if (t.jenisTagihan.kategori !== 'BULANAN' || !t.bulan || !t.tahun) {
        return true
      }

      const tahunMulai = tahunAjaran.tahunMulai || 2024
      const tagihanOrder = getSchoolMonthOrder(t.bulan, t.tahun, tahunMulai)

      // Check PINDAH_MASUK - filter months before enrollment
      const pindahMasuk = t.siswa.histori?.find(h => h.tipeAksi === 'PINDAH_MASUK')
      if (pindahMasuk) {
        const enrollDate = new Date(pindahMasuk.tanggalAksi)
        const enrollMonth = enrollDate.getMonth() + 1
        const enrollYear = enrollDate.getFullYear()
        const enrollOrder = getSchoolMonthOrder(enrollMonth, enrollYear, tahunMulai)
        
        if (tagihanOrder < enrollOrder) {
          return false
        }
      }

      // Check PINDAH_KELUAR - filter months after leaving
      const pindahKeluar = t.siswa.histori?.find(h => h.tipeAksi === 'PINDAH_KELUAR')
      if (pindahKeluar) {
        const leaveDate = new Date(pindahKeluar.tanggalAksi)
        const leaveMonth = leaveDate.getMonth() + 1
        const leaveYear = leaveDate.getFullYear()
        const leaveOrder = getSchoolMonthOrder(leaveMonth, leaveYear, tahunMulai)
        
        if (tagihanOrder > leaveOrder) {
          return false
        }
      }

      return true
    })

    // Group by siswa
    const grouped: Record<string, {
      siswa: { nama: string; nipd: string; kelas: string; enrollMonth?: number; enrollYear?: number; leaveMonth?: number; leaveYear?: number }
      items: any[]
    }> = {}

    for (const t of filteredTagihan) {
      const key = t.siswa.nipd
      if (!grouped[key]) {
        const pindahMasuk = t.siswa.histori?.find(h => h.tipeAksi === 'PINDAH_MASUK')
        const pindahKeluar = t.siswa.histori?.find(h => h.tipeAksi === 'PINDAH_KELUAR')
        
        let enrollMonth, enrollYear, leaveMonth, leaveYear
        if (pindahMasuk) {
          const enrollDate = new Date(pindahMasuk.tanggalAksi)
          enrollMonth = enrollDate.getMonth() + 1
          enrollYear = enrollDate.getFullYear()
        }
        if (pindahKeluar) {
          const leaveDate = new Date(pindahKeluar.tanggalAksi)
          leaveMonth = leaveDate.getMonth() + 1
          leaveYear = leaveDate.getFullYear()
        }
        
        grouped[key] = {
          siswa: { 
            nama: t.siswa.nama, 
            nipd: t.siswa.nipd, 
            kelas: t.siswa.kelasNama,
            enrollMonth,
            enrollYear,
            leaveMonth,
            leaveYear
          },
          items: []
        }
      }
      grouped[key].items.push({
        nama: t.jenisTagihan.nama,
        bulan: t.bulan,
        tahun: t.tahun,
        jumlahTagihan: Number(t.jumlahTagihan),
        jumlahDibayar: Number(t.jumlahDibayar),
        status: t.status
      })
    }

    const data = Object.values(grouped)

    if (type === 'excel') {
      return generateExcel(data, tahunAjaran.nama, tab, tahunAjaran.tahunMulai || 2024)
    } else {
      return generatePDF(data, tahunAjaran.nama, tab, tahunAjaran.tahunMulai || 2024)
    }
  } catch (error) {
    console.error('Error generating report:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

function generatePDF(data: any[], tahunAjaranNama: string, tab: string, tahunMulai: number) {
  const doc = new jsPDF({ orientation: 'landscape' })
  
  // Title
  doc.setFontSize(16)
  doc.text(`Status Pembayaran ${tab === 'bulanan' ? 'SPP Bulanan' : 'Sekali Bayar'}`, 14, 15)
  doc.setFontSize(11)
  doc.text(`Tahun Ajaran: ${tahunAjaranNama}`, 14, 22)
  doc.text(`Tanggal: ${new Date().toLocaleDateString('id-ID')}`, 14, 28)

  if (tab === 'bulanan') {
    // Generate monthly grid
    const headers = [['NIPD', 'Nama', 'Kelas', 'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des', 'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun']]
    const bulanOrder = [7, 8, 9, 10, 11, 12, 1, 2, 3, 4, 5, 6]
    
    const bodyData = data.map(d => {
      const row = [d.siswa.nipd, d.siswa.nama, d.siswa.kelas]
      
      for (const bulan of bulanOrder) {
        // Determine the year for this month
        const tahunBulan = bulan >= 7 ? tahunMulai : tahunMulai + 1
        const bulanOrder_val = getSchoolMonthOrder(bulan, tahunBulan, tahunMulai)
        
        // Check if this month is before enrollment for pindah masuk students
        if (d.siswa.enrollMonth && d.siswa.enrollYear) {
          const enrollOrder_val = getSchoolMonthOrder(d.siswa.enrollMonth, d.siswa.enrollYear, tahunMulai)
          
          if (bulanOrder_val < enrollOrder_val) {
            row.push('-') // Before enrollment, show dash
            continue
          }
        }
        
        // Check if this month is after leaving for pindah keluar students
        if (d.siswa.leaveMonth && d.siswa.leaveYear) {
          const leaveOrder_val = getSchoolMonthOrder(d.siswa.leaveMonth, d.siswa.leaveYear, tahunMulai)
          
          if (bulanOrder_val > leaveOrder_val) {
            row.push('-') // After leaving, show dash
            continue
          }
        }
        
        const item = d.items.find((i: any) => i.bulan === bulan)
        if (item) {
          row.push(item.status === 'LUNAS' ? 'V' : item.status === 'SEBAGIAN' ? '~' : 'X')
        } else {
          row.push('-')
        }
      }
      return row
    })

    autoTable(doc, {
      startY: 35,
      head: headers,
      body: bodyData,
      styles: { fontSize: 8, cellPadding: 2, halign: 'center' },
      headStyles: { fillColor: [59, 130, 246] },
      columnStyles: {
        0: { cellWidth: 25, halign: 'left' },
        1: { cellWidth: 40, halign: 'left' },
        2: { cellWidth: 20, halign: 'center' }
      },
      didParseCell: function(data) {
        // Style status cells (columns 3-14 are month columns)
        if (data.section === 'body' && data.column.index >= 3) {
          const value = data.cell.raw as string
          if (value === 'V') {
            data.cell.styles.textColor = [22, 163, 74] // green-600
            data.cell.styles.fontStyle = 'bold'
          } else if (value === '~') {
            data.cell.styles.textColor = [202, 138, 4] // yellow-600
            data.cell.styles.fontStyle = 'bold'
          } else if (value === 'X') {
            data.cell.styles.textColor = [220, 38, 38] // red-600
            data.cell.styles.fontStyle = 'bold'
          } else {
            data.cell.styles.textColor = [156, 163, 175] // gray-400
          }
        }
      }
    })
  } else {
    // Sekali bayar table
    const headers = [['NIPD', 'Nama', 'Kelas', 'Jenis Tagihan', 'Tagihan', 'Terbayar', 'Sisa', 'Status']]
    
    const bodyData: any[] = []
    for (const d of data) {
      for (const item of d.items) {
        bodyData.push([
          d.siswa.nipd,
          d.siswa.nama,
          d.siswa.kelas,
          item.nama,
          `Rp ${item.jumlahTagihan.toLocaleString('id-ID')}`,
          `Rp ${item.jumlahDibayar.toLocaleString('id-ID')}`,
          `Rp ${(item.jumlahTagihan - item.jumlahDibayar).toLocaleString('id-ID')}`,
          item.status === 'LUNAS' ? 'Lunas' : item.status === 'SEBAGIAN' ? 'Sebagian' : 'Belum'
        ])
      }
    }

    autoTable(doc, {
      startY: 35,
      head: headers,
      body: bodyData,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [59, 130, 246] }
    })
  }

  // Legend
  const finalY = (doc as any).lastAutoTable?.finalY || 35
  doc.setFontSize(9)
  doc.text('Keterangan: V = Lunas, ~ = Sebagian, X = Belum Bayar, - = Tidak ada tagihan/Belum masuk/Sudah keluar', 14, finalY + 10)

  const buffer = Buffer.from(doc.output('arraybuffer'))
  
  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="status-pembayaran-${new Date().toISOString().split('T')[0]}.pdf"`
    }
  })
}

function generateExcel(data: any[], tahunAjaranNama: string, tab: string, tahunMulai: number) {
  const workbook = XLSX.utils.book_new()
  
  if (tab === 'bulanan') {
    const bulanOrder = [7, 8, 9, 10, 11, 12, 1, 2, 3, 4, 5, 6]
    const headers = ['NIPD', 'Nama', 'Kelas', 'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des', 'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun']
    
    const rows = [
      [`Status Pembayaran SPP Bulanan - TA ${tahunAjaranNama}`],
      ['Keterangan: LUNAS = Sudah bayar, SEBAGIAN = Bayar sebagian, BELUM = Belum bayar, - = Tidak ada tagihan/Belum masuk/Sudah keluar'],
      [],
      headers,
      ...data.map(d => {
        const row = [d.siswa.nipd, d.siswa.nama, d.siswa.kelas]
        
        for (const bulan of bulanOrder) {
          const tahunBulan = bulan >= 7 ? tahunMulai : tahunMulai + 1
          const bulanOrder_val = getSchoolMonthOrder(bulan, tahunBulan, tahunMulai)
          
          // Check if this month is before enrollment for pindah masuk students
          if (d.siswa.enrollMonth && d.siswa.enrollYear) {
            const enrollOrder_val = getSchoolMonthOrder(d.siswa.enrollMonth, d.siswa.enrollYear, tahunMulai)
            
            if (bulanOrder_val < enrollOrder_val) {
              row.push('-')
              continue
            }
          }
          
          // Check if this month is after leaving for pindah keluar students
          if (d.siswa.leaveMonth && d.siswa.leaveYear) {
            const leaveOrder_val = getSchoolMonthOrder(d.siswa.leaveMonth, d.siswa.leaveYear, tahunMulai)
            
            if (bulanOrder_val > leaveOrder_val) {
              row.push('-')
              continue
            }
          }
          
          const item = d.items.find((i: any) => i.bulan === bulan)
          if (item) {
            row.push(item.status === 'LUNAS' ? 'LUNAS' : item.status === 'SEBAGIAN' ? 'SEBAGIAN' : 'BELUM')
          } else {
            row.push('-')
          }
        }
        return row
      })
    ]

    const worksheet = XLSX.utils.aoa_to_sheet(rows)
    XLSX.utils.book_append_sheet(workbook, worksheet, 'SPP Bulanan')
  } else {
    const headers = ['NIPD', 'Nama', 'Kelas', 'Jenis Tagihan', 'Tagihan', 'Terbayar', 'Sisa', 'Status']
    
    const rows: any[] = [
      [`Status Pembayaran Sekali Bayar - TA ${tahunAjaranNama}`],
      [],
      headers
    ]

    for (const d of data) {
      for (const item of d.items) {
        rows.push([
          d.siswa.nipd,
          d.siswa.nama,
          d.siswa.kelas,
          item.nama,
          item.jumlahTagihan,
          item.jumlahDibayar,
          item.jumlahTagihan - item.jumlahDibayar,
          item.status === 'LUNAS' ? 'Lunas' : item.status === 'SEBAGIAN' ? 'Sebagian' : 'Belum Lunas'
        ])
      }
    }

    const worksheet = XLSX.utils.aoa_to_sheet(rows)
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Sekali Bayar')
  }

  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="status-pembayaran-${new Date().toISOString().split('T')[0]}.xlsx"`
    }
  })
}
