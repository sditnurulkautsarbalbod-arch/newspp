'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { GraduationCap, Users, Building2 } from 'lucide-react'

type LoginMode = 'parent' | 'admin'

export default function LoginPage() {
  const router = useRouter()
  const [mode, setMode] = useState<LoginMode>('parent')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  
  // Parent login
  const [nipd, setNipd] = useState('')
  
  // Admin login
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const handleParentLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    
    try {
      const result = await signIn('parent-login', {
        nipd,
        redirect: false,
      })
      
      if (result?.error) {
        setError(result.error)
      } else {
        router.push('/dashboard/orangtua')
        router.refresh()
      }
    } catch {
      setError('Terjadi kesalahan. Silakan coba lagi.')
    } finally {
      setLoading(false)
    }
  }

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    
    try {
      const result = await signIn('admin-login', {
        email,
        password,
        redirect: false,
      })
      
      if (result?.error) {
        setError(result.error)
      } else {
        router.push('/dashboard')
        router.refresh()
      }
    } catch {
      setError('Terjadi kesalahan. Silakan coba lagi.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo & Title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-600 text-white mb-4">
            <GraduationCap className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Sistem Pembayaran SPP</h1>
          <p className="text-gray-600 mt-1">SD Example School</p>
        </div>

        {/* Mode Toggle */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => { setMode('parent'); setError('') }}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-medium transition-colors ${
              mode === 'parent'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
            }`}
          >
            <Users className="w-5 h-5" />
            Orang Tua
          </button>
          <button
            onClick={() => { setMode('admin'); setError('') }}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-medium transition-colors ${
              mode === 'admin'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
            }`}
          >
            <Building2 className="w-5 h-5" />
            Admin / Kepsek
          </button>
        </div>

        {/* Login Card */}
        <Card>
          <CardHeader>
            <CardTitle>
              {mode === 'parent' ? 'Login Orang Tua' : 'Login Admin / Kepala Sekolah'}
            </CardTitle>
            <CardDescription>
              {mode === 'parent'
                ? 'Masukkan NIPD anak Anda untuk melihat tagihan'
                : 'Masukkan email dan password Anda'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {mode === 'parent' ? (
              <form onSubmit={handleParentLogin} className="space-y-4">
                <Input
                  label="NIPD (Nomor Induk Peserta Didik)"
                  placeholder="Contoh: 2024001"
                  value={nipd}
                  onChange={(e) => setNipd(e.target.value)}
                  required
                  autoFocus
                />
                
                {error && (
                  <div className="p-3 rounded-lg bg-red-50 text-red-600 text-sm">
                    {error}
                  </div>
                )}
                
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Memproses...' : 'Masuk'}
                </Button>
              </form>
            ) : (
              <form onSubmit={handleAdminLogin} className="space-y-4">
                <Input
                  label="Email"
                  type="email"
                  placeholder="email@sekolah.id"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                />
                
                <Input
                  label="Password"
                  type="password"
                  placeholder="Masukkan password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                
                {error && (
                  <div className="p-3 rounded-lg bg-red-50 text-red-600 text-sm">
                    {error}
                  </div>
                )}
                
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Memproses...' : 'Masuk'}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

        {/* Demo Credentials */}
        <div className="mt-6 p-4 bg-white/50 rounded-lg border border-gray-200">
          <p className="text-sm font-medium text-gray-700 mb-2">Demo Login:</p>
          <div className="text-xs text-gray-600 space-y-1">
            {mode === 'parent' ? (
              <>
                <p><span className="font-medium">NIPD:</span> 2024001, 2024002, 2024003</p>
              </>
            ) : (
              <>
                <p><span className="font-medium">Admin:</span> bendahara@sekolah.id / admin123</p>
                <p><span className="font-medium">Kepsek:</span> kepsek@sekolah.id / admin123</p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
