'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { ArrowLeftRight, ArrowRightCircle, ArrowLeftCircle, ArrowLeft, Edit2, Trash2, X, RefreshCw, Calendar, UserPlus, UserMinus } from 'lucide-react'
import Link from 'next/link'

interface HistoriItem {
  id: string
  tipeAksi: string
  tanggalAksi: string
  keterangan: string | null
  kelasNama: string | null
  siswa: {
    id: string
    nama: string
    nipd: string
    kelasNama: string
    status: string
  }
  tahunAjaran: {
    id: string
    nama: string
  }
}

interface TahunAjaran {
  id: string
  nama: string
  aktif: boolean
}

export default function HistoriPindahPage() {
  const [data, setData] = useState<HistoriItem[]>([])
  const [loading, setLoading] = useState(true)
  const [tahunAjaranList, setTahunAjaranList] = useState<TahunAjaran[]>([])
  const [selectedTA, setSelectedTA] = useState('')
  const [filterType, setFilterType] = useState('all')
  
  // Edit modal state
  const [editModal, setEditModal] = useState(false)
  const [editItem, setEditItem] = useState<HistoriItem | null>(null)
  const [editDate, setEditDate] = useState('')
  const [editKeterangan, setEditKeterangan] = useState('')
  const [saving, setSaving] = useState(false)

  const fetchTahunAjaran = async () => {
    try {
      const res = await fetch('/api/manajemen/tahun-ajaran')
      const json = await res.json()
      // API returns array directly, not { data: [...] }
      const list = Array.isArray(json) ? json : []
      setTahunAjaranList(list)
      const aktif = list.find((t: TahunAjaran) => t.aktif)
      if (aktif) setSelectedTA(aktif.id)
    } catch (error) {
      console.error('Error:', error)
    }
  }

  const fetchData = useCallback(async () => {
    if (!selectedTA) return
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('tahunAjaranId', selectedTA)
      params.set('tipeAksi', 'PINDAH_MASUK,PINDAH_KELUAR')
      
      const res = await fetch(`/api/siswa/histori?${params}`)
      const json = await res.json()
      
      let filtered = json.data || []
      if (filterType !== 'all') {
        filtered = filtered.filter((h: HistoriItem) => h.tipeAksi === filterType)
      }
      
      setData(filtered)
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }, [selectedTA, filterType])

  useEffect(() => {
    fetchTahunAjaran()
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })
  }

  const handleEdit = (item: HistoriItem) => {
    setEditItem(item)
    setEditDate(item.tanggalAksi.split('T')[0])
    setEditKeterangan(item.keterangan || '')
    setEditModal(true)
  }

  const handleSaveEdit = async () => {
    if (!editItem) return
    setSaving(true)
    try {
      const res = await fetch('/api/siswa/histori', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editItem.id,
          tanggalAksi: editDate,
          keterangan: editKeterangan
        })
      })

      if (res.ok) {
        setEditModal(false)
        fetchData()
        alert('Berhasil diupdate!')
      } else {
        alert('Gagal mengupdate')
      }
    } catch {
      alert('Terjadi kesalahan')
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = async (item: HistoriItem) => {
    const confirmMsg = item.tipeAksi === 'PINDAH_KELUAR'
      ? `Batalkan pindah keluar untuk ${item.siswa.nama}?\n\nStatus siswa akan dikembalikan menjadi AKTIF.`
      : `Batalkan pindah masuk untuk ${item.siswa.nama}?\n\nHanya record histori yang akan dihapus.`
    
    if (!confirm(confirmMsg)) return

    try {
      const res = await fetch(`/api/siswa/histori?id=${item.id}`, {
        method: 'DELETE'
      })

      if (res.ok) {
        fetchData()
        alert('Berhasil dibatalkan!')
      } else {
        alert('Gagal membatalkan')
      }
    } catch {
      alert('Terjadi kesalahan')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/admin/manajemen-data" className="p-2 hover:bg-gray-100 rounded-lg">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Histori Pindah Siswa</h1>
            <p className="text-gray-500">Kelola data siswa pindah masuk dan pindah keluar</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/dashboard/admin/manajemen-data/siswa-masuk">
            <Button variant="outline" className="text-green-600 border-green-200 hover:bg-green-50">
              <UserPlus className="w-4 h-4 mr-2" />
              Pindah Masuk
            </Button>
          </Link>
          <Link href="/dashboard/admin/manajemen-data/siswa-keluar">
            <Button variant="outline" className="text-red-600 border-red-200 hover:bg-red-50">
              <UserMinus className="w-4 h-4 mr-2" />
              Pindah Keluar
            </Button>
          </Link>
          <Button variant="outline" onClick={fetchData}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Select
              label="Tahun Ajaran"
              options={tahunAjaranList.map(t => ({ 
                value: t.id, 
                label: t.nama + (t.aktif ? ' (Aktif)' : '') 
              }))}
              value={selectedTA}
              onChange={(e) => setSelectedTA(e.target.value)}
            />
            <Select
              label="Tipe"
              options={[
                { value: 'all', label: 'Semua' },
                { value: 'PINDAH_MASUK', label: 'Pindah Masuk' },
                { value: 'PINDAH_KELUAR', label: 'Pindah Keluar' }
              ]}
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <ArrowLeftRight className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{data.length}</p>
                <p className="text-sm text-gray-500">Total Histori</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-100 rounded-lg">
                <ArrowRightCircle className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {data.filter(d => d.tipeAksi === 'PINDAH_MASUK').length}
                </p>
                <p className="text-sm text-gray-500">Pindah Masuk</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-red-100 rounded-lg">
                <ArrowLeftCircle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {data.filter(d => d.tipeAksi === 'PINDAH_KELUAR').length}
                </p>
                <p className="text-sm text-gray-500">Pindah Keluar</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>Daftar Histori Pindah</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-gray-500">Memuat data...</div>
          ) : data.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              Tidak ada data histori pindah untuk tahun ajaran ini
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>NIPD</TableHead>
                    <TableHead>Nama Siswa</TableHead>
                    <TableHead>Kelas</TableHead>
                    <TableHead>Tipe</TableHead>
                    <TableHead>Tanggal</TableHead>
                    <TableHead>Keterangan</TableHead>
                    <TableHead>Status Siswa</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-mono text-sm">{item.siswa.nipd}</TableCell>
                      <TableCell className="font-medium">{item.siswa.nama}</TableCell>
                      <TableCell>
                        <Badge variant="info">{item.kelasNama || item.siswa.kelasNama}</Badge>
                      </TableCell>
                      <TableCell>
                        {item.tipeAksi === 'PINDAH_MASUK' ? (
                          <Badge variant="success">
                            <ArrowRightCircle className="w-3 h-3 mr-1" />
                            Masuk
                          </Badge>
                        ) : (
                          <Badge variant="danger">
                            <ArrowLeftCircle className="w-3 h-3 mr-1" />
                            Keluar
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <Calendar className="w-3 h-3 text-gray-400" />
                          {formatDate(item.tanggalAksi)}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-gray-600 max-w-[200px] truncate">
                        {item.keterangan || '-'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={
                          item.siswa.status === 'AKTIF' ? 'success' :
                          item.siswa.status === 'PINDAH' ? 'warning' : 'default'
                        }>
                          {item.siswa.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEdit(item)}
                            title="Edit tanggal"
                          >
                            <Edit2 className="w-4 h-4 text-blue-500" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleCancel(item)}
                            title="Batalkan"
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Modal */}
      {editModal && editItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold">Edit Histori Pindah</h3>
              <button onClick={() => setEditModal(false)}>
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-4 space-y-4">
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">Siswa</p>
                <p className="font-medium">{editItem.siswa.nama}</p>
                <p className="text-xs text-gray-400">{editItem.siswa.nipd}</p>
              </div>

              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">Tipe</p>
                <p className="font-medium">
                  {editItem.tipeAksi === 'PINDAH_MASUK' ? 'Pindah Masuk' : 'Pindah Keluar'}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tanggal {editItem.tipeAksi === 'PINDAH_MASUK' ? 'Masuk' : 'Keluar'}
                </label>
                <input
                  type="date"
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Keterangan
                </label>
                <textarea
                  value={editKeterangan}
                  onChange={(e) => setEditKeterangan(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Catatan tambahan..."
                />
              </div>
            </div>

            <div className="p-4 border-t flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setEditModal(false)}
              >
                Batal
              </Button>
              <Button
                className="flex-1"
                onClick={handleSaveEdit}
                disabled={saving}
              >
                {saving ? 'Menyimpan...' : 'Simpan'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
