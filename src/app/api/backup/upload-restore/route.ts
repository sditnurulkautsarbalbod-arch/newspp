import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import fs from 'fs'
import path from 'path'

const BACKUP_DIR = path.join(process.cwd(), 'backups')

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: 'File tidak ditemukan' }, { status: 400 })
    }

    if (!file.name.endsWith('.db')) {
      return NextResponse.json({ error: 'File harus berformat .db' }, { status: 400 })
    }

    // Validate SQLite file by checking header
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    
    // SQLite 3 database starts with "SQLite format 3\0"
    const sqliteHeader = Buffer.from('SQLite format 3\0')
    if (!buffer.subarray(0, 15).equals(sqliteHeader)) {
      return NextResponse.json({ error: 'File bukan database SQLite yang valid' }, { status: 400 })
    }

    // Ensure backup directory exists
    if (!fs.existsSync(BACKUP_DIR)) {
      fs.mkdirSync(BACKUP_DIR, { recursive: true })
    }

    // Get target database path
    const dbUrl = process.env.DATABASE_URL || 'file:./dev.db'
    const targetPath = dbUrl.replace('file:', '').replace('./', path.join(process.cwd(), 'prisma/'))

    // Create a backup of current database before restore
    const preRestoreBackup = `pre-restore-${new Date().toISOString().replace(/[:.]/g, '-')}.db`
    const preRestorePath = path.join(BACKUP_DIR, preRestoreBackup)
    fs.copyFileSync(targetPath, preRestorePath)

    // Disconnect prisma before restore
    await prisma.$disconnect()

// Write directly to database location
    fs.writeFileSync(targetPath, buffer)

    // Reconnect prisma
    await prisma.$connect()

    // Record pre-restore backup
    await prisma.databaseBackup.create({
      data: {
        filename: preRestoreBackup,
        filesize: fs.statSync(preRestorePath).size
      }
    })

// Also save uploaded file as a backup for reference
    const uploadedBackupName = `uploaded-${new Date().toISOString().replace(/[:.]/g, '-')}.db`
    const uploadedBackupPath = path.join(BACKUP_DIR, uploadedBackupName)
    fs.writeFileSync(uploadedBackupPath, buffer)

    await prisma.databaseBackup.create({
      data: {
        filename: uploadedBackupName,
        filesize: buffer.length
      }
    })

    return NextResponse.json({
      message: 'Database berhasil di-restore dari file upload',
      preRestoreBackup: preRestoreBackup
    })
  } catch (error) {
    console.error('Error restoring from upload:', error)
    return NextResponse.json({ error: 'Gagal restore database dari file upload' }, { status: 500 })
  }
}
