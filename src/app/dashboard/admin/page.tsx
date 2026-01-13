'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Spinner } from '@/components/ui/spinner'
import { formatCurrency } from '@/lib/utils'
import { 
  Users, 
  Wallet, 
  TrendingUp, 
  AlertCircle,
  CheckCircle2
} from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts'

interface DashboardStats {
  totalSiswa: number
  totalTagihan: number
  totalTerbayar: number
  totalBelumLunas: number
  persentaseLunas: number
  pembayaranBulanIni: { bulan: string; total: number }[]
  tagihanPerJenis: {
    nama: string
    totalTagihan: number
    totalTerbayar: number
    jumlahLunas: number
    jumlahBelumLunas: number
  }[]
  tahunAjaran?: string
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6']

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/dashboard/stats')
      .then(res => res.json())
      .then(data => {
        setStats(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spinner size="lg" />
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Gagal memuat data dashboard</p>
      </div>
    )
  }

  const statCards = [
    {
      title: 'Total Siswa',
      value: stats.totalSiswa,
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    {
      title: 'Total Tagihan',
      value: formatCurrency(stats.totalTagihan),
      icon: Wallet,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50'
    },
    {
      title: 'Total Terbayar',
      value: formatCurrency(stats.totalTerbayar),
      icon: TrendingUp,
      color: 'text-green-600',
      bgColor: 'bg-green-50'
    },
    {
      title: 'Belum Terbayar',
      value: formatCurrency(stats.totalBelumLunas),
      icon: AlertCircle,
      color: 'text-red-600',
      bgColor: 'bg-red-50'
    }
  ]

  return (
    <div className="space-y-6">
      {/* Tahun Ajaran Badge */}
      {stats.tahunAjaran && (
        <div className="flex items-center gap-2">
          <Badge variant="info">Tahun Ajaran {stats.tahunAjaran}</Badge>
        </div>
      )}

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, index) => (
          <Card key={index}>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                  <stat.icon className={`w-6 h-6 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-sm text-gray-500">{stat.title}</p>
                  <p className="text-xl font-bold text-gray-900">{stat.value}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Progress Pembayaran */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-600" />
            Progress Pembayaran
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="h-4 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-green-500 rounded-full transition-all duration-500"
                  style={{ width: `${stats.persentaseLunas}%` }}
                />
              </div>
            </div>
            <span className="text-lg font-bold text-gray-900">
              {stats.persentaseLunas}%
            </span>
          </div>
          <p className="text-sm text-gray-500 mt-2">
            {stats.persentaseLunas}% tagihan sudah lunas
          </p>
        </CardContent>
      </Card>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pembayaran per Bulan */}
        <Card>
          <CardHeader>
            <CardTitle>Pembayaran 6 Bulan Terakhir</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              {stats.pembayaranBulanIni.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.pembayaranBulanIni}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="bulan" tick={{ fontSize: 12 }} />
                    <YAxis 
                      tick={{ fontSize: 12 }}
                      tickFormatter={(value) => `${(value / 1000000).toFixed(1)}jt`}
                    />
                    <Tooltip 
                      formatter={(value) => formatCurrency(Number(value))}
                      labelFormatter={(label) => `Bulan: ${label}`}
                    />
                    <Bar dataKey="total" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500">
                  Belum ada data pembayaran
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Tagihan per Jenis */}
        <Card>
          <CardHeader>
            <CardTitle>Tagihan per Jenis</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              {stats.tagihanPerJenis.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={stats.tagihanPerJenis}
                      dataKey="totalTagihan"
                      nameKey="nama"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      label={({ name, percent }) => `${name} (${((percent ?? 0) * 100).toFixed(0)}%)`}
                    >
                      {stats.tagihanPerJenis.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500">
                  Belum ada data tagihan
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detail Tagihan per Jenis */}
      <Card>
        <CardHeader>
          <CardTitle>Detail Tagihan per Jenis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Jenis Tagihan</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-500">Total Tagihan</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-500">Terbayar</th>
                  <th className="text-center py-3 px-4 font-medium text-gray-500">Lunas</th>
                  <th className="text-center py-3 px-4 font-medium text-gray-500">Belum Lunas</th>
                </tr>
              </thead>
              <tbody>
                {stats.tagihanPerJenis.map((jenis, index) => (
                  <tr key={index} className="border-b border-gray-100">
                    <td className="py-3 px-4 font-medium text-gray-900">{jenis.nama}</td>
                    <td className="py-3 px-4 text-right text-gray-600">
                      {formatCurrency(jenis.totalTagihan)}
                    </td>
                    <td className="py-3 px-4 text-right text-green-600">
                      {formatCurrency(jenis.totalTerbayar)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <Badge variant="success">{jenis.jumlahLunas}</Badge>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <Badge variant="danger">{jenis.jumlahBelumLunas}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
