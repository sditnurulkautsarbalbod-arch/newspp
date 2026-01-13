import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Set all tahun ajaran to inactive
    await prisma.tahunAjaran.updateMany({
      data: { aktif: false }
    })

    // Set this one to active
    await prisma.tahunAjaran.update({
      where: { id },
      data: { aktif: true }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error setting aktif:', error)
    return NextResponse.json({ error: 'Failed to set aktif' }, { status: 500 })
  }
}
