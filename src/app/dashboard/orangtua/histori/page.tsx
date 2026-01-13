'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { formatCurrency, formatDate, BULAN_INDONESIA } from '@/lib/utils'
import { Receipt, Download, Calendar } from 'lucide-react'

interface Payment {
  id: string
  nomorKuitansi: string
  jumlahBayar: number
  tanggalBayar: string
  metodeBayar: string
  jenisTagihan: string
  bulan: number | null
  tahun: number | null
}

export default function HistoriOrangTuaPage() {
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/orangtua/data')
      .then(res => res.json())
      .then(data => {
        // Get all payments from tagihan
        const allPayments = (data.tagihan || []).flatMap((t: any) => 
          (t.pembayaran || []).map((p: any) => ({
            ...p,
            jenisTagihan: t.jenisTagihan.nama,
            bulan: t.bulan,
            tahun: t.tahun
          }))
        ).sort((a: Payment, b: Payment) => 
          new Date(b.tanggalBayar).getTime() - new Date(a.tanggalBayar).getTime()
        )
        setPayments(allPayments)
      })
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

  // Group by month
  const groupedPayments: Record<string, Payment[]> = {}
  payments.forEach(p => {
    const date = new Date(p.tanggalBayar)
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    if (!groupedPayments[key]) groupedPayments[key] = []
    groupedPayments[key].push(p)
  })

  const formatMonthYear = (key: string) => {
    const [year, month] = key.split('-')
    return `${BULAN_INDONESIA[parseInt(month) - 1]} ${year}`
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-gray-900">Histori Pembayaran</h1>

      {payments.length === 0 ? (
        <div className="text-center py-12">
          <Receipt className="w-12 h-12 mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500">Belum ada riwayat pembayaran</p>
        </div>
      ) : (
        Object.entries(groupedPayments).map(([monthKey, monthPayments]) => (
          <div key={monthKey}>
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="w-4 h-4 text-gray-400" />
              <h2 className="text-sm font-medium text-gray-500">
                {formatMonthYear(monthKey)}
              </h2>
            </div>
            <div className="space-y-3">
              {monthPayments.map((payment) => (
                <Card key={payment.id}>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">
                          {payment.jenisTagihan}
                          {payment.bulan && ` - ${BULAN_INDONESIA[payment.bulan - 1]}`}
                        </p>
                        <p className="text-sm text-gray-500 mt-0.5">
                          {formatDate(payment.tanggalBayar)}
                        </p>
                        <div className="flex gap-2 mt-2">
                          <Badge variant="info" className="text-xs">
                            {payment.nomorKuitansi}
                          </Badge>
                          {payment.metodeBayar && (
                            <Badge variant="default" className="text-xs">
                              {payment.metodeBayar}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-green-600">
                          {formatCurrency(payment.jumlahBayar)}
                        </p>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="mt-1 text-xs"
                          onClick={() => window.open(`/api/kuitansi/${payment.nomorKuitansi}`, '_blank')}
                        >
                          <Download className="w-3 h-3 mr-1" />
                          Kuitansi
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))
      )}

      {/* Total */}
      {payments.length > 0 && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex justify-between items-center">
              <span className="text-blue-900 font-medium">Total Pembayaran</span>
              <span className="text-xl font-bold text-blue-700">
                {formatCurrency(payments.reduce((acc, p) => acc + Number(p.jumlahBayar), 0))}
              </span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
