import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET tarif khusus for a siswa
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const tarifKhusus = await prisma.jenisTagihanSiswa.findMany({
      where: { siswaId: id },
      include: {
        jenisTagihan: { select: { nama: true, nominal: true, kategori: true } }
      }
    })

    return NextResponse.json({ tarifKhusus })
  } catch (error) {
    console.error('Error fetching tarif khusus:', error)
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 })
  }
}

// POST set tarif khusus for a siswa
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
const { id: siswaId } = await params
    const body = await request.json()
    const { jenisTagihanId, nominalKhusus, alasan, updateTagihanBelumLunas, tahunAjaranId } = body

    // Validate nominalKhusus must be positive
    if (nominalKhusus === undefined || nominalKhusus === null || nominalKhusus <= 0) {
      return NextResponse.json({ error: 'Nominal khusus harus lebih dari 0' }, { status: 400 })
    }

    // Validate siswa exists
    const siswa = await prisma.siswa.findUnique({ where: { id: siswaId } })
    if (!siswa) {
      return NextResponse.json({ error: 'Siswa tidak ditemukan' }, { status: 404 })
    }

    // Check if tarif khusus already exists for this jenis tagihan
    const existing = await prisma.jenisTagihanSiswa.findFirst({
      where: { siswaId, jenisTagihanId }
    })

    let tarifKhusus
    if (existing) {
      // Update existing
      tarifKhusus = await prisma.jenisTagihanSiswa.update({
        where: { id: existing.id },
        data: { nominalKhusus, alasan }
      })
    } else {
      // Create new
      tarifKhusus = await prisma.jenisTagihanSiswa.create({
        data: {
          siswaId,
          jenisTagihanId,
          nominalKhusus,
          alasan
        }
      })
    }

    let updatedCount = 0

    // Update existing unpaid tagihan if requested
    if (updateTagihanBelumLunas) {
      const result = await prisma.tagihan.updateMany({
        where: {
          siswaId,
          jenisTagihanId,
          status: { in: ['BELUM_LUNAS', 'SEBAGIAN'] },
          tahunAjaranId: tahunAjaranId || siswa.tahunAjaranId
        },
        data: {
          jumlahTagihan: nominalKhusus
        }
      })
      updatedCount = result.count
    }

    // Create histori for audit
    await prisma.siswaHistori.create({
      data: {
        siswaId,
        tahunAjaranId: tahunAjaranId || siswa.tahunAjaranId,
        kelasId: siswa.kelasId,
        kelasNama: siswa.kelasNama,
        tipeAksi: 'TARIF_KHUSUS',
        keterangan: `Tarif khusus: ${alasan || 'Tidak ada keterangan'}. ${updatedCount} tagihan diupdate.`,
        tanggalAksi: new Date()
      }
    })

    return NextResponse.json({ 
      success: true, 
      tarifKhusus,
      updatedCount
    })
  } catch (error) {
    console.error('Error setting tarif khusus:', error)
    return NextResponse.json({ error: 'Failed to set tarif khusus' }, { status: 500 })
  }
}
