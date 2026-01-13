'use client'

import { useState, useEffect } from 'react'
import { ArrowLeft, History, Search, User, Calendar, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { formatDate } from '@/lib/utils'

interface TahunAjaran { id: string; nama: string; aktif: boolean }
interface Siswa { id: string; nama: string; nipd: string; kelasNama: string; status: string }

interface HistoriItem {
  id: string
  tipeAksi: string
  kelasNama: string
  keterangan: string | null
  tanggalAksi: string
  tahunAjaran: { nama: string }
  siswa: { nama: string; nipd: string }
}

const TIPE_AKSI_LABELS: Record<string, { label: string; color: string }> = {
  MASUK_BARU: { label: 'Siswa Baru', color: 'bg-green-100 text-green-800' },
  NAIK_KELAS: { label: 'Naik Kelas', color: 'bg-blue-100 text-blue-800' },
  PINDAH_KELAS: { label: 'Pindah Kelas', color: 'bg-yellow-100 text-yellow-800' },
  TINGGAL_KELAS: { label: 'Tinggal Kelas', color: 'bg-orange-100 text-orange-800' },
  PINDAH_MASUK: { label: 'Pindah Masuk', color: 'bg-teal-100 text-teal-800' },
  PINDAH_KELUAR: { label: 'Pindah Keluar', color: 'bg-red-100 text-red-800' },
  KELUAR: { label: 'Keluar', color: 'bg-red-100 text-red-800' },
  LULUS: { label: 'Lulus', color: 'bg-purple-100 text-purple-800' },
}

export default function HistoriSiswaPage() {
  const [histori, setHistori] = useState<HistoriItem[]>([])
  const [siswaList, setSiswaList] = useState<Siswa[]>([])
  const [tahunAjaranList, setTahunAjaranList] = useState<TahunAjaran[]>([])
  const [selectedTahunAjaran, setSelectedTahunAjaran] = useState('')
  const [selectedSiswa, setSelectedSiswa] = useState('')
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    fetch('/api/manajemen/tahun-ajaran')
      .then(res => res.json())
      .then(data => {
        const list = Array.isArray(data) ? data : []
        setTahunAjaranList(list)
      })
  }, [])

  useEffect(() => {
    let url = '/api/siswa?limit=500&status=all'
    if (selectedTahunAjaran) url += `&tahunAjaranId=${selectedTahunAjaran}`
    fetch(url)
      .then(res => res.json())
      .then(data => setSiswaList(data.data || []))
  }, [selectedTahunAjaran])

  useEffect(() => {
    setLoading(true)
    let url = '/api/siswa/histori?'
    if (selectedTahunAjaran) url += `tahunAjaranId=${selectedTahunAjaran}&`
    if (selectedSiswa) url += `siswaId=${selectedSiswa}&`

    fetch(url)
      .then(res => res.json())
      .then(data => setHistori(data.data || []))
      .finally(() => setLoading(false))
  }, [selectedTahunAjaran, selectedSiswa])

  const filteredHistori = histori.filter(h => 
    h.siswa.nama.toLowerCase().includes(search.toLowerCase()) ||
    h.siswa.nipd.includes(search)
  )

  // Group by siswa for timeline view
  const groupedBySiswa = filteredHistori.reduce((acc, h) => {
    const key = h.siswa.nipd
    if (!acc[key]) {
      acc[key] = { siswa: h.siswa, items: [] }
    }
    acc[key].items.push(h)
    return acc
  }, {} as Record<string, { siswa: { nama: string; nipd: string }; items: HistoriItem[] }>)

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/admin/manajemen-data" className="p-2 hover:bg-gray-100 rounded-lg">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Histori Siswa</h1>
          <p className="text-gray-600">Riwayat perjalanan siswa di sekolah</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl border border-gray-200">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-600">Tahun Ajaran</label>
            <select
              value={selectedTahunAjaran}
              onChange={(e) => { setSelectedTahunAjaran(e.target.value); setSelectedSiswa('') }}
              className="px-3 py-2 text-sm border border-gray-300 rounded-lg"
            >
              <option value="">Semua Tahun Ajaran</option>
              {tahunAjaranList.map((ta) => (
                <option key={ta.id} value={ta.id}>{ta.nama} {ta.aktif && '(Aktif)'}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1 min-w-[200px]">
            <label className="text-xs font-medium text-gray-600">Siswa</label>
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

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama/NIPD..."
              className="pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading...</div>
      ) : Object.keys(groupedBySiswa).length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <History className="w-12 h-12 mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500">Belum ada histori siswa</p>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(groupedBySiswa).map(([nipd, { siswa, items }]) => (
            <div key={nipd} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="bg-gray-50 px-6 py-4 border-b flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-full">
                  <User className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{siswa.nama}</h3>
                  <p className="text-sm text-gray-500">NIPD: {siswa.nipd}</p>
                </div>
              </div>
              
              <div className="p-6">
                <div className="relative">
                  {/* Timeline line */}
                  <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200" />
                  
                  <div className="space-y-6">
                    {items.map((item, idx) => (
                      <div key={item.id} className="relative flex gap-4">
                        {/* Timeline dot */}
                        <div className="relative z-10 w-8 h-8 rounded-full bg-white border-2 border-gray-300 flex items-center justify-center">
                          <div className="w-3 h-3 rounded-full bg-blue-500" />
                        </div>
                        
                        {/* Content */}
                        <div className="flex-1 pb-2">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${TIPE_AKSI_LABELS[item.tipeAksi]?.color || 'bg-gray-100 text-gray-800'}`}>
                              {TIPE_AKSI_LABELS[item.tipeAksi]?.label || item.tipeAksi}
                            </span>
                            <span className="text-sm text-gray-500">
                              {item.tahunAjaran.nama}
                            </span>
                          </div>
                          <p className="text-gray-900">
                            Kelas: <span className="font-medium">{item.kelasNama}</span>
                          </p>
                          {item.keterangan && (
                            <p className="text-sm text-gray-600 mt-1">{item.keterangan}</p>
                          )}
                          <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {formatDate(item.tanggalAksi)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
