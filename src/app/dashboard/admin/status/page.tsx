'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Spinner } from '@/components/ui/spinner'
import { formatCurrency, formatShortDate, formatDate, BULAN_INDONESIA } from '@/lib/utils'
import { Check, X as XIcon, Calendar, CreditCard, Download, FileSpreadsheet, FileText, Trash2 } from 'lucide-react'

interface Kelas { id: string; nama: string }
interface Siswa { id: string; nama: string; nipd: string }
interface TahunAjaran { id: string; nama: string; aktif: boolean; tahunMulai: number }

interface TagihanDetail {
  id: string
  bulan: number | null
  tahun: number | null
  status: string
  jumlahTagihan: number
  jumlahDibayar: number
  siswa: { id: string; nama: string; nipd: string; kelasNama: string }
  jenisTagihan: { nama: string; kategori: string }
  pembayaran: {
    id: string
    jumlahBayar: number
    tanggalBayar: string
    metodeBayar: string
    nomorKuitansi: string
  }[]
}

interface TagihanGrouped {
  siswa: { id: string; nama: string; nipd: string; kelas: string }
  bulanan: {
    id: string
    bulan: number
    tahun: number
    status: string
    jumlahTagihan: number
    jumlahDibayar: number
    pembayaran: TagihanDetail['pembayaran']
  }[]
  sekaliBayar: {
    id: string
    nama: string
    status: string
    jumlahTagihan: number
    jumlahDibayar: number
    pembayaran: TagihanDetail['pembayaran']
  }[]
}

type TabType = 'bulanan' | 'sekalibayar'

// Helper function to generate month order based on starting month
const generateBulanOrder = (bulanMulai: number): number[] => {
  const order: number[] = []
  for (let i = 0; i < 12; i++) {
    const month = ((bulanMulai - 1 + i) % 12) + 1
    order.push(month)
  }
  return order
}

export default function StatusPembayaranPage() {
  const [data, setData] = useState<TagihanGrouped[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [pageSize] = useState(50)
  const [activeTab, setActiveTab] = useState<TabType>('bulanan')
  const [tahunAjaran, setTahunAjaran] = useState<TahunAjaran | null>(null)
  const [bulanMulai, setBulanMulai] = useState(7) // Default Juli
  const [bulanOrder, setBulanOrder] = useState<number[]>([7, 8, 9, 10, 11, 12, 1, 2, 3, 4, 5, 6])
  
  // Filters
  const [tahunAjaranList, setTahunAjaranList] = useState<TahunAjaran[]>([])
  const [kelasList, setKelasList] = useState<Kelas[]>([])
  const [siswaList, setSiswaList] = useState<Siswa[]>([])
  const [selectedTahunAjaran, setSelectedTahunAjaran] = useState('')
  const [selectedKelas, setSelectedKelas] = useState('')
  const [selectedSiswa, setSelectedSiswa] = useState('')

  // Fetch settings for bulanMulai
  useEffect(() => {
    fetch('/api/settings')
      .then(res => res.json())
      .then(data => {
        if (data.bulanMulai) {
          setBulanMulai(data.bulanMulai)
          setBulanOrder(generateBulanOrder(data.bulanMulai))
        }
      })
      .catch(() => {})
  }, [])

  // Detail Modal
  const [showDetail, setShowDetail] = useState(false)
  const [detailData, setDetailData] = useState<{
    siswa: { nama: string; nipd: string; kelas: string }
    tagihan: string
    periode: string
    jumlahTagihan: number
    jumlahDibayar: number
    status: string
    pembayaran: TagihanDetail['pembayaran']
  } | null>(null)

  // Fetch tahun ajaran
  useEffect(() => {
    fetch('/api/manajemen/tahun-ajaran')
      .then(res => res.json())
      .then(data => {
        const list = Array.isArray(data) ? data : []
        setTahunAjaranList(list)
        const aktif = list.find((t: TahunAjaran) => t.aktif)
        if (aktif) {
          setSelectedTahunAjaran(aktif.id)
          setTahunAjaran(aktif)
        }
      })
  }, [])

  // Fetch kelas
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

  const fetchData = useCallback(async () => {
    if (!selectedTahunAjaran) return
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('tahunAjaranId', selectedTahunAjaran)
      if (selectedKelas) params.set('kelasId', selectedKelas)
      if (selectedSiswa) params.set('siswaId', selectedSiswa)
      
      const res = await fetch(`/api/tagihan?${params}`)
      const json = await res.json()
      
      // Group by siswa
      const grouped: Record<string, TagihanGrouped> = {}
      
      for (const tagihan of json.data || []) {
        const siswaId = tagihan.siswa.id
        
        if (!grouped[siswaId]) {
          grouped[siswaId] = {
            siswa: {
              id: tagihan.siswa.id,
              nama: tagihan.siswa.nama,
              nipd: tagihan.siswa.nipd,
              kelas: tagihan.siswa.kelasNama
            },
            bulanan: [],
            sekaliBayar: []
          }
        }
        
        if (tagihan.jenisTagihan.kategori.includes('BULANAN')) {
          grouped[siswaId].bulanan.push({
            id: tagihan.id,
            bulan: tagihan.bulan,
            tahun: tagihan.tahun,
            status: tagihan.status,
            jumlahTagihan: Number(tagihan.jumlahTagihan),
            jumlahDibayar: Number(tagihan.jumlahDibayar),
            pembayaran: tagihan.pembayaran || []
          })
        } else {
          grouped[siswaId].sekaliBayar.push({
            id: tagihan.id,
            nama: tagihan.jenisTagihan.nama,
            status: tagihan.status,
            jumlahTagihan: Number(tagihan.jumlahTagihan),
            jumlahDibayar: Number(tagihan.jumlahDibayar),
            pembayaran: tagihan.pembayaran || []
          })
        }
      }

      setData(Object.values(grouped))
      setPage(1)
    } catch (error) {
      console.error('Error fetching data:', error)
      alert('Gagal mengambil data. Silakan refresh halaman.')
    } finally {
      setLoading(false)
    }
  }, [selectedTahunAjaran, selectedKelas, selectedSiswa, page, pageSize])

  useEffect(() => {
    const timer = setTimeout(() => fetchData(), 300)
    return () => clearTimeout(timer)
  }, [fetchData])

  const handleShowDetail = (siswa: TagihanGrouped['siswa'], tagihan: any, isMonthly: boolean) => {
    setDetailData({
      siswa,
      tagihan: isMonthly ? 'SPP' : tagihan.nama,
      periode: isMonthly ? `${BULAN_INDONESIA[tagihan.bulan - 1]} ${tagihan.tahun}` : '-',
      jumlahTagihan: tagihan.jumlahTagihan,
      jumlahDibayar: tagihan.jumlahDibayar,
      status: tagihan.status,
      pembayaran: tagihan.pembayaran
    })
    setShowDetail(true)
  }

  // State for payment modal
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [paymentTagihan, setPaymentTagihan] = useState<any>(null)
  const [paymentSiswa, setPaymentSiswa] = useState<TagihanGrouped['siswa'] | null>(null)
  const [paymentForm, setPaymentForm] = useState({ jumlahBayar: '', metodeBayar: 'TUNAI', keterangan: '' })
  const [paymentSubmitting, setPaymentSubmitting] = useState(false)
  const [deletingPayment, setDeletingPayment] = useState<string | null>(null)

  const handleOpenPayment = (siswa: TagihanGrouped['siswa'], tagihan: any) => {
    setPaymentSiswa(siswa)
    setPaymentTagihan(tagihan)
    const sisa = tagihan.jumlahTagihan - tagihan.jumlahDibayar
    setPaymentForm({ jumlahBayar: sisa.toString(), metodeBayar: 'TUNAI', keterangan: '' })
    setShowPaymentModal(true)
  }

  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!paymentTagihan) return
    setPaymentSubmitting(true)

    try {
      const res = await fetch('/api/pembayaran', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tagihanId: paymentTagihan.id,
          jumlahBayar: parseFloat(paymentForm.jumlahBayar),
          metodeBayar: paymentForm.metodeBayar,
          keterangan: paymentForm.keterangan
        })
      })

      if (res.ok) {
        setShowPaymentModal(false)
        fetchData() // Refresh data
      } else {
        const data = await res.json()
        alert(data.error || 'Gagal menyimpan pembayaran')
      }
    } catch {
      alert('Terjadi kesalahan')
    } finally {
      setPaymentSubmitting(false)
    }
  }

  const handleDeletePembayaran = async (pembayaranId: string) => {
    const confirmDelete = confirm(
      '⚠️ PERINGATAN!\n\n' +
      'Anda akan membatalkan/menghapus pembayaran ini.\n\n' +
      'Tindakan ini akan:\n' +
      '• Menghapus catatan pembayaran\n' +
      '• Mengubah status tagihan\n\n' +
      'Lanjutkan?'
    )
    
    if (!confirmDelete) return

    setDeletingPayment(pembayaranId)
    try {
      const res = await fetch(`/api/pembayaran?id=${pembayaranId}`, {
        method: 'DELETE'
      })

      if (res.ok) {
        // Refresh data and close modal
        fetchData()
        setShowDetail(false)
        alert('Pembayaran berhasil dibatalkan')
      } else {
        const data = await res.json()
        alert(data.error || 'Gagal membatalkan pembayaran')
      }
    } catch {
      alert('Terjadi kesalahan')
    } finally {
      setDeletingPayment(null)
    }
  }

  const handleDownload = (type: 'pdf' | 'excel') => {
    const params = new URLSearchParams()
    params.set('tahunAjaranId', selectedTahunAjaran)
    params.set('type', type)
    params.set('tab', activeTab)
    if (selectedKelas) params.set('kelasId', selectedKelas)
    if (selectedSiswa) params.set('siswaId', selectedSiswa)
    
    window.open(`/api/laporan/status-pembayaran?${params}`, '_blank')
  }

  // Get all unique sekali bayar names from data
  const getSekaliBayarColumns = () => {
    const columns = new Set<string>()
    data.forEach(item => {
      item.sekaliBayar.forEach(sb => columns.add(sb.nama))
    })
    return Array.from(columns).sort()
  }
 
  const getBulanHeaders = () => {
    if (!tahunAjaran) return []
    return bulanOrder.map((bulan, idx) => {
      const tahun = idx < 6 ? tahunAjaran.tahunMulai : tahunAjaran.tahunMulai + 1
      return { bulan, tahun, label: BULAN_INDONESIA[bulan - 1].substring(0, 3) }
    })
  }

  const renderStatusIcon = (tagihan: any, siswa: TagihanGrouped['siswa'], isMonthly: boolean) => {
    const isLunas = tagihan?.status === 'LUNAS'
    const isSebagian = tagihan?.status === 'SEBAGIAN'
    const hasPayment = tagihan?.pembayaran?.length > 0

    if (!tagihan) return <span className="text-gray-300">-</span>

    // All status icons are clickable
    const baseClass = 'cursor-pointer hover:scale-110 transition-transform'

    if (isLunas) {
      return (
        <div 
          className={`inline-flex flex-col items-center ${baseClass}`}
          onClick={() => handleShowDetail(siswa, tagihan, isMonthly)}
          title="Klik untuk detail"
        >
          <span className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center">
            <Check className="w-4 h-4 text-green-600" />
          </span>
        </div>
      )
    } else if (isSebagian) {
      return (
        <div 
          className={`inline-flex flex-col items-center ${baseClass}`}
          onClick={() => handleShowDetail(siswa, tagihan, isMonthly)}
          title="Klik untuk detail & kuitansi"
        >
          <span className="w-6 h-6 rounded-full bg-yellow-100 flex items-center justify-center text-[10px] font-bold text-yellow-700">
            ~
          </span>
        </div>
      )
    } else {
      return (
        <div
          className={`inline-flex flex-col items-center ${baseClass}`}
          onClick={() => handleOpenPayment(siswa, tagihan)}
          title="Klik untuk bayar"
        >
          <span className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center">
            <XIcon className="w-4 h-4 text-red-500" />
          </span>
        </div>
      )
    }
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-white p-4 rounded-xl border border-gray-200">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-600">Tahun Ajaran</label>
            <select
              value={selectedTahunAjaran}
              onChange={(e) => {
                setSelectedTahunAjaran(e.target.value)
                setSelectedKelas('')
                setSelectedSiswa('')
                const ta = tahunAjaranList.find(t => t.id === e.target.value)
                if (ta) setTahunAjaran(ta)
              }}
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

          <div className="flex-1" />

          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => handleDownload('excel')}>
              <FileSpreadsheet className="w-4 h-4 mr-1" />
              Excel
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleDownload('pdf')}>
              <FileText className="w-4 h-4 mr-1" />
              PDF
            </Button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b">
        <button
          onClick={() => setActiveTab('bulanan')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'bulanan'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Calendar className="w-4 h-4" />
          SPP Bulanan
        </button>
        <button
          onClick={() => setActiveTab('sekalibayar')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'sekalibayar'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          Sekali Bayar
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Spinner size="lg" />
        </div>
      ) : data.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          Tidak ada data
        </div>
      ) : activeTab === 'bulanan' ? (
        <Card>
          <CardHeader>
            <CardTitle>Status SPP Bulanan - Tahun Ajaran {tahunAjaran?.nama}</CardTitle>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left py-3 px-4 font-medium text-gray-500 sticky left-0 bg-gray-50 min-w-[180px]">
                    Siswa
                  </th>
                  {getBulanHeaders().map((h, i) => (
                    <th key={i} className="text-center py-3 px-2 font-medium text-gray-500 min-w-[60px]">
                      <div>{h.label}</div>
                      <div className="text-xs font-normal">{h.tahun}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.slice((page - 1) * pageSize, page * pageSize).map((item) => (
                  <tr key={item.siswa.id} className="border-b border-gray-100">
                    <td className="py-3 px-4 sticky left-0 bg-white">
                      <div>
                        <p className="font-medium text-gray-900">{item.siswa.nama}</p>
                        <p className="text-xs text-gray-500">{item.siswa.nipd} • {item.siswa.kelas}</p>
                      </div>
                    </td>
                    {getBulanHeaders().map((h, i) => {
                      const tagihan = item.bulanan.find(
                        b => b.bulan === h.bulan && b.tahun === h.tahun
                      )
                      return (
                        <td key={i} className="py-3 px-2 text-center">
                          {renderStatusIcon(tagihan, item.siswa, true)}
                        </td>
                      )
                    })}
                  </tr>
                ))}
                </tbody>
              </table>
              
              {/* Pagination */}
              <div className="flex items-center justify-between px-4 py-3 border-t">
                <div className="text-sm text-gray-600">
                  Halaman {page} dari {Math.ceil(data.length / pageSize)}
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
                    disabled={page >= Math.ceil(data.length / pageSize)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Status Tagihan Sekali Bayar - Tahun Ajaran {tahunAjaran?.nama}</CardTitle>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left py-3 px-4 font-medium text-gray-500 min-w-[180px]">Siswa</th>
                    {getSekaliBayarColumns().map(nama => (
                      <th key={nama} className="text-center py-3 px-4 font-medium text-gray-500">{nama}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.slice((page - 1) * pageSize, page * pageSize).map((item) => (
                  <tr key={item.siswa.id} className="border-b border-gray-100">
                    <td className="py-3 px-4">
                      <div>
                        <p className="font-medium text-gray-900">{item.siswa.nama}</p>
                        <p className="text-xs text-gray-500">{item.siswa.nipd} • {item.siswa.kelas}</p>
                      </div>
                    </td>
                    {getSekaliBayarColumns().map(nama => {
                      const tagihan = item.sekaliBayar.find(t => t.nama === nama)
                      return (
                        <td key={nama} className="py-3 px-4 text-center">
                          {renderStatusIcon(tagihan, item.siswa, false)}
                        </td>
                      )
                    })}
                  </tr>
                ))}
                </tbody>
              </table>
              
              {/* Pagination */}
              <div className="flex items-center justify-between px-4 py-3 border-t">
                <div className="text-sm text-gray-600">
                  Halaman {page} dari {Math.ceil(data.length / pageSize)}
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
                    disabled={page >= Math.ceil(data.length / pageSize)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-sm text-gray-600">
        <div className="flex items-center gap-2">
          <span className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center">
            <Check className="w-3 h-3 text-green-600" />
          </span>
          Lunas (klik untuk detail)
        </div>
        <div className="flex items-center gap-2">
          <span className="w-5 h-5 rounded-full bg-yellow-100 flex items-center justify-center text-xs font-bold text-yellow-700">
            ~
          </span>
          Sebagian (klik untuk detail & kuitansi)
        </div>
        <div className="flex items-center gap-2">
          <span className="w-5 h-5 rounded-full bg-red-100 flex items-center justify-center">
            <XIcon className="w-3 h-3 text-red-500" />
          </span>
          Belum Bayar (klik untuk bayar)
        </div>
      </div>

      {/* Detail Modal */}
      {showDetail && detailData && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold">Detail Pembayaran</h3>
              <button onClick={() => setShowDetail(false)}>
                <XIcon className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-4 bg-gray-50 border-b">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <p className="text-gray-500">Siswa</p>
                  <p className="font-medium">{detailData.siswa.nama}</p>
                </div>
                <div>
                  <p className="text-gray-500">Kelas</p>
                  <p className="font-medium">{detailData.siswa.kelas}</p>
                </div>
                <div>
                  <p className="text-gray-500">Tagihan</p>
                  <p className="font-medium">{detailData.tagihan}</p>
                </div>
                <div>
                  <p className="text-gray-500">Periode</p>
                  <p className="font-medium">{detailData.periode}</p>
                </div>
                <div>
                  <p className="text-gray-500">Total Tagihan</p>
                  <p className="font-medium">{formatCurrency(detailData.jumlahTagihan)}</p>
                </div>
                <div>
                  <p className="text-gray-500">Status</p>
                  <Badge variant={detailData.status === 'LUNAS' ? 'success' : 'warning'}>
                    {detailData.status === 'LUNAS' ? 'Lunas' : 'Sebagian'}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="p-4">
              <h4 className="font-medium mb-3">Riwayat Pembayaran</h4>
              <div className="space-y-2">
                {detailData.pembayaran.map((p, idx) => (
                  <div key={idx} className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-green-600">{formatCurrency(p.jumlahBayar)}</p>
                        <p className="text-xs text-gray-500">
                          {formatDate(p.tanggalBayar)} • {p.metodeBayar}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">No: {p.nomorKuitansi}</p>
                      </div>
                      <div className="flex gap-1">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => window.open(`/api/kuitansi/${p.nomorKuitansi}`, '_blank')}
                        >
                          <Download className="w-3 h-3 mr-1" />
                          Kuitansi
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleDeletePembayaran(p.id)}
                          disabled={deletingPayment === p.id}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50"
                        >
                          {deletingPayment === p.id ? (
                            <span className="w-3 h-3 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <Trash2 className="w-3 h-3" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-4 border-t flex gap-2">
              {detailData.status !== 'LUNAS' && (
                <Button 
                  className="flex-1" 
                  onClick={() => {
                    setShowDetail(false)
                    handleOpenPayment(
                      { id: '', nama: detailData.siswa.nama, kelas: detailData.siswa.kelas, nipd: detailData.siswa.nipd },
                      { 
                        id: detailData.tagihan, 
                        jumlahTagihan: detailData.jumlahTagihan, 
                        jumlahDibayar: detailData.jumlahDibayar 
                      }
                    )
                  }}
                >
                  <CreditCard className="w-4 h-4 mr-2" />
                  Lanjut Bayar
                </Button>
              )}
              <Button 
                variant="outline" 
                className={detailData.status !== 'LUNAS' ? 'flex-1' : 'w-full'}
                onClick={() => setShowDetail(false)}
              >
                Tutup
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && paymentSiswa && paymentTagihan && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold">Input Pembayaran</h3>
              <button onClick={() => setShowPaymentModal(false)}>
                <XIcon className="w-5 h-5" />
              </button>
            </div>
            
<div className="p-4 bg-gray-50 border-b">
               <div className="grid grid-cols-2 gap-2 text-sm">
                 <div>
                   <p className="text-gray-500">Nama</p>
                   <p className="font-medium">{paymentSiswa.nama}</p>
                 </div>
                 <div>
                   <p className="text-gray-500">NIPD</p>
                   <p className="font-medium">{paymentSiswa.nipd}</p>
                 </div>
                 <div>
                   <p className="text-gray-500">Kelas</p>
                   <p className="font-medium">{paymentSiswa.kelas}</p>
                 </div>
                 <div>
                   <p className="text-gray-500">Tagihan</p>
                   <p className="font-medium">{formatCurrency(paymentTagihan.jumlahTagihan)}</p>
                 </div>
                 <div>
                   <p className="text-gray-500">Sudah Dibayar</p>
                   <p className="font-medium text-green-600">{formatCurrency(paymentTagihan.jumlahDibayar)}</p>
                 </div>
                 <div>
                   <p className="text-gray-500">Sisa Tagihan</p>
                   <p className="font-bold text-lg text-red-600">
                     {formatCurrency(paymentTagihan.jumlahTagihan - paymentTagihan.jumlahDibayar)}
                   </p>
                 </div>
               </div>
             </div>

            <form onSubmit={handleSubmitPayment} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Jumlah Bayar
                </label>
                <input
                  type="number"
                  value={paymentForm.jumlahBayar}
                  onChange={(e) => setPaymentForm({ ...paymentForm, jumlahBayar: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Masukkan jumlah"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  💡 Jika bayar lebih dari sisa, kelebihan akan dicatat sebagai infaq
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Metode Bayar
                </label>
                <select
                  value={paymentForm.metodeBayar}
                  onChange={(e) => setPaymentForm({ ...paymentForm, metodeBayar: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="TUNAI">Tunai</option>
                  <option value="TRANSFER">Transfer Bank</option>
                  <option value="QRIS">QRIS</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Keterangan (opsional)
                </label>
                <input
                  type="text"
                  value={paymentForm.keterangan}
                  onChange={(e) => setPaymentForm({ ...paymentForm, keterangan: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Catatan pembayaran"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowPaymentModal(false)}
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={paymentSubmitting}
                >
                  {paymentSubmitting ? 'Menyimpan...' : 'Simpan Pembayaran'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
