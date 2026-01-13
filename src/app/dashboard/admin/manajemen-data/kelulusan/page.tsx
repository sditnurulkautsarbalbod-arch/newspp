'use client'

import { useState, useEffect } from 'react'
import { ArrowLeft, GraduationCap, CheckCircle, AlertCircle, Undo2, Users } from 'lucide-react'
import Link from 'next/link'

interface Siswa {
  id: string
  nipd: string
  nama: string
  kelasNama: string
  kelas?: { nama: string; tingkat: number }
  tanggalLulus?: string
}

interface TahunAjaran {
  id: string
  nama: string
  aktif: boolean
}

type TabType = 'calon' | 'lulus'

export default function KelulusanPage() {
  const [activeTab, setActiveTab] = useState<TabType>('calon')
  const [siswaKelas6, setSiswaKelas6] = useState<Siswa[]>([])
  const [siswaLulus, setSiswaLulus] = useState<Siswa[]>([])
  const [tahunAjaranList, setTahunAjaranList] = useState<TahunAjaran[]>([])
  const [selectedTahunAjaran, setSelectedTahunAjaran] = useState('')
  const [selectedSiswa, setSelectedSiswa] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [result, setResult] = useState<{ success?: boolean; message?: string } | null>(null)

  const fetchData = async () => {
    if (!selectedTahunAjaran) return
    
    setLoading(true)
    try {
      if (activeTab === 'calon') {
        const res = await fetch(`/api/manajemen/kelulusan?tahunAjaranId=${selectedTahunAjaran}&type=calon`)
        const data = await res.json()
        setSiswaKelas6(Array.isArray(data) ? data : [])
      } else {
        const res = await fetch(`/api/manajemen/kelulusan?tahunAjaranId=${selectedTahunAjaran}&type=lulus`)
        const data = await res.json()
        setSiswaLulus(Array.isArray(data) ? data : [])
      }
    } catch (error) {
      console.error('Error:', error)
      if (activeTab === 'calon') setSiswaKelas6([])
      else setSiswaLulus([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { 
    if (selectedTahunAjaran) {
      setSelectedSiswa([])
      fetchData()
    }
  }, [selectedTahunAjaran, activeTab])

  useEffect(() => {
    fetch('/api/manajemen/tahun-ajaran').then(res => res.json()).then(data => {
      setTahunAjaranList(data)
      const aktif = data.find((t: TahunAjaran) => t.aktif)
      setSelectedTahunAjaran(aktif?.id || data[0]?.id || '')
    })
  }, [])

  const currentList = activeTab === 'calon' ? siswaKelas6 : siswaLulus

  const handleSelectAll = () => {
    if (selectedSiswa.length === currentList.length) {
      setSelectedSiswa([])
    } else {
      setSelectedSiswa(currentList.map(s => s.id))
    }
  }

  const handleToggleSiswa = (id: string) => {
    setSelectedSiswa(prev => 
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    )
  }

  const handleProses = async () => {
    if (selectedSiswa.length === 0) {
      alert(activeTab === 'calon' ? 'Pilih siswa yang akan diluluskan' : 'Pilih siswa yang akan dibatalkan kelulusannya')
      return
    }

    const confirmMsg = activeTab === 'calon' 
      ? `Yakin ingin meluluskan ${selectedSiswa.length} siswa?`
      : `Yakin ingin membatalkan kelulusan ${selectedSiswa.length} siswa? Siswa akan dikembalikan ke kelas sebelumnya.`
    
    if (!confirm(confirmMsg)) return

    setProcessing(true)
    setResult(null)

    try {
      const res = await fetch('/api/manajemen/kelulusan', {
        method: activeTab === 'calon' ? 'POST' : 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          siswaIds: selectedSiswa,
          tahunAjaranId: selectedTahunAjaran,
        }),
      })

      const data = await res.json()
      
      if (res.ok) {
        const msg = activeTab === 'calon' 
          ? `Berhasil meluluskan ${selectedSiswa.length} siswa`
          : `Berhasil membatalkan kelulusan ${selectedSiswa.length} siswa`
        setResult({ success: true, message: msg })
        setSelectedSiswa([])
        fetchData()
      } else {
        setResult({ success: false, message: data.error || 'Gagal memproses' })
      }
    } catch (error) {
      setResult({ success: false, message: 'Terjadi kesalahan' })
    } finally {
      setProcessing(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/admin/manajemen-data" className="p-2 hover:bg-gray-100 rounded-lg">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Kelulusan Siswa</h1>
          <p className="text-gray-600">Proses kelulusan dan pembatalan kelulusan siswa</p>
        </div>
      </div>

      {result && (
        <div className={`p-4 rounded-lg flex items-center gap-3 ${result.success ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
          {result.success ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          {result.message}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('calon')}
          className={`flex items-center gap-2 px-4 py-3 font-medium border-b-2 transition-colors ${
            activeTab === 'calon' 
              ? 'border-purple-600 text-purple-600' 
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Users className="w-4 h-4" />
          Calon Lulusan
        </button>
        <button
          onClick={() => setActiveTab('lulus')}
          className={`flex items-center gap-2 px-4 py-3 font-medium border-b-2 transition-colors ${
            activeTab === 'lulus' 
              ? 'border-orange-600 text-orange-600' 
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <GraduationCap className="w-4 h-4" />
          Sudah Lulus
        </button>
      </div>

      <div className="bg-white p-6 rounded-xl border border-gray-200">
        <div className="flex flex-wrap gap-4 items-center justify-between mb-6">
          <div className="flex gap-4 items-center">
            <label className="text-sm font-medium text-gray-700">Tahun Ajaran:</label>
            <select
              value={selectedTahunAjaran}
              onChange={(e) => setSelectedTahunAjaran(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg"
            >
              {tahunAjaranList.map((ta) => (
                <option key={ta.id} value={ta.id}>{ta.nama} {ta.aktif && '(Aktif)'}</option>
              ))}
            </select>
          </div>
          
          {activeTab === 'calon' ? (
            <button
              onClick={handleProses}
              disabled={processing || selectedSiswa.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
            >
              <GraduationCap className="w-4 h-4" />
              {processing ? 'Memproses...' : `Luluskan (${selectedSiswa.length})`}
            </button>
          ) : (
            <button
              onClick={handleProses}
              disabled={processing || selectedSiswa.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50"
            >
              <Undo2 className="w-4 h-4" />
              {processing ? 'Memproses...' : `Batalkan Kelulusan (${selectedSiswa.length})`}
            </button>
          )}
        </div>

        {activeTab === 'lulus' && (
          <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
            <p className="text-sm text-orange-800">
              <strong>Perhatian:</strong> Membatalkan kelulusan akan mengembalikan siswa ke kelas sebelumnya dan mengaktifkan kembali status siswa.
            </p>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedSiswa.length === currentList.length && currentList.length > 0}
                    onChange={handleSelectAll}
                    className="w-4 h-4 rounded border-gray-300"
                  />
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">NIPD</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nama Siswa</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Kelas</th>
                {activeTab === 'lulus' && (
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tanggal Lulus</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr><td colSpan={activeTab === 'lulus' ? 5 : 4} className="px-4 py-8 text-center text-gray-500">Loading...</td></tr>
              ) : currentList.length === 0 ? (
                <tr>
                  <td colSpan={activeTab === 'lulus' ? 5 : 4} className="px-4 py-8 text-center text-gray-500">
                    {activeTab === 'calon' ? 'Tidak ada siswa kelas 6' : 'Tidak ada siswa yang sudah lulus'}
                  </td>
                </tr>
              ) : (
                currentList.map((siswa) => (
                  <tr key={siswa.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedSiswa.includes(siswa.id)}
                        onChange={() => handleToggleSiswa(siswa.id)}
                        className="w-4 h-4 rounded border-gray-300"
                      />
                    </td>
                    <td className="px-4 py-3 font-mono text-sm">{siswa.nipd}</td>
                    <td className="px-4 py-3 font-medium">{siswa.nama}</td>
                    <td className="px-4 py-3 text-gray-600">{siswa.kelas?.nama || siswa.kelasNama}</td>
                    {activeTab === 'lulus' && (
                      <td className="px-4 py-3 text-gray-600">
                        {siswa.tanggalLulus ? new Date(siswa.tanggalLulus).toLocaleDateString('id-ID') : '-'}
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
