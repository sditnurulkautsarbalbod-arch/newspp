import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const type = formData.get('type') as string | null

    if (!file) {
      return NextResponse.json({ error: 'File tidak ditemukan' }, { status: 400 })
    }

    if (!type || !['sekolah', 'yayasan'].includes(type)) {
      return NextResponse.json({ error: 'Tipe logo tidak valid' }, { status: 400 })
    }

    // Validate file type
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Format file tidak didukung. Gunakan PNG, JPG, atau WebP' }, { status: 400 })
    }

    // Validate file size (max 2MB)
    const maxSize = 2 * 1024 * 1024
    if (file.size > maxSize) {
      return NextResponse.json({ error: 'Ukuran file maksimal 2MB' }, { status: 400 })
    }

    // Create uploads directory if not exists
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'logos')
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true })
    }

    // Generate unique filename
    const ext = file.name.split('.').pop()?.toLowerCase() || 'png'
    const filename = `logo-${type}-${Date.now()}.${ext}`
    const filepath = path.join(uploadDir, filename)

    // Convert file to buffer and save
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    await writeFile(filepath, buffer)

    // Path for database and frontend (relative to public folder)
    const publicPath = `/uploads/logos/${filename}`

    // Update database
    const updateData = type === 'sekolah' 
      ? { logoSekolah: publicPath }
      : { logoYayasan: publicPath }

    await prisma.sekolahSettings.upsert({
      where: { id: 'default' },
      update: updateData,
      create: {
        id: 'default',
        namaSekolah: 'Nama Sekolah',
        formatKuitansi: 'KWT/{tahun}/{bulan}/{tanggal}/{nomor}',
        ...updateData
      }
    })

    return NextResponse.json({ 
      success: true, 
      path: publicPath,
      message: `Logo ${type} berhasil diupload` 
    })

  } catch (error) {
    console.error('Error uploading logo:', error)
    return NextResponse.json({ error: 'Gagal mengupload logo' }, { status: 500 })
  }
}
