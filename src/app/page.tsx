import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export default async function Home() {
  const session = await getServerSession(authOptions)
  
  if (session) {
    // Redirect based on role
    switch (session.user.role) {
      case 'ADMIN':
        redirect('/dashboard/admin')
      case 'KEPALA_SEKOLAH':
        redirect('/dashboard/kepsek')
      case 'ORANG_TUA':
        redirect('/dashboard/orangtua')
      default:
        redirect('/login')
    }
  }
  
  redirect('/login')
}
