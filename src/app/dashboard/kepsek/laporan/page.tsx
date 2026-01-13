'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Spinner } from '@/components/ui/spinner'
import { formatCurrency, BULAN_INDONESIA } from '@/lib/utils'
import { FileSpreadsheet, FileText, Filter, Eye } from 'lucide-react'
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
  siswa: { nama: string; nipd: string; kelasNama: string }
  jenisTagihan: { nama: string; kategori: string }
}

interface Summary {
  totalTagihan: number
  totalTerbayar: number
  jumlahLunas: number
  jumlahBelumLunas: number
}

const kelasOptions = [
  { value: '', label: 'Semua Kelas' },
  ...['1A', '1B', '2A', '2B', '3A', '3B', '4A', '4B', '5A', '5B', '6A', '6B'].map(k => ({ value: k, label: k }))
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

export default function KepsekLaporanPage() {
  const [data, setData] = useState<LaporanItem[]>([])
  const [summary, setSummary] = useState<Summary | null>(null)
  const [loading, setLoading] = useState(true)
  const [tahunAjaran, setTahunAjaran] = useState('')
  const [kelas, setKelas] = useState('')
  const [bulan, setBulan] = useState('')
  const [status, setStatus] = useState('')

  const fetchData = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (kelas) params.set('kelas', kelas)
    if (bulan) params.set('bulan', bulan)
    if (status) params.set('status', status)
    
    const res = await fetch(`/api/laporan?${params}`)
    const json = await res.json()
    setData(json.data || [])
    setSummary(json.summary || null)
    setTahunAjaran(json.tahunAjaran || '')
    setLoading(false)
  }, [kelas, bulan, status])

  useEffect(() => { fetchData() }, [fetchData])

  const exportToPDF = () => {
    const doc = new jsPDF()
    doc.setFontSize(16)
    doc.text(`Laporan Pembayaran SPP - TA ${tahunAjaran}`, 14, 15)
    autoTable(doc, {
      startY: 25,
      head: [['NIPD', 'Nama', 'Kelas', 'Jenis', 'Tagihan', 'Terbayar', 'Status']],
      body: data.map(item => [
        item.siswa.nipd, item.siswa.nama, item.siswa.kelasNama, item.jenisTagihan.nama,
        formatCurrency(item.jumlahTagihan), formatCurrency(item.jumlahDibayar),
        item.status === 'LUNAS' ? 'Lunas' : 'Belum'
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [34, 197, 94] }
    })
    doc.save(`laporan-kepsek-${new Date().toISOString().split('T')[0]}.pdf`)
  }

  const exportToExcel = () => {
    const ws = XLSX.utils.json_to_sheet(data.map(item => ({
      NIPD: item.siswa.nipd,
      Nama: item.siswa.nama,
      Kelas: item.siswa.kelasNama,
      'Jenis Tagihan': item.jenisTagihan.nama,
      Tagihan: Number(item.jumlahTagihan),
      Terbayar: Number(item.jumlahDibayar),
      Status: item.status
    })))
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Laporan')
    XLSX.writeFile(wb, `laporan-kepsek-${new Date().toISOString().split('T')[0]}.xlsx`)
  }

  return (
    <div className="space-y-6">
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-center gap-3">
        <Eye className="w-5 h-5 text-yellow-600" />
        <p className="text-sm text-yellow-800">Mode read-only - Data hanya dapat dilihat dan diekspor</p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Filter className="w-4 h-4" />Filter
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Select label="Kelas" options={kelasOptions} value={kelas} onChange={(e) => setKelas(e.target.value)} />
            <Select label="Bulan" options={bulanOptions} value={bulan} onChange={(e) => setBulan(e.target.value)} />
            <Select label="Status" options={statusOptions} value={status} onChange={(e) => setStatus(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col sm:flex-row justify-between gap-4">
        {summary && (
          <div className="flex flex-wrap gap-4 text-sm">
            <div><span className="text-gray-500">Total:</span> <span className="font-semibold">{formatCurrency(summary.totalTagihan)}</span></div>
            <div><span className="text-gray-500">Terbayar:</span> <span className="font-semibold text-green-600">{formatCurrency(summary.totalTerbayar)}</span></div>
          </div>
        )}
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportToExcel}><FileSpreadsheet className="w-4 h-4 mr-2" />Excel</Button>
          <Button variant="outline" onClick={exportToPDF}><FileText className="w-4 h-4 mr-2" />PDF</Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12"><Spinner /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>NIPD</TableHead>
                  <TableHead>Nama</TableHead>
                  <TableHead>Kelas</TableHead>
                  <TableHead>Jenis</TableHead>
                  <TableHead className="text-right">Tagihan</TableHead>
                  <TableHead className="text-right">Terbayar</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.slice(0, 100).map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-mono text-xs">{item.siswa.nipd}</TableCell>
                    <TableCell>{item.siswa.nama}</TableCell>
                    <TableCell><Badge variant="info">{item.siswa.kelasNama}</Badge></TableCell>
                    <TableCell>{item.jenisTagihan.nama}</TableCell>
                    <TableCell className="text-right">{formatCurrency(item.jumlahTagihan)}</TableCell>
                    <TableCell className="text-right text-green-600">{formatCurrency(item.jumlahDibayar)}</TableCell>
                    <TableCell>
                      <Badge variant={item.status === 'LUNAS' ? 'success' : 'danger'}>
                        {item.status === 'LUNAS' ? 'Lunas' : 'Belum'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
