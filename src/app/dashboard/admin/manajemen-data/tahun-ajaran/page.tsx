'use client'

import { useState, useEffect } from 'react'
import { Plus, Edit, Trash2, Check, X, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

interface TahunAjaran {
  id: string
  nama: string
  tahunMulai: number
  tahunSelesai: number
  aktif: boolean
  _count?: { siswa: number; tagihan: number }
}

export default function TahunAjaranPage() {
  const [data, setData] = useState<TahunAjaran[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState({ nama: '', tahunMulai: '', tahunSelesai: '' })

  const fetchData = async () => {
    try {
      const res = await fetch('/api/manajemen/tahun-ajaran')
      const json = await res.json()
      setData(json)
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const url = editId 
        ? `/api/manajemen/tahun-ajaran/${editId}` 
        : '/api/manajemen/tahun-ajaran'
      const method = editId ? 'PUT' : 'POST'
      
      await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nama: form.nama,
          tahunMulai: parseInt(form.tahunMulai),
          tahunSelesai: parseInt(form.tahunSelesai),
        }),
      })
      
      setShowForm(false)
      setEditId(null)
      setForm({ nama: '', tahunMulai: '', tahunSelesai: '' })
      fetchData()
    } catch (error) {
      console.error('Error saving:', error)
    }
  }

  const handleSetAktif = async (id: string) => {
    try {
      await fetch(`/api/manajemen/tahun-ajaran/${id}/set-aktif`, { method: 'POST' })
      fetchData()
    } catch (error) {
      console.error('Error setting aktif:', error)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Yakin ingin menghapus tahun ajaran ini?')) return
    try {
      await fetch(`/api/manajemen/tahun-ajaran/${id}`, { method: 'DELETE' })
      fetchData()
    } catch (error) {
      console.error('Error deleting:', error)
    }
  }

  const handleEdit = (item: TahunAjaran) => {
    setEditId(item.id)
    setForm({
      nama: item.nama,
      tahunMulai: item.tahunMulai.toString(),
      tahunSelesai: item.tahunSelesai.toString(),
    })
    setShowForm(true)
  }

  const currentYear = new Date().getFullYear()

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/admin/manajemen-data" className="p-2 hover:bg-gray-100 rounded-lg">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tahun Ajaran</h1>
          <p className="text-gray-600">Kelola tahun ajaran sekolah</p>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={() => {
            setShowForm(true)
            setEditId(null)
            setForm({
              nama: `${currentYear}/${currentYear + 1}`,
              tahunMulai: currentYear.toString(),
              tahunSelesai: (currentYear + 1).toString(),
            })
          }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" />
          Tambah Tahun Ajaran
        </button>
      </div>

      {showForm && (
        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <h3 className="font-semibold mb-4">{editId ? 'Edit' : 'Tambah'} Tahun Ajaran</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nama</label>
                <input
                  type="text"
                  value={form.nama}
                  onChange={(e) => setForm({ ...form, nama: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="2024/2025"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tahun Mulai</label>
                <input
                  type="number"
                  value={form.tahunMulai}
                  onChange={(e) => setForm({ ...form, tahunMulai: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tahun Selesai</label>
                <input
                  type="number"
                  value={form.tahunSelesai}
                  onChange={(e) => setForm({ ...form, tahunSelesai: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                Simpan
              </button>
              <button
                type="button"
                onClick={() => { setShowForm(false); setEditId(null) }}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                Batal
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nama</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Periode</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Siswa</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {loading ? (
              <tr><td colSpan={5} className="px-6 py-4 text-center text-gray-500">Loading...</td></tr>
            ) : data.length === 0 ? (
              <tr><td colSpan={5} className="px-6 py-4 text-center text-gray-500">Tidak ada data</td></tr>
            ) : (
              data.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium">{item.nama}</td>
                  <td className="px-6 py-4 text-gray-600">{item.tahunMulai} - {item.tahunSelesai}</td>
                  <td className="px-6 py-4 text-gray-600">{item._count?.siswa || 0} siswa</td>
                  <td className="px-6 py-4">
                    {item.aktif ? (
                      <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">Aktif</span>
                    ) : (
                      <button
                        onClick={() => handleSetAktif(item.id)}
                        className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-600 rounded-full hover:bg-blue-100 hover:text-blue-700"
                      >
                        Set Aktif
                      </button>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      <button onClick={() => handleEdit(item)} className="p-1 text-blue-600 hover:bg-blue-50 rounded">
                        <Edit className="w-4 h-4" />
                      </button>
                      {!item.aktif && (
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
