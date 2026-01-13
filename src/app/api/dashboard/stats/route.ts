import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET() {
  try {
    // Get active tahun ajaran
    const tahunAjaran = await prisma.tahunAjaran.findFirst({
      where: { aktif: true }
    })

    if (!tahunAjaran) {
      return NextResponse.json({
        totalSiswa: 0,
        totalTagihan: 0,
        totalTerbayar: 0,
        totalBelumLunas: 0,
        persentaseLunas: 0,
        pembayaranBulanIni: [],
        tagihanPerJenis: []
      })
    }

    // Total siswa aktif
    const totalSiswa = await prisma.siswa.count({
      where: { tahunAjaranId: tahunAjaran.id, aktif: true }
    })

    // Total tagihan
    const tagihanAgg = await prisma.tagihan.aggregate({
      where: { tahunAjaranId: tahunAjaran.id },
      _sum: { jumlahTagihan: true, jumlahDibayar: true }
    })

    const totalTagihan = Number(tagihanAgg._sum.jumlahTagihan) || 0
    const totalTerbayar = Number(tagihanAgg._sum.jumlahDibayar) || 0

    // Tagihan belum lunas
    const belumLunasCount = await prisma.tagihan.count({
      where: { 
        tahunAjaranId: tahunAjaran.id,
        status: { not: 'LUNAS' }
      }
    })

    const lunasCount = await prisma.tagihan.count({
      where: { 
        tahunAjaranId: tahunAjaran.id,
        status: 'LUNAS'
      }
    })

    const totalTagihanCount = belumLunasCount + lunasCount
    const persentaseLunas = totalTagihanCount > 0 
      ? Math.round((lunasCount / totalTagihanCount) * 100) 
      : 0

// Pembayaran 6 bulan terakhir (filter by active tahun ajaran)
    const sixMonthsAgo = new Date()
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

    const pembayaranRaw = await prisma.pembayaran.findMany({
      where: {
        tanggalBayar: { gte: sixMonthsAgo },
        tagihan: {
          tahunAjaranId: tahunAjaran.id
        }
      },
      select: {
        jumlahBayar: true,
        tanggalBayar: true
      }
    })

    // Group by month
    const pembayaranPerBulan: Record<string, number> = {}
    pembayaranRaw.forEach(p => {
      const key = `${p.tanggalBayar.getFullYear()}-${String(p.tanggalBayar.getMonth() + 1).padStart(2, '0')}`
      pembayaranPerBulan[key] = (pembayaranPerBulan[key] || 0) + Number(p.jumlahBayar)
    })

    const pembayaranBulanIni = Object.entries(pembayaranPerBulan)
      .map(([bulan, total]) => ({ bulan, total }))
      .sort((a, b) => a.bulan.localeCompare(b.bulan))

    // Tagihan per jenis
    const tagihanPerJenis = await prisma.jenisTagihan.findMany({
      where: { tahunAjaranId: tahunAjaran.id },
      include: {
        tagihan: {
          select: {
            jumlahTagihan: true,
            jumlahDibayar: true,
            status: true
          }
        }
      }
    })

    const tagihanPerJenisFormatted = tagihanPerJenis.map(jt => ({
      nama: jt.nama,
      totalTagihan: jt.tagihan.reduce((acc, t) => acc + Number(t.jumlahTagihan), 0),
      totalTerbayar: jt.tagihan.reduce((acc, t) => acc + Number(t.jumlahDibayar), 0),
      jumlahLunas: jt.tagihan.filter(t => t.status === 'LUNAS').length,
      jumlahBelumLunas: jt.tagihan.filter(t => t.status !== 'LUNAS').length
    }))

    return NextResponse.json({
      totalSiswa,
      totalTagihan,
      totalTerbayar,
      totalBelumLunas: totalTagihan - totalTerbayar,
      persentaseLunas,
      pembayaranBulanIni,
      tagihanPerJenis: tagihanPerJenisFormatted,
      tahunAjaran: tahunAjaran.nama
    })
  } catch (error) {
    console.error('Error fetching dashboard stats:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
