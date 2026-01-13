import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const kelasId = searchParams.get('kelasId')

    if (!kelasId) {
      return NextResponse.json([])
    }

    const siswa = await prisma.siswa.findMany({
      where: {
        kelasId,
        status: 'AKTIF',
      },
      include: {
        kelas: { select: { id: true, nama: true, tingkat: true } }
      },
      orderBy: { nama: 'asc' }
    })

    return NextResponse.json(siswa)
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { siswaIds, kelasIdTujuan, tahunAjaranIdTujuan } = body

    if (!siswaIds || siswaIds.length === 0) {
      return NextResponse.json({ error: 'No siswa selected' }, { status: 400 })
    }

    // Get kelas tujuan info
    const kelasTujuan = await prisma.kelas.findUnique({
      where: { id: kelasIdTujuan }
    })

    if (!kelasTujuan) {
      return NextResponse.json({ error: 'Kelas tujuan not found' }, { status: 404 })
    }

    const result = await prisma.$transaction(async (tx) => {
      const processedSiswa = []

      for (const siswaId of siswaIds) {
        // Get current siswa data for history
        const siswa = await tx.siswa.findUnique({
          where: { id: siswaId },
          include: { kelas: true }
        })

        if (!siswa) continue

        // Determine action type
        const oldTingkat = siswa.kelas?.tingkat || 0
        const newTingkat = kelasTujuan.tingkat
        let tipeAksi = 'NAIK_KELAS'
        if (newTingkat === oldTingkat) {
          tipeAksi = 'PINDAH_KELAS'
        } else if (newTingkat < oldTingkat) {
          tipeAksi = 'TINGGAL_KELAS'
        }

        // Create history for old class
        await tx.siswaHistori.create({
          data: {
            siswaId,
            tahunAjaranId: siswa.tahunAjaranId,
            kelasId: siswa.kelasId,
            kelasNama: siswa.kelasNama,
            tipeAksi,
            keterangan: `${siswa.kelasNama} → ${kelasTujuan.nama}`,
            tanggalAksi: new Date()
          }
        })

        // Update siswa
        await tx.siswa.update({
          where: { id: siswaId },
          data: {
            kelasId: kelasIdTujuan,
            kelasNama: kelasTujuan.nama,
            tahunAjaranId: tahunAjaranIdTujuan,
          }
        })

        processedSiswa.push(siswa.nama)
      }

      return { count: processedSiswa.length, names: processedSiswa }
    })

    return NextResponse.json({ success: true, count: result.count })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Failed to process' }, { status: 500 })
  }
}
