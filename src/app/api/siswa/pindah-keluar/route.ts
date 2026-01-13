import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Proses siswa pindah keluar
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { siswaIds, alasan, tanggalKeluar, tipeKeluar } = body
    // tipeKeluar: PINDAH, KELUAR

    if (!siswaIds || siswaIds.length === 0) {
      return NextResponse.json({ error: 'Pilih siswa yang akan diproses' }, { status: 400 })
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

        // Update siswa status
        await tx.siswa.update({
          where: { id: siswaId },
          data: {
            status: tipeKeluar, // PINDAH or KELUAR
            aktif: false,
            tanggalKeluar: tanggalKeluar ? new Date(tanggalKeluar) : new Date(),
            alasanKeluar: alasan
          }
        })

        // Create histori
        await tx.siswaHistori.create({
          data: {
            siswaId,
            tahunAjaranId: siswa.tahunAjaranId,
            kelasId: siswa.kelasId,
            kelasNama: siswa.kelasNama,
            tipeAksi: tipeKeluar === 'PINDAH' ? 'PINDAH_KELUAR' : 'KELUAR',
            keterangan: alasan,
            tanggalAksi: tanggalKeluar ? new Date(tanggalKeluar) : new Date()
          }
        })

        processedSiswa.push(siswa.nama)
      }

      return { count: processedSiswa.length, names: processedSiswa }
    })

    return NextResponse.json({ 
      success: true, 
      message: `${result.count} siswa berhasil diproses`,
      data: result
    })
  } catch (error) {
    console.error('Error processing pindah keluar:', error)
    return NextResponse.json({ error: 'Failed to process' }, { status: 500 })
  }
}
