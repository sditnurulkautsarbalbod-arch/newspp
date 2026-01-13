import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

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
    const kelas = searchParams.get('kelas')
    const bulan = searchParams.get('bulan')
    const jenisTagihanId = searchParams.get('jenisTagihanId')
    const status = searchParams.get('status')
    const tahunAjaranId = searchParams.get('tahunAjaranId')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '100')

    // Fetch all tahun ajaran for dropdown options
    const allTahunAjaran = await prisma.tahunAjaran.findMany({
      orderBy: { createdAt: 'desc' },
      select: { id: true, nama: true, aktif: true, tahunMulai: true }
    })

    // Determine which tahun ajaran to query
    let selectedTahunAjaran: { id: string; nama: string; aktif: boolean; tahunMulai?: number } | null = null
    const where: any = {}

    if (tahunAjaranId === 'all') {
      // Show all years - for cross-year tracking (tunggakan lintas tahun)
      selectedTahunAjaran = { id: 'all', nama: 'Semua Tahun Ajaran', aktif: false }
    } else if (tahunAjaranId) {
      // Specific year selected
      selectedTahunAjaran = allTahunAjaran.find(t => t.id === tahunAjaranId) || null
      if (selectedTahunAjaran) {
        where.tahunAjaranId = tahunAjaranId
      }
    } else {
      // Default to active year
      selectedTahunAjaran = allTahunAjaran.find(t => t.aktif) || null
      if (selectedTahunAjaran) {
        where.tahunAjaranId = selectedTahunAjaran.id
      }
    }

    if (!selectedTahunAjaran && allTahunAjaran.length === 0) {
      return NextResponse.json({ data: [], summary: {}, tahunAjaranOptions: [] })
    }

    if (kelas) {
      where.siswa = { kelasNama: kelas }
    }

    if (bulan) {
      where.bulan = parseInt(bulan)
    }

    if (jenisTagihanId) {
      where.jenisTagihanId = jenisTagihanId
    }

    if (status) {
      where.status = status
    }

    const tagihan = await prisma.tagihan.findMany({
      where,
      include: {
        siswa: { 
          select: { 
            id: true,
            nama: true, 
            nipd: true, 
            kelasNama: true,
            histori: {
              where: {
                tipeAksi: { in: ['PINDAH_MASUK', 'PINDAH_KELUAR'] },
                ...(selectedTahunAjaran?.id !== 'all' ? { tahunAjaranId: selectedTahunAjaran?.id } : {})
              },
              orderBy: { tanggalAksi: 'desc' }
            }
          } 
        },
        jenisTagihan: { select: { nama: true, kategori: true } },
        tahunAjaran: { select: { nama: true, tahunMulai: true } },
        pembayaran: {
          select: { jumlahBayar: true, tanggalBayar: true, metodeBayar: true }
        }
      },
      orderBy: [
        { tahunAjaran: { nama: 'desc' } },
        { siswa: { kelasNama: 'asc' } },
        { siswa: { nama: 'asc' } }
      ],
      take: limit,
      skip: (page - 1) * limit
    })

    // Get total count for pagination
    const totalCount = await prisma.tagihan.count({ where })

    // Filter out tagihan based on pindah masuk/keluar dates
    const filteredTagihan = tagihan.filter(t => {
      // Only filter monthly tagihan (check if BULANAN is in comma-separated kategori)
      const kategoriList = t.jenisTagihan.kategori.split(',')
      const isBulanan = kategoriList.includes('BULANAN')
      
      if (!isBulanan || !t.bulan || !t.tahun) {
        return true
      }

      const tahunMulai = t.tahunAjaran?.tahunMulai || selectedTahunAjaran?.tahunMulai || 2024
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

    // Calculate summary
    const summary = {
      totalTagihan: filteredTagihan.reduce((acc, t) => acc + Number(t.jumlahTagihan), 0),
      totalTerbayar: filteredTagihan.reduce((acc, t) => acc + Number(t.jumlahDibayar), 0),
      jumlahLunas: filteredTagihan.filter(t => t.status === 'LUNAS').length,
      jumlahBelumLunas: filteredTagihan.filter(t => t.status !== 'LUNAS').length,
      totalTransaksi: filteredTagihan.reduce((acc, t) => acc + t.pembayaran.length, 0)
    }

    return NextResponse.json({
      data: filteredTagihan,
      summary,
      tahunAjaran: selectedTahunAjaran?.nama || '',
      tahunAjaranId: selectedTahunAjaran?.id || '',
      tahunAjaranOptions: allTahunAjaran,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit)
      }
    })
  } catch (error) {
    console.error('Error fetching laporan:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
