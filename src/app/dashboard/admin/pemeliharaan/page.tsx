'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { HardDrive, Download, RefreshCw, Database, Clock, FileArchive, Trash2, RotateCcw, Upload } from 'lucide-react'
import { formatDate } from '@/lib/utils'

interface BackupRecord {
  id: string
  filename: string
  filesize: number
  createdBy: string | null
  createdAt: string
}

export default function PemeliharaanPage() {
  const [backups, setBackups] = useState<BackupRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [restoring, setRestoring] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [dbStats, setDbStats] = useState<{
    siswa: number
    tagihan: number
    pembayaran: number
    lastBackup: string | null
  } | null>(null)

  const fetchData = async () => {
    try {
      const [backupsRes, statsRes] = await Promise.all([
        fetch('/api/backup'),
        fetch('/api/backup/stats')
      ])
      
      const backupsData = await backupsRes.json()
      const statsData = await statsRes.json()
      
      setBackups(backupsData.data || [])
      setDbStats(statsData)
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleCreateBackup = async () => {
    setCreating(true)
    setMessage(null)

    try {
      const res = await fetch('/api/backup', {
        method: 'POST'
      })

      if (res.ok) {
        const data = await res.json()
        setMessage({ type: 'success', text: `Backup berhasil dibuat: ${data.filename}` })
        fetchData()
      } else {
        throw new Error('Gagal membuat backup')
      }
    } catch {
      setMessage({ type: 'error', text: 'Gagal membuat backup database' })
    } finally {
      setCreating(false)
    }
  }

  const handleDownloadBackup = (filename: string) => {
    window.open(`/api/backup/download/${filename}`, '_blank')
  }

  const handleDeleteBackup = async (id: string) => {
    if (!confirm('Yakin ingin menghapus backup ini?')) return

    try {
      const res = await fetch(`/api/backup/${id}`, { method: 'DELETE' })
      if (res.ok) {
        setMessage({ type: 'success', text: 'Backup berhasil dihapus' })
        fetchData()
      }
    } catch {
      setMessage({ type: 'error', text: 'Gagal menghapus backup' })
    }
  }

  const handleRestoreBackup = async (filename: string) => {
    const confirmRestore = confirm(
      `⚠️ PERINGATAN!\n\nAnda akan me-restore database dari backup:\n${filename}\n\n` +
      `Tindakan ini akan:\n` +
      `• Mengganti seluruh data saat ini dengan data dari backup\n` +
      `• Membuat backup otomatis sebelum restore (untuk keamanan)\n\n` +
      `Lanjutkan restore?`
    )
    
    if (!confirmRestore) return

    setRestoring(filename)
    setMessage(null)

    try {
      const res = await fetch('/api/backup', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename })
      })

      if (res.ok) {
        const data = await res.json()
        setMessage({ 
          type: 'success', 
          text: `Database berhasil di-restore! Backup sebelum restore: ${data.preRestoreBackup}` 
        })
        fetchData()
        // Reload page after short delay to refresh all data
        setTimeout(() => window.location.reload(), 2000)
      } else {
        const error = await res.json()
        throw new Error(error.error || 'Gagal restore database')
      }
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Gagal restore database' })
    } finally {
      setRestoring(null)
    }
  }

  const handleUploadRestore = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file extension
    if (!file.name.endsWith('.db')) {
      setMessage({ type: 'error', text: 'File harus berformat .db (SQLite database)' })
      e.target.value = ''
      return
    }

    const confirmUpload = confirm(
      `⚠️ PERINGATAN!\n\nAnda akan me-restore database dari file:\n${file.name}\n\n` +
      `Tindakan ini akan:\n` +
      `• Mengganti seluruh data saat ini dengan data dari file backup\n` +
      `• Membuat backup otomatis sebelum restore (untuk keamanan)\n\n` +
      `Lanjutkan restore?`
    )

    if (!confirmUpload) {
      e.target.value = ''
      return
    }

    setUploading(true)
    setMessage(null)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch('/api/backup/upload-restore', {
        method: 'POST',
        body: formData
      })

      if (res.ok) {
        const data = await res.json()
        setMessage({ 
          type: 'success', 
          text: `Database berhasil di-restore dari file upload! Backup sebelum restore: ${data.preRestoreBackup}` 
        })
        fetchData()
        setTimeout(() => window.location.reload(), 2000)
      } else {
        const error = await res.json()
        throw new Error(error.error || 'Gagal restore database')
      }
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Gagal upload dan restore' })
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Pemeliharaan Database</h1>
        <p className="text-gray-600">Backup dan pemeliharaan database sistem</p>
      </div>

      {message && (
        <div className={`p-4 rounded-lg ${message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
          {message.text}
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Database className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{dbStats?.siswa || 0}</p>
                <p className="text-sm text-gray-500">Total Siswa</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <FileArchive className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{dbStats?.tagihan || 0}</p>
                <p className="text-sm text-gray-500">Total Tagihan</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <HardDrive className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{dbStats?.pembayaran || 0}</p>
                <p className="text-sm text-gray-500">Total Pembayaran</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Clock className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm font-medium">
                  {dbStats?.lastBackup ? formatDate(dbStats.lastBackup) : 'Belum ada'}
                </p>
                <p className="text-sm text-gray-500">Backup Terakhir</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Backup Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <HardDrive className="w-5 h-5" />
            Backup Database
          </CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={fetchData}>
              <RefreshCw className="w-4 h-4 mr-1" />
              Refresh
            </Button>
            <label className="cursor-pointer">
              <input
                type="file"
                accept=".db"
                onChange={handleUploadRestore}
                className="hidden"
                disabled={uploading}
              />
              <span className={`inline-flex items-center justify-center rounded-md text-sm font-medium border border-gray-300 bg-white px-3 py-2 hover:bg-gray-50 transition-colors ${uploading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
                {uploading ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-1 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-1" />
                    Upload & Restore
                  </>
                )}
              </span>
            </label>
            <Button onClick={handleCreateBackup} disabled={creating}>
              {creating ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-1 animate-spin" />
                  Membuat...
                </>
              ) : (
                <>
                  <Database className="w-4 h-4 mr-1" />
                  Buat Backup
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-gray-500">Loading...</div>
          ) : backups.length === 0 ? (
            <div className="text-center py-12">
              <HardDrive className="w-12 h-12 mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500 mb-4">Belum ada backup database</p>
              <Button onClick={handleCreateBackup} disabled={creating}>
                <Database className="w-4 h-4 mr-1" />
                Buat Backup Pertama
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama File</TableHead>
                  <TableHead>Ukuran</TableHead>
                  <TableHead>Tanggal</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {backups.map((backup) => (
                  <TableRow key={backup.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <FileArchive className="w-4 h-4 text-gray-400" />
                        {backup.filename}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="default">{formatFileSize(backup.filesize)}</Badge>
                    </TableCell>
                    <TableCell>{formatDate(backup.createdAt)}</TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleRestoreBackup(backup.filename)}
                          disabled={restoring !== null}
                          title="Restore database dari backup ini"
                        >
                          {restoring === backup.filename ? (
                            <RefreshCw className="w-4 h-4 animate-spin" />
                          ) : (
                            <RotateCcw className="w-4 h-4 text-blue-500" />
                          )}
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleDownloadBackup(backup.filename)}
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleDeleteBackup(backup.id)}
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Info */}
      <Card>
        <CardContent className="pt-6">
          <h3 className="font-medium mb-2">Informasi Backup & Restore</h3>
          <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
            <li>Backup otomatis menyimpan seluruh data database SQLite</li>
            <li>Disarankan untuk membuat backup secara berkala (minimal 1x seminggu)</li>
            <li>File backup dapat didownload dan disimpan di tempat yang aman</li>
            <li><strong>Restore:</strong> Klik tombol <RotateCcw className="w-3 h-3 inline text-blue-500" /> untuk mengembalikan database dari backup</li>
            <li>Sebelum restore, sistem akan membuat backup otomatis untuk keamanan</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
