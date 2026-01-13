import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
const siswa = await prisma.siswa.findUnique({
      where: { id },
      include: {
        kelas: true,
        tahunAjaran: true,
        tagihan: {
          include: {
            jenisTagihan: true,
            pembayaran: true
          },
          orderBy: [{ jenisTagihan: { kategori: 'asc' } }, { bulan: 'asc' }]
        }
      }
    })

    if (!siswa) {
      return NextResponse.json({ error: 'Siswa tidak ditemukan' }, { status: 404 })
    }

    return NextResponse.json(siswa)
  } catch (error) {
    console.error('Error fetching siswa:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
const { id } = await params
    const body = await request.json()
    const { nama, kelas, jenisKelamin, tempatLahir, tanggalLahir, alamat, namaOrangTua, noTelepon } = body
    
    // Get kelasId from kelas name if provided
    let kelasId
    if (kelas) {
      const kelasRecord = await prisma.kelas.findFirst({
        where: { nama: kelas }
      })
      kelasId = kelasRecord?.id
    }

    const siswa = await prisma.siswa.update({
      where: { id },
      data: {
        nama,
        kelasId,
        kelasNama: kelas, // Update kelasNama as well
        jenisKelamin,
        tempatLahir,
        tanggalLahir: tanggalLahir ? new Date(tanggalLahir) : null,
        alamat,
        namaOrangTua,
        noTelepon
      }
    })

    return NextResponse.json(siswa)
  } catch (error) {
    console.error('Error updating siswa:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Soft delete - just mark as inactive
    await prisma.siswa.update({
      where: { id },
      data: { aktif: false }
    })

    return NextResponse.json({ message: 'Siswa berhasil dihapus' })
  } catch (error) {
    console.error('Error deleting siswa:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
