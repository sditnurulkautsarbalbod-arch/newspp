import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { formatDate } from '@/lib/utils'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const tahunAjaranId = searchParams.get('tahunAjaranId')

    let taId = tahunAjaranId
    if (!taId) {
      const tahunAjaran = await prisma.tahunAjaran.findFirst({
        where: { aktif: true }
      })
      if (!tahunAjaran) {
        return NextResponse.json({ data: [] })
      }
      taId = tahunAjaran.id
    }

    const jenisTagihan = await prisma.jenisTagihan.findMany({
      where: { tahunAjaranId: taId },
      include: {
        targetKelas: { include: { kelas: { select: { id: true, nama: true } } } },
        targetSiswa: { include: { siswa: { select: { id: true, nama: true, nipd: true } } } }
      },
      orderBy: { nama: 'asc' }
    })

    return NextResponse.json({ data: jenisTagihan })
  } catch (error) {
    console.error('Error fetching jenis tagihan:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { nama, kategori, nominal, tipeTarget, targetKelasIds, targetSiswaIds, tahunAjaranId } = body

    let taId = tahunAjaranId
    if (!taId) {
      const tahunAjaran = await prisma.tahunAjaran.findFirst({
        where: { aktif: true }
      })
      if (!tahunAjaran) {
        return NextResponse.json({ error: 'Tahun ajaran aktif tidak ditemukan' }, { status: 400 })
      }
      taId = tahunAjaran.id
    }

    // No unique constraint check - allow duplicate names for different class levels

    const result = await prisma.$transaction(async (tx) => {
      // Create jenis tagihan
      const jenisTagihan = await tx.jenisTagihan.create({
        data: {
          nama,
          kategori,
          nominal,
          tipeTarget: tipeTarget || 'SEMUA',
          tahunAjaranId: taId
        }
      })

      // Create target kelas if PER_KELAS
      if (tipeTarget === 'PER_KELAS' && targetKelasIds?.length > 0) {
        await tx.jenisTagihanKelas.createMany({
          data: targetKelasIds.map((kelasId: string) => ({
            jenisTagihanId: jenisTagihan.id,
            kelasId
          }))
        })
      }

      // Create target siswa if PER_SISWA
      if (tipeTarget === 'PER_SISWA' && targetSiswaIds?.length > 0) {
        await tx.jenisTagihanSiswa.createMany({
          data: targetSiswaIds.map((siswaId: string) => ({
            jenisTagihanId: jenisTagihan.id,
            siswaId
          }))
        })
      }

      // Generate tagihan for target students
      const tahunAjaran = await tx.tahunAjaran.findUnique({ where: { id: taId } })
      
      let targetSiswa: { id: string }[] = []
      
      if (tipeTarget === 'SEMUA') {
        targetSiswa = await tx.siswa.findMany({
          where: { tahunAjaranId: taId, status: 'AKTIF' },
          select: { id: true }
        })
      } else if (tipeTarget === 'PER_KELAS' && targetKelasIds?.length > 0) {
        targetSiswa = await tx.siswa.findMany({
          where: { tahunAjaranId: taId, status: 'AKTIF', kelasId: { in: targetKelasIds } },
          select: { id: true }
        })
      } else if (tipeTarget === 'PER_SISWA' && targetSiswaIds?.length > 0) {
        targetSiswa = targetSiswaIds.map((id: string) => ({ id }))
      }

      // Create tagihan for each student
      for (const siswa of targetSiswa) {
        const kategoriList = kategori.split(',')
        
        for (const kat of kategoriList) {
          if (kat === 'BULANAN') {
            for (let i = 0; i < 12; i++) {
              const bulan = i < 6 ? i + 7 : i - 5
              const tahun = i < 6 ? tahunAjaran!.tahunMulai : tahunAjaran!.tahunSelesai
              
              await tx.tagihan.create({
                data: {
                  siswaId: siswa.id,
                  jenisTagihanId: jenisTagihan.id,
                  tahunAjaranId: taId,
                  bulan,
                  tahun,
                  jumlahTagihan: nominal
                }
              }).catch(() => {}) // Skip if already exists
            }
          } else {
            await tx.tagihan.create({
              data: {
                siswaId: siswa.id,
                jenisTagihanId: jenisTagihan.id,
                tahunAjaranId: taId,
                jumlahTagihan: nominal
              }
            }).catch(() => {}) // Skip if already exists
          }
        }
      }

      return jenisTagihan
    })

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    console.error('Error creating jenis tagihan:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'ID tidak ditemukan' }, { status: 400 })
    }

    // Check if there are any payments for this jenis tagihan
    const payments = await prisma.pembayaran.findMany({
      where: {
        tagihan: {
          jenisTagihanId: id
        }
      },
      take: 5,
      select: {
        nomorKuitansi: true,
        tanggalBayar: true,
        tagihan: {
          select: {
            siswa: {
              select: { nama: true }
            }
          }
        }
      }
    })

    if (payments.length > 0) {
      const paymentInfo = payments.map(p => 
        `• ${p.nomorKuitansi} - ${p.tagihan.siswa.nama} (${formatDate(p.tanggalBayar)})`
      ).join('\n')
      return NextResponse.json({ 
        error: `Tidak dapat menghapus karena sudah ada pembayaran:\n\n${paymentInfo}\n\nGunakan tombol nonaktifkan saja.` 
      }, { status: 400 })
    }

    // Delete jenis tagihan (cascade will delete related tagihan, targetKelas, targetSiswa)
    await prisma.jenisTagihan.delete({
      where: { id }
    })

    return NextResponse.json({ success: true, message: 'Jenis tagihan berhasil dihapus' })
  } catch (error) {
    console.error('Error deleting jenis tagihan:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, aktif } = body

    if (!id) {
      return NextResponse.json({ error: 'ID tidak ditemukan' }, { status: 400 })
    }

    const updated = await prisma.jenisTagihan.update({
      where: { id },
      data: { aktif }
    })

    return NextResponse.json({ 
      success: true, 
      data: updated,
      message: aktif ? 'Jenis tagihan diaktifkan' : 'Jenis tagihan dinonaktifkan'
    })
  } catch (error) {
    console.error('Error updating jenis tagihan:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
