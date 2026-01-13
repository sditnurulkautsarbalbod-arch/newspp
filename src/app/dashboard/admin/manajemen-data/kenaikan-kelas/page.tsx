'use client'

import { useState, useEffect } from 'react'
import { ArrowLeft, ArrowUpCircle, CheckCircle, AlertCircle } from 'lucide-react'
import Link from 'next/link'

interface Siswa {
  id: string
  nipd: string
  nama: string
  kelasNama: string
  kelasId: string
  kelas?: { id: string; nama: string; tingkat: number }
}

interface Kelas {
  id: string
  nama: string
  tingkat: number
}

interface TahunAjaran {
  id: string
  nama: string
  aktif: boolean
}

export default function KenaikanKelasPage() {
  const [siswaList, setSiswaList] = useState<Siswa[]>([])
  const [kelasList, setKelasList] = useState<Kelas[]>([])
  const [kelasListTujuan, setKelasListTujuan] = useState<Kelas[]>([])
  const [tahunAjaranList, setTahunAjaranList] = useState<TahunAjaran[]>([])
  const [selectedTahunAjaran, setSelectedTahunAjaran] = useState('')
  const [selectedTahunAjaranTujuan, setSelectedTahunAjaranTujuan] = useState('')
  const [selectedKelas, setSelectedKelas] = useState('')
  const [selectedKelasTujuan, setSelectedKelasTujuan] = useState('')
  const [selectedSiswa, setSelectedSiswa] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [result, setResult] = useState<{ success?: boolean; message?: string } | null>(null)

  const fetchTahunAjaran = async () => {
    const res = await fetch('/api/manajemen/tahun-ajaran')
    const data = await res.json()
    setTahunAjaranList(data)
    const list = Array.isArray(data) ? data : []
    const aktif = list.find((t: TahunAjaran) => t.aktif)
    if (aktif) {
      setSelectedTahunAjaran(aktif.id)
      setSelectedTahunAjaranTujuan(aktif.id)
    }
  }

  const fetchKelas = async (tahunAjaranId: string, setKelas: (k: Kelas[]) => void) => {
    const res = await fetch(`/api/manajemen/kelas?tahunAjaranId=${tahunAjaranId}`)
    const data = await res.json()
    setKelas(Array.isArray(data) ? data : [])
  }

  const fetchSiswa = async () => {
    if (!selectedKelas) {
      setSiswaList([])
      return
    }
    setLoading(true)
    try {
      const res = await fetch(`/api/manajemen/kenaikan-kelas?kelasId=${selectedKelas}`)
      const data = await res.json()
      setSiswaList(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Error:', error)
      setSiswaList([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchTahunAjaran() }, [])
  useEffect(() => { 
    if (selectedTahunAjaran) fetchKelas(selectedTahunAjaran, setKelasList) 
  }, [selectedTahunAjaran])
  useEffect(() => { 
    if (selectedTahunAjaranTujuan) fetchKelas(selectedTahunAjaranTujuan, setKelasListTujuan) 
  }, [selectedTahunAjaranTujuan])
  useEffect(() => { fetchSiswa() }, [selectedKelas])

  const handleSelectAll = () => {
    if (selectedSiswa.length === siswaList.length) {
      setSelectedSiswa([])
    } else {
      setSelectedSiswa(siswaList.map(s => s.id))
    }
  }

  const handleProses = async () => {
    if (selectedSiswa.length === 0) {
      alert('Pilih siswa yang akan dinaikkan')
      return
    }
    if (!selectedKelasTujuan) {
      alert('Pilih kelas tujuan')
      return
    }

    if (!confirm(`Naikkan ${selectedSiswa.length} siswa ke kelas baru?`)) return

    setProcessing(true)
    setResult(null)

    try {
      const res = await fetch('/api/manajemen/kenaikan-kelas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          siswaIds: selectedSiswa,
          kelasIdTujuan: selectedKelasTujuan,
          tahunAjaranIdTujuan: selectedTahunAjaranTujuan,
        }),
      })

      const data = await res.json()
      
      if (res.ok) {
        setResult({ success: true, message: `Berhasil menaikkan ${selectedSiswa.length} siswa` })
        setSelectedSiswa([])
        fetchSiswa()
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
          <h1 className="text-2xl font-bold text-gray-900">Kenaikan Kelas</h1>
          <p className="text-gray-600">Proses kenaikan atau pindah kelas siswa</p>
        </div>
      </div>

      {result && (
        <div className={`p-4 rounded-lg flex items-center gap-3 ${result.success ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
          {result.success ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          {result.message}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Kelas Asal */}
        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <h3 className="font-semibold text-gray-900 mb-4">Kelas Asal</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tahun Ajaran</label>
              <select
                value={selectedTahunAjaran}
                onChange={(e) => { setSelectedTahunAjaran(e.target.value); setSelectedKelas('') }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="">Pilih Tahun Ajaran</option>
                {tahunAjaranList.map((ta) => (
                  <option key={ta.id} value={ta.id}>{ta.nama} {ta.aktif && '(Aktif)'}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Kelas</label>
              <select
                value={selectedKelas}
                onChange={(e) => setSelectedKelas(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="">Pilih Kelas</option>
                {kelasList.map((k) => (
                  <option key={k.id} value={k.id}>{k.nama}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Kelas Tujuan */}
        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <h3 className="font-semibold text-gray-900 mb-4">Kelas Tujuan</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tahun Ajaran</label>
              <select
                value={selectedTahunAjaranTujuan}
                onChange={(e) => { setSelectedTahunAjaranTujuan(e.target.value); setSelectedKelasTujuan('') }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="">Pilih Tahun Ajaran</option>
                {tahunAjaranList.map((ta) => (
                  <option key={ta.id} value={ta.id}>{ta.nama} {ta.aktif && '(Aktif)'}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Kelas</label>
              <select
                value={selectedKelasTujuan}
                onChange={(e) => setSelectedKelasTujuan(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="">Pilih Kelas Tujuan</option>
                {kelasListTujuan.map((k) => (
                  <option key={k.id} value={k.id}>{k.nama}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Daftar Siswa */}
      <div className="bg-white p-6 rounded-xl border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900">Daftar Siswa</h3>
          <button
            onClick={handleProses}
            disabled={processing || selectedSiswa.length === 0 || !selectedKelasTujuan}
            className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50"
          >
            <ArrowUpCircle className="w-4 h-4" />
            {processing ? 'Memproses...' : `Naikkan (${selectedSiswa.length})`}
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedSiswa.length === siswaList.length && siswaList.length > 0}
                    onChange={handleSelectAll}
                    className="w-4 h-4 rounded border-gray-300"
                  />
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">NIPD</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nama</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Kelas Saat Ini</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-500">Loading...</td></tr>
              ) : siswaList.length === 0 ? (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-500">Pilih kelas untuk melihat siswa</td></tr>
              ) : (
                siswaList.map((siswa) => (
                  <tr key={siswa.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedSiswa.includes(siswa.id)}
                        onChange={() => setSelectedSiswa(prev => 
                          prev.includes(siswa.id) ? prev.filter(s => s !== siswa.id) : [...prev, siswa.id]
                        )}
                        className="w-4 h-4 rounded border-gray-300"
                      />
                    </td>
                    <td className="px-4 py-3 font-mono text-sm">{siswa.nipd}</td>
                    <td className="px-4 py-3 font-medium">{siswa.nama}</td>
                    <td className="px-4 py-3 text-gray-600">{siswa.kelas?.nama || siswa.kelasNama}</td>
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
