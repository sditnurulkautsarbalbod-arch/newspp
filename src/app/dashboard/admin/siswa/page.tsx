'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Spinner } from '@/components/ui/spinner'
import { Plus, Edit, Trash2, Eye, X, Upload, Download, FileSpreadsheet, RotateCcw, Users, UserX } from 'lucide-react'
import Link from 'next/link'

interface Siswa {
  id: string
  nipd: string
  nama: string
  kelasNama: string
  kelas?: { id: string; nama: string }
  jenisKelamin?: string
  namaOrangTua?: string
  noTelepon?: string
  status: string
  tahunAjaran: { nama: string }
}

interface Kelas {
  id: string
  nama: string
}

interface TahunAjaran {
  id: string
  nama: string
  aktif: boolean
}

interface SiswaForm {
  nipd: string
  nama: string
  kelasId: string
  jenisKelamin: string
  tempatLahir: string
  tanggalLahir: string
  alamat: string
  namaOrangTua: string
  noTelepon: string
}

const initialForm: SiswaForm = {
  nipd: '',
  nama: '',
  kelasId: '',
  jenisKelamin: 'L',
  tempatLahir: '',
  tanggalLahir: '',
  alamat: '',
  namaOrangTua: '',
  noTelepon: ''
}

export default function SiswaPage() {
  const [siswaList, setSiswaList] = useState<Siswa[]>([])
  const [kelasList, setKelasList] = useState<Kelas[]>([])
  const [tahunAjaranList, setTahunAjaranList] = useState<TahunAjaran[]>([])
  const [loading, setLoading] = useState(true)
  
  // Filters
  const [selectedTahunAjaran, setSelectedTahunAjaran] = useState('')
  const [selectedKelas, setSelectedKelas] = useState('')
  const [selectedSiswa, setSelectedSiswa] = useState('')
  const [showDeleted, setShowDeleted] = useState(false)
  
  // Modal
  const [showModal, setShowModal] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [form, setForm] = useState<SiswaForm>(initialForm)
  const [editId, setEditId] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [pagination, setPagination] = useState({ page: 1, total: 0, totalPages: 1 })
  
  // Import
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importLoading, setImportLoading] = useState(false)
  const [importResult, setImportResult] = useState<{ success: number; failed: number; errors: string[] } | null>(null)

  // Fetch tahun ajaran
  useEffect(() => {
    fetch('/api/manajemen/tahun-ajaran')
      .then(res => res.json())
      .then(data => {
        const list = Array.isArray(data) ? data : []
        setTahunAjaranList(list)
        const aktif = list.find((t: TahunAjaran) => t.aktif)
        if (aktif) setSelectedTahunAjaran(aktif.id)
      })
  }, [])

  // Fetch kelas when tahun ajaran changes
  useEffect(() => {
    if (!selectedTahunAjaran) return
    fetch(`/api/manajemen/kelas?tahunAjaranId=${selectedTahunAjaran}`)
      .then(res => res.json())
      .then(data => setKelasList(Array.isArray(data) ? data : []))
      .catch(() => setKelasList([]))
  }, [selectedTahunAjaran])

  const fetchSiswa = useCallback(async () => {
    if (!selectedTahunAjaran) return
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('tahunAjaranId', selectedTahunAjaran)
      if (selectedKelas) params.set('kelasId', selectedKelas)
      if (selectedSiswa) params.set('siswaId', selectedSiswa)
      params.set('page', pagination.page.toString())
      params.set('status', showDeleted ? 'TIDAK_AKTIF' : 'AKTIF')
      
      const res = await fetch(`/api/siswa?${params}`)
      const data = await res.json()
      setSiswaList(data.data || [])
      setPagination(prev => ({ ...prev, ...data.pagination }))
    } catch {
      console.error('Error fetching siswa')
    } finally {
      setLoading(false)
    }
  }, [selectedTahunAjaran, selectedKelas, selectedSiswa, pagination.page, showDeleted])

  useEffect(() => {
    const timer = setTimeout(() => fetchSiswa(), 300)
    return () => clearTimeout(timer)
  }, [fetchSiswa])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')

    try {
      const url = editId ? `/api/siswa/${editId}` : '/api/siswa'
      const method = editId ? 'PUT' : 'POST'
      
      const payload = {
        ...form,
        tahunAjaranId: selectedTahunAjaran,
      }
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Gagal menyimpan data')
      }

      setShowModal(false)
      setForm(initialForm)
      setEditId(null)
      fetchSiswa()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleEdit = async (id: string) => {
    try {
      const res = await fetch(`/api/siswa/${id}`)
      const siswa = await res.json()
      setForm({
        nipd: siswa.nipd,
        nama: siswa.nama,
        kelasId: siswa.kelasId || '',
        jenisKelamin: siswa.jenisKelamin || 'L',
        tempatLahir: siswa.tempatLahir || '',
        tanggalLahir: siswa.tanggalLahir ? siswa.tanggalLahir.split('T')[0] : '',
        alamat: siswa.alamat || '',
        namaOrangTua: siswa.namaOrangTua || '',
        noTelepon: siswa.noTelepon || ''
      })
      setEditId(id)
      setShowModal(true)
    } catch {
      console.error('Error fetching siswa detail')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Yakin ingin menghapus siswa ini?')) return
    
    try {
      const res = await fetch(`/api/siswa/${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (res.ok) {
        alert(data.message || 'Siswa berhasil dihapus')
      }
      fetchSiswa()
    } catch {
      console.error('Error deleting siswa')
    }
  }

  const handleRestore = async (id: string) => {
    if (!confirm('Yakin ingin memulihkan siswa ini?')) return
    
    try {
      const res = await fetch(`/api/siswa/${id}`, { 
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'restore' })
      })
      if (res.ok) {
        alert('Siswa berhasil dipulihkan')
        fetchSiswa()
      }
    } catch {
      console.error('Error restoring siswa')
    }
  }

  const handleImport = async () => {
    if (!importFile) return
    setImportLoading(true)
    setImportResult(null)

    try {
      const formData = new FormData()
      formData.append('file', importFile)
      formData.append('tahunAjaranId', selectedTahunAjaran)

      const res = await fetch('/api/siswa/import', {
        method: 'POST',
        body: formData,
      })

      const result = await res.json()
      setImportResult(result)
      
      if (result.success > 0) {
        fetchSiswa()
      }
    } catch (err) {
      setImportResult({ success: 0, failed: 0, errors: ['Gagal mengimport file'] })
    } finally {
      setImportLoading(false)
    }
  }

  const downloadTemplate = () => {
    window.open('/api/siswa/template', '_blank')
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-white p-4 rounded-xl border border-gray-200">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-600">Tahun Ajaran</label>
            <select
              value={selectedTahunAjaran}
              onChange={(e) => { setSelectedTahunAjaran(e.target.value); setSelectedKelas(''); setSelectedSiswa('') }}
              className="px-3 py-2 text-sm border border-gray-300 rounded-lg"
            >
              {tahunAjaranList.map((ta) => (
                <option key={ta.id} value={ta.id}>{ta.nama} {ta.aktif && '(Aktif)'}</option>
              ))}
            </select>
          </div>
          
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-600">Kelas</label>
            <select
              value={selectedKelas}
              onChange={(e) => { setSelectedKelas(e.target.value); setSelectedSiswa('') }}
              className="px-3 py-2 text-sm border border-gray-300 rounded-lg"
            >
              <option value="">Semua Kelas</option>
              {kelasList.map((k) => (
                <option key={k.id} value={k.id}>{k.nama}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1 min-w-[200px]">
            <label className="text-xs font-medium text-gray-600">Nama Siswa</label>
            <select
              value={selectedSiswa}
              onChange={(e) => setSelectedSiswa(e.target.value)}
              className="px-3 py-2 text-sm border border-gray-300 rounded-lg"
            >
              <option value="">Semua Siswa</option>
              {siswaList.map((s) => (
                <option key={s.id} value={s.id}>{s.nama} ({s.nipd})</option>
              ))}
            </select>
          </div>

          <div className="flex-1" />

          {/* Toggle Deleted Students */}
          <div className="flex rounded-lg border border-gray-200 overflow-hidden">
            <button
              onClick={() => { setShowDeleted(false); setPagination(p => ({...p, page: 1})); }}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors ${
                !showDeleted ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Users className="w-4 h-4" />
              Aktif
            </button>
            <button
              onClick={() => { setShowDeleted(true); setPagination(p => ({...p, page: 1})); }}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors ${
                showDeleted ? 'bg-orange-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              <UserX className="w-4 h-4" />
              Dihapus
            </button>
          </div>

          <Button variant="outline" onClick={() => setShowImportModal(true)}>
            <Upload className="w-4 h-4 mr-2" />
            Import Excel
          </Button>
          <Button onClick={() => { setShowModal(true); setForm({...initialForm, kelasId: selectedKelas || kelasList[0]?.id || ''}); setEditId(null); }} disabled={showDeleted}>
            <Plus className="w-4 h-4 mr-2" />
            Tambah Siswa
          </Button>
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Spinner />
            </div>
          ) : siswaList.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              Tidak ada data siswa
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>NIPD</TableHead>
                  <TableHead>Nama</TableHead>
                  <TableHead>Kelas</TableHead>
                  <TableHead className="hidden md:table-cell">Orang Tua</TableHead>
                  <TableHead className="hidden md:table-cell">Status</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {siswaList.map((siswa) => (
                  <TableRow key={siswa.id}>
                    <TableCell className="font-medium">{siswa.nipd}</TableCell>
                    <TableCell>{siswa.nama}</TableCell>
                    <TableCell>
                      <Badge variant="info">{siswa.kelas?.nama || siswa.kelasNama}</Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">{siswa.namaOrangTua || '-'}</TableCell>
                    <TableCell className="hidden md:table-cell">
                      <Badge variant={siswa.status === 'AKTIF' ? 'success' : 'default'}>
                        {siswa.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Link href={`/dashboard/admin/siswa/${siswa.id}`}>
                          <Button variant="ghost" size="icon">
                            <Eye className="w-4 h-4" />
                          </Button>
                        </Link>
                        {showDeleted ? (
                          <Button variant="ghost" size="icon" onClick={() => handleRestore(siswa.id)} title="Pulihkan">
                            <RotateCcw className="w-4 h-4 text-green-600" />
                          </Button>
                        ) : (
                          <>
                            <Button variant="ghost" size="icon" onClick={() => handleEdit(siswa.id)}>
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDelete(siswa.id)}>
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={pagination.page === 1}
            onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
          >
            Sebelumnya
          </Button>
          <span className="flex items-center px-4 text-sm text-gray-600">
            Halaman {pagination.page} dari {pagination.totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={pagination.page === pagination.totalPages}
            onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
          >
            Selanjutnya
          </Button>
        </div>
      )}

      {/* Modal Form */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold">
                {editId ? 'Edit Siswa' : 'Tambah Siswa Baru'}
              </h3>
              <button onClick={() => setShowModal(false)}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              <Input
                label="NIPD"
                value={form.nipd}
                onChange={(e) => setForm({ ...form, nipd: e.target.value })}
                required
                disabled={!!editId}
              />
              <Input
                label="Nama Lengkap"
                value={form.nama}
                onChange={(e) => setForm({ ...form, nama: e.target.value })}
                required
              />
              <div className="grid grid-cols-2 gap-4">
                <Select
                  label="Kelas"
                  options={kelasList.map(k => ({ value: k.id, label: k.nama }))}
                  value={form.kelasId}
                  onChange={(e) => setForm({ ...form, kelasId: e.target.value })}
                />
                <Select
                  label="Jenis Kelamin"
                  options={[
                    { value: 'L', label: 'Laki-laki' },
                    { value: 'P', label: 'Perempuan' }
                  ]}
                  value={form.jenisKelamin}
                  onChange={(e) => setForm({ ...form, jenisKelamin: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Tempat Lahir"
                  value={form.tempatLahir}
                  onChange={(e) => setForm({ ...form, tempatLahir: e.target.value })}
                />
                <Input
                  label="Tanggal Lahir"
                  type="date"
                  value={form.tanggalLahir}
                  onChange={(e) => setForm({ ...form, tanggalLahir: e.target.value })}
                />
              </div>
              <Input
                label="Alamat"
                value={form.alamat}
                onChange={(e) => setForm({ ...form, alamat: e.target.value })}
              />
              <Input
                label="Nama Orang Tua"
                value={form.namaOrangTua}
                onChange={(e) => setForm({ ...form, namaOrangTua: e.target.value })}
              />
              <Input
                label="No. Telepon"
                value={form.noTelepon}
                onChange={(e) => setForm({ ...form, noTelepon: e.target.value })}
              />

              {error && (
                <div className="p-3 rounded-lg bg-red-50 text-red-600 text-sm">
                  {error}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setShowModal(false)}>
                  Batal
                </Button>
                <Button type="submit" className="flex-1" disabled={submitting}>
                  {submitting ? 'Menyimpan...' : 'Simpan'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold">Import Siswa dari Excel</h3>
              <button onClick={() => { setShowImportModal(false); setImportFile(null); setImportResult(null) }}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={downloadTemplate}>
                  <Download className="w-4 h-4 mr-2" />
                  Download Template
                </Button>
              </div>
              
              <div 
                className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-blue-400 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                <FileSpreadsheet className="w-12 h-12 mx-auto text-gray-400 mb-2" />
                {importFile ? (
                  <p className="text-sm text-gray-600">{importFile.name}</p>
                ) : (
                  <p className="text-sm text-gray-500">Klik untuk memilih file Excel (.xlsx)</p>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  className="hidden"
                  onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                />
              </div>

              {importResult && (
                <div className={`p-3 rounded-lg text-sm ${importResult.success > 0 ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
                  <p>Berhasil: {importResult.success} siswa</p>
                  {importResult.failed > 0 && <p>Gagal: {importResult.failed} siswa</p>}
                  {importResult.errors.length > 0 && (
                    <ul className="mt-2 text-xs list-disc list-inside">
                      {importResult.errors.slice(0, 5).map((err, i) => <li key={i}>{err}</li>)}
                    </ul>
                  )}
                </div>
              )}

              <div className="flex gap-3">
                <Button 
                  variant="outline" 
                  className="flex-1" 
                  onClick={() => { setShowImportModal(false); setImportFile(null); setImportResult(null) }}
                >
                  Tutup
                </Button>
                <Button 
                  className="flex-1" 
                  disabled={!importFile || importLoading}
                  onClick={handleImport}
                >
                  {importLoading ? 'Mengimport...' : 'Import'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
