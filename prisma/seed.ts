import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database dengan data dummy...')

  // Clear existing data
  await prisma.pembayaran.deleteMany()
  await prisma.tagihan.deleteMany()
  await prisma.siswaHistori.deleteMany()
  await prisma.jenisTagihanSiswa.deleteMany()
  await prisma.jenisTagihanKelas.deleteMany()
  await prisma.jenisTagihan.deleteMany()
  await prisma.user.deleteMany()
  await prisma.siswa.deleteMany()
  await prisma.kelas.deleteMany()
  await prisma.tahunAjaran.deleteMany()
  await prisma.sekolahSettings.deleteMany()
  await prisma.databaseBackup.deleteMany()
  console.log('✓ Data lama dihapus')

  // Create Tahun Ajaran
  const tahunAjaran2324 = await prisma.tahunAjaran.create({
    data: { nama: '2023/2024', tahunMulai: 2023, tahunSelesai: 2024, aktif: false }
  })
  const tahunAjaran2425 = await prisma.tahunAjaran.create({
    data: { nama: '2024/2025', tahunMulai: 2024, tahunSelesai: 2025, aktif: true }
  })
  console.log('✓ Tahun Ajaran dibuat')

  // Create Kelas for both tahun ajaran
  const kelasData = [
    { nama: '1A', tingkat: 1 }, { nama: '1B', tingkat: 1 },
    { nama: '2A', tingkat: 2 }, { nama: '2B', tingkat: 2 },
    { nama: '3A', tingkat: 3 }, { nama: '3B', tingkat: 3 },
    { nama: '4A', tingkat: 4 }, { nama: '4B', tingkat: 4 },
    { nama: '5A', tingkat: 5 }, { nama: '5B', tingkat: 5 },
    { nama: '6A', tingkat: 6 }, { nama: '6B', tingkat: 6 },
  ]

  const kelasMap2425: Record<string, string> = {}
  for (const k of kelasData) {
    const kelas = await prisma.kelas.create({
      data: { nama: k.nama, tingkat: k.tingkat, tahunAjaranId: tahunAjaran2425.id }
    })
    kelasMap2425[k.nama] = kelas.id
  }
  console.log('✓ Kelas dibuat')

  // Create Admin Users
  const hashedPassword = await bcrypt.hash('admin123', 10)
  await prisma.user.create({
    data: { email: 'admin@sekolah.sch.id', password: hashedPassword, nama: 'Bendahara Sekolah', role: 'ADMIN' }
  })
  await prisma.user.create({
    data: { email: 'kepsek@sekolah.sch.id', password: hashedPassword, nama: 'Kepala Sekolah', role: 'KEPALA_SEKOLAH' }
  })
  console.log('✓ Admin users dibuat')

  // Create Jenis Tagihan
  const spp = await prisma.jenisTagihan.create({
    data: { nama: 'SPP', kategori: 'BULANAN', nominal: 150000, tipeTarget: 'SEMUA', tahunAjaranId: tahunAjaran2425.id }
  })
  const uangPangkal = await prisma.jenisTagihan.create({
    data: { nama: 'Uang Pangkal', kategori: 'TAHUNAN', nominal: 1500000, tipeTarget: 'SEMUA', tahunAjaranId: tahunAjaran2425.id }
  })
  const seragam = await prisma.jenisTagihan.create({
    data: { nama: 'Seragam', kategori: 'TAHUNAN', nominal: 500000, tipeTarget: 'SEMUA', tahunAjaranId: tahunAjaran2425.id }
  })
  const buku = await prisma.jenisTagihan.create({
    data: { nama: 'Buku Paket', kategori: 'TAHUNAN', nominal: 350000, tipeTarget: 'SEMUA', tahunAjaranId: tahunAjaran2425.id }
  })
  const ekskul = await prisma.jenisTagihan.create({
    data: { nama: 'Kegiatan Ekskul', kategori: 'INSIDENTAL', nominal: 100000, tipeTarget: 'PER_KELAS', tahunAjaranId: tahunAjaran2425.id }
  })
  // Link ekskul to kelas 4-6
  for (const kelas of ['4A', '4B', '5A', '5B', '6A', '6B']) {
    await prisma.jenisTagihanKelas.create({
      data: { jenisTagihanId: ekskul.id, kelasId: kelasMap2425[kelas] }
    })
  }
  console.log('✓ Jenis Tagihan dibuat')

  // Create Siswa (30 siswa across classes)
  const namaSiswa = [
    // Kelas 1A
    { nipd: '2024001', nama: 'Ahmad Fauzi', kelas: '1A', jk: 'L', ortu: 'Budi Santoso' },
    { nipd: '2024002', nama: 'Siti Aisyah', kelas: '1A', jk: 'P', ortu: 'Hadi Wijaya' },
    { nipd: '2024003', nama: 'Muhammad Rizki', kelas: '1A', jk: 'L', ortu: 'Agus Pratama' },
    // Kelas 1B
    { nipd: '2024004', nama: 'Fatimah Zahra', kelas: '1B', jk: 'P', ortu: 'Rudi Hartono' },
    { nipd: '2024005', nama: 'Abdullah Rahman', kelas: '1B', jk: 'L', ortu: 'Dedi Kurniawan' },
    // Kelas 2A
    { nipd: '2024006', nama: 'Aisyah Putri', kelas: '2A', jk: 'P', ortu: 'Eko Prasetyo' },
    { nipd: '2024007', nama: 'Ridwan Hakim', kelas: '2A', jk: 'L', ortu: 'Bambang Susilo' },
    { nipd: '2024008', nama: 'Nurul Hidayah', kelas: '2A', jk: 'P', ortu: 'Ahmad Yani' },
    // Kelas 2B
    { nipd: '2024009', nama: 'Farhan Maulana', kelas: '2B', jk: 'L', ortu: 'Sutrisno Hadi' },
    { nipd: '2024010', nama: 'Dewi Safitri', kelas: '2B', jk: 'P', ortu: 'Joko Widodo' },
    // Kelas 3A
    { nipd: '2024011', nama: 'Rafi Ahmad', kelas: '3A', jk: 'L', ortu: 'Herman Susanto' },
    { nipd: '2024012', nama: 'Zahra Amelia', kelas: '3A', jk: 'P', ortu: 'Wahyu Hidayat' },
    // Kelas 3B
    { nipd: '2024013', nama: 'Dimas Pratama', kelas: '3B', jk: 'L', ortu: 'Slamet Riyadi' },
    { nipd: '2024014', nama: 'Aulia Rahma', kelas: '3B', jk: 'P', ortu: 'Tri Wahyudi' },
    // Kelas 4A
    { nipd: '2024015', nama: 'Fajar Nugroho', kelas: '4A', jk: 'L', ortu: 'Bambang Irawan' },
    { nipd: '2024016', nama: 'Nabila Putri', kelas: '4A', jk: 'P', ortu: 'Sugeng Hartono' },
    { nipd: '2024017', nama: 'Ilham Ramadhan', kelas: '4A', jk: 'L', ortu: 'Ari Wibowo' },
    // Kelas 4B
    { nipd: '2024018', nama: 'Syifa Aulia', kelas: '4B', jk: 'P', ortu: 'Darmawan' },
    { nipd: '2024019', nama: 'Hafiz Akbar', kelas: '4B', jk: 'L', ortu: 'Gunawan' },
    // Kelas 5A
    { nipd: '2024020', nama: 'Nadia Salsabila', kelas: '5A', jk: 'P', ortu: 'Hendro Prasetyo' },
    { nipd: '2024021', nama: 'Arya Pratama', kelas: '5A', jk: 'L', ortu: 'Surya Wijaya' },
    { nipd: '2024022', nama: 'Cantika Dewi', kelas: '5A', jk: 'P', ortu: 'Bima Sakti' },
    // Kelas 5B
    { nipd: '2024023', nama: 'Rizky Aditya', kelas: '5B', jk: 'L', ortu: 'Bayu Nugroho' },
    { nipd: '2024024', nama: 'Laila Fitriani', kelas: '5B', jk: 'P', ortu: 'Indra Permana' },
    // Kelas 6A
    { nipd: '2024025', nama: 'Alif Maulana', kelas: '6A', jk: 'L', ortu: 'Yusuf Rahman' },
    { nipd: '2024026', nama: 'Salma Azzahra', kelas: '6A', jk: 'P', ortu: 'Agung Prasetyo' },
    { nipd: '2024027', nama: 'Bagas Setiawan', kelas: '6A', jk: 'L', ortu: 'Hendra Wijaya' },
    // Kelas 6B
    { nipd: '2024028', nama: 'Intan Permata', kelas: '6B', jk: 'P', ortu: 'Rahmat Hidayat' },
    { nipd: '2024029', nama: 'Galih Pratama', kelas: '6B', jk: 'L', ortu: 'Santoso' },
    { nipd: '2024030', nama: 'Mega Putri', kelas: '6B', jk: 'P', ortu: 'Wawan Setiawan' },
  ]

  const siswaIds: Record<string, string> = {}
  const adminUser = await prisma.user.findFirst({ where: { role: 'ADMIN' } })

  for (const s of namaSiswa) {
    const siswa = await prisma.siswa.create({
      data: {
        nipd: s.nipd,
        nama: s.nama,
        kelasId: kelasMap2425[s.kelas],
        kelasNama: s.kelas,
        jenisKelamin: s.jk,
        namaOrangTua: s.ortu,
        noTelepon: `08${Math.floor(1000000000 + Math.random() * 9000000000)}`,
        tahunAjaranId: tahunAjaran2425.id,
        tahunMasuk: 2024
      }
    })
    siswaIds[s.nipd] = siswa.id

    // Create parent user
    await prisma.user.create({
      data: { nipd: s.nipd, nama: s.ortu, role: 'ORANG_TUA', siswaId: siswa.id }
    })

    // Create histori masuk
    await prisma.siswaHistori.create({
      data: {
        siswaId: siswa.id,
        tahunAjaranId: tahunAjaran2425.id,
        kelasId: kelasMap2425[s.kelas],
        kelasNama: s.kelas,
        tipeAksi: 'MASUK_BARU',
        keterangan: 'Siswa baru terdaftar',
        tanggalAksi: new Date('2024-07-15')
      }
    })

    // Create tagihan SPP (12 bulan)
    for (let i = 0; i < 12; i++) {
      const bulan = i < 6 ? i + 7 : i - 5
      const tahun = i < 6 ? 2024 : 2025
      await prisma.tagihan.create({
        data: {
          siswaId: siswa.id,
          jenisTagihanId: spp.id,
          tahunAjaranId: tahunAjaran2425.id,
          bulan, tahun,
          jumlahTagihan: 150000
        }
      })
    }

    // Create tagihan tahunan
    for (const jt of [uangPangkal, seragam, buku]) {
      await prisma.tagihan.create({
        data: {
          siswaId: siswa.id,
          jenisTagihanId: jt.id,
          tahunAjaranId: tahunAjaran2425.id,
          jumlahTagihan: jt.nominal
        }
      })
    }

    // Create tagihan ekskul for kelas 4-6
    if (['4A', '4B', '5A', '5B', '6A', '6B'].includes(s.kelas)) {
      await prisma.tagihan.create({
        data: {
          siswaId: siswa.id,
          jenisTagihanId: ekskul.id,
          tahunAjaranId: tahunAjaran2425.id,
          jumlahTagihan: 100000
        }
      })
    }
  }
  console.log('✓ 30 Siswa dan Tagihan dibuat')

  // Create sample payments (variasi status pembayaran)
  let kuitansiNo = 1
  const bulanBayar = [7, 8, 9, 10, 11] // Juli - November sudah bayar

  for (const nipd of Object.keys(siswaIds).slice(0, 20)) { // 20 siswa pertama bayar
    const siswaId = siswaIds[nipd]
    
    // Bayar SPP untuk beberapa bulan
    const bulanDibayar = bulanBayar.slice(0, Math.floor(Math.random() * 5) + 1)
    
    for (const bulan of bulanDibayar) {
      const tagihan = await prisma.tagihan.findFirst({
        where: { siswaId, bulan, jenisTagihan: { nama: 'SPP' } }
      })
      
      if (tagihan) {
        const nomorKuitansi = `KWT/2024/${String(bulan).padStart(2, '0')}/${String(kuitansiNo++).padStart(4, '0')}`
        
        await prisma.pembayaran.create({
          data: {
            tagihanId: tagihan.id,
            jumlahBayar: 150000,
            metodeBayar: ['TUNAI', 'TRANSFER', 'QRIS'][Math.floor(Math.random() * 3)],
            nomorKuitansi,
            createdBy: adminUser?.id,
            tanggalBayar: new Date(2024, bulan - 1, Math.floor(Math.random() * 28) + 1)
          }
        })
        
        await prisma.tagihan.update({
          where: { id: tagihan.id },
          data: { jumlahDibayar: 150000, status: 'LUNAS' }
        })
      }
    }

    // Bayar sebagian tahunan (random)
    if (Math.random() > 0.5) {
      const tagihanTahunan = await prisma.tagihan.findFirst({
        where: { siswaId, jenisTagihan: { nama: 'Uang Pangkal' } }
      })
      
      if (tagihanTahunan) {
        const bayar = Math.random() > 0.5 ? 1500000 : 750000 // Full or half
        
        await prisma.pembayaran.create({
          data: {
            tagihanId: tagihanTahunan.id,
            jumlahBayar: bayar,
            metodeBayar: 'TRANSFER',
            nomorKuitansi: `KWT/2024/07/${String(kuitansiNo++).padStart(4, '0')}`,
            createdBy: adminUser?.id,
            tanggalBayar: new Date(2024, 6, 20)
          }
        })
        
        await prisma.tagihan.update({
          where: { id: tagihanTahunan.id },
          data: { 
            jumlahDibayar: bayar, 
            status: bayar >= 1500000 ? 'LUNAS' : 'SEBAGIAN' 
          }
        })
      }
    }
  }
  console.log('✓ Sample pembayaran dibuat')

  // Create Sekolah Settings
  await prisma.sekolahSettings.create({
    data: {
      id: 'default',
      namaYayasan: 'Yayasan Pendidikan Islam Nusantara',
      namaSekolah: 'SD Islam Terpadu Harapan Bangsa',
      alamat: 'Jl. Pendidikan No. 123',
      kelurahan: 'Sukamaju',
      kecamatan: 'Cilandak',
      kabKota: 'Jakarta Selatan',
      provinsi: 'DKI Jakarta',
      noTelepon: '021-12345678',
      email: 'info@sdit-harapanbangsa.sch.id',
      website: 'www.sdit-harapanbangsa.sch.id',
      formatKuitansi: 'KWT/{tahun}/{bulan}/{nomor}',
      bulanMulai: 7
    }
  })
  console.log('✓ Sekolah Settings dibuat')

  console.log('\n✅ Seeding selesai!')
  console.log('\n📋 Data yang dibuat:')
  console.log('   - 2 Tahun Ajaran (2023/2024, 2024/2025)')
  console.log('   - 12 Kelas (1A-6B)')
  console.log('   - 30 Siswa dengan parent users')
  console.log('   - 5 Jenis Tagihan (SPP, Uang Pangkal, Seragam, Buku, Ekskul)')
  console.log('   - ~500 Tagihan')
  console.log('   - ~100 Pembayaran (variasi status)')
  console.log('   - 30 Histori siswa')
  console.log('\n🔐 Login credentials:')
  console.log('   Admin: admin@sekolah.sch.id / admin123')
  console.log('   Kepsek: kepsek@sekolah.sch.id / admin123')
  console.log('   Orang Tua: gunakan NIPD (2024001 - 2024030)')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(async () => { await prisma.$disconnect() })
