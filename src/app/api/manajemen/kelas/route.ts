import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const tahunAjaranId = searchParams.get('tahunAjaranId')

    const where = tahunAjaranId ? { tahunAjaranId } : {}

    const data = await prisma.kelas.findMany({
      where,
      orderBy: [{ tingkat: 'asc' }, { nama: 'asc' }],
      include: {
        tahunAjaran: { select: { nama: true } },
        _count: { select: { siswa: true } }
      }
    })
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { nama, tingkat, tahunAjaranId } = body

    const data = await prisma.kelas.create({
      data: { nama, tingkat, tahunAjaranId }
    })

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Failed to create' }, { status: 500 })
  }
}
