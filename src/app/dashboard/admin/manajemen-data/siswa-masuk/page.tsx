'use client'

import { useState, useEffect } from 'react'
import { ArrowLeft, UserPlus, CheckCircle, AlertCircle } from 'lucide-react'
import Link from 'next/link'

interface Kelas { id: string; nama: string }
interface TahunAjaran { id: string; nama: string; aktif: boolean }

export default function SiswaPindahMasukPage() {
  const [tahunAjaranList, setTahunAjaranList] = useState<TahunAjaran[]>([])
  const [kelasList, setKelasList] = useState<Kelas[]>([])
  const [selectedTahunAjaran, setSelectedTahunAjaran] = useState('')
  const [processing, setProcessing] = useState(false)
  const [result, setResult] = useState<{ success?: boolean; message?: string } | null>(null)
  
  // Form
  const [form, setForm] = useState({
    nipd: '',
    nama: '',
    kelasId: '',
    jenisKelamin: 'L',
    alamat: '',
    namaOrangTua: '',
    noTelepon: '',
    asalSekolah: '',
    tanggalMasuk: new Date().toISOString().split('T')[0]
  })

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

  useEffect(() => {
    if (!selectedTahunAjaran) return
    fetch(`/api/manajemen/kelas?tahunAjaranId=${selectedTahunAjaran}`)
      .then(res => res.json())
      .then(data => setKelasList(Array.isArray(data) ? data : []))
  }, [selectedTahunAjaran])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!form.nipd || !form.nama || !form.kelasId) {
      alert('NIPD, Nama, dan Kelas wajib diisi')
      return
    }

    setProcessing(true)
    setResult(null)

    try {
      const res = await fetch('/api/siswa/pindah-masuk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          tahunAjaranId: selectedTahunAjaran
        })
      })

      const data = await res.json()

      if (res.ok) {
        setResult({ success: true, message: data.message })
        setForm({
          nipd: '',
          nama: '',
          kelasId: '',
          jenisKelamin: 'L',
          alamat: '',
          namaOrangTua: '',
          noTelepon: '',
          asalSekolah: '',
          tanggalMasuk: new Date().toISOString().split('T')[0]
        })
      } else {
        setResult({ success: false, message: data.error })
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
          <h1 className="text-2xl font-bold text-gray-900">Siswa Pindah Masuk</h1>
          <p className="text-gray-600">Daftarkan siswa pindahan di tengah tahun ajaran</p>
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

      <div className="max-w-2xl">
        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <div className="flex items-center gap-4 mb-6">
            <select
              value={selectedTahunAjaran}
              onChange={(e) => setSelectedTahunAjaran(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              {tahunAjaranList.map((ta) => (
                <option key={ta.id} value={ta.id}>{ta.nama} {ta.aktif && '(Aktif)'}</option>
              ))}
            </select>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">NIPD *</label>
                <input
                  type="text"
                  value={form.nipd}
                  onChange={(e) => setForm({ ...form, nipd: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="2024011"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Kelas *</label>
                <select
                  value={form.kelasId}
                  onChange={(e) => setForm({ ...form, kelasId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  required
                >
                  <option value="">Pilih Kelas</option>
                  {kelasList.map((k) => (
                    <option key={k.id} value={k.id}>{k.nama}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nama Lengkap *</label>
              <input
                type="text"
                value={form.nama}
                onChange={(e) => setForm({ ...form, nama: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                placeholder="Nama lengkap siswa"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Jenis Kelamin</label>
                <select
                  value={form.jenisKelamin}
                  onChange={(e) => setForm({ ...form, jenisKelamin: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="L">Laki-laki</option>
                  <option value="P">Perempuan</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal Masuk</label>
                <input
                  type="date"
                  value={form.tanggalMasuk}
                  onChange={(e) => setForm({ ...form, tanggalMasuk: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Asal Sekolah</label>
              <input
                type="text"
                value={form.asalSekolah}
                onChange={(e) => setForm({ ...form, asalSekolah: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                placeholder="Nama sekolah asal"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Alamat</label>
              <textarea
                value={form.alamat}
                onChange={(e) => setForm({ ...form, alamat: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nama Orang Tua</label>
                <input
                  type="text"
                  value={form.namaOrangTua}
                  onChange={(e) => setForm({ ...form, namaOrangTua: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">No. Telepon</label>
                <input
                  type="text"
                  value={form.noTelepon}
                  onChange={(e) => setForm({ ...form, noTelepon: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="08xx"
                />
              </div>
            </div>

            <div className="pt-4">
              <button
                type="submit"
                disabled={processing}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                <UserPlus className="w-4 h-4" />
                {processing ? 'Memproses...' : 'Daftarkan Siswa Pindahan'}
              </button>
            </div>
          </form>
        </div>

        <div className="mt-4 p-4 bg-blue-50 rounded-lg text-sm text-blue-800">
          <p className="font-medium mb-1">Catatan:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Siswa pindahan akan otomatis dibuatkan tagihan mulai bulan berjalan</li>
            <li>Tagihan bulan sebelumnya tidak akan dibuat</li>
            <li>Akun orang tua akan otomatis dibuat dengan NIPD sebagai login</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
