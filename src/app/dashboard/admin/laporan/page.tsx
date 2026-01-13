'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Spinner } from '@/components/ui/spinner'
import { formatCurrency, BULAN_INDONESIA } from '@/lib/utils'
import { Download, FileSpreadsheet, FileText, Filter } from 'lucide-react'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'

interface LaporanItem {
  id: string
  bulan: number | null
  tahun: number | null
  jumlahTagihan: number
  jumlahDibayar: number
  status: string
  siswa: { nama: string; nipd: string; kelas?: string; kelasNama?: string }
  jenisTagihan: { nama: string; kategori: string }
  tahunAjaran?: { nama: string }
}

interface Summary {
  totalTagihan: number
  totalTerbayar: number
  jumlahLunas: number
  jumlahBelumLunas: number
}

interface TahunAjaranOption {
  id: string
  nama: string
  aktif: boolean
}

const kelasOptions = [
  { value: '', label: 'Semua Kelas' },
  { value: '1A', label: '1A' }, { value: '1B', label: '1B' },
  { value: '2A', label: '2A' }, { value: '2B', label: '2B' },
  { value: '3A', label: '3A' }, { value: '3B', label: '3B' },
  { value: '4A', label: '4A' }, { value: '4B', label: '4B' },
  { value: '5A', label: '5A' }, { value: '5B', label: '5B' },
  { value: '6A', label: '6A' }, { value: '6B', label: '6B' },
]

const bulanOptions = [
  { value: '', label: 'Semua Bulan' },
  ...BULAN_INDONESIA.map((b, i) => ({ value: String(i + 1), label: b }))
]

const statusOptions = [
  { value: '', label: 'Semua Status' },
  { value: 'LUNAS', label: 'Lunas' },
  { value: 'SEBAGIAN', label: 'Sebagian' },
  { value: 'BELUM_LUNAS', label: 'Belum Lunas' }
]

export default function LaporanPage() {
  const [data, setData] = useState<LaporanItem[]>([])
  const [summary, setSummary] = useState<Summary | null>(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [pageSize] = useState(50)
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1 })
  const [tahunAjaran, setTahunAjaran] = useState('')
  const [tahunAjaranOptions, setTahunAjaranOptions] = useState<TahunAjaranOption[]>([])
  
  // Filters
  const [selectedTahunAjaranId, setSelectedTahunAjaranId] = useState('')
  const [kelas, setKelas] = useState('')
  const [bulan, setBulan] = useState('')
  const [status, setStatus] = useState('')

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (selectedTahunAjaranId) params.set('tahunAjaranId', selectedTahunAjaranId)
      if (kelas) params.set('kelas', kelas)
      if (bulan) params.set('bulan', bulan)
      if (status) params.set('status', status)
      params.set('page', page.toString())
      params.set('limit', pageSize.toString())
      
      const res = await fetch(`/api/laporan?${params}`)
      const json = await res.json()
      setData(json.data || [])
      setSummary(json.summary || null)
      setTahunAjaran(json.tahunAjaran || '')
      setPagination({ 
        page: json.pagination?.page || page, 
        totalPages: json.pagination?.totalPages || Math.ceil((json.data?.length || 0) / pageSize) 
      })
      
      // Set options only once
      if (json.tahunAjaranOptions && tahunAjaranOptions.length === 0) {
        setTahunAjaranOptions(json.tahunAjaranOptions)
      }
    } catch {
      console.error('Error fetching data')
    } finally {
      setLoading(false)
    }
  }, [selectedTahunAjaranId, kelas, bulan, status, page, pageSize, tahunAjaranOptions.length])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const exportToPDF = () => {
    const doc = new jsPDF()
    
    // Title
    doc.setFontSize(16)
    doc.text(`Laporan Pembayaran SPP - TA ${tahunAjaran}`, 14, 15)
    
    // Filters info
    doc.setFontSize(10)
    const filterText = [
      kelas ? `Kelas: ${kelas}` : '',
      bulan ? `Bulan: ${BULAN_INDONESIA[parseInt(bulan) - 1]}` : '',
      status ? `Status: ${status}` : ''
    ].filter(Boolean).join(' | ') || 'Semua Data'
    doc.text(`Filter: ${filterText}`, 14, 22)
    
    // Summary
    if (summary) {
      doc.text(`Total Tagihan: ${formatCurrency(summary.totalTagihan)} | Terbayar: ${formatCurrency(summary.totalTerbayar)}`, 14, 28)
    }

    // Table - add Tahun Ajaran column when viewing all years
    const isAllYears = selectedTahunAjaranId === 'all'
    const headers = isAllYears 
      ? [['NIPD', 'Nama', 'Kelas', 'TA', 'Jenis', 'Periode', 'Tagihan', 'Terbayar', 'Sisa', 'Status']]
      : [['NIPD', 'Nama', 'Kelas', 'Jenis', 'Periode', 'Tagihan', 'Terbayar', 'Sisa', 'Status']]
    
    const bodyData = data.map(item => {
      const baseRow = [
        item.siswa.nipd,
        item.siswa.nama,
        item.siswa.kelasNama || item.siswa.kelas || '-',
      ]
      if (isAllYears) {
        baseRow.push(item.tahunAjaran?.nama || '-')
      }
      baseRow.push(
        item.jenisTagihan.nama,
        item.bulan ? `${BULAN_INDONESIA[item.bulan - 1]} ${item.tahun}` : '-',
        formatCurrency(item.jumlahTagihan),
        formatCurrency(item.jumlahDibayar),
        formatCurrency(Number(item.jumlahTagihan) - Number(item.jumlahDibayar)),
        item.status === 'LUNAS' ? 'Lunas' : item.status === 'SEBAGIAN' ? 'Sebagian' : 'Belum'
      )
      return baseRow
    })

    autoTable(doc, {
      startY: 35,
      head: headers,
      body: bodyData,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [59, 130, 246] }
    })

    doc.save(`laporan-spp-${new Date().toISOString().split('T')[0]}.pdf`)
  }

  const exportToExcel = () => {
    const isAllYears = selectedTahunAjaranId === 'all'
    const headerRow = isAllYears
      ? ['NIPD', 'Nama', 'Kelas', 'Tahun Ajaran', 'Jenis Tagihan', 'Periode', 'Tagihan', 'Terbayar', 'Sisa', 'Status']
      : ['NIPD', 'Nama', 'Kelas', 'Jenis Tagihan', 'Periode', 'Tagihan', 'Terbayar', 'Sisa', 'Status']
    
    const dataRows = data.map(item => {
      const baseRow: (string | number)[] = [
        item.siswa.nipd,
        item.siswa.nama,
        item.siswa.kelasNama || item.siswa.kelas || '-',
      ]
      if (isAllYears) {
        baseRow.push(item.tahunAjaran?.nama || '-')
      }
      baseRow.push(
        item.jenisTagihan.nama,
        item.bulan ? `${BULAN_INDONESIA[item.bulan - 1]} ${item.tahun}` : '-',
        Number(item.jumlahTagihan),
        Number(item.jumlahDibayar),
        Number(item.jumlahTagihan) - Number(item.jumlahDibayar),
        item.status === 'LUNAS' ? 'Lunas' : item.status === 'SEBAGIAN' ? 'Sebagian' : 'Belum Lunas'
      )
      return baseRow
    })

    const wsData = [
      ['Laporan Pembayaran SPP', '', '', '', '', '', '', '', '', ''],
      [`Tahun Ajaran: ${tahunAjaran}`, '', '', '', '', '', '', '', '', ''],
      ['', '', '', '', '', '', '', '', '', ''],
      headerRow,
      ...dataRows,
      ['', '', '', '', '', '', '', '', '', ''],
      ['TOTAL', '', '', '', '', 
        summary?.totalTagihan || 0, 
        summary?.totalTerbayar || 0, 
        (summary?.totalTagihan || 0) - (summary?.totalTerbayar || 0),
        ''
      ]
    ]

    const ws = XLSX.utils.aoa_to_sheet(wsData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Laporan')
    XLSX.writeFile(wb, `laporan-spp-${new Date().toISOString().split('T')[0]}.xlsx`)
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Filter className="w-4 h-4" />
            Filter Laporan
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <Select
              label="Tahun Ajaran"
              options={[
                { value: '', label: 'Tahun Aktif' },
                { value: 'all', label: '📊 Semua Tahun (Tunggakan)' },
                ...tahunAjaranOptions.map(t => ({ 
                  value: t.id, 
                  label: t.nama + (t.aktif ? ' (Aktif)' : '') 
                }))
              ]}
              value={selectedTahunAjaranId}
              onChange={(e) => setSelectedTahunAjaranId(e.target.value)}
            />
            <Select
              label="Kelas"
              options={kelasOptions}
              value={kelas}
              onChange={(e) => setKelas(e.target.value)}
            />
            <Select
              label="Bulan"
              options={bulanOptions}
              value={bulan}
              onChange={(e) => setBulan(e.target.value)}
            />
            <Select
              label="Status"
              options={statusOptions}
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Summary & Export */}
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        {summary && (
          <div className="flex flex-wrap gap-4 text-sm">
            <div>
              <span className="text-gray-500">Total Tagihan:</span>
              <span className="ml-2 font-semibold">{formatCurrency(summary.totalTagihan)}</span>
            </div>
            <div>
              <span className="text-gray-500">Terbayar:</span>
              <span className="ml-2 font-semibold text-green-600">{formatCurrency(summary.totalTerbayar)}</span>
            </div>
            <div>
              <span className="text-gray-500">Lunas:</span>
              <Badge variant="success" className="ml-2">{summary.jumlahLunas}</Badge>
            </div>
            <div>
              <span className="text-gray-500">Belum:</span>
              <Badge variant="danger" className="ml-2">{summary.jumlahBelumLunas}</Badge>
            </div>
          </div>
        )}
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={() => exportToExcel()} disabled={data.length === 0}>
            <FileSpreadsheet className="w-4 h-4 mr-2" />
            Excel
          </Button>
          <Button type="button" variant="outline" onClick={() => exportToPDF()} disabled={data.length === 0}>
            <FileText className="w-4 h-4 mr-2" />
            PDF
          </Button>
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Spinner />
            </div>
          ) : data.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              Tidak ada data
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>NIPD</TableHead>
                    <TableHead>Nama</TableHead>
                    <TableHead>Kelas</TableHead>
                    {selectedTahunAjaranId === 'all' && <TableHead>Tahun Ajaran</TableHead>}
                    <TableHead>Jenis</TableHead>
                    <TableHead>Periode</TableHead>
                    <TableHead className="text-right">Tagihan</TableHead>
                    <TableHead className="text-right">Terbayar</TableHead>
                    <TableHead className="text-right">Sisa</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.slice(0, 100).map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-mono text-xs">{item.siswa.nipd}</TableCell>
                      <TableCell>{item.siswa.nama}</TableCell>
                      <TableCell><Badge variant="info">{item.siswa.kelasNama || item.siswa.kelas || '-'}</Badge></TableCell>
                      {selectedTahunAjaranId === 'all' && (
                        <TableCell>
                          <Badge variant="default">{item.tahunAjaran?.nama || '-'}</Badge>
                        </TableCell>
                      )}
                      <TableCell>{item.jenisTagihan.nama}</TableCell>
                      <TableCell>
                        {item.bulan ? `${BULAN_INDONESIA[item.bulan - 1].substring(0, 3)} ${item.tahun}` : '-'}
                      </TableCell>
                      <TableCell className="text-right">{formatCurrency(item.jumlahTagihan)}</TableCell>
                      <TableCell className="text-right text-green-600">{formatCurrency(item.jumlahDibayar)}</TableCell>
                      <TableCell className="text-right text-red-600">
                        {formatCurrency(Number(item.jumlahTagihan) - Number(item.jumlahDibayar))}
                      </TableCell>
                      <TableCell>
                        <Badge variant={
                          item.status === 'LUNAS' ? 'success' : 
                          item.status === 'SEBAGIAN' ? 'warning' : 'danger'
                        }>
                          {item.status === 'LUNAS' ? 'Lunas' : item.status === 'SEBAGIAN' ? 'Sebagian' : 'Belum'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {!loading && data.length > 0 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Halaman {page} dari {pagination.totalPages} ({data.length} data ditampilkan)
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
              disabled={page >= pagination.totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
