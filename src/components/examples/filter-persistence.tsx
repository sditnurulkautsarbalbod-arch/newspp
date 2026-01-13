'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { setCookie, getCookie, deleteCookie, type CookieOptions } from '@/lib/cookies'

// Tipe data filter yang akan disimpan
interface FilterCookies {
  tahunAjaranId: string
  kelasId: string
  selectedKelas: string
  selectedSiswa: string
  pageSize: string
}

export function FilterPersistenceExample() {
  const [filters, setFilters] = useState<FilterCookies>({
    tahunAjaranId: '',
    kelasId: '',
    selectedKelas: '',
    selectedSiswa: '',
    pageSize: '50'
  })

  // Load filters dari cookies saat mount
  useEffect(() => {
    const loadFilters = async () => {
      try {
        const savedFilters = await getCookie('pembayaran-filters')
        if (savedFilters) {
          const parsed = JSON.parse(savedFilters) as FilterCookies
          setFilters(parsed)
        }
      } catch (error) {
        console.error('Gagal memuat filter dari cookies:', error)
      }
    }
    loadFilters()
  }, [])

  // Simpan filters ke cookies saat berubah (debounced)
  useEffect(() => {
    const saveFilters = async () => {
      try {
        await setCookie('pembayaran-filters', JSON.stringify(filters), {
          maxAge: 60 * 60 * 24 * 30, // 30 hari
          httpOnly: false, // Bisa diakses dari client
          path: '/'
        })
      } catch (error) {
        console.error('Gagal menyimpan filter ke cookies:', error)
      }
    }

    // Debounce untuk mengurangi penulisan ke cookies
    const timer = setTimeout(saveFilters, 500)
    return () => clearTimeout(timer)
  }, [filters])

  const handleResetFilters = async () => {
    const defaultFilters: FilterCookies = {
      tahunAjaranId: '',
      kelasId: '',
      selectedKelas: '',
      selectedSiswa: '',
      pageSize: '50'
    }
    setFilters(defaultFilters)
    await deleteCookie('pembayaran-filters')
  }

  const handleSetTahunAjaran = (id: string) => {
    setFilters(prev => ({ ...prev, tahunAjaranId: id }))
  }

  const handleSetKelas = (kelas: string) => {
    setFilters(prev => ({ ...prev, selectedKelas: kelas }))
  }

  return (
    <Card className="w-full max-w-2xl mx-auto mt-8">
      <CardHeader>
        <CardTitle>Pengaturan Filter Pembayaran</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="text-sm font-medium mb-2 block">Tahun Ajaran</label>
          <input
            type="text"
            value={filters.tahunAjaranId}
            onChange={(e) => handleSetTahunAjaran(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg"
            placeholder="Masukkan ID Tahun Ajaran"
          />
        </div>

        <div>
          <label className="text-sm font-medium mb-2 block">Kelas</label>
          <input
            type="text"
            value={filters.selectedKelas}
            onChange={(e) => handleSetKelas(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg"
            placeholder="Contoh: 1A, 2B, 3A"
          />
        </div>

        <div>
          <label className="text-sm font-medium mb-2 block">Baris Per Halaman</label>
          <input
            type="number"
            value={filters.pageSize}
            onChange={(e) => setFilters(prev => ({ ...prev, pageSize: e.target.value }))}
            className="w-full px-3 py-2 border rounded-lg"
            min="10"
            max="200"
            step="10"
          />
        </div>

        <div className="pt-4 border-t">
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleResetFilters}>
              Reset Filter
            </Button>
            <Button onClick={() => alert('Filter disimpan!')}>
              Simpan Filter
            </Button>
          </div>
        </div>

        {/* Debug: Show cookie value */}
        <div className="mt-4 p-3 bg-gray-50 rounded text-xs">
          <p className="font-medium mb-1">Cookie saat ini:</p>
          <pre className="overflow-auto max-h-32">
            {JSON.stringify(filters, null, 2)}
          </pre>
        </div>
      </CardContent>
    </Card>
  )
}
