'use client'

import { useState, useEffect } from 'react'
import { ArrowLeft, GraduationCap, CheckCircle, AlertCircle } from 'lucide-react'
import Link from 'next/link'

interface Siswa {
  id: string
  nipd: string
  nama: string
  kelasNama: string
  kelas?: { nama: string; tingkat: number }
}

interface TahunAjaran {
  id: string
  nama: string
  aktif: boolean
}

export default function KelulusanPage() {
  const [siswaKelas6, setSiswaKelas6] = useState<Siswa[]>([])
  const [tahunAjaranList, setTahunAjaranList] = useState<TahunAjaran[]>([])
  const [selectedTahunAjaran, setSelectedTahunAjaran] = useState('')
  const [selectedSiswa, setSelectedSiswa] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [result, setResult] = useState<{ success?: boolean; message?: string } | null>(null)

  const fetchData = async () => {
    try {
      const [siswaRes, taRes] = await Promise.all([
        fetch(`/api/manajemen/kelulusan?tahunAjaranId=${selectedTahunAjaran}`),
        fetch('/api/manajemen/tahun-ajaran')
      ])
      const [siswaData, taData] = await Promise.all([siswaRes.json(), taRes.json()])
      
      setSiswaKelas6(Array.isArray(siswaData) ? siswaData : [])
      setTahunAjaranList(Array.isArray(taData) ? taData : [])
      
      if (!selectedTahunAjaran && Array.isArray(taData) && taData.length > 0) {
        const aktif = taData.find((t: TahunAjaran) => t.aktif)
        setSelectedTahunAjaran(aktif?.id || taData[0].id)
      }
    } catch (error) {
      console.error('Error:', error)
      setSiswaKelas6([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { 
    if (selectedTahunAjaran) fetchData() 
  }, [selectedTahunAjaran])

  useEffect(() => {
    fetch('/api/manajemen/tahun-ajaran').then(res => res.json()).then(data => {
      setTahunAjaranList(data)
      const aktif = data.find((t: TahunAjaran) => t.aktif)
      setSelectedTahunAjaran(aktif?.id || data[0]?.id || '')
    })
  }, [])

  const handleSelectAll = () => {
    if (selectedSiswa.length === siswaKelas6.length) {
      setSelectedSiswa([])
    } else {
      setSelectedSiswa(siswaKelas6.map(s => s.id))
    }
  }

  const handleToggleSiswa = (id: string) => {
    setSelectedSiswa(prev => 
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    )
  }

  const handleProses = async () => {
    if (selectedSiswa.length === 0) {
      alert('Pilih siswa yang akan diluluskan')
      return
    }

    if (!confirm(`Yakin ingin meluluskan ${selectedSiswa.length} siswa?`)) return

    setProcessing(true)
    setResult(null)

    try {
      const res = await fetch('/api/manajemen/kelulusan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          siswaIds: selectedSiswa,
          tahunAjaranId: selectedTahunAjaran,
        }),
      })

      const data = await res.json()
      
      if (res.ok) {
        setResult({ success: true, message: `Berhasil meluluskan ${selectedSiswa.length} siswa` })
        setSelectedSiswa([])
        fetchData()
      } else {
        setResult({ success: false, message: data.error || 'Gagal memproses kelulusan' })
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
          <p className="text-gray-600">Proses kelulusan siswa kelas 6</p>
        </div>
      </div>

      {result && (
        <div className={`p-4 rounded-lg flex items-center gap-3 ${result.success ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
          {result.success ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          {result.message}
        </div>
      )}

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
          <button
            onClick={handleProses}
            disabled={processing || selectedSiswa.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
          >
            <GraduationCap className="w-4 h-4" />
            {processing ? 'Memproses...' : `Luluskan (${selectedSiswa.length})`}
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedSiswa.length === siswaKelas6.length && siswaKelas6.length > 0}
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
              ) : siswaKelas6.length === 0 ? (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-500">Tidak ada siswa kelas 6</td></tr>
              ) : (
                siswaKelas6.map((siswa) => (
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
