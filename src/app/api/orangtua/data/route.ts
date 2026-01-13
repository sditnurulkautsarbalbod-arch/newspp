import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user.siswaId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const siswa = await prisma.siswa.findUnique({
      where: { id: session.user.siswaId },
      include: {
        tahunAjaran: true,
        tagihan: {
          include: {
            jenisTagihan: true,
            pembayaran: { orderBy: { tanggalBayar: 'desc' } }
          }
        }
      }
    })

    if (!siswa) {
      return NextResponse.json({ error: 'Siswa tidak ditemukan' }, { status: 404 })
    }

    // Calculate summary
    const totalTagihan = siswa.tagihan.reduce((acc, t) => acc + Number(t.jumlahTagihan), 0)
    const totalTerbayar = siswa.tagihan.reduce((acc, t) => acc + Number(t.jumlahDibayar), 0)
    const tagihanBelumLunas = siswa.tagihan.filter(t => t.status !== 'LUNAS').length
    const tagihanLunas = siswa.tagihan.filter(t => t.status === 'LUNAS').length

    // Recent payments
    const allPembayaran = siswa.tagihan.flatMap(t => 
      t.pembayaran.map(p => ({
        ...p,
        jenisTagihan: t.jenisTagihan.nama,
        bulan: t.bulan,
        tahun: t.tahun
      }))
    ).sort((a, b) => new Date(b.tanggalBayar).getTime() - new Date(a.tanggalBayar).getTime())

    return NextResponse.json({
      siswa: {
        id: siswa.id,
        nama: siswa.nama,
        nipd: siswa.nipd,
        kelas: siswa.kelasNama,
        tahunAjaran: siswa.tahunAjaran.nama
      },
      summary: {
        totalTagihan,
        totalTerbayar,
        sisaBelumBayar: totalTagihan - totalTerbayar,
        tagihanBelumLunas,
        tagihanLunas
      },
      recentPayments: allPembayaran.slice(0, 5),
      tagihan: siswa.tagihan
    })
  } catch (error) {
    console.error('Error fetching orangtua data:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
