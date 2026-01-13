'use client'

import { useSession, signOut } from 'next-auth/react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { 
  LayoutDashboard, 
  BarChart3,
  Receipt,
  LogOut,
  Menu,
  X,
  GraduationCap
} from 'lucide-react'
import { LoadingPage } from '@/components/ui/spinner'

const menuItems = [
  { href: '/dashboard/kepsek', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/kepsek/laporan', label: 'Laporan', icon: BarChart3 },
  { href: '/dashboard/kepsek/status', label: 'Status Pembayaran', icon: Receipt },
]

export default function KepsekLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    } else if (status === 'authenticated' && session?.user.role !== 'KEPALA_SEKOLAH') {
      router.push('/dashboard')
    }
  }, [status, session, router])

  if (status === 'loading') {
    return <LoadingPage />
  }

  if (!session || session.user.role !== 'KEPALA_SEKOLAH') {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed top-0 left-0 z-50 h-full w-64 bg-white border-r border-gray-200 transform transition-transform duration-200 ease-in-out lg:translate-x-0 ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-200">
          <div className="w-10 h-10 rounded-lg bg-green-600 flex items-center justify-center">
            <GraduationCap className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-gray-900">SPP Payment</h1>
            <p className="text-xs text-gray-500">Kepala Sekolah</p>
          </div>
          <button className="ml-auto lg:hidden" onClick={() => setSidebarOpen(false)}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="p-4 space-y-1">
          {menuItems.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                  isActive ? 'bg-green-50 text-green-700' : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <item.icon className="w-5 h-5" />
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200">
          <div className="flex items-center gap-3 px-4 py-2 mb-2">
            <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
              <span className="text-sm font-medium text-green-700">
                {session.user.name?.charAt(0) || 'K'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{session.user.name}</p>
              <p className="text-xs text-gray-500 truncate">{session.user.email}</p>
            </div>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="flex items-center gap-3 w-full px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg"
          >
            <LogOut className="w-5 h-5" />
            Keluar
          </button>
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 bg-white border-b border-gray-200 px-4 py-3 lg:px-6">
          <div className="flex items-center gap-4">
            <button
              className="lg:hidden p-2 -ml-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="w-5 h-5" />
            </button>
            <h2 className="text-lg font-semibold text-gray-900">
              {menuItems.find(item => item.href === pathname)?.label || 'Dashboard'}
            </h2>
            <span className="ml-auto text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
              Mode Lihat Saja
            </span>
          </div>
        </header>

        <main className="p-4 lg:p-6">{children}</main>
      </div>
    </div>
  )
}
