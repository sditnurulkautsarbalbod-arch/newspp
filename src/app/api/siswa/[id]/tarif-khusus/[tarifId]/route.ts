import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// DELETE tarif khusus
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; tarifId: string }> }
) {
  try {
    const { id: siswaId, tarifId } = await params

    await prisma.jenisTagihanSiswa.delete({
      where: { id: tarifId }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting tarif khusus:', error)
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 })
  }
}
