'use client'

import { useState, useEffect } from 'react'
import { Plus, Edit, Trash2, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

interface Kelas {
  id: string
  nama: string
  tingkat: number
  tahunAjaranId: string
  tahunAjaran: { nama: string }
  aktif: boolean
  _count?: { siswa: number }
}

interface TahunAjaran {
  id: string
  nama: string
  aktif: boolean
}

export default function KelasPage() {
  const [data, setData] = useState<Kelas[]>([])
  const [tahunAjaranList, setTahunAjaranList] = useState<TahunAjaran[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [selectedTahunAjaran, setSelectedTahunAjaran] = useState('')
  const [form, setForm] = useState({ nama: '', tingkat: '1', tahunAjaranId: '' })

  const fetchData = async () => {
    try {
      const [kelasRes, taRes] = await Promise.all([
        fetch(`/api/manajemen/kelas${selectedTahunAjaran ? `?tahunAjaranId=${selectedTahunAjaran}` : ''}`),
        fetch('/api/manajemen/tahun-ajaran')
      ])
      const [kelasData, taData] = await Promise.all([kelasRes.json(), taRes.json()])
      setData(Array.isArray(kelasData) ? kelasData : [])
      setTahunAjaranList(Array.isArray(taData) ? taData : [])
      
      if (!selectedTahunAjaran && Array.isArray(taData) && taData.length > 0) {
        const aktif = taData.find((t: TahunAjaran) => t.aktif)
        setSelectedTahunAjaran(aktif?.id || taData[0].id)
      }
    } catch (error) {
      console.error('Error:', error)
      setData([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [selectedTahunAjaran])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const url = editId ? `/api/manajemen/kelas/${editId}` : '/api/manajemen/kelas'
      const method = editId ? 'PUT' : 'POST'
      
      await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nama: form.nama,
          tingkat: parseInt(form.tingkat),
          tahunAjaranId: form.tahunAjaranId || selectedTahunAjaran,
        }),
      })
      
      setShowForm(false)
      setEditId(null)
      setForm({ nama: '', tingkat: '1', tahunAjaranId: '' })
      fetchData()
    } catch (error) {
      console.error('Error saving:', error)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Yakin ingin menghapus kelas ini?')) return
    try {
      await fetch(`/api/manajemen/kelas/${id}`, { method: 'DELETE' })
      fetchData()
    } catch (error) {
      console.error('Error:', error)
    }
  }

  const handleEdit = (item: Kelas) => {
    setEditId(item.id)
    setForm({
      nama: item.nama,
      tingkat: item.tingkat.toString(),
      tahunAjaranId: item.tahunAjaranId,
    })
    setShowForm(true)
  }

  const generateKelas = async () => {
    if (!confirm('Generate kelas 1A-6D (24 kelas) untuk tahun ajaran ini?')) return
    try {
      const res = await fetch('/api/manajemen/kelas/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tahunAjaranId: selectedTahunAjaran }),
      })
      const data = await res.json()
      if (data.success) {
        alert(`${data.count} kelas berhasil digenerate!`)
      }
      fetchData()
    } catch (error) {
      console.error('Error:', error)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/admin/manajemen-data" className="p-2 hover:bg-gray-100 rounded-lg">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Kelas</h1>
          <p className="text-gray-600">Kelola data kelas per tahun ajaran</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-4 items-center justify-between">
        <div className="flex gap-4 items-center">
          <select
            value={selectedTahunAjaran}
            onChange={(e) => setSelectedTahunAjaran(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            {tahunAjaranList.map((ta) => (
              <option key={ta.id} value={ta.id}>{ta.nama} {ta.aktif && '(Aktif)'}</option>
            ))}
          </select>
        </div>
        <div className="flex gap-2">
          <button
            onClick={generateKelas}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            Generate Kelas 1A-6D
          </button>
          <button
            onClick={() => {
              setShowForm(true)
              setEditId(null)
              setForm({ nama: '', tingkat: '1', tahunAjaranId: selectedTahunAjaran })
            }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
            Tambah Kelas
          </button>
        </div>
      </div>

      {showForm && (
        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <h3 className="font-semibold mb-4">{editId ? 'Edit' : 'Tambah'} Kelas</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nama Kelas</label>
                <input
                  type="text"
                  value={form.nama}
                  onChange={(e) => setForm({ ...form, nama: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="1A"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tingkat</label>
                <select
                  value={form.tingkat}
                  onChange={(e) => setForm({ ...form, tingkat: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  {[1,2,3,4,5,6].map(t => <option key={t} value={t}>Kelas {t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tahun Ajaran</label>
                <select
                  value={form.tahunAjaranId || selectedTahunAjaran}
                  onChange={(e) => setForm({ ...form, tahunAjaranId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg disabled:bg-gray-100"
                  disabled={!!editId}
                >
                  {tahunAjaranList.map((ta) => (
                    <option key={ta.id} value={ta.id}>{ta.nama}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-2">
              <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Simpan</button>
              <button type="button" onClick={() => { setShowForm(false); setEditId(null) }} className="px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200">Batal</button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nama Kelas</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tingkat</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Jumlah Siswa</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {loading ? (
              <tr><td colSpan={4} className="px-6 py-4 text-center text-gray-500">Loading...</td></tr>
            ) : data.length === 0 ? (
              <tr><td colSpan={4} className="px-6 py-4 text-center text-gray-500">Tidak ada data</td></tr>
            ) : (
              data.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium">{item.nama}</td>
                  <td className="px-6 py-4 text-gray-600">Kelas {item.tingkat}</td>
                  <td className="px-6 py-4 text-gray-600">{item._count?.siswa || 0} siswa</td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      <button onClick={() => handleEdit(item)} className="p-1 text-blue-600 hover:bg-blue-50 rounded">
                        <Edit className="w-4 h-4" />
                      </button>
                      {(item._count?.siswa || 0) === 0 && (
                        <button onClick={() => handleDelete(item.id)} className="p-1 text-red-600 hover:bg-red-50 rounded">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
