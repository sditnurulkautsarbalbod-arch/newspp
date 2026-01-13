import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { tahunAjaranId } = body

    // Generate kelas 1A-6D (4 kelas per tingkat)
    const kelasTemplate = [
      { nama: '1A', tingkat: 1 }, { nama: '1B', tingkat: 1 }, { nama: '1C', tingkat: 1 }, { nama: '1D', tingkat: 1 },
      { nama: '2A', tingkat: 2 }, { nama: '2B', tingkat: 2 }, { nama: '2C', tingkat: 2 }, { nama: '2D', tingkat: 2 },
      { nama: '3A', tingkat: 3 }, { nama: '3B', tingkat: 3 }, { nama: '3C', tingkat: 3 }, { nama: '3D', tingkat: 3 },
      { nama: '4A', tingkat: 4 }, { nama: '4B', tingkat: 4 }, { nama: '4C', tingkat: 4 }, { nama: '4D', tingkat: 4 },
      { nama: '5A', tingkat: 5 }, { nama: '5B', tingkat: 5 }, { nama: '5C', tingkat: 5 }, { nama: '5D', tingkat: 5 },
      { nama: '6A', tingkat: 6 }, { nama: '6B', tingkat: 6 }, { nama: '6C', tingkat: 6 }, { nama: '6D', tingkat: 6 },
    ]

    let created = 0
    for (const k of kelasTemplate) {
      await prisma.kelas.upsert({
        where: {
          nama_tahunAjaranId: {
            nama: k.nama,
            tahunAjaranId,
          },
        },
        update: {},
        create: {
          nama: k.nama,
          tingkat: k.tingkat,
          tahunAjaranId,
        },
      })
      created++
    }

    return NextResponse.json({ success: true, count: created })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Failed to generate' }, { status: 500 })
  }
}
