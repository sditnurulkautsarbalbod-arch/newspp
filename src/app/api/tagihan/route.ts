import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Helper function to get month number for comparison (July=1 in school year)
function getSchoolMonthOrder(bulan: number, tahun: number, tahunAjaranMulai: number): number {
  // School year starts in July (month 7)
  // July 2024 = month 1, Aug 2024 = month 2, ..., June 2025 = month 12
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
    const status = searchParams.get('status')

    let taId = tahunAjaranId
    let tahunAjaran = null
    
    if (!taId) {
      tahunAjaran = await prisma.tahunAjaran.findFirst({
        where: { aktif: true }
      })
      if (!tahunAjaran) {
        return NextResponse.json({ data: [] })
      }
      taId = tahunAjaran.id
    } else {
      tahunAjaran = await prisma.tahunAjaran.findUnique({
        where: { id: taId }
      })
    }

    const where: any = {
      tahunAjaranId: taId
    }

    if (siswaId) {
      where.siswaId = siswaId
    }

    if (kelasId) {
      where.siswa = { kelasId }
    }

    if (status) {
      // Support comma-separated status values
      const statuses = status.split(',')
      if (statuses.length > 1) {
        where.status = { in: statuses }
      } else {
        where.status = status
      }
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
            kelasId: true,
            histori: {
              where: {
                tipeAksi: { in: ['PINDAH_MASUK', 'PINDAH_KELUAR'] },
                tahunAjaranId: taId
              },
              orderBy: { tanggalAksi: 'desc' }
            }
          } 
        },
        jenisTagihan: { select: { id: true, nama: true, kategori: true, nominal: true } },
        pembayaran: {
          orderBy: { tanggalBayar: 'desc' }
        }
      },
      orderBy: [
        { siswa: { kelasNama: 'asc' } },
        { siswa: { nama: 'asc' } },
        { jenisTagihan: { kategori: 'asc' } },
        { bulan: 'asc' }
      ]
    })

    // Filter out tagihan based on pindah masuk/keluar dates
    const filteredTagihan = tagihan.filter(t => {
      // Only filter monthly tagihan (check if BULANAN is in comma-separated kategori)
      const kategoriList = t.jenisTagihan.kategori.split(',')
      const isBulanan = kategoriList.includes('BULANAN')
      
      if (!isBulanan || !t.bulan || !t.tahun) {
        return true
      }

      const tahunMulai = tahunAjaran?.tahunMulai || 2024
      const tagihanOrder = getSchoolMonthOrder(t.bulan, t.tahun, tahunMulai)

      // Check PINDAH_MASUK - filter months before enrollment
      const pindahMasuk = t.siswa.histori?.find(h => h.tipeAksi === 'PINDAH_MASUK')
      if (pindahMasuk) {
        const enrollDate = new Date(pindahMasuk.tanggalAksi)
        const enrollMonth = enrollDate.getMonth() + 1
        const enrollYear = enrollDate.getFullYear()
        const enrollOrder = getSchoolMonthOrder(enrollMonth, enrollYear, tahunMulai)
        
        if (tagihanOrder < enrollOrder) {
          return false // Before enrollment, hide tagihan
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
          return false // After leaving, hide tagihan
        }
      }

      return true
    })

    return NextResponse.json({ data: filteredTagihan })
  } catch (error) {
    console.error('Error fetching tagihan:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
