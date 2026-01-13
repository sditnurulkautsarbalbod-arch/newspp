import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Proses siswa pindah masuk (siswa baru di tengah tahun)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      nipd, nama, kelasId, jenisKelamin, alamat, namaOrangTua, noTelepon,
      tahunAjaranId, asalSekolah, tanggalMasuk 
    } = body

    // Validate
    if (!nipd || !nama || !kelasId || !tahunAjaranId) {
      return NextResponse.json({ 
        error: 'NIPD, Nama, Kelas, dan Tahun Ajaran wajib diisi' 
      }, { status: 400 })
    }

    // Check if NIPD exists
    const existing = await prisma.siswa.findUnique({ where: { nipd } })
    if (existing) {
      return NextResponse.json({ error: 'NIPD sudah terdaftar' }, { status: 400 })
    }

    // Get kelas info
    const kelas = await prisma.kelas.findUnique({ where: { id: kelasId } })
    if (!kelas) {
      return NextResponse.json({ error: 'Kelas tidak ditemukan' }, { status: 400 })
    }

    const tahunAjaran = await prisma.tahunAjaran.findUnique({ where: { id: tahunAjaranId } })
    if (!tahunAjaran) {
      return NextResponse.json({ error: 'Tahun ajaran tidak ditemukan' }, { status: 400 })
    }

    const result = await prisma.$transaction(async (tx) => {
      // Create siswa
      const siswa = await tx.siswa.create({
        data: {
          nipd,
          nama,
          kelasId,
          kelasNama: kelas.nama,
          jenisKelamin,
          alamat,
          namaOrangTua,
          noTelepon,
          tahunAjaranId,
          tahunMasuk: tahunAjaran.tahunMulai,
          status: 'AKTIF'
        }
      })

      // Create parent user
      await tx.user.create({
        data: {
          nipd,
          nama: namaOrangTua || `Orang Tua ${nama}`,
          role: 'ORANG_TUA',
          siswaId: siswa.id
        }
      })

      // Create histori
      await tx.siswaHistori.create({
        data: {
          siswaId: siswa.id,
          tahunAjaranId,
          kelasId,
          kelasNama: kelas.nama,
          tipeAksi: 'PINDAH_MASUK',
          keterangan: asalSekolah ? `Pindahan dari ${asalSekolah}` : 'Siswa pindahan',
          tanggalAksi: tanggalMasuk ? new Date(tanggalMasuk) : new Date()
        }
      })

      // Generate tagihan untuk siswa baru (mulai dari bulan saat ini)
      const currentMonth = new Date().getMonth() + 1
      const currentYear = new Date().getFullYear()

      const jenisTagihanList = await tx.jenisTagihan.findMany({
        where: {
          tahunAjaranId,
          aktif: true,
          OR: [
            { tipeTarget: 'SEMUA' },
            { targetKelas: { some: { kelasId } } }
          ]
        }
      })

      // Get settings for bulanMulai
      const settings = await tx.sekolahSettings.findFirst()
      const bulanMulai = settings?.bulanMulai || 7

      // Generate bulanOrder berdasarkan bulanMulai
      const bulanOrder = []
      for (let i = 0; i < 12; i++) {
        const bulan = (bulanMulai + i - 1) % 12 + 1
        bulanOrder.push(bulan)
      }

for (const jt of jenisTagihanList) {
        const kategoriList = jt.kategori.split(',')
        
        for (const kat of kategoriList) {
          if (kat === 'BULANAN') {
            // Generate tagihan untuk bulan-bulan yang tersisa
            const startIdx = bulanOrder.findIndex(b => {
              const tahun = b >= bulanMulai ? tahunAjaran.tahunMulai : tahunAjaran.tahunSelesai
              return (b > currentMonth && tahun === currentYear) || 
                     (tahun > currentYear) ||
                     (b === currentMonth && tahun === currentYear)
            })

            for (let i = Math.max(0, startIdx); i < 12; i++) {
              const bulan = bulanOrder[i]
              const tahun = bulan >= bulanMulai ? tahunAjaran.tahunMulai : tahunAjaran.tahunSelesai
              
              await tx.tagihan.create({
                data: {
                  siswaId: siswa.id,
                  jenisTagihanId: jt.id,
                  tahunAjaranId,
                  bulan,
                  tahun,
                  jumlahTagihan: jt.nominal
                }
              }).catch(() => {}) // Skip if exists
            }
          } else {
            // Tagihan tahunan/insidental
            await tx.tagihan.create({
              data: {
                siswaId: siswa.id,
                jenisTagihanId: jt.id,
                tahunAjaranId,
                jumlahTagihan: jt.nominal
              }
            }).catch(() => {})
          }
        }
      }

      return siswa
    })

    return NextResponse.json({ 
      success: true, 
      message: `Siswa ${nama} berhasil didaftarkan`,
      data: result
    })
  } catch (error) {
    console.error('Error processing pindah masuk:', error)
    return NextResponse.json({ error: 'Failed to process' }, { status: 500 })
  }
}
