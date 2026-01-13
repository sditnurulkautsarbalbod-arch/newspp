'use client'

import { useState, useEffect } from 'react'
import { ArrowLeft, Search, DollarSign, Save, History, AlertCircle, CheckCircle } from 'lucide-react'
import Link from 'next/link'
import { formatCurrency } from '@/lib/utils'

interface TahunAjaran { id: string; nama: string; aktif: boolean }
interface Kelas { id: string; nama: string }
interface Siswa { 
  id: string; nipd: string; nama: string; kelasNama: string 
  tarifKhusus?: TarifKhusus[]
}
interface JenisTagihan { id: string; nama: string; nominal: number; kategori: string }
interface TarifKhusus {
  id: string
  jenisTagihanId: string
  jenisTagihan: { nama: string; nominal: number }
  nominalKhusus: number
  alasan: string
  tanggalMulai: string
}

export default function TarifKhususPage() {
  const [tahunAjaranList, setTahunAjaranList] = useState<TahunAjaran[]>([])
  const [kelasList, setKelasList] = useState<Kelas[]>([])
  const [siswaList, setSiswaList] = useState<Siswa[]>([])
  const [jenisTagihanList, setJenisTagihanList] = useState<JenisTagihan[]>([])
  
  const [selectedTahunAjaran, setSelectedTahunAjaran] = useState('')
  const [selectedKelas, setSelectedKelas] = useState('')
  const [selectedSiswa, setSelectedSiswa] = useState<Siswa | null>(null)
  const [search, setSearch] = useState('')
  
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [result, setResult] = useState<{ success?: boolean; message?: string } | null>(null)
  
  // Form state
  const [tarifForm, setTarifForm] = useState<{
    jenisTagihanId: string
    nominalKhusus: string
    alasan: string
    updateTagihanBelumLunas: boolean
  }>({
    jenisTagihanId: '',
    nominalKhusus: '',
    alasan: '',
    updateTagihanBelumLunas: true
  })

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
    let url = `/api/siswa?tahunAjaranId=${selectedTahunAjaran}&limit=500`
    if (selectedKelas) url += `&kelasId=${selectedKelas}`
    fetch(url)
      .then(res => res.json())
      .then(data => setSiswaList(data.data || []))
  }, [selectedTahunAjaran, selectedKelas])

  // Fetch jenis tagihan
  useEffect(() => {
    if (!selectedTahunAjaran) return
    fetch(`/api/jenis-tagihan?tahunAjaranId=${selectedTahunAjaran}`)
      .then(res => res.json())
      .then(data => setJenisTagihanList(data.data || []))
  }, [selectedTahunAjaran])

  // Fetch tarif khusus for selected siswa
  useEffect(() => {
    if (!selectedSiswa) return
    fetch(`/api/siswa/${selectedSiswa.id}/tarif-khusus`)
      .then(res => res.json())
      .then(data => {
        if (data.tarifKhusus) {
          setSelectedSiswa(prev => prev ? { ...prev, tarifKhusus: data.tarifKhusus } : null)
        }
      })
  }, [selectedSiswa?.id])

  const filteredSiswa = siswaList.filter(s =>
    s.nama.toLowerCase().includes(search.toLowerCase()) ||
    s.nipd.includes(search)
  )

  const handleSelectSiswa = (siswa: Siswa) => {
    setSelectedSiswa(siswa)
    setTarifForm({
      jenisTagihanId: '',
      nominalKhusus: '',
      alasan: '',
      updateTagihanBelumLunas: true
    })
    setResult(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedSiswa || !tarifForm.jenisTagihanId || !tarifForm.nominalKhusus) {
      alert('Lengkapi semua field')
      return
    }

    setSaving(true)
    setResult(null)

    try {
      const res = await fetch(`/api/siswa/${selectedSiswa.id}/tarif-khusus`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jenisTagihanId: tarifForm.jenisTagihanId,
          nominalKhusus: parseInt(tarifForm.nominalKhusus),
          alasan: tarifForm.alasan,
          updateTagihanBelumLunas: tarifForm.updateTagihanBelumLunas,
          tahunAjaranId: selectedTahunAjaran
        })
      })

      const data = await res.json()

      if (res.ok) {
        setResult({ 
          success: true, 
          message: `Tarif khusus berhasil disimpan. ${data.updatedCount || 0} tagihan diupdate.` 
        })
        // Refresh tarif khusus
        const refreshRes = await fetch(`/api/siswa/${selectedSiswa.id}/tarif-khusus`)
        const refreshData = await refreshRes.json()
        setSelectedSiswa(prev => prev ? { ...prev, tarifKhusus: refreshData.tarifKhusus } : null)
        setTarifForm({ jenisTagihanId: '', nominalKhusus: '', alasan: '', updateTagihanBelumLunas: true })
      } else {
        setResult({ success: false, message: data.error || 'Gagal menyimpan' })
      }
    } catch (error) {
      setResult({ success: false, message: 'Terjadi kesalahan' })
    } finally {
      setSaving(false)
    }
  }

  const handleRemoveTarif = async (tarifId: string) => {
    if (!confirm('Yakin ingin menghapus tarif khusus ini?')) return
    
    try {
      await fetch(`/api/siswa/${selectedSiswa?.id}/tarif-khusus/${tarifId}`, {
        method: 'DELETE'
      })
      // Refresh
      const res = await fetch(`/api/siswa/${selectedSiswa?.id}/tarif-khusus`)
      const data = await res.json()
      setSelectedSiswa(prev => prev ? { ...prev, tarifKhusus: data.tarifKhusus } : null)
    } catch (error) {
      console.error('Error:', error)
    }
  }

  const selectedJenisTagihan = jenisTagihanList.find(jt => jt.id === tarifForm.jenisTagihanId)

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/admin/manajemen-data" className="p-2 hover:bg-gray-100 rounded-lg">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tarif Khusus Siswa</h1>
          <p className="text-gray-600">Atur tarif khusus untuk siswa tertentu (keringanan, beasiswa, dll)</p>
        </div>
      </div>

      {result && (
        <div className={`p-4 rounded-lg flex items-center gap-3 ${result.success ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
          {result.success ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          {result.message}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Siswa List */}
        <div className="bg-white p-4 rounded-xl border border-gray-200">
          <div className="space-y-4 mb-4">
            <select
              value={selectedTahunAjaran}
              onChange={(e) => { setSelectedTahunAjaran(e.target.value); setSelectedKelas(''); setSelectedSiswa(null) }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              {tahunAjaranList.map((ta) => (
                <option key={ta.id} value={ta.id}>{ta.nama} {ta.aktif && '(Aktif)'}</option>
              ))}
            </select>
            <select
              value={selectedKelas}
              onChange={(e) => { setSelectedKelas(e.target.value); setSelectedSiswa(null) }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              <option value="">Semua Kelas</option>
              {kelasList.map((k) => (
                <option key={k.id} value={k.id}>{k.nama}</option>
              ))}
            </select>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari nama/NIPD..."
                className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
          </div>

          <div className="max-h-[500px] overflow-y-auto">
            {filteredSiswa.length === 0 ? (
              <p className="text-center text-gray-500 py-8">Tidak ada siswa</p>
            ) : (
              <div className="space-y-1">
                {filteredSiswa.map((siswa) => (
                  <button
                    key={siswa.id}
                    onClick={() => handleSelectSiswa(siswa)}
                    className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                      selectedSiswa?.id === siswa.id 
                        ? 'bg-blue-50 border border-blue-200' 
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <p className="font-medium text-sm">{siswa.nama}</p>
                    <p className="text-xs text-gray-500">{siswa.nipd} • {siswa.kelasNama}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Tarif Form */}
        <div className="lg:col-span-2 space-y-6">
          {!selectedSiswa ? (
            <div className="bg-white p-12 rounded-xl border border-gray-200 text-center">
              <DollarSign className="w-12 h-12 mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500">Pilih siswa untuk mengatur tarif khusus</p>
            </div>
          ) : (
            <>
              {/* Selected Siswa Info */}
              <div className="bg-blue-50 p-4 rounded-xl border border-blue-200">
                <h3 className="font-semibold text-blue-900">{selectedSiswa.nama}</h3>
                <p className="text-sm text-blue-700">NIPD: {selectedSiswa.nipd} • Kelas: {selectedSiswa.kelasNama}</p>
              </div>

              {/* Current Tarif Khusus */}
              {selectedSiswa.tarifKhusus && selectedSiswa.tarifKhusus.length > 0 && (
                <div className="bg-white p-4 rounded-xl border border-gray-200">
                  <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                    <History className="w-4 h-4" />
                    Tarif Khusus Aktif
                  </h4>
                  <div className="space-y-2">
                    {selectedSiswa.tarifKhusus.map((tarif) => (
                      <div key={tarif.id} className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                        <div>
                          <p className="font-medium text-yellow-900">{tarif.jenisTagihan.nama}</p>
                          <p className="text-sm text-yellow-700">
                            <span className="line-through">{formatCurrency(tarif.jenisTagihan.nominal)}</span>
                            {' → '}
                            <span className="font-bold">{formatCurrency(tarif.nominalKhusus)}</span>
                          </p>
                          {tarif.alasan && <p className="text-xs text-yellow-600 mt-1">{tarif.alasan}</p>}
                        </div>
                        <button
                          onClick={() => handleRemoveTarif(tarif.id)}
                          className="text-red-500 hover:text-red-700 text-sm"
                        >
                          Hapus
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Add New Tarif Form */}
              <div className="bg-white p-6 rounded-xl border border-gray-200">
                <h4 className="font-medium text-gray-900 mb-4">Tambah Tarif Khusus</h4>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Jenis Tagihan</label>
                    <select
                      value={tarifForm.jenisTagihanId}
                      onChange={(e) => setTarifForm({ ...tarifForm, jenisTagihanId: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      required
                    >
                      <option value="">Pilih Jenis Tagihan</option>
                      {jenisTagihanList.map((jt) => (
                        <option key={jt.id} value={jt.id}>
                          {jt.nama} - {formatCurrency(jt.nominal)} ({jt.kategori})
                        </option>
                      ))}
                    </select>
                  </div>

                  {selectedJenisTagihan && (
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-600">
                        Tarif Normal: <span className="font-bold">{formatCurrency(selectedJenisTagihan.nominal)}</span>
                      </p>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nominal Khusus (Rp)</label>
                    <input
                      type="number"
                      value={tarifForm.nominalKhusus}
                      onChange={(e) => setTarifForm({ ...tarifForm, nominalKhusus: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      placeholder="Contoh: 250000"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Alasan / Keterangan</label>
                    <textarea
                      value={tarifForm.alasan}
                      onChange={(e) => setTarifForm({ ...tarifForm, alasan: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      rows={2}
                      placeholder="Contoh: Keringanan karena kondisi ekonomi keluarga"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="updateTagihan"
                      checked={tarifForm.updateTagihanBelumLunas}
                      onChange={(e) => setTarifForm({ ...tarifForm, updateTagihanBelumLunas: e.target.checked })}
                      className="w-4 h-4 rounded border-gray-300"
                    />
                    <label htmlFor="updateTagihan" className="text-sm text-gray-700">
                      Update tagihan yang <strong>belum lunas</strong> ke tarif baru
                    </label>
                  </div>

                  <div className="p-3 bg-blue-50 rounded-lg text-sm text-blue-800">
                    <p><strong>Catatan:</strong></p>
                    <ul className="list-disc list-inside mt-1 space-y-1">
                      <li>Tagihan yang sudah LUNAS tidak akan berubah</li>
                      <li>Tarif khusus berlaku untuk tagihan selanjutnya</li>
                      <li>Perubahan akan tercatat untuk audit</li>
                    </ul>
                  </div>

                  <button
                    type="submit"
                    disabled={saving}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    <Save className="w-4 h-4" />
                    {saving ? 'Menyimpan...' : 'Simpan Tarif Khusus'}
                  </button>
                </form>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
