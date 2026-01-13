import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import fs from 'fs'
import path from 'path'

const BACKUP_DIR = path.join(process.cwd(), 'backups')

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const backup = await prisma.databaseBackup.findUnique({
      where: { id }
    })

    if (!backup) {
      return NextResponse.json({ error: 'Backup not found' }, { status: 404 })
    }

    // Delete file
    const filePath = path.join(BACKUP_DIR, backup.filename)
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath)
    }

    // Delete record
    await prisma.databaseBackup.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting backup:', error)
    return NextResponse.json({ error: 'Failed to delete backup' }, { status: 500 })
  }
}
