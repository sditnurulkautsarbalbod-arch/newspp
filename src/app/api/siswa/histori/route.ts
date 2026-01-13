import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Get histori siswa
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const siswaId = searchParams.get('siswaId')
    const tahunAjaranId = searchParams.get('tahunAjaranId')
    const tipeAksi = searchParams.get('tipeAksi')

    const where: any = {}
    if (siswaId) where.siswaId = siswaId
    if (tahunAjaranId) where.tahunAjaranId = tahunAjaranId
    if (tipeAksi) {
      // Support comma-separated values like "PINDAH_MASUK,PINDAH_KELUAR"
      const types = tipeAksi.split(',')
      if (types.length > 1) {
        where.tipeAksi = { in: types }
      } else {
        where.tipeAksi = tipeAksi
      }
    }

    const histori = await prisma.siswaHistori.findMany({
      where,
      include: {
        siswa: { select: { id: true, nama: true, nipd: true, kelasNama: true, status: true } },
        tahunAjaran: { select: { id: true, nama: true } }
      },
      orderBy: { tanggalAksi: 'desc' }
    })

    return NextResponse.json({ data: histori })
  } catch (error) {
    console.error('Error fetching histori:', error)
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 })
  }
}

// Create histori entry
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { siswaId, tahunAjaranId, kelasId, kelasNama, tipeAksi, keterangan, tanggalAksi } = body

    const histori = await prisma.siswaHistori.create({
      data: {
        siswaId,
        tahunAjaranId,
        kelasId,
        kelasNama,
        tipeAksi,
        keterangan,
        tanggalAksi: tanggalAksi ? new Date(tanggalAksi) : new Date()
      }
    })

    return NextResponse.json(histori)
  } catch (error) {
    console.error('Error creating histori:', error)
    return NextResponse.json({ error: 'Failed to create' }, { status: 500 })
  }
}

// Update histori entry (edit tanggal atau keterangan)
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, tanggalAksi, keterangan } = body

    if (!id) {
      return NextResponse.json({ error: 'ID diperlukan' }, { status: 400 })
    }

    const histori = await prisma.siswaHistori.update({
      where: { id },
      data: {
        tanggalAksi: tanggalAksi ? new Date(tanggalAksi) : undefined,
        keterangan: keterangan !== undefined ? keterangan : undefined
      }
    })

    return NextResponse.json(histori)
  } catch (error) {
    console.error('Error updating histori:', error)
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 })
  }
}

// Delete/Cancel histori entry
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'ID diperlukan' }, { status: 400 })
    }

    // Get histori to check type and update siswa status if needed
    const histori = await prisma.siswaHistori.findUnique({
      where: { id },
      include: { siswa: true }
    })

    if (!histori) {
      return NextResponse.json({ error: 'Histori tidak ditemukan' }, { status: 404 })
    }

    // If canceling PINDAH_KELUAR, revert siswa status to AKTIF
    if (histori.tipeAksi === 'PINDAH_KELUAR') {
      await prisma.siswa.update({
        where: { id: histori.siswaId },
        data: { status: 'AKTIF', tanggalKeluar: null }
      })
    }
    
    // If canceling PINDAH_MASUK, delete the siswa record (they came from another school)
    if (histori.tipeAksi === 'PINDAH_MASUK') {
      await prisma.siswa.update({
        where: { id: histori.siswaId },
        data: { aktif: false, status: 'KELUAR' }
      })
    }

    await prisma.siswaHistori.delete({
      where: { id }
    })

    return NextResponse.json({ message: 'Histori berhasil dibatalkan' })
  } catch (error) {
    console.error('Error deleting histori:', error)
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 })
  }
}
