import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const [siswa, tagihan, pembayaran, lastBackup] = await Promise.all([
      prisma.siswa.count(),
      prisma.tagihan.count(),
      prisma.pembayaran.count(),
      prisma.databaseBackup.findFirst({
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true }
      })
    ])

    return NextResponse.json({
      siswa,
      tagihan,
      pembayaran,
      lastBackup: lastBackup?.createdAt || null
    })
  } catch (error) {
    console.error('Error fetching stats:', error)
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 })
  }
}
