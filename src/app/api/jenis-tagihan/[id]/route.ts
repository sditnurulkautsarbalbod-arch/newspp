import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { nama, kategori, nominal, aktif, tipeTarget, targetKelasIds, targetSiswaIds } = body

    // Use transaction to update jenis tagihan and its targets
    const jenisTagihan = await prisma.$transaction(async (tx) => {
      // Update the main record
      const updated = await tx.jenisTagihan.update({
        where: { id },
        data: { 
          nama, 
          kategori, 
          nominal, 
          aktif,
          tipeTarget: tipeTarget || 'SEMUA'
        }
      })

      // If tipeTarget is provided, update the targets
      if (tipeTarget) {
        // Delete existing targets
        await tx.jenisTagihanKelas.deleteMany({ where: { jenisTagihanId: id } })
        await tx.jenisTagihanSiswa.deleteMany({ where: { jenisTagihanId: id } })

        // Create new targets based on tipeTarget
        if (tipeTarget === 'PER_KELAS' && targetKelasIds?.length > 0) {
          await tx.jenisTagihanKelas.createMany({
            data: targetKelasIds.map((kelasId: string) => ({
              jenisTagihanId: id,
              kelasId
            }))
          })
        } else if (tipeTarget === 'PER_SISWA' && targetSiswaIds?.length > 0) {
          await tx.jenisTagihanSiswa.createMany({
            data: targetSiswaIds.map((siswaId: string) => ({
              jenisTagihanId: id,
              siswaId
            }))
          })
        }
      }

      return updated
    })

    return NextResponse.json(jenisTagihan)
  } catch (error) {
    console.error('Error updating jenis tagihan:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Check if there are any payments
    const payments = await prisma.pembayaran.count({
      where: { tagihan: { jenisTagihanId: id } }
    })

    if (payments > 0) {
      // Soft delete
      await prisma.jenisTagihan.update({
        where: { id },
        data: { aktif: false }
      })
    } else {
      // Hard delete if no payments
      await prisma.tagihan.deleteMany({
        where: { jenisTagihanId: id }
      })
      await prisma.jenisTagihan.delete({
        where: { id }
      })
    }

    return NextResponse.json({ message: 'Jenis tagihan berhasil dihapus' })
  } catch (error) {
    console.error('Error deleting jenis tagihan:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
