import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const tahunAjaranId = searchParams.get('tahunAjaranId')
    const kelasId = searchParams.get('kelasId')
    const siswaId = searchParams.get('siswaId')
    const search = searchParams.get('search')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    const where: any = {}
    
    // Support status filter: 'AKTIF', 'TIDAK_AKTIF', 'all'
    const statusParam = searchParams.get('status')
    if (statusParam === 'all') {
      // No status filter - get all
    } else if (statusParam === 'TIDAK_AKTIF') {
      where.status = 'TIDAK_AKTIF'
    } else {
      where.status = 'AKTIF'
    }
    
    if (tahunAjaranId) {
      where.tahunAjaranId = tahunAjaranId
    }

    if (kelasId) {
      where.kelasId = kelasId
    }

    if (siswaId) {
      where.id = siswaId
    }
    
    if (search) {
      where.OR = [
        { nama: { contains: search } },
        { nipd: { contains: search } }
      ]
    }

    const [siswa, total] = await Promise.all([
      prisma.siswa.findMany({
        where,
        include: {
          tahunAjaran: { select: { nama: true } },
          kelas: { select: { id: true, nama: true } }
        },
        orderBy: [{ kelasNama: 'asc' }, { nama: 'asc' }],
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.siswa.count({ where })
    ])

    return NextResponse.json({
      data: siswa,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error('Error fetching siswa:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { nipd, nama, kelasId, jenisKelamin, tempatLahir, tanggalLahir, alamat, namaOrangTua, noTelepon, tahunAjaranId } = body

    // Get tahun ajaran
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

    // Get kelas info
    const kelas = await prisma.kelas.findUnique({ where: { id: kelasId } })
    if (!kelas) {
      return NextResponse.json({ error: 'Kelas tidak ditemukan' }, { status: 400 })
    }

    // Check if NIPD already exists
    const existing = await prisma.siswa.findUnique({ where: { nipd } })
    if (existing) {
      return NextResponse.json({ error: 'NIPD sudah terdaftar' }, { status: 400 })
    }

    // Create siswa and parent user in transaction
    const result = await prisma.$transaction(async (tx) => {
      const siswa = await tx.siswa.create({
        data: {
          nipd,
          nama,
          kelasId,
          kelasNama: kelas.nama,
          jenisKelamin,
          tempatLahir,
          tanggalLahir: tanggalLahir ? new Date(tanggalLahir) : null,
          alamat,
          namaOrangTua,
          noTelepon,
          tahunAjaranId: taId
        }
      })

      // Create parent user
      await tx.user.create({
        data: {
          nipd: siswa.nipd,
          nama: namaOrangTua || nama,
          role: 'ORANG_TUA',
          siswaId: siswa.id
        }
      })

      // Generate tagihan for the student based on tipeTarget
      const jenisTagihanList = await tx.jenisTagihan.findMany({
        where: { 
          tahunAjaranId: taId, 
          aktif: true,
          OR: [
            { tipeTarget: 'SEMUA' },
            { targetKelas: { some: { kelasId } } },
            { targetSiswa: { some: { siswaId: siswa.id } } }
          ]
        },
        include: {
          targetKelas: { where: { kelasId } },
          targetSiswa: { where: { siswaId: siswa.id } }
        }
      })

      const tahunAjaran = await tx.tahunAjaran.findUnique({ where: { id: taId } })

      for (const jt of jenisTagihanList) {
        // Determine nominal (check for special nominal)
        let nominal = jt.nominal
        if (jt.targetKelas.length > 0 && jt.targetKelas[0].nominalKhusus) {
          nominal = jt.targetKelas[0].nominalKhusus
        }
        if (jt.targetSiswa.length > 0 && jt.targetSiswa[0].nominalKhusus) {
          nominal = jt.targetSiswa[0].nominalKhusus
        }

        if (jt.kategori === 'BULANAN') {
          for (let i = 0; i < 12; i++) {
            const bulan = i < 6 ? i + 7 : i - 5
            const tahun = i < 6 ? tahunAjaran!.tahunMulai : tahunAjaran!.tahunSelesai
            
            await tx.tagihan.create({
              data: {
                siswaId: siswa.id,
                jenisTagihanId: jt.id,
                tahunAjaranId: taId,
                bulan,
                tahun,
                jumlahTagihan: nominal
              }
            })
          }
        } else {
          await tx.tagihan.create({
            data: {
              siswaId: siswa.id,
              jenisTagihanId: jt.id,
              tahunAjaranId: taId,
              jumlahTagihan: nominal
            }
          })
        }
      }

      return siswa
    })

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    console.error('Error creating siswa:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
