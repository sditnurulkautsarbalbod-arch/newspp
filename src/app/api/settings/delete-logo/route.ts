import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { unlink } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { type } = body

    if (!type || !['sekolah', 'yayasan'].includes(type)) {
      return NextResponse.json({ error: 'Tipe logo tidak valid' }, { status: 400 })
    }

    // Get current settings to find the logo path
    const settings = await prisma.sekolahSettings.findFirst()
    
    if (!settings) {
      return NextResponse.json({ error: 'Settings tidak ditemukan' }, { status: 404 })
    }

    const logoPath = type === 'sekolah' ? settings.logoSekolah : settings.logoYayasan

    // Delete the file if it exists
    if (logoPath) {
      const fullPath = path.join(process.cwd(), 'public', logoPath)
      if (existsSync(fullPath)) {
        try {
          await unlink(fullPath)
        } catch (e) {
          console.error('Error deleting logo file:', e)
        }
      }
    }

    // Update database to remove logo path
    const updateData = type === 'sekolah' 
      ? { logoSekolah: null }
      : { logoYayasan: null }

    await prisma.sekolahSettings.update({
      where: { id: settings.id },
      data: updateData
    })

    return NextResponse.json({ 
      success: true, 
      message: `Logo ${type} berhasil dihapus` 
    })

  } catch (error) {
    console.error('Error deleting logo:', error)
    return NextResponse.json({ error: 'Gagal menghapus logo' }, { status: 500 })
  }
}
