'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Spinner } from '@/components/ui/spinner'
import { formatCurrency, formatDate, BULAN_INDONESIA } from '@/lib/utils'
import { ArrowLeft, User, Check, X as XIcon, CreditCard } from 'lucide-react'
import Link from 'next/link'

interface SiswaDetail {
  id: string
  nipd: string
  nama: string
  kelas?: { id: string; nama: string } | string
  kelasNama?: string
  jenisKelamin?: string
  tempatLahir?: string
  tanggalLahir?: string
  alamat?: string
  namaOrangTua?: string
  noTelepon?: string
  tahunAjaran: { nama: string }
  tagihan: Array<{
    id: string
    bulan: number | null
    tahun: number | null
    jumlahTagihan: number
    jumlahDibayar: number
    status: string
    jenisTagihan: { nama: string; kategori: string }
    pembayaran: Array<{
      id: string
      jumlahBayar: number
      tanggalBayar: string
      nomorKuitansi: string
    }>
  }>
}

export default function SiswaDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [siswa, setSiswa] = useState<SiswaDetail | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (params.id) {
      fetch(`/api/siswa/${params.id}`)
        .then(res => res.json())
        .then(setSiswa)
        .catch(console.error)
        .finally(() => setLoading(false))
    }
  }, [params.id])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spinner size="lg" />
      </div>
    )
  }

  if (!siswa) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Siswa tidak ditemukan</p>
        <Button variant="outline" className="mt-4" onClick={() => router.back()}>
          Kembali
        </Button>
      </div>
    )
  }

  const totalTagihan = siswa.tagihan.reduce((acc, t) => acc + Number(t.jumlahTagihan), 0)
  const totalTerbayar = siswa.tagihan.reduce((acc, t) => acc + Number(t.jumlahDibayar), 0)
  
  // Handle comma-separated kategori
  const tagihanBulanan = siswa.tagihan.filter(t => {
    const kategoriList = t.jenisTagihan.kategori.split(',')
    return kategoriList.includes('BULANAN')
  })
  
  const tagihanSekaliBayar = siswa.tagihan.filter(t => {
    const kategoriList = t.jenisTagihan.kategori.split(',')
    // Non-bulanan = TAHUNAN or INSIDENTAL
    return kategoriList.includes('TAHUNAN') || kategoriList.includes('INSIDENTAL')
  })

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Button variant="ghost" onClick={() => router.back()}>
        <ArrowLeft className="w-4 h-4 mr-2" />
        Kembali
      </Button>

      {/* Student Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
              <User className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl">{siswa.nama}</h2>
              <p className="text-sm font-normal text-gray-500">NIPD: {siswa.nipd}</p>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-gray-500">Kelas</p>
              <p className="font-medium">
                {typeof siswa.kelas === 'object' && siswa.kelas?.nama ? siswa.kelas.nama : (siswa.kelasNama || '-')}
              </p>
            </div>
            <div>
              <p className="text-gray-500">Tahun Ajaran</p>
              <p className="font-medium">{siswa.tahunAjaran.nama}</p>
            </div>
            <div>
              <p className="text-gray-500">Orang Tua</p>
              <p className="font-medium">{siswa.namaOrangTua || '-'}</p>
            </div>
            <div>
              <p className="text-gray-500">No. Telepon</p>
              <p className="font-medium">{siswa.noTelepon || '-'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-sm text-gray-500">Total Tagihan</p>
            <p className="text-lg font-bold">{formatCurrency(totalTagihan)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-sm text-gray-500">Terbayar</p>
            <p className="text-lg font-bold text-green-600">{formatCurrency(totalTerbayar)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-sm text-gray-500">Sisa</p>
            <p className="text-lg font-bold text-red-600">{formatCurrency(totalTagihan - totalTerbayar)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-sm text-gray-500">Lunas</p>
            <p className="text-lg font-bold">{siswa.tagihan.filter(t => t.status === 'LUNAS').length}/{siswa.tagihan.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* SPP Bulanan */}
      <Card>
        <CardHeader>
          <CardTitle>SPP Bulanan</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {tagihanBulanan
              .sort((a, b) => {
                const orderA = a.bulan! >= 7 ? a.bulan! - 7 : a.bulan! + 5
                const orderB = b.bulan! >= 7 ? b.bulan! - 7 : b.bulan! + 5
                return orderA - orderB
              })
              .map((t) => (
              <div key={t.id} className="px-6 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {t.status === 'LUNAS' ? (
                    <span className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                      <Check className="w-4 h-4 text-green-600" />
                    </span>
                  ) : (
                    <span className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                      <XIcon className="w-4 h-4 text-gray-400" />
                    </span>
                  )}
                  <div>
                    <p className="font-medium">{BULAN_INDONESIA[t.bulan! - 1]} {t.tahun}</p>
                    <p className="text-xs text-gray-500">{formatCurrency(t.jumlahTagihan)}</p>
                  </div>
                </div>
                <div className="text-right">
                  <Badge variant={t.status === 'LUNAS' ? 'success' : t.status === 'SEBAGIAN' ? 'warning' : 'danger'}>
                    {t.status === 'LUNAS' ? 'Lunas' : t.status === 'SEBAGIAN' ? 'Sebagian' : 'Belum'}
                  </Badge>
                  {t.pembayaran[0] && (
                    <p className="text-xs text-gray-500 mt-1">{formatDate(t.pembayaran[0].tanggalBayar)}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Sekali Bayar */}
      <Card>
        <CardHeader>
          <CardTitle>Tagihan Sekali Bayar</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {tagihanSekaliBayar.map((t) => (
              <div key={t.id} className="px-6 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {t.status === 'LUNAS' ? (
                    <span className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                      <Check className="w-4 h-4 text-green-600" />
                    </span>
                  ) : (
                    <span className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                      <CreditCard className="w-4 h-4 text-gray-400" />
                    </span>
                  )}
                  <div>
                    <p className="font-medium">{t.jenisTagihan.nama}</p>
                    <p className="text-xs text-gray-500">{formatCurrency(t.jumlahTagihan)}</p>
                  </div>
                </div>
                <div className="text-right">
                  <Badge variant={t.status === 'LUNAS' ? 'success' : 'danger'}>
                    {t.status === 'LUNAS' ? 'Lunas' : 'Belum'}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
