import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const data = await prisma.tahunAjaran.findMany({
      orderBy: { tahunMulai: 'desc' },
      include: {
        _count: {
          select: { siswa: true, tagihan: true }
        }
      }
    })
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching tahun ajaran:', error)
    return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { nama, tahunMulai, tahunSelesai } = body

    const data = await prisma.tahunAjaran.create({
      data: { nama, tahunMulai, tahunSelesai }
    })

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error creating tahun ajaran:', error)
    return NextResponse.json({ error: 'Failed to create data' }, { status: 500 })
  }
}
