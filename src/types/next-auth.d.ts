import 'next-auth'
import { Role } from '@prisma/client'

declare module 'next-auth' {
  interface User {
    id: string
    role: Role
    nipd?: string
    siswaId?: string
  }

  interface Session {
    user: {
      id: string
      name?: string | null
      email?: string | null
      role: string
      nipd?: string
      siswaId?: string
    }
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    role: string
    nipd?: string
    siswaId?: string
  }
}
