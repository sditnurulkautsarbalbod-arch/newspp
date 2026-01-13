import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number | string): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num)
}

export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(d)
}

export function formatShortDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(d)
}

export function generateKuitansiNumber(format?: string, counter?: number): string {
  const now = new Date()
  const tahun = now.getFullYear().toString()
  const bulan = String(now.getMonth() + 1).padStart(2, '0')
  const tanggal = String(now.getDate()).padStart(2, '0')
  const nomor = counter ? String(counter).padStart(4, '0') : Math.random().toString(36).substring(2, 8).toUpperCase()
  
  // Default format if not provided
  const template = format || 'KWT/{tahun}/{bulan}/{tanggal}/{nomor}'
  
  return template
    .replace('{tahun}', tahun)
    .replace('{bulan}', bulan)
    .replace('{tanggal}', tanggal)
    .replace('{nomor}', nomor)
}

export const BULAN_INDONESIA = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
]

// Tahun ajaran dimulai dari Juli (bulan ke-7)
export function getBulanTahunAjaran(tahunMulai: number): Array<{ bulan: number; tahun: number; nama: string }> {
  const bulanTahunAjaran = []
  // Juli - Desember tahun pertama
  for (let i = 7; i <= 12; i++) {
    bulanTahunAjaran.push({
      bulan: i,
      tahun: tahunMulai,
      nama: `${BULAN_INDONESIA[i - 1]} ${tahunMulai}`
    })
  }
  // Januari - Juni tahun kedua
  for (let i = 1; i <= 6; i++) {
    bulanTahunAjaran.push({
      bulan: i,
      tahun: tahunMulai + 1,
      nama: `${BULAN_INDONESIA[i - 1]} ${tahunMulai + 1}`
    })
  }
  return bulanTahunAjaran
}
