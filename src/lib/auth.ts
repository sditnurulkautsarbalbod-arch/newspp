import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import prisma from '@/lib/prisma'

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      id: 'admin-login',
      name: 'Admin Login',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Email dan password harus diisi')
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        })

        if (!user || !user.password) {
          throw new Error('Email atau password salah')
        }

        const isValid = await bcrypt.compare(credentials.password, user.password)
        if (!isValid) {
          throw new Error('Email atau password salah')
        }

        return {
          id: user.id,
          email: user.email,
          name: user.nama,
          role: user.role,
        }
      },
    }),
    CredentialsProvider({
      id: 'parent-login',
      name: 'Parent Login',
      credentials: {
        nipd: { label: 'NIPD', type: 'text' },
      },
      async authorize(credentials) {
        if (!credentials?.nipd) {
          throw new Error('NIPD harus diisi')
        }

        const user = await prisma.user.findUnique({
          where: { nipd: credentials.nipd },
          include: { siswa: true },
        })

        if (!user) {
          throw new Error('NIPD tidak ditemukan')
        }

        return {
          id: user.id,
          name: user.nama,
          role: user.role,
          nipd: user.nipd ?? undefined,
          siswaId: user.siswaId ?? undefined,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = user.role
        token.nipd = user.nipd
        token.siswaId = user.siswaId
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.role = token.role as string
        session.user.nipd = token.nipd as string | undefined
        session.user.siswaId = token.siswaId as string | undefined
      }
      return session
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  session: {
    strategy: 'jwt',
    maxAge: 24 * 60 * 60, // 24 hours
  },
  secret: process.env.NEXTAUTH_SECRET,
}
