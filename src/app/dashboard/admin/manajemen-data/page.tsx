'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Calendar, Users, GraduationCap, ArrowUpCircle, UserMinus, UserPlus, History, DollarSign, ArrowLeftRight } from 'lucide-react'

const manajemenItems = [
  {
    href: '/dashboard/admin/manajemen-data/tahun-ajaran',
    label: 'Tahun Ajaran',
    description: 'Kelola tahun ajaran aktif dan histori',
    icon: Calendar,
    color: 'bg-blue-500',
  },
  {
    href: '/dashboard/admin/manajemen-data/kelas',
    label: 'Kelas',
    description: 'Kelola data kelas per tahun ajaran',
    icon: Users,
    color: 'bg-green-500',
  },
  {
    href: '/dashboard/admin/manajemen-data/kenaikan-kelas',
    label: 'Kenaikan Kelas',
    description: 'Proses kenaikan kelas siswa',
    icon: ArrowUpCircle,
    color: 'bg-orange-500',
  },
  {
    href: '/dashboard/admin/manajemen-data/kelulusan',
    label: 'Kelulusan',
    description: 'Proses kelulusan siswa kelas akhir',
    icon: GraduationCap,
    color: 'bg-purple-500',
  },
  {
    href: '/dashboard/admin/manajemen-data/siswa-masuk',
    label: 'Siswa Pindah Masuk',
    description: 'Daftarkan siswa pindahan baru',
    icon: UserPlus,
    color: 'bg-teal-500',
  },
  {
    href: '/dashboard/admin/manajemen-data/siswa-keluar',
    label: 'Siswa Pindah/Keluar',
    description: 'Proses siswa pindah atau keluar',
    icon: UserMinus,
    color: 'bg-red-500',
  },
  {
    href: '/dashboard/admin/manajemen-data/tarif-khusus',
    label: 'Tarif Khusus Siswa',
    description: 'Atur keringanan/beasiswa per siswa',
    icon: DollarSign,
    color: 'bg-yellow-500',
  },
  {
    href: '/dashboard/admin/manajemen-data/histori-siswa',
    label: 'Histori Siswa',
    description: 'Lihat riwayat perjalanan siswa',
    icon: History,
    color: 'bg-gray-500',
  },
  {
    href: '/dashboard/admin/manajemen-data/histori-pindah',
    label: 'Histori Pindah',
    description: 'Kelola data siswa pindah masuk & keluar',
    icon: ArrowLeftRight,
    color: 'bg-indigo-500',
  },
]

export default function ManajemenDataPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Manajemen Data</h1>
        <p className="text-gray-600 mt-1">
          Kelola tahun ajaran, kelas, kelulusan, dan kenaikan kelas
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {manajemenItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="block p-6 bg-white rounded-xl border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all"
          >
            <div className="flex items-start gap-4">
              <div className={`p-3 rounded-lg ${item.color}`}>
                <item.icon className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">{item.label}</h3>
                <p className="text-sm text-gray-600 mt-1">{item.description}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
