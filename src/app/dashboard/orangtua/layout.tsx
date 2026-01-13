'use client'

import { useSession, signOut } from 'next-auth/react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { 
  LayoutDashboard, 
  Receipt,
  History,
  LogOut,
  Menu,
  X,
  GraduationCap
} from 'lucide-react'
import { LoadingPage } from '@/components/ui/spinner'

const menuItems = [
  { href: '/dashboard/orangtua', label: 'Beranda', icon: LayoutDashboard },
  { href: '/dashboard/orangtua/tagihan', label: 'Tagihan', icon: Receipt },
  { href: '/dashboard/orangtua/histori', label: 'Histori Pembayaran', icon: History },
]

export default function OrangTuaLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const pathname = usePathname()
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    } else if (status === 'authenticated' && session?.user.role !== 'ORANG_TUA') {
      router.push('/dashboard')
    }
  }, [status, session, router])

  if (status === 'loading') {
    return <LoadingPage />
  }

  if (!session || session.user.role !== 'ORANG_TUA') {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center">
              <GraduationCap className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-gray-900 text-sm">SPP Payment</h1>
              <p className="text-xs text-gray-500">Orang Tua</p>
            </div>
          </div>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {menuOpen && (
          <div className="bg-white border-t border-gray-100 px-4 py-2">
            <div className="max-w-lg mx-auto">
              <div className="py-2 border-b border-gray-100 mb-2">
                <p className="text-sm font-medium text-gray-900">{session.user.name}</p>
                <p className="text-xs text-gray-500">NIPD: {session.user.nipd}</p>
              </div>
              {menuItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMenuOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm ${
                    pathname === item.href
                      ? 'bg-blue-50 text-blue-700 font-medium'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  {item.label}
                </Link>
              ))}
              <button
                onClick={() => signOut({ callbackUrl: '/login' })}
                className="flex items-center gap-3 w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg mt-2"
              >
                <LogOut className="w-5 h-5" />
                Keluar
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="max-w-lg mx-auto px-4 py-6">
        {children}
      </main>

      {/* Bottom Navigation - Mobile */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-2 sm:hidden">
        <div className="max-w-lg mx-auto flex justify-around">
          {menuItems.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center gap-1 py-1 px-3 rounded-lg transition-colors ${
                  isActive ? 'text-blue-600' : 'text-gray-500'
                }`}
              >
                <item.icon className="w-5 h-5" />
                <span className="text-xs">{item.label}</span>
              </Link>
            )
          })}
        </div>
      </nav>

      {/* Spacer for bottom nav */}
      <div className="h-16 sm:hidden" />
    </div>
  )
}
