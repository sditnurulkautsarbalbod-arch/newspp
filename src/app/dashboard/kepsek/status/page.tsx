'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Spinner } from '@/components/ui/spinner'
import { BULAN_INDONESIA } from '@/lib/utils'
import { Search, Check, X as XIcon, Calendar, CreditCard, Eye } from 'lucide-react'

interface Siswa {
  id: string
  nama: string
  nipd: string
  kelasNama: string
}

interface TagihanGrouped {
  siswa: Siswa
  bulanan: { bulan: number; tahun: number; status: string }[]
  sekaliBayar: { nama: string; status: string }[]
}

type TabType = 'bulanan' | 'sekalibayar'

const kelasOptions = [
  { value: '', label: 'Semua Kelas' },
  ...['1A', '1B', '2A', '2B', '3A', '3B', '4A', '4B', '5A', '5B', '6A', '6B'].map(k => ({ value: k, label: `Kelas ${k}` }))
]

const BULAN_ORDER = [7, 8, 9, 10, 11, 12, 1, 2, 3, 4, 5, 6]

export default function KepsekStatusPage() {
  const [data, setData] = useState<TagihanGrouped[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [kelas, setKelas] = useState('')
  const [activeTab, setActiveTab] = useState<TabType>('bulanan')
  const [tahunAjaran, setTahunAjaran] = useState<{ nama: string; tahunMulai: number } | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (kelas) params.set('kelas', kelas)
    
    const res = await fetch(`/api/tagihan?${params}`)
    const json = await res.json()
    
    if (json.tahunAjaran) setTahunAjaran(json.tahunAjaran)

    const grouped: Record<string, TagihanGrouped> = {}
    for (const tagihan of json.data || []) {
      const siswaId = tagihan.siswa.id
      if (!grouped[siswaId]) {
        grouped[siswaId] = { siswa: tagihan.siswa, bulanan: [], sekaliBayar: [] }
      }
      if (tagihan.jenisTagihan.kategori === 'BULANAN') {
        grouped[siswaId].bulanan.push({
          bulan: tagihan.bulan,
          tahun: tagihan.tahun,
          status: tagihan.status
        })
      } else {
        grouped[siswaId].sekaliBayar.push({
          nama: tagihan.jenisTagihan.nama,
          status: tagihan.status
        })
      }
    }
    setData(Object.values(grouped))
    setLoading(false)
  }, [kelas])

  useEffect(() => { fetchData() }, [fetchData])

  const filteredData = data.filter(item => {
    if (!search) return true
    return item.siswa.nama.toLowerCase().includes(search.toLowerCase()) || item.siswa.nipd.includes(search)
  })

  const getBulanHeaders = () => {
    if (!tahunAjaran) return []
    return BULAN_ORDER.map((bulan, idx) => ({
      bulan,
      tahun: idx < 6 ? tahunAjaran.tahunMulai : tahunAjaran.tahunMulai + 1,
      label: BULAN_INDONESIA[bulan - 1].substring(0, 3)
    }))
  }

  return (
    <div className="space-y-6">
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-center gap-3">
        <Eye className="w-5 h-5 text-yellow-600" />
        <p className="text-sm text-yellow-800">Mode read-only</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input placeholder="Cari nama atau NIPD..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select options={kelasOptions} value={kelas} onChange={(e) => setKelas(e.target.value)} className="w-full sm:w-40" />
      </div>

      <div className="flex gap-2 border-b">
        <button onClick={() => setActiveTab('bulanan')} className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 ${activeTab === 'bulanan' ? 'border-green-600 text-green-600' : 'border-transparent text-gray-500'}`}>
          <Calendar className="w-4 h-4" />SPP Bulanan
        </button>
        <button onClick={() => setActiveTab('sekalibayar')} className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 ${activeTab === 'sekalibayar' ? 'border-green-600 text-green-600' : 'border-transparent text-gray-500'}`}>
          <CreditCard className="w-4 h-4" />Sekali Bayar
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12"><Spinner size="lg" /></div>
      ) : activeTab === 'bulanan' ? (
        <Card>
          <CardHeader><CardTitle>Status SPP - TA {tahunAjaran?.nama}</CardTitle></CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left py-3 px-4 font-medium text-gray-500 sticky left-0 bg-gray-50 min-w-[180px]">Siswa</th>
                  {getBulanHeaders().map((h, i) => (
                    <th key={i} className="text-center py-3 px-2 font-medium text-gray-500 min-w-[60px]">
                      <div>{h.label}</div><div className="text-xs font-normal">{h.tahun}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredData.map((item) => (
                  <tr key={item.siswa.id} className="border-b border-gray-100">
                    <td className="py-3 px-4 sticky left-0 bg-white">
                      <p className="font-medium">{item.siswa.nama}</p>
                      <p className="text-xs text-gray-500">{item.siswa.nipd} • {item.siswa.kelasNama}</p>
                    </td>
                    {getBulanHeaders().map((h, i) => {
                      const tagihan = item.bulanan.find(b => b.bulan === h.bulan && b.tahun === h.tahun)
                      return (
                        <td key={i} className="py-3 px-2 text-center">
                          {tagihan?.status === 'LUNAS' ? (
                            <span className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center mx-auto">
                              <Check className="w-4 h-4 text-green-600" />
                            </span>
                          ) : (
                            <span className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center mx-auto">
                              <XIcon className="w-4 h-4 text-red-500" />
                            </span>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader><CardTitle>Status Tagihan Sekali Bayar</CardTitle></CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left py-3 px-4 font-medium text-gray-500 min-w-[180px]">Siswa</th>
                  <th className="text-center py-3 px-4 font-medium text-gray-500">Uang Pangkal</th>
                  <th className="text-center py-3 px-4 font-medium text-gray-500">Seragam</th>
                  <th className="text-center py-3 px-4 font-medium text-gray-500">Buku</th>
                  <th className="text-center py-3 px-4 font-medium text-gray-500">Infaq</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.map((item) => {
                  const getStatus = (nama: string) => item.sekaliBayar.find(t => t.nama === nama)?.status
                  const renderIcon = (nama: string) => {
                    const s = getStatus(nama)
                    if (s === 'LUNAS') return <span className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center mx-auto"><Check className="w-4 h-4 text-green-600" /></span>
                    return <span className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center mx-auto"><XIcon className="w-4 h-4 text-red-500" /></span>
                  }
                  return (
                    <tr key={item.siswa.id} className="border-b border-gray-100">
                      <td className="py-3 px-4"><p className="font-medium">{item.siswa.nama}</p><p className="text-xs text-gray-500">{item.siswa.nipd}</p></td>
                      <td className="py-3 px-4 text-center">{renderIcon('Uang Pangkal')}</td>
                      <td className="py-3 px-4 text-center">{renderIcon('Seragam')}</td>
                      <td className="py-3 px-4 text-center">{renderIcon('Buku')}</td>
                      <td className="py-3 px-4 text-center">{renderIcon('Infaq')}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
