'use client'

import { useState, useEffect } from 'react'
import { ArrowLeft, UserMinus, CheckCircle, AlertCircle } from 'lucide-react'
import Link from 'next/link'

interface Siswa {
  id: string
  nipd: string
  nama: string
  kelasNama: string
}

interface TahunAjaran {
  id: string
  nama: string
  aktif: boolean
}

interface Kelas {
  id: string
  nama: string
}

export default function SiswaPindahKeluarPage() {
  const [siswaList, setSiswaList] = useState<Siswa[]>([])
  const [tahunAjaranList, setTahunAjaranList] = useState<TahunAjaran[]>([])
  const [kelasList, setKelasList] = useState<Kelas[]>([])
  const [selectedTahunAjaran, setSelectedTahunAjaran] = useState('')
  const [selectedKelas, setSelectedKelas] = useState('')
  const [selectedSiswaFilter, setSelectedSiswaFilter] = useState('')
  const [selectedSiswa, setSelectedSiswa] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [result, setResult] = useState<{ success?: boolean; message?: string } | null>(null)
  
  // Form
  const [tipeKeluar, setTipeKeluar] = useState<'PINDAH' | 'KELUAR'>('PINDAH')
  const [alasan, setAlasan] = useState('')
  const [tanggalKeluar, setTanggalKeluar] = useState(new Date().toISOString().split('T')[0])

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

  // Fetch kelas
  useEffect(() => {
    if (!selectedTahunAjaran) return
    fetch(`/api/manajemen/kelas?tahunAjaranId=${selectedTahunAjaran}`)
      .then(res => res.json())
      .then(data => setKelasList(Array.isArray(data) ? data : []))
  }, [selectedTahunAjaran])

  // Fetch siswa
  useEffect(() => {
    if (!selectedTahunAjaran) return
    setLoading(true)
    let url = `/api/siswa?tahunAjaranId=${selectedTahunAjaran}&limit=500`
    if (selectedKelas) url += `&kelasId=${selectedKelas}`
    
    fetch(url)
      .then(res => res.json())
      .then(data => {
        setSiswaList(data.data || [])
        setSelectedSiswa([])
      })
      .finally(() => setLoading(false))
  }, [selectedTahunAjaran, selectedKelas])

  // Filter siswa by dropdown selection
  const filteredSiswa = selectedSiswaFilter 
    ? siswaList.filter(s => s.id === selectedSiswaFilter)
    : siswaList

  const handleSelectAll = () => {
    if (selectedSiswa.length === filteredSiswa.length) {
      setSelectedSiswa([])
    } else {
      setSelectedSiswa(filteredSiswa.map(s => s.id))
    }
  }

  const handleToggleSiswa = (id: string) => {
    setSelectedSiswa(prev => 
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    )
  }

  const handleProses = async () => {
    if (selectedSiswa.length === 0) {
      alert('Pilih siswa yang akan diproses')
      return
    }

    if (!confirm(`Yakin ingin memproses ${selectedSiswa.length} siswa sebagai ${tipeKeluar}?`)) return

    setProcessing(true)
    setResult(null)

    try {
      const res = await fetch('/api/siswa/pindah-keluar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          siswaIds: selectedSiswa,
          tipeKeluar,
          alasan,
          tanggalKeluar,
        }),
      })

      const data = await res.json()
      
      if (res.ok) {
        setResult({ success: true, message: data.message || `Berhasil memproses ${selectedSiswa.length} siswa` })
        setSelectedSiswa([])
        // Refresh siswa list
        const refreshRes = await fetch(`/api/siswa?tahunAjaranId=${selectedTahunAjaran}&limit=500${selectedKelas ? `&kelasId=${selectedKelas}` : ''}`)
        const refreshData = await refreshRes.json()
        setSiswaList(refreshData.data || [])
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
          <h1 className="text-2xl font-bold text-gray-900">Siswa Pindah / Keluar</h1>
          <p className="text-gray-600">Proses siswa yang pindah sekolah atau keluar</p>
        </div>
      </div>

      {result && (
        <div className={`p-4 rounded-lg ${result.success ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
          <div className="flex items-center gap-3">
            {result.success ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
            {result.message}
          </div>
          {result.success && (
            <div className="mt-3 pt-3 border-t border-green-200">
              <Link 
                href="/dashboard/admin/manajemen-data/histori-pindah"
                className="inline-flex items-center gap-2 text-sm font-medium text-green-700 hover:text-green-900"
              >
                Lihat di Histori Pindah →
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Tahun Ajaran</label>
            <select
              value={selectedTahunAjaran}
              onChange={(e) => { 
                setSelectedTahunAjaran(e.target.value)
                setSelectedKelas('')
                setSelectedSiswaFilter('')
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              {tahunAjaranList.map((ta) => (
                <option key={ta.id} value={ta.id}>{ta.nama} {ta.aktif && '(Aktif)'}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Kelas</label>
            <select
              value={selectedKelas}
              onChange={(e) => { 
                setSelectedKelas(e.target.value)
                setSelectedSiswaFilter('')
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              <option value="">Semua Kelas</option>
              {kelasList.map((k) => (
                <option key={k.id} value={k.id}>{k.nama}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Nama Siswa</label>
            <select
              value={selectedSiswaFilter}
              onChange={(e) => setSelectedSiswaFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              <option value="">Semua Siswa</option>
              {siswaList.map((s) => (
                <option key={s.id} value={s.id}>{s.nama} ({s.nipd})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Tipe</label>
            <select
              value={tipeKeluar}
              onChange={(e) => setTipeKeluar(e.target.value as 'PINDAH' | 'KELUAR')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              <option value="PINDAH">Pindah Sekolah</option>
              <option value="KELUAR">Keluar / Mengundurkan Diri</option>
            </select>
          </div>
        </div>
      </div>

      {/* Form Details */}
      <div className="bg-white p-4 rounded-xl border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal Keluar</label>
            <input
              type="date"
              value={tanggalKeluar}
              onChange={(e) => setTanggalKeluar(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Alasan</label>
            <input
              type="text"
              value={alasan}
              onChange={(e) => setAlasan(e.target.value)}
              placeholder="Contoh: Pindah ke Jakarta"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>
        </div>
      </div>

      {/* Siswa Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="p-4 border-b flex items-center justify-between">
          <h3 className="font-medium">Pilih Siswa ({selectedSiswa.length} dipilih)</h3>
          <button
            onClick={handleProses}
            disabled={processing || selectedSiswa.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
          >
            <UserMinus className="w-4 h-4" />
            {processing ? 'Memproses...' : `Proses ${tipeKeluar}`}
          </button>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedSiswa.length === filteredSiswa.length && filteredSiswa.length > 0}
                    onChange={handleSelectAll}
                    className="w-4 h-4 rounded border-gray-300"
                  />
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">NIPD</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nama Siswa</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Kelas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-500">Loading...</td></tr>
              ) : filteredSiswa.length === 0 ? (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-500">Tidak ada siswa aktif</td></tr>
              ) : (
                filteredSiswa.map((siswa) => (
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
                    <td className="px-4 py-3 text-gray-600">{siswa.kelasNama}</td>
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
