'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Spinner } from '@/components/ui/spinner'
import { formatCurrency } from '@/lib/utils'
import { Users, Wallet, TrendingUp, AlertCircle, CheckCircle2, Eye } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts'

interface DashboardStats {
  totalSiswa: number
  totalTagihan: number
  totalTerbayar: number
  totalBelumLunas: number
  persentaseLunas: number
  pembayaranBulanIni: { bulan: string; total: number }[]
  tagihanPerJenis: { nama: string; totalTagihan: number; totalTerbayar: number }[]
  tahunAjaran?: string
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6']

export default function KepsekDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/dashboard/stats')
      .then(res => res.json())
      .then(setStats)
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

  if (!stats) {
    return <div className="text-center py-12 text-gray-500">Gagal memuat data</div>
  }

  const statCards = [
    { title: 'Total Siswa', value: stats.totalSiswa, icon: Users, color: 'text-blue-600', bgColor: 'bg-blue-50' },
    { title: 'Total Tagihan', value: formatCurrency(stats.totalTagihan), icon: Wallet, color: 'text-purple-600', bgColor: 'bg-purple-50' },
    { title: 'Total Terbayar', value: formatCurrency(stats.totalTerbayar), icon: TrendingUp, color: 'text-green-600', bgColor: 'bg-green-50' },
    { title: 'Belum Terbayar', value: formatCurrency(stats.totalBelumLunas), icon: AlertCircle, color: 'text-red-600', bgColor: 'bg-red-50' }
  ]

  return (
    <div className="space-y-6">
      {/* Info Banner */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-center gap-3">
        <Eye className="w-5 h-5 text-yellow-600" />
        <p className="text-sm text-yellow-800">
          Anda login sebagai Kepala Sekolah. Halaman ini hanya untuk melihat data (read-only).
        </p>
      </div>

      {stats.tahunAjaran && (
        <Badge variant="info">Tahun Ajaran {stats.tahunAjaran}</Badge>
      )}

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
                  className="h-full bg-green-500 rounded-full"
                  style={{ width: `${stats.persentaseLunas}%` }}
                />
              </div>
            </div>
            <span className="text-lg font-bold">{stats.persentaseLunas}%</span>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>Pembayaran 6 Bulan Terakhir</CardTitle></CardHeader>
          <CardContent>
            <div className="h-[300px]">
              {stats.pembayaranBulanIni.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.pembayaranBulanIni}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="bulan" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `${(v/1000000).toFixed(1)}jt`} />
                    <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                    <Bar dataKey="total" fill="#10B981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500">Belum ada data</div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Tagihan per Jenis</CardTitle></CardHeader>
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
                      {stats.tagihanPerJenis.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500">Belum ada data</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
