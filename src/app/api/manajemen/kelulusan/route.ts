import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const tahunAjaranId = searchParams.get('tahunAjaranId')
    const type = searchParams.get('type') // 'calon' or 'lulus'

    if (!tahunAjaranId) {
      return NextResponse.json([])
    }

    if (type === 'lulus') {
      // Get siswa yang sudah lulus
      const siswaLulus = await prisma.siswa.findMany({
        where: {
          status: 'LULUS',
          histori: {
            some: {
              tahunAjaranId,
              tipeAksi: 'LULUS'
            }
          }
        },
        include: {
          histori: {
            where: { tipeAksi: 'LULUS' },
            orderBy: { tanggalAksi: 'desc' },
            take: 1
          }
        },
        orderBy: { nama: 'asc' }
      })

      return NextResponse.json(siswaLulus.map(s => ({
        ...s,
        kelasNama: s.histori[0]?.kelasNama || s.kelasNama,
        tanggalLulus: s.histori[0]?.tanggalAksi
      })))
    }

    // Default: Get siswa kelas 6 (tingkat 6) yang masih aktif
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

// DELETE - Batalkan kelulusan
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json()
    const { siswaIds, tahunAjaranId } = body

    if (!siswaIds || siswaIds.length === 0) {
      return NextResponse.json({ error: 'No siswa selected' }, { status: 400 })
    }

    const result = await prisma.$transaction(async (tx) => {
      const processedSiswa = []

      for (const siswaId of siswaIds) {
        // Get siswa with last history before graduation
        const siswa = await tx.siswa.findUnique({
          where: { id: siswaId },
          include: {
            histori: {
              where: { tipeAksi: 'LULUS' },
              orderBy: { tanggalAksi: 'desc' },
              take: 1
            }
          }
        })

        if (!siswa || siswa.status !== 'LULUS') continue

        const lastHistory = siswa.histori[0]
        if (!lastHistory) continue

        // Create cancel history
        await tx.siswaHistori.create({
          data: {
            siswaId,
            tahunAjaranId,
            kelasId: lastHistory.kelasId,
            kelasNama: lastHistory.kelasNama,
            tipeAksi: 'BATAL_LULUS',
            keterangan: `Pembatalan kelulusan, kembali ke ${lastHistory.kelasNama}`,
            tanggalAksi: new Date()
          }
        })

        // Restore siswa to previous class
        await tx.siswa.update({
          where: { id: siswaId },
          data: { 
            status: 'AKTIF',
            aktif: true,
            kelasId: lastHistory.kelasId,
            kelasNama: lastHistory.kelasNama,
            tahunAjaranId: lastHistory.tahunAjaranId || tahunAjaranId,
            tanggalKeluar: null,
            alasanKeluar: null
          }
        })

        processedSiswa.push(siswa.nama)
      }

      return { count: processedSiswa.length, names: processedSiswa }
    })

    return NextResponse.json({ success: true, count: result.count })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Failed to cancel graduation' }, { status: 500 })
  }
}
