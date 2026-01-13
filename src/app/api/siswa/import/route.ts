import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import * as XLSX from 'xlsx'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const tahunAjaranId = formData.get('tahunAjaranId') as string

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    if (!tahunAjaranId) {
      return NextResponse.json({ error: 'Tahun ajaran required' }, { status: 400 })
    }

    // Read file
    const buffer = await file.arrayBuffer()
    const workbook = XLSX.read(buffer, { type: 'array' })
    const sheetName = workbook.SheetNames[0]
    const sheet = workbook.Sheets[sheetName]
    const data = XLSX.utils.sheet_to_json(sheet) as any[]

    // Get kelas mapping
    const kelasList = await prisma.kelas.findMany({
      where: { tahunAjaranId }
    })
    const kelasMap = new Map(kelasList.map(k => [k.nama.toUpperCase(), k]))

    // Get tahun ajaran info for tagihan generation
    const tahunAjaran = await prisma.tahunAjaran.findUnique({
      where: { id: tahunAjaranId }
    })

    if (!tahunAjaran) {
      return NextResponse.json({ error: 'Tahun ajaran tidak ditemukan' }, { status: 400 })
    }

    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[]
    }

    for (let i = 0; i < data.length; i++) {
      const row = data[i]
      const rowNum = i + 2 // Excel row number (1-based + header)

      try {
        const nipd = String(row.NIPD || row.nipd || '').trim()
        const nama = String(row.Nama || row.nama || row.NAMA || '').trim()
        const kelasNama = String(row.Kelas || row.kelas || row.KELAS || '').trim().toUpperCase()
        const namaOrangTua = String(row['Nama Orang Tua'] || row.namaOrangTua || row['Orang Tua'] || '').trim()
        const noTelepon = String(row['No Telepon'] || row.noTelepon || row.Telepon || '').trim()
        const jenisKelamin = String(row['Jenis Kelamin'] || row.jenisKelamin || row.JK || 'L').trim().toUpperCase()
        const alamat = String(row.Alamat || row.alamat || '').trim()

        if (!nipd || !nama) {
          results.failed++
          results.errors.push(`Baris ${rowNum}: NIPD dan Nama wajib diisi`)
          continue
        }

        const kelas = kelasMap.get(kelasNama)
        if (!kelas) {
          results.failed++
          results.errors.push(`Baris ${rowNum}: Kelas "${kelasNama}" tidak ditemukan`)
          continue
        }

        // Check if NIPD already exists
        const existing = await prisma.siswa.findUnique({ where: { nipd } })
        if (existing) {
          results.failed++
          results.errors.push(`Baris ${rowNum}: NIPD ${nipd} sudah terdaftar`)
          continue
        }

        // Create siswa with tagihan in transaction
        await prisma.$transaction(async (tx) => {
          // Create siswa
          const siswa = await tx.siswa.create({
            data: {
              nipd,
              nama,
              kelasId: kelas.id,
              kelasNama: kelas.nama,
              jenisKelamin: jenisKelamin === 'P' ? 'P' : 'L',
              alamat: alamat || null,
              namaOrangTua: namaOrangTua || null,
              noTelepon: noTelepon || null,
              tahunAjaranId,
            }
          })

          // Create parent user
          await tx.user.create({
            data: {
              nipd,
              nama: namaOrangTua || `Orang Tua ${nama}`,
              role: 'ORANG_TUA',
              siswaId: siswa.id,
            }
          })

          // Generate tagihan for the student based on tipeTarget
          const jenisTagihanList = await tx.jenisTagihan.findMany({
            where: { 
              tahunAjaranId, 
              aktif: true,
              OR: [
                { tipeTarget: 'SEMUA' },
                { targetKelas: { some: { kelasId: kelas.id } } }
              ]
            },
            include: {
              targetKelas: { where: { kelasId: kelas.id } }
            }
          })

          for (const jt of jenisTagihanList) {
            // Determine nominal (check for special nominal)
            let nominal = jt.nominal
            if (jt.targetKelas.length > 0 && jt.targetKelas[0].nominalKhusus) {
              nominal = jt.targetKelas[0].nominalKhusus
            }

            if (jt.kategori === 'BULANAN') {
              // Create 12 monthly tagihan
              for (let m = 0; m < 12; m++) {
                const bulan = m < 6 ? m + 7 : m - 5 // Juli-Des (7-12), Jan-Jun (1-6)
                const tahun = m < 6 ? tahunAjaran.tahunMulai : tahunAjaran.tahunSelesai
                
                await tx.tagihan.create({
                  data: {
                    siswaId: siswa.id,
                    jenisTagihanId: jt.id,
                    tahunAjaranId,
                    bulan,
                    tahun,
                    jumlahTagihan: nominal
                  }
                })
              }
            } else {
              // TAHUNAN or INSIDENTAL - create single tagihan
              await tx.tagihan.create({
                data: {
                  siswaId: siswa.id,
                  jenisTagihanId: jt.id,
                  tahunAjaranId,
                  jumlahTagihan: nominal
                }
              })
            }
          }
        })

        results.success++
      } catch (err: any) {
        results.failed++
        results.errors.push(`Baris ${rowNum}: ${err.message || 'Error tidak diketahui'}`)
      }
    }

    return NextResponse.json(results)
  } catch (error: any) {
    console.error('Import error:', error)
    return NextResponse.json({ 
      success: 0, 
      failed: 0, 
      errors: [error.message || 'Failed to import'] 
    }, { status: 500 })
  }
}
