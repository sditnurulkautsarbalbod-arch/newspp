import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    let settings = await prisma.sekolahSettings.findFirst()
    
    if (!settings) {
      settings = await prisma.sekolahSettings.create({
        data: {
          id: 'default',
          namaSekolah: 'Nama Sekolah',
          formatKuitansi: 'KWT/{tahun}/{bulan}/{tanggal}/{nomor}'
        }
      })
    }

    return NextResponse.json(settings)
  } catch (error) {
    console.error('Error fetching settings:', error)
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      namaYayasan, namaSekolah, alamat, kelurahan, kecamatan, 
      kabKota, provinsi, noTelepon, email, website, formatKuitansi,
      bulanMulai, namaBendahara
    } = body

    const settings = await prisma.sekolahSettings.upsert({
      where: { id: 'default' },
      update: {
        namaYayasan,
        namaSekolah,
        alamat,
        kelurahan,
        kecamatan,
        kabKota,
        provinsi,
        noTelepon,
        email,
        website,
        formatKuitansi,
        bulanMulai: bulanMulai || 7,
        namaBendahara
      },
      create: {
        id: 'default',
        namaYayasan,
        namaSekolah,
        alamat,
        kelurahan,
        kecamatan,
        kabKota,
        provinsi,
        noTelepon,
        email,
        website,
        formatKuitansi,
        bulanMulai: bulanMulai || 7,
        namaBendahara
      }
    })

    return NextResponse.json(settings)
  } catch (error) {
    console.error('Error updating settings:', error)
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 })
  }
}
