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

    // Check if siswa has any payments
    const siswa = await prisma.siswa.findUnique({
      where: { id },
      include: {
        tagihan: {
          where: { jumlahDibayar: { gt: 0 } }
        }
      }
    })

    if (!siswa) {
      return NextResponse.json({ error: 'Siswa tidak ditemukan' }, { status: 404 })
    }

    // If student has payments, do soft delete
    if (siswa.tagihan.length > 0) {
      await prisma.siswa.update({
        where: { id },
        data: { 
          status: 'TIDAK_AKTIF',
          aktif: false 
        }
      })
      return NextResponse.json({ message: 'Siswa berhasil dinonaktifkan (memiliki riwayat pembayaran)' })
    }

    // If no payments, do hard delete (delete all related records)
    await prisma.$transaction(async (tx) => {
      // Delete parent user
      await tx.user.deleteMany({ where: { siswaId: id } })
      
      // Delete tagihan (which will cascade delete pembayaran due to relation)
      await tx.tagihan.deleteMany({ where: { siswaId: id } })
      
      // Delete siswa histori
      await tx.siswaHistori.deleteMany({ where: { siswaId: id } })
      
      // Delete siswa
      await tx.siswa.delete({ where: { id } })
    })

    return NextResponse.json({ message: 'Siswa berhasil dihapus' })
  } catch (error) {
    console.error('Error deleting siswa:', error)
    return NextResponse.json({ error: 'Gagal menghapus siswa' }, { status: 500 })
  }
}
