'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Spinner } from '@/components/ui/spinner'
import { formatCurrency } from '@/lib/utils'
import { Plus, Edit, Trash2, X, Users, User, ToggleLeft, ToggleRight } from 'lucide-react'

interface JenisTagihan {
  id: string
  nama: string
  kategori: string
  nominal: number
  tipeTarget: string
  aktif: boolean
  targetKelas?: { kelas: { id: string; nama: string } }[]
  targetSiswa?: { siswa: { id: string; nama: string } }[]
}

interface Kelas {
  id: string
  nama: string
}

interface Siswa {
  id: string
  nama: string
  nipd: string
}

interface TahunAjaran {
  id: string
  nama: string
  aktif: boolean
}

interface FormData {
  nama: string
  kategori: string[]
  nominal: string
  tipeTarget: string
  targetKelasIds: string[]
  targetSiswaIds: string[]
}

const initialForm: FormData = {
  nama: '',
  kategori: ['BULANAN'],
  nominal: '',
  tipeTarget: 'SEMUA',
  targetKelasIds: [],
  targetSiswaIds: []
}

export default function JenisTagihanPage() {
  const [data, setData] = useState<JenisTagihan[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState<FormData>(initialForm)
  const [editId, setEditId] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  
  // Filters & Data
  const [tahunAjaranList, setTahunAjaranList] = useState<TahunAjaran[]>([])
  const [kelasList, setKelasList] = useState<Kelas[]>([])
  const [siswaList, setSiswaList] = useState<Siswa[]>([])
  const [selectedTahunAjaran, setSelectedTahunAjaran] = useState('')
  const [filterKelas, setFilterKelas] = useState('')
  const [filterSiswa, setFilterSiswa] = useState('')

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

  // Fetch siswa
  useEffect(() => {
    if (!selectedTahunAjaran) return
    let url = `/api/siswa?tahunAjaranId=${selectedTahunAjaran}&limit=500`
    if (filterKelas) url += `&kelasId=${filterKelas}`
    fetch(url)
      .then(res => res.json())
      .then(data => setSiswaList(data.data || []))
  }, [selectedTahunAjaran, filterKelas])

  const fetchData = useCallback(async () => {
    if (!selectedTahunAjaran) return
    setLoading(true)
    try {
      const res = await fetch(`/api/jenis-tagihan?tahunAjaranId=${selectedTahunAjaran}`)
      const json = await res.json()
      setData(json.data || json || [])
    } catch {
      console.error('Error fetching data')
    } finally {
      setLoading(false)
    }
  }, [selectedTahunAjaran])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')

    try {
      const url = editId ? `/api/jenis-tagihan/${editId}` : '/api/jenis-tagihan'
      const method = editId ? 'PUT' : 'POST'
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nama: form.nama,
          kategori: form.kategori.join(','),
          nominal: parseFloat(form.nominal),
          tipeTarget: form.tipeTarget,
          targetKelasIds: form.tipeTarget === 'PER_KELAS' ? form.targetKelasIds : [],
          targetSiswaIds: form.tipeTarget === 'PER_SISWA' ? form.targetSiswaIds : [],
          tahunAjaranId: selectedTahunAjaran
        })
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Gagal menyimpan data')
      }

      setShowModal(false)
      setForm(initialForm)
      setEditId(null)
      fetchData()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleEdit = async (item: JenisTagihan) => {
    setForm({
      nama: item.nama,
      kategori: item.kategori.split(','),
      nominal: item.nominal.toString(),
      tipeTarget: item.tipeTarget,
      targetKelasIds: item.targetKelas?.map(t => t.kelas?.id).filter(Boolean) as string[] || [],
      targetSiswaIds: item.targetSiswa?.map(t => t.siswa?.id).filter(Boolean) as string[] || []
    })
    setEditId(item.id)
    setShowModal(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Yakin ingin menghapus jenis tagihan ini?')) return
    
    try {
      const res = await fetch(`/api/jenis-tagihan?id=${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) {
        alert(data.error || 'Gagal menghapus')
        return
      }
      fetchData()
    } catch {
      console.error('Error deleting')
    }
  }

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const res = await fetch('/api/jenis-tagihan', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, aktif: !currentStatus })
      })
      if (res.ok) {
        fetchData()
      }
    } catch {
      console.error('Error toggling status')
    }
  }

  const getTipeTargetLabel = (tipe: string) => {
    switch (tipe) {
      case 'SEMUA': return 'Semua Siswa'
      case 'PER_KELAS': return 'Per Kelas'
      case 'PER_SISWA': return 'Per Siswa'
      default: return tipe
    }
  }

  // Filter data based on selected filters
  const filteredData = Array.isArray(data) ? data.filter(item => {
    if (filterKelas && item.tipeTarget === 'PER_KELAS') {
      const hasKelas = item.targetKelas?.some(t => kelasList.find(k => k.id === filterKelas)?.nama === t.kelas?.nama)
      if (!hasKelas) return false
    }
    return true
  }) : []

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-white p-4 rounded-xl border border-gray-200">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-600">Tahun Ajaran</label>
            <select
              value={selectedTahunAjaran}
              onChange={(e) => { setSelectedTahunAjaran(e.target.value); setFilterKelas(''); setFilterSiswa('') }}
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
              value={filterKelas}
              onChange={(e) => { setFilterKelas(e.target.value); setFilterSiswa('') }}
              className="px-3 py-2 text-sm border border-gray-300 rounded-lg"
            >
              <option value="">Semua Kelas</option>
              {kelasList.map((k) => (
                <option key={k.id} value={k.id}>{k.nama}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1 min-w-[200px]">
            <label className="text-xs font-medium text-gray-600">Siswa</label>
            <select
              value={filterSiswa}
              onChange={(e) => setFilterSiswa(e.target.value)}
              className="px-3 py-2 text-sm border border-gray-300 rounded-lg"
            >
              <option value="">Semua Siswa</option>
              {siswaList.map((s) => (
                <option key={s.id} value={s.id}>{s.nama} ({s.nipd})</option>
              ))}
            </select>
          </div>

          <div className="flex-1" />

          <Button onClick={() => { setShowModal(true); setForm(initialForm); setEditId(null); }}>
            <Plus className="w-4 h-4 mr-2" />
            Tambah Jenis Tagihan
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Spinner />
            </div>
          ) : filteredData.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              Belum ada jenis tagihan
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama</TableHead>
                  <TableHead>Kategori</TableHead>
                  <TableHead>Target</TableHead>
                  <TableHead className="text-right">Nominal</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.nama}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {item.kategori.split(',').map((kat) => (
                          <Badge key={kat} variant={kat === 'BULANAN' ? 'info' : kat === 'TAHUNAN' ? 'warning' : 'default'}>
                            {kat === 'BULANAN' ? 'Bulanan' : kat === 'TAHUNAN' ? 'Tahunan' : 'Insidental'}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {item.tipeTarget === 'SEMUA' && <Users className="w-4 h-4 text-gray-500" />}
                        {item.tipeTarget === 'PER_KELAS' && <Users className="w-4 h-4 text-blue-500" />}
                        {item.tipeTarget === 'PER_SISWA' && <User className="w-4 h-4 text-green-500" />}
                        <span className="text-sm">{getTipeTargetLabel(item.tipeTarget)}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">{formatCurrency(item.nominal)}</TableCell>
                    <TableCell>
                      <Badge variant={item.aktif ? 'success' : 'danger'}>
                        {item.aktif ? 'Aktif' : 'Nonaktif'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => handleToggleActive(item.id, item.aktif)}
                          title={item.aktif ? 'Nonaktifkan' : 'Aktifkan'}
                        >
                          {item.aktif ? (
                            <ToggleRight className="w-4 h-4 text-green-500" />
                          ) : (
                            <ToggleLeft className="w-4 h-4 text-gray-400" />
                          )}
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(item)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id)}>
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

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold">
                {editId ? 'Edit Jenis Tagihan' : 'Tambah Jenis Tagihan'}
              </h3>
              <button onClick={() => setShowModal(false)}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              <Input
                label="Nama Tagihan"
                placeholder="Contoh: SPP, Seragam, Buku"
                value={form.nama}
                onChange={(e) => setForm({ ...form, nama: e.target.value })}
                required
              />
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Kategori</label>
                  <div className="space-y-2 p-3 border rounded-lg">
                    {[
                      { value: 'BULANAN', label: 'Bulanan (12x/tahun)' },
                      { value: 'TAHUNAN', label: 'Tahunan (1x/tahun)' },
                      { value: 'INSIDENTAL', label: 'Insidental (sekali)' }
                    ].map((opt) => (
                      <label key={opt.value} className="flex items-center gap-2 text-sm cursor-pointer">
                        <input
                          type="checkbox"
                          checked={form.kategori.includes(opt.value)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setForm({ ...form, kategori: [...form.kategori, opt.value] })
                            } else {
                              const newKategori = form.kategori.filter(k => k !== opt.value)
                              setForm({ ...form, kategori: newKategori.length > 0 ? newKategori : [opt.value] })
                            }
                          }}
                          className="rounded text-blue-600"
                        />
                        {opt.label}
                      </label>
                    ))}
                  </div>
                </div>
                <Select
                  label="Target Pembayaran"
                  options={[
                    { value: 'SEMUA', label: 'Semua Siswa' },
                    { value: 'PER_KELAS', label: 'Per Kelas' },
                    { value: 'PER_SISWA', label: 'Per Siswa' }
                  ]}
                  value={form.tipeTarget}
                  onChange={(e) => setForm({ ...form, tipeTarget: e.target.value, targetKelasIds: [], targetSiswaIds: [] })}
                />
              </div>

              {form.tipeTarget === 'PER_KELAS' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Pilih Kelas</label>
                  <div className="grid grid-cols-3 gap-2 max-h-40 overflow-y-auto p-2 border rounded-lg">
                    {kelasList.map(k => (
                      <label key={k.id} className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={form.targetKelasIds.includes(k.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setForm({ ...form, targetKelasIds: [...form.targetKelasIds, k.id] })
                            } else {
                              setForm({ ...form, targetKelasIds: form.targetKelasIds.filter(id => id !== k.id) })
                            }
                          }}
                          className="rounded"
                        />
                        {k.nama}
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {form.tipeTarget === 'PER_SISWA' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Pilih Siswa</label>
                  <div className="max-h-40 overflow-y-auto p-2 border rounded-lg space-y-1">
                    {siswaList.map(s => (
                      <label key={s.id} className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={form.targetSiswaIds.includes(s.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setForm({ ...form, targetSiswaIds: [...form.targetSiswaIds, s.id] })
                            } else {
                              setForm({ ...form, targetSiswaIds: form.targetSiswaIds.filter(id => id !== s.id) })
                            }
                          }}
                          className="rounded"
                        />
                        {s.nama} ({s.nipd})
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <Input
                label="Nominal (Rp)"
                type="number"
                placeholder="150000"
                value={form.nominal}
                onChange={(e) => setForm({ ...form, nominal: e.target.value })}
                required
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
    </div>
  )
}
