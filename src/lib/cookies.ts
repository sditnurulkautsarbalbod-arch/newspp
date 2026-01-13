import { cookies } from 'next/headers'

/**
 * Cookie options type
 */
export type CookieOptions = {
  maxAge?: number
  httpOnly?: boolean
  secure?: boolean
  sameSite?: 'strict' | 'lax' | 'none'
  path?: string
}

/**
 * Set cookie dengan expiration
 */
export async function setCookie(name: string, value: string, options: CookieOptions = {}) {
  const cookieStore = await cookies()
  
  cookieStore.set({
    name,
    value,
    ...options,
    path: options.path || '/',
    httpOnly: options.httpOnly ?? true,
    secure: options.secure ?? process.env.NODE_ENV === 'production',
    sameSite: options.sameSite || 'lax'
  })
}

/**
 * Get cookie value
 */
export async function getCookie(name: string): Promise<string | undefined> {
  const cookieStore = await cookies()
  return cookieStore.get(name)?.value
}

/**
 * Delete cookie
 */
export async function deleteCookie(name: string, options: { path?: string } = {}) {
  const cookieStore = await cookies()
  cookieStore.delete({
    name,
    ...options,
    path: options.path || '/'
  })
}

/**
 * Get all cookies
 */
export async function getAllCookies(): Promise<Record<string, string>> {
  const cookieStore = await cookies()
  const all = cookieStore.getAll()
  return all.reduce((acc, cookie) => {
    acc[cookie.name] = cookie.value
    return acc
  }, {} as Record<string, string>)
}
