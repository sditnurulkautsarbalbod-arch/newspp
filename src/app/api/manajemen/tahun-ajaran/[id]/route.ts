import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { nama, tahunMulai, tahunSelesai } = body

    const data = await prisma.tahunAjaran.update({
      where: { id },
      data: { nama, tahunMulai, tahunSelesai }
    })

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error updating tahun ajaran:', error)
    return NextResponse.json({ error: 'Failed to update data' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Check if has related data
    const tahunAjaran = await prisma.tahunAjaran.findUnique({
      where: { id },
      include: { _count: { select: { siswa: true, tagihan: true } } }
    })

    if (tahunAjaran?.aktif) {
      return NextResponse.json({ error: 'Cannot delete active tahun ajaran' }, { status: 400 })
    }

    if (tahunAjaran?._count.siswa || tahunAjaran?._count.tagihan) {
      return NextResponse.json({ error: 'Cannot delete tahun ajaran with related data' }, { status: 400 })
    }

    await prisma.tahunAjaran.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting tahun ajaran:', error)
    return NextResponse.json({ error: 'Failed to delete data' }, { status: 500 })
  }
}
