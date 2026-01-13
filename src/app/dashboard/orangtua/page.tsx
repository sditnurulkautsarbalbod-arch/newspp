'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Spinner } from '@/components/ui/spinner'
import { formatCurrency, formatDate, BULAN_INDONESIA } from '@/lib/utils'
import { 
  User, 
  Wallet, 
  CheckCircle2, 
  AlertCircle,
  Clock
} from 'lucide-react'
import Link from 'next/link'

interface SiswaData {
  siswa: {
    nama: string
    nipd: string
    kelas: string
    tahunAjaran: string
  }
  summary: {
    totalTagihan: number
    totalTerbayar: number
    sisaBelumBayar: number
    tagihanBelumLunas: number
    tagihanLunas: number
  }
  recentPayments: Array<{
    id: string
    nomorKuitansi: string
    jumlahBayar: number
    tanggalBayar: string
    jenisTagihan: string
    bulan: number | null
    tahun: number | null
  }>
}

export default function OrangTuaDashboard() {
  const { data: session } = useSession()
  const [data, setData] = useState<SiswaData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/orangtua/data')
      .then(res => res.json())
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spinner size="lg" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Gagal memuat data</p>
      </div>
    )
  }

  const { siswa, summary, recentPayments } = data

  return (
    <div className="space-y-6">
      {/* Student Info Card */}
      <Card className="bg-gradient-to-br from-blue-600 to-blue-700 text-white border-0">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center">
              <User className="w-7 h-7" />
            </div>
            <div>
              <h2 className="text-xl font-bold">{siswa.nama}</h2>
              <p className="text-blue-100">NIPD: {siswa.nipd}</p>
              <div className="flex gap-2 mt-1">
                <Badge className="bg-white/20 text-white border-0">
                  Kelas {siswa.kelas}
                </Badge>
                <Badge className="bg-white/20 text-white border-0">
                  TA {siswa.tahunAjaran}
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-50">
                <AlertCircle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Sisa Tagihan</p>
                <p className="text-lg font-bold text-red-600">
                  {formatCurrency(summary.sisaBelumBayar)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-50">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Sudah Dibayar</p>
                <p className="text-lg font-bold text-green-600">
                  {formatCurrency(summary.totalTerbayar)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Progress */}
      <Card>
        <CardContent className="p-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-gray-600">Progress Pembayaran</span>
            <span className="text-sm font-medium">
              {summary.tagihanLunas}/{summary.tagihanLunas + summary.tagihanBelumLunas} Lunas
            </span>
          </div>
          <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className="h-full bg-green-500 rounded-full transition-all duration-500"
              style={{ 
                width: `${summary.totalTagihan > 0 
                  ? (summary.totalTerbayar / summary.totalTagihan) * 100 
                  : 0}%` 
              }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-4">
        <Link href="/dashboard/orangtua/tagihan">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="p-4 text-center">
              <Wallet className="w-8 h-8 mx-auto mb-2 text-blue-600" />
              <p className="font-medium text-gray-900">Lihat Tagihan</p>
              <p className="text-xs text-gray-500">{summary.tagihanBelumLunas} belum lunas</p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/dashboard/orangtua/histori">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="p-4 text-center">
              <Clock className="w-8 h-8 mx-auto mb-2 text-purple-600" />
              <p className="font-medium text-gray-900">Histori</p>
              <p className="text-xs text-gray-500">Riwayat pembayaran</p>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Recent Payments */}
      {recentPayments.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Pembayaran Terakhir</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-gray-100">
              {recentPayments.map((payment) => (
                <div key={payment.id} className="px-6 py-3 flex justify-between items-center">
                  <div>
                    <p className="font-medium text-gray-900 text-sm">
                      {payment.jenisTagihan}
                      {payment.bulan && ` - ${BULAN_INDONESIA[payment.bulan - 1]}`}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatDate(payment.tanggalBayar)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-green-600 text-sm">
                      {formatCurrency(payment.jumlahBayar)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
