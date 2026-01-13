'use client'

import { useState, useEffect, useCallback } from 'react'
import { ChevronDown, X } from 'lucide-react'

interface FilterOption {
  value: string
  label: string
}

interface FilterDropdownProps {
  label: string
  value: string
  options: FilterOption[]
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  loading?: boolean
  className?: string
}

export function FilterDropdown({
  label,
  value,
  options,
  onChange,
  placeholder = 'Semua',
  disabled = false,
  loading = false,
  className = '',
}: FilterDropdownProps) {
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <label className="text-xs font-medium text-gray-600">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled || loading}
        className="px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
      >
        <option value="">{loading ? 'Loading...' : placeholder}</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  )
}

interface FilterBarProps {
  filters: {
    tahunAjaran?: boolean
    kelas?: boolean
    siswa?: boolean
    status?: boolean
    bulan?: boolean
  }
  values: {
    tahunAjaranId?: string
    kelasId?: string
    siswaId?: string
    status?: string
    bulan?: string
  }
  onChange: (key: string, value: string) => void
  onReset?: () => void
}

export function FilterBar({ filters, values, onChange, onReset }: FilterBarProps) {
  const [tahunAjaranList, setTahunAjaranList] = useState<FilterOption[]>([])
  const [kelasList, setKelasList] = useState<FilterOption[]>([])
  const [siswaList, setSiswaList] = useState<FilterOption[]>([])
  const [loading, setLoading] = useState({ tahunAjaran: false, kelas: false, siswa: false })

  const fetchTahunAjaran = useCallback(async () => {
    setLoading((l) => ({ ...l, tahunAjaran: true }))
    try {
      const res = await fetch('/api/manajemen/tahun-ajaran')
      const data = await res.json()
      setTahunAjaranList(
        data.map((t: { id: string; nama: string; aktif: boolean }) => ({
          value: t.id,
          label: t.aktif ? `${t.nama} (Aktif)` : t.nama,
        }))
      )
      // Auto-select aktif tahun ajaran if not selected
      if (!values.tahunAjaranId) {
        const aktif = data.find((t: { aktif: boolean }) => t.aktif)
        if (aktif) onChange('tahunAjaranId', aktif.id)
      }
    } catch (error) {
      console.error('Error fetching tahun ajaran:', error)
    } finally {
      setLoading((l) => ({ ...l, tahunAjaran: false }))
    }
  }, [values.tahunAjaranId, onChange])

  const fetchKelas = useCallback(async () => {
    if (!values.tahunAjaranId) {
      setKelasList([])
      return
    }
    setLoading((l) => ({ ...l, kelas: true }))
    try {
      const res = await fetch(`/api/manajemen/kelas?tahunAjaranId=${values.tahunAjaranId}`)
      const data = await res.json()
      setKelasList(
        data.map((k: { id: string; nama: string }) => ({
          value: k.id,
          label: k.nama,
        }))
      )
    } catch (error) {
      console.error('Error fetching kelas:', error)
    } finally {
      setLoading((l) => ({ ...l, kelas: false }))
    }
  }, [values.tahunAjaranId])

  const fetchSiswa = useCallback(async () => {
    setLoading((l) => ({ ...l, siswa: true }))
    try {
      let url = '/api/siswa?limit=500'
      if (values.tahunAjaranId) url += `&tahunAjaranId=${values.tahunAjaranId}`
      if (values.kelasId) url += `&kelasId=${values.kelasId}`
      
      const res = await fetch(url)
      const data = await res.json()
      const siswaData = data.data || data
      setSiswaList(
        siswaData.map((s: { id: string; nama: string; nipd: string }) => ({
          value: s.id,
          label: `${s.nama} (${s.nipd})`,
        }))
      )
    } catch (error) {
      console.error('Error fetching siswa:', error)
    } finally {
      setLoading((l) => ({ ...l, siswa: false }))
    }
  }, [values.tahunAjaranId, values.kelasId])

  useEffect(() => {
    if (filters.tahunAjaran) fetchTahunAjaran()
  }, [filters.tahunAjaran, fetchTahunAjaran])

  useEffect(() => {
    if (filters.kelas) fetchKelas()
  }, [filters.kelas, fetchKelas])

  useEffect(() => {
    if (filters.siswa) fetchSiswa()
  }, [filters.siswa, fetchSiswa])

  const statusOptions: FilterOption[] = [
    { value: 'LUNAS', label: 'Lunas' },
    { value: 'BELUM_LUNAS', label: 'Belum Lunas' },
    { value: 'SEBAGIAN', label: 'Sebagian' },
  ]

  const bulanOptions: FilterOption[] = [
    { value: '1', label: 'Januari' },
    { value: '2', label: 'Februari' },
    { value: '3', label: 'Maret' },
    { value: '4', label: 'April' },
    { value: '5', label: 'Mei' },
    { value: '6', label: 'Juni' },
    { value: '7', label: 'Juli' },
    { value: '8', label: 'Agustus' },
    { value: '9', label: 'September' },
    { value: '10', label: 'Oktober' },
    { value: '11', label: 'November' },
    { value: '12', label: 'Desember' },
  ]

  const hasActiveFilters = Object.values(values).some((v) => v)

  return (
    <div className="bg-white p-4 rounded-xl border border-gray-200">
      <div className="flex flex-wrap gap-4 items-end">
        {filters.tahunAjaran && (
          <FilterDropdown
            label="Tahun Ajaran"
            value={values.tahunAjaranId || ''}
            options={tahunAjaranList}
            onChange={(v) => {
              onChange('tahunAjaranId', v)
              onChange('kelasId', '')
              onChange('siswaId', '')
            }}
            loading={loading.tahunAjaran}
          />
        )}

        {filters.kelas && (
          <FilterDropdown
            label="Kelas"
            value={values.kelasId || ''}
            options={kelasList}
            onChange={(v) => {
              onChange('kelasId', v)
              onChange('siswaId', '')
            }}
            loading={loading.kelas}
            disabled={!values.tahunAjaranId}
          />
        )}

        {filters.siswa && (
          <FilterDropdown
            label="Siswa"
            value={values.siswaId || ''}
            options={siswaList}
            onChange={(v) => onChange('siswaId', v)}
            loading={loading.siswa}
            className="min-w-[200px]"
          />
        )}

        {filters.status && (
          <FilterDropdown
            label="Status"
            value={values.status || ''}
            options={statusOptions}
            onChange={(v) => onChange('status', v)}
          />
        )}

        {filters.bulan && (
          <FilterDropdown
            label="Bulan"
            value={values.bulan || ''}
            options={bulanOptions}
            onChange={(v) => onChange('bulan', v)}
          />
        )}

        {hasActiveFilters && onReset && (
          <button
            onClick={onReset}
            className="flex items-center gap-1 px-3 py-2 text-sm text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
            Reset
          </button>
        )}
      </div>
    </div>
  )
}

export function useFilters(initialValues: Record<string, string> = {}) {
  const [filters, setFilters] = useState(initialValues)

  const handleChange = useCallback((key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }))
  }, [])

  const handleReset = useCallback(() => {
    setFilters(initialValues)
  }, [initialValues])

  return { filters, handleChange, handleReset, setFilters }
}
