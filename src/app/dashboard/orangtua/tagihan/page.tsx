'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Spinner } from '@/components/ui/spinner'
import { formatCurrency, BULAN_INDONESIA } from '@/lib/utils'
import { Calendar, CreditCard, Check, X as XIcon } from 'lucide-react'

interface Tagihan {
  id: string
  bulan: number | null
  tahun: number | null
  jumlahTagihan: number
  jumlahDibayar: number
  status: string
  jenisTagihan: { nama: string; kategori: string }
}

type TabType = 'bulanan' | 'sekalibayar'

export default function TagihanOrangTuaPage() {
  const [tagihan, setTagihan] = useState<Tagihan[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<TabType>('bulanan')

  useEffect(() => {
    fetch('/api/orangtua/data')
      .then(res => res.json())
      .then(data => setTagihan(data.tagihan || []))
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

const tagihanBulanan = tagihan
    .filter(t => {
      // Handle comma-separated kategori
      const kategori = t.jenisTagihan.kategori.split(',')
      return kategori.includes('BULANAN')
    })
    .sort((a, b) => {
      const orderA = a.bulan! >= 7 ? a.bulan! - 7 : a.bulan! + 5
      const orderB = b.bulan! >= 7 ? b.bulan! - 7 : b.bulan! + 5
      return orderA - orderB
    })
  
  const tagihanSekaliBayar = tagihan.filter(t => {
    // Handle comma-separated kategori - filter non-bulanan
    const kategori = t.jenisTagihan.kategori.split(',')
    return kategori.includes('TAHUNAN') || kategori.includes('INSIDENTAL')
  })

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'LUNAS':
        return <Badge variant="success">Lunas</Badge>
      case 'SEBAGIAN':
        return <Badge variant="warning">Sebagian</Badge>
      default:
        return <Badge variant="danger">Belum Bayar</Badge>
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-gray-900">Tagihan</h1>

      {/* Tabs */}
      <div className="flex gap-2 bg-gray-100 p-1 rounded-lg">
        <button
          onClick={() => setActiveTab('bulanan')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'bulanan'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-600'
          }`}
        >
          <Calendar className="w-4 h-4" />
          SPP Bulanan
        </button>
        <button
          onClick={() => setActiveTab('sekalibayar')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'sekalibayar'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-600'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          Sekali Bayar
        </button>
      </div>

      {/* Content */}
      {activeTab === 'bulanan' ? (
        <div className="space-y-3">
          {tagihanBulanan.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              Tidak ada tagihan bulanan
            </div>
          ) : (
            tagihanBulanan.map((t) => {
              const sisa = Number(t.jumlahTagihan) - Number(t.jumlahDibayar)
              const isLunas = t.status === 'LUNAS'
              
              return (
                <Card key={t.id} className={isLunas ? 'bg-green-50 border-green-200' : ''}>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          isLunas ? 'bg-green-100' : 'bg-gray-100'
                        }`}>
                          {isLunas ? (
                            <Check className="w-5 h-5 text-green-600" />
                          ) : (
                            <XIcon className="w-5 h-5 text-gray-400" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">
                            {BULAN_INDONESIA[t.bulan! - 1]} {t.tahun}
                          </p>
                          <p className="text-sm text-gray-500">{t.jenisTagihan.nama}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        {getStatusBadge(t.status)}
                        <p className="text-sm font-medium mt-1">
                          {formatCurrency(t.jumlahTagihan)}
                        </p>
                        {!isLunas && sisa > 0 && (
                          <p className="text-xs text-red-500">
                            Sisa: {formatCurrency(sisa)}
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {tagihanSekaliBayar.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              Tidak ada tagihan sekali bayar
            </div>
          ) : (
            tagihanSekaliBayar.map((t) => {
              const sisa = Number(t.jumlahTagihan) - Number(t.jumlahDibayar)
              const isLunas = t.status === 'LUNAS'
              
              return (
                <Card key={t.id} className={isLunas ? 'bg-green-50 border-green-200' : ''}>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          isLunas ? 'bg-green-100' : 'bg-gray-100'
                        }`}>
                          {isLunas ? (
                            <Check className="w-5 h-5 text-green-600" />
                          ) : (
                            <XIcon className="w-5 h-5 text-gray-400" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{t.jenisTagihan.nama}</p>
                          <p className="text-sm text-gray-500">Tagihan Sekali Bayar</p>
                        </div>
                      </div>
                      <div className="text-right">
                        {getStatusBadge(t.status)}
                        <p className="text-sm font-medium mt-1">
                          {formatCurrency(t.jumlahTagihan)}
                        </p>
                        {!isLunas && sisa > 0 && (
                          <p className="text-xs text-red-500">
                            Sisa: {formatCurrency(sisa)}
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })
          )}
        </div>
      )}

      {/* Summary */}
      <Card className="bg-gray-50">
        <CardContent className="p-4">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Total Tagihan:</span>
            <span className="font-medium">
              {formatCurrency(tagihan.reduce((acc, t) => acc + Number(t.jumlahTagihan), 0))}
            </span>
          </div>
          <div className="flex justify-between text-sm mt-1">
            <span className="text-gray-600">Sudah Dibayar:</span>
            <span className="font-medium text-green-600">
              {formatCurrency(tagihan.reduce((acc, t) => acc + Number(t.jumlahDibayar), 0))}
            </span>
          </div>
          <div className="flex justify-between text-sm mt-1 pt-2 border-t">
            <span className="text-gray-900 font-medium">Sisa Tagihan:</span>
            <span className="font-bold text-red-600">
              {formatCurrency(tagihan.reduce((acc, t) => 
                acc + (Number(t.jumlahTagihan) - Number(t.jumlahDibayar)), 0
              ))}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
