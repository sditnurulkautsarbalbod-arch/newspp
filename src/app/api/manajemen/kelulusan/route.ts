import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const tahunAjaranId = searchParams.get('tahunAjaranId')

    if (!tahunAjaranId) {
      return NextResponse.json([])
    }

    // Get siswa kelas 6 (tingkat 6) yang masih aktif
    const siswa = await prisma.siswa.findMany({
      where: {
        tahunAjaranId,
        status: 'AKTIF',
        kelas: { tingkat: 6 }
      },
      include: {
        kelas: { select: { nama: true, tingkat: true } }
      },
      orderBy: [{ kelasNama: 'asc' }, { nama: 'asc' }]
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
    const { siswaIds, tahunAjaranId } = body

    if (!siswaIds || siswaIds.length === 0) {
      return NextResponse.json({ error: 'No siswa selected' }, { status: 400 })
    }

    const result = await prisma.$transaction(async (tx) => {
      const processedSiswa = []

      for (const siswaId of siswaIds) {
        // Get current siswa data
        const siswa = await tx.siswa.findUnique({
          where: { id: siswaId },
          include: { kelas: true }
        })

        if (!siswa) continue

        // Create history
        await tx.siswaHistori.create({
          data: {
            siswaId,
            tahunAjaranId: siswa.tahunAjaranId,
            kelasId: siswa.kelasId,
            kelasNama: siswa.kelasNama,
            tipeAksi: 'LULUS',
            keterangan: `Lulus dari ${siswa.kelasNama}`,
            tanggalAksi: new Date()
          }
        })

        // Update siswa status
        await tx.siswa.update({
          where: { id: siswaId },
          data: { 
            status: 'LULUS',
            aktif: false,
            tanggalKeluar: new Date(),
            alasanKeluar: 'Lulus'
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
