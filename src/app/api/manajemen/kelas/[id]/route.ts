import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { nama, tingkat, tahunAjaranId } = body

    const data = await prisma.kelas.update({
      where: { id },
      data: { nama, tingkat, tahunAjaranId }
    })

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const kelas = await prisma.kelas.findUnique({
      where: { id },
      include: { _count: { select: { siswa: true } } }
    })

    if (kelas?._count.siswa) {
      return NextResponse.json({ error: 'Cannot delete kelas with siswa' }, { status: 400 })
    }

    await prisma.kelas.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 })
  }
}
