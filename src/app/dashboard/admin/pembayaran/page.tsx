'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Spinner } from '@/components/ui/spinner'
import { formatCurrency, BULAN_INDONESIA } from '@/lib/utils'
import { CreditCard, X, Download } from 'lucide-react'

interface Tagihan {
  id: string
  bulan: number | null
  tahun: number | null
  jumlahTagihan: number
  jumlahDibayar: number
  status: string
  siswa: { id: string; nama: string; nipd: string; kelasNama: string }
  jenisTagihan: { nama: string; kategori: string }
}

interface Kelas { id: string; nama: string }
interface Siswa { id: string; nama: string; nipd: string }
interface TahunAjaran { id: string; nama: string; aktif: boolean }

interface PaymentForm {
  tagihanId: string
  jumlahBayar: string
  metodeBayar: string
  keterangan: string
}

const metodeBayarOptions = [
  { value: 'TUNAI', label: 'Tunai' },
  { value: 'TRANSFER', label: 'Transfer Bank' },
  { value: 'QRIS', label: 'QRIS' }
]

export default function PembayaranPage() {
  const [tagihan, setTagihan] = useState<Tagihan[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [pageSize] = useState(50)
  const [showModal, setShowModal] = useState(false)
  const [selectedTagihan, setSelectedTagihan] = useState<Tagihan | null>(null)
  const [form, setForm] = useState<PaymentForm>({
    tagihanId: '',
    jumlahBayar: '',
    metodeBayar: 'TUNAI',
    keterangan: ''
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [successKuitansi, setSuccessKuitansi] = useState<string | null>(null)

  // Filters
  const [tahunAjaranList, setTahunAjaranList] = useState<TahunAjaran[]>([])
  const [kelasList, setKelasList] = useState<Kelas[]>([])
  const [siswaList, setSiswaList] = useState<Siswa[]>([])
  const [selectedTahunAjaran, setSelectedTahunAjaran] = useState('')
  const [selectedKelas, setSelectedKelas] = useState('')
  const [selectedSiswa, setSelectedSiswa] = useState('')

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
    if (selectedKelas) url += `&kelasId=${selectedKelas}`
    fetch(url)
      .then(res => res.json())
      .then(data => setSiswaList(data.data || []))
  }, [selectedTahunAjaran, selectedKelas])

  const fetchTagihan = useCallback(async () => {
    if (!selectedTahunAjaran) return
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('tahunAjaranId', selectedTahunAjaran)
      params.set('status', 'BELUM_LUNAS,SEBAGIAN')
      params.set('page', page.toString())
      params.set('limit', pageSize.toString())
      if (selectedKelas) params.set('kelasId', selectedKelas)
      if (selectedSiswa) params.set('siswaId', selectedSiswa)
      
      const res = await fetch(`/api/tagihan?${params}`)
      const data = await res.json()
      setTagihan(data.data || [])
      setTotalCount(data.total || data.data?.length || 0)
    } catch {
      console.error('Error fetching tagihan')
    } finally {
      setLoading(false)
    }
  }, [selectedTahunAjaran, selectedKelas, selectedSiswa, page, pageSize])

  useEffect(() => {
    const timer = setTimeout(() => fetchTagihan(), 300)
    return () => clearTimeout(timer)
  }, [fetchTagihan])

  const openPaymentModal = (t: Tagihan) => {
    const sisa = Number(t.jumlahTagihan) - Number(t.jumlahDibayar)
    setSelectedTagihan(t)
    setForm({
      tagihanId: t.id,
      jumlahBayar: sisa.toString(),
      metodeBayar: 'TUNAI',
      keterangan: ''
    })
    setShowModal(true)
    setError('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')

    try {
      const res = await fetch('/api/pembayaran', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          jumlahBayar: parseFloat(form.jumlahBayar)
        })
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Gagal menyimpan pembayaran')
      }

      const result = await res.json()
      setSuccessKuitansi(result.nomorKuitansi)
      setShowModal(false)
      fetchTagihan()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const formatBulanTahun = (bulan: number | null, tahun: number | null) => {
    if (bulan === null) return '-'
    return `${BULAN_INDONESIA[bulan - 1]} ${tahun}`
  }

  return (
    <div className="space-y-6">
      {/* Success Alert */}
      {successKuitansi && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center justify-between">
          <div>
            <p className="text-green-800 font-medium">Pembayaran berhasil!</p>
            <p className="text-green-600 text-sm">No. Kuitansi: {successKuitansi}</p>
          </div>
          <div className="flex gap-2">
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => window.open(`/api/kuitansi/${successKuitansi}`, '_blank')}
            >
              <Download className="w-4 h-4 mr-1" />
              Download Kuitansi
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setSuccessKuitansi(null)}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl border border-gray-200">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-600">Tahun Ajaran</label>
            <select
              value={selectedTahunAjaran}
              onChange={(e) => { setSelectedTahunAjaran(e.target.value); setSelectedKelas(''); setSelectedSiswa('') }}
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
              value={selectedKelas}
              onChange={(e) => { setSelectedKelas(e.target.value); setSelectedSiswa('') }}
              className="px-3 py-2 text-sm border border-gray-300 rounded-lg"
            >
              <option value="">Semua Kelas</option>
              {kelasList.map((k) => (
                <option key={k.id} value={k.id}>{k.nama}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1 min-w-[200px]">
            <label className="text-xs font-medium text-gray-600">Nama Siswa</label>
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

          {(selectedKelas || selectedSiswa) && (
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => { setSelectedKelas(''); setSelectedSiswa('') }}
              className="text-gray-500"
            >
              <X className="w-4 h-4 mr-1" />
              Reset Filter
            </Button>
          )}
        </div>
      </div>

      {/* Tagihan Table */}
      <Card>
        <CardHeader>
          <CardTitle>Tagihan Belum Lunas</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Spinner />
            </div>
          ) : tagihan.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              Semua tagihan sudah lunas
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Siswa</TableHead>
                      <TableHead>Kelas</TableHead>
                      <TableHead>Jenis Tagihan</TableHead>
                      <TableHead>Periode</TableHead>
                      <TableHead className="text-right">Tagihan</TableHead>
                      <TableHead className="text-right">Terbayar</TableHead>
                      <TableHead className="text-right">Sisa</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tagihan.map((t) => {
                    const sisa = Number(t.jumlahTagihan) - Number(t.jumlahDibayar)
                    return (
                      <TableRow key={t.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{t.siswa.nama}</p>
                            <p className="text-xs text-gray-500">{t.siswa.nipd}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="info">{t.siswa.kelasNama}</Badge>
                        </TableCell>
                        <TableCell>{t.jenisTagihan.nama}</TableCell>
                        <TableCell>{formatBulanTahun(t.bulan, t.tahun)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(t.jumlahTagihan)}</TableCell>
                        <TableCell className="text-right text-green-600">
                          {formatCurrency(t.jumlahDibayar)}
                        </TableCell>
                        <TableCell className="text-right text-red-600 font-medium">
                          {formatCurrency(sisa)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={t.status === 'SEBAGIAN' ? 'warning' : 'danger'}>
                            {t.status === 'SEBAGIAN' ? 'Sebagian' : 'Belum Lunas'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button size="sm" onClick={() => openPaymentModal(t)}>
                            <CreditCard className="w-4 h-4 mr-1" />
                            Bayar
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
              </div>
              
              {/* Pagination */}
              <div className="flex items-center justify-between px-4 py-3 border-t">
                <div className="text-sm text-gray-600">
                  Halaman {page} dari {Math.max(1, Math.ceil(totalCount / pageSize))} ({totalCount} data)
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => p + 1)}
                    disabled={page >= Math.ceil(totalCount / pageSize)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Payment Modal */}
      {showModal && selectedTagihan && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold">Input Pembayaran</h3>
              <button onClick={() => setShowModal(false)}>
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-4 bg-gray-50 border-b">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <p className="text-gray-500">Siswa</p>
                  <p className="font-medium">{selectedTagihan.siswa.nama}</p>
                </div>
                <div>
                  <p className="text-gray-500">NIPD</p>
                  <p className="font-medium">{selectedTagihan.siswa.nipd}</p>
                </div>
                <div>
                  <p className="text-gray-500">Tagihan</p>
                  <p className="font-medium">{selectedTagihan.jenisTagihan.nama}</p>
                </div>
                <div>
                  <p className="text-gray-500">Periode</p>
                  <p className="font-medium">
                    {formatBulanTahun(selectedTagihan.bulan, selectedTagihan.tahun)}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">Total Tagihan</p>
                  <p className="font-medium">{formatCurrency(selectedTagihan.jumlahTagihan)}</p>
                </div>
                <div>
                  <p className="text-gray-500">Sisa</p>
                  <p className="font-medium text-red-600">
                    {formatCurrency(Number(selectedTagihan.jumlahTagihan) - Number(selectedTagihan.jumlahDibayar))}
                  </p>
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              <Input
                label="Jumlah Bayar (Rp)"
                type="number"
                value={form.jumlahBayar}
                onChange={(e) => setForm({ ...form, jumlahBayar: e.target.value })}
                required
              />
              <Select
                label="Metode Pembayaran"
                options={metodeBayarOptions}
                value={form.metodeBayar}
                onChange={(e) => setForm({ ...form, metodeBayar: e.target.value })}
              />
              <Input
                label="Keterangan (opsional)"
                value={form.keterangan}
                onChange={(e) => setForm({ ...form, keterangan: e.target.value })}
                placeholder="Catatan pembayaran"
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
                  {submitting ? 'Memproses...' : 'Simpan Pembayaran'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
