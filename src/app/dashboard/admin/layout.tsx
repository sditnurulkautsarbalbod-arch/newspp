'use client'

import { useSession, signOut } from 'next-auth/react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { useEffect } from 'react'
import { 
  LayoutDashboard, 
  Users, 
  FileText, 
  CreditCard, 
  Settings,
  LogOut,
  Menu,
  X,
  GraduationCap,
  BarChart3,
  Receipt,
  Database,
  HardDrive
} from 'lucide-react'
import { useState } from 'react'
import { LoadingPage } from '@/components/ui/spinner'

const adminMenuItems = [
  { href: '/dashboard/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/admin/siswa', label: 'Data Siswa', icon: Users },
  { href: '/dashboard/admin/tagihan', label: 'Jenis Tagihan', icon: FileText },
  { href: '/dashboard/admin/pembayaran', label: 'Pembayaran', icon: CreditCard },
  { href: '/dashboard/admin/status', label: 'Status Pembayaran', icon: Receipt },
  { href: '/dashboard/admin/laporan', label: 'Laporan', icon: BarChart3 },
  { href: '/dashboard/admin/manajemen-data', label: 'Manajemen Data', icon: Database },
  { href: '/dashboard/admin/pengaturan', label: 'Pengaturan', icon: Settings },
  { href: '/dashboard/admin/pemeliharaan', label: 'Pemeliharaan', icon: HardDrive },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    } else if (status === 'authenticated' && session?.user.role !== 'ADMIN') {
      router.push('/dashboard')
    }
  }, [status, session, router])

  if (status === 'loading') {
    return <LoadingPage />
  }

  if (!session || session.user.role !== 'ADMIN') {
    return null
  }

  const handleLogout = async () => {
    await signOut({ callbackUrl: '/login' })
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
      <aside className={`fixed top-0 left-0 z-50 h-full bg-white border-r border-gray-200 transform transition-all duration-200 ease-in-out ${
        sidebarCollapsed ? 'w-20' : 'w-64'
      } ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      } lg:translate-x-0`}>
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 py-4 border-b border-gray-200">
          <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center flex-shrink-0">
            <GraduationCap className="w-6 h-6 text-white" />
          </div>
          {!sidebarCollapsed && (
            <div className="flex-1 min-w-0">
              <h1 className="font-bold text-gray-900">SPP Payment</h1>
              <p className="text-xs text-gray-500">Bendahara</p>
            </div>
          )}
          <button 
            className="lg:hidden ml-auto"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-1 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 200px)' }}>
          {adminMenuItems.map((item) => {
            const isActive = pathname === item.href || 
              (item.href !== '/dashboard/admin' && pathname.startsWith(item.href))
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-100'
                } ${sidebarCollapsed ? 'justify-center' : ''}`}
                title={sidebarCollapsed ? item.label : undefined}
              >
                <item.icon className="w-5 h-5 flex-shrink-0" />
                {!sidebarCollapsed && item.label}
              </Link>
            )
          })}
        </nav>

        {/* User & Logout */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200">
          {!sidebarCollapsed && (
            <div className="flex items-center gap-3 px-4 py-2 mb-2">
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                <span className="text-sm font-medium text-blue-700">
                  {session.user.name?.charAt(0) || 'A'}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {session.user.name}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {session.user.email}
                </p>
              </div>
            </div>
          )}
          <button
            onClick={handleLogout}
            className={`flex items-center gap-3 w-full px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors ${sidebarCollapsed ? 'justify-center' : ''}`}
            title={sidebarCollapsed ? 'Keluar' : undefined}
          >
            <LogOut className="w-5 h-5" />
            {!sidebarCollapsed && 'Keluar'}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className={`transition-all duration-200 ${sidebarCollapsed ? 'lg:pl-20' : 'lg:pl-64'}`}>
        {/* Top bar */}
        <header className="sticky top-0 z-30 bg-white border-b border-gray-200 px-4 py-3 lg:px-6">
          <div className="flex items-center gap-4">
            <button
              className="lg:hidden p-2 -ml-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="w-5 h-5" />
            </button>
            <button
              className="hidden lg:flex p-2 -ml-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              title={sidebarCollapsed ? 'Perluas sidebar' : 'Kecilkan sidebar'}
            >
              <Menu className="w-5 h-5" />
            </button>
            <h2 className="text-lg font-semibold text-gray-900">
              {adminMenuItems.find(item => item.href === pathname)?.label || 'Dashboard'}
            </h2>
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
