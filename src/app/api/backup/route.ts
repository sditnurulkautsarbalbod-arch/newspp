import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import fs from 'fs'
import path from 'path'

const BACKUP_DIR = path.join(process.cwd(), 'backups')

// Ensure backup directory exists
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true })
}

export async function GET() {
  try {
    const backups = await prisma.databaseBackup.findMany({
      orderBy: { createdAt: 'desc' },
      take: 20
    })

    return NextResponse.json({ data: backups })
  } catch (error) {
    console.error('Error fetching backups:', error)
    return NextResponse.json({ error: 'Failed to fetch backups' }, { status: 500 })
  }
}

export async function POST() {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const filename = `backup-${timestamp}.db`
    const backupPath = path.join(BACKUP_DIR, filename)
    
    // Get source database path
    const dbUrl = process.env.DATABASE_URL || 'file:./dev.db'
    const sourcePath = dbUrl.replace('file:', '').replace('./', path.join(process.cwd(), 'prisma/'))
    
    // Copy database file
    fs.copyFileSync(sourcePath, backupPath)
    
    const stats = fs.statSync(backupPath)
    
    // Record backup in database
    const backup = await prisma.databaseBackup.create({
      data: {
        filename,
        filesize: stats.size
      }
    })

    return NextResponse.json(backup)
  } catch (error) {
    console.error('Error creating backup:', error)
    return NextResponse.json({ error: 'Failed to create backup' }, { status: 500 })
  }
}

// Restore database from backup
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { filename } = body

    if (!filename) {
      return NextResponse.json({ error: 'Filename diperlukan' }, { status: 400 })
    }

    const backupPath = path.join(BACKUP_DIR, filename)
    
    // Check if backup file exists
    if (!fs.existsSync(backupPath)) {
      return NextResponse.json({ error: 'File backup tidak ditemukan' }, { status: 404 })
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

    // Restore: copy backup to database location
    fs.copyFileSync(backupPath, targetPath)

    // Reconnect prisma
    await prisma.$connect()

    // Record the pre-restore backup
    await prisma.databaseBackup.create({
      data: {
        filename: preRestoreBackup,
        filesize: fs.statSync(preRestorePath).size
      }
    })

    return NextResponse.json({ 
      message: 'Database berhasil di-restore',
      preRestoreBackup: preRestoreBackup
    })
  } catch (error) {
    console.error('Error restoring database:', error)
    return NextResponse.json({ error: 'Failed to restore database' }, { status: 500 })
  }
}
