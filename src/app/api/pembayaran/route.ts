import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { generateKuitansiNumber } from '@/lib/utils'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const siswaId = searchParams.get('siswaId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    const where: any = {}
    
    if (siswaId) {
      where.tagihan = { siswaId }
    }
    
    if (startDate || endDate) {
      where.tanggalBayar = {}
      if (startDate) where.tanggalBayar.gte = new Date(startDate)
      if (endDate) where.tanggalBayar.lte = new Date(endDate)
    }

    const [pembayaran, total] = await Promise.all([
      prisma.pembayaran.findMany({
        where,
        include: {
          tagihan: {
            include: {
              siswa: { select: { id: true, nama: true, nipd: true, kelasNama: true } },
              jenisTagihan: { select: { nama: true, kategori: true } }
            }
          }
        },
        orderBy: { tanggalBayar: 'desc' },
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.pembayaran.count({ where })
    ])

    return NextResponse.json({
      data: pembayaran,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
    })
  } catch (error) {
    console.error('Error fetching pembayaran:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { tagihanId, jumlahBayar, metodeBayar, keterangan } = body

    // Get tagihan and settings in parallel
    const [tagihan, settings] = await Promise.all([
      prisma.tagihan.findUnique({
        where: { id: tagihanId }
      }),
      prisma.sekolahSettings.findFirst()
    ])

    if (!tagihan) {
      return NextResponse.json({ error: 'Tagihan tidak ditemukan' }, { status: 404 })
    }

    const sisa = Number(tagihan.jumlahTagihan) - Number(tagihan.jumlahDibayar)
    
    // Allow overpayment - record full amount paid, track excess as infaq/donation
    const isOverpayment = jumlahBayar > sisa
    const infaq = isOverpayment ? jumlahBayar - sisa : 0

    // Get today's payment count for sequential numbering
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayEnd = new Date(today)
    todayEnd.setHours(23, 59, 59, 999)
    
    const todayCount = await prisma.pembayaran.count({
      where: {
        createdAt: {
          gte: today,
          lte: todayEnd
        }
      }
    })

    // Generate kuitansi number using format from settings
    const formatKuitansi = settings?.formatKuitansi || 'KWT/{tahun}/{bulan}/{tanggal}/{nomor}'
    const nomorKuitansi = generateKuitansiNumber(formatKuitansi, todayCount + 1)

    // Create payment and update tagihan
    const result = await prisma.$transaction(async (tx) => {
      const pembayaran = await tx.pembayaran.create({
        data: {
          tagihanId,
          jumlahBayar: jumlahBayar, // Record full amount paid (including overpayment)
          metodeBayar,
          keterangan: infaq > 0 
            ? `${keterangan || ''} [Infaq/Kelebihan: Rp ${infaq.toLocaleString('id-ID')}]`.trim()
            : keterangan,
          nomorKuitansi
        }
      })

      // jumlahDibayar = actual amount paid (can exceed jumlahTagihan)
      const newJumlahDibayar = Number(tagihan.jumlahDibayar) + jumlahBayar
      
      // Status is LUNAS if paid >= tagihan amount
      const status = newJumlahDibayar >= Number(tagihan.jumlahTagihan) 
        ? 'LUNAS' 
        : 'SEBAGIAN'

      await tx.tagihan.update({
        where: { id: tagihanId },
        data: {
          jumlahDibayar: newJumlahDibayar,
          status
        }
      })

      return { ...pembayaran, infaq }
    })

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    console.error('Error creating pembayaran:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'ID pembayaran diperlukan' }, { status: 400 })
    }

    // Get pembayaran to be deleted
    const pembayaran = await prisma.pembayaran.findUnique({
      where: { id },
      include: { tagihan: true }
    })

    if (!pembayaran) {
      return NextResponse.json({ error: 'Pembayaran tidak ditemukan' }, { status: 404 })
    }

    // Delete pembayaran and update tagihan in transaction
    await prisma.$transaction(async (tx) => {
      // Delete pembayaran
      await tx.pembayaran.delete({
        where: { id }
      })

      // Recalculate tagihan
      const remainingPayments = await tx.pembayaran.aggregate({
        where: { tagihanId: pembayaran.tagihanId },
        _sum: { jumlahBayar: true }
      })

      const totalDibayar = remainingPayments._sum.jumlahBayar || 0
      const tagihan = pembayaran.tagihan
      
      let status = 'BELUM_LUNAS'
      if (Number(totalDibayar) >= Number(tagihan.jumlahTagihan)) {
        status = 'LUNAS'
      } else if (Number(totalDibayar) > 0) {
        status = 'SEBAGIAN'
      }

      await tx.tagihan.update({
        where: { id: pembayaran.tagihanId },
        data: {
          jumlahDibayar: totalDibayar,
          status
        }
      })
    })

    return NextResponse.json({ message: 'Pembayaran berhasil dibatalkan' })
  } catch (error) {
    console.error('Error deleting pembayaran:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
