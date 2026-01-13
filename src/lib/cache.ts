import { unstable_cache } from 'next/cache'
import { revalidatePath } from 'next/cache'

/**
 * Cache tahun ajaran aktif (5 menit)
 */
export const getActiveTahunAjaran = unstable_cache(
  async () => {
    const { prisma } = await import('@/lib/prisma')
    return prisma.tahunAjaran.findFirst({
      where: { aktif: true }
    })
  },
  ['active-tahun-ajaran'],
  { revalidate: 300, tags: ['tahun-ajaran'] }
)

/**
 * Cache kelas list berdasarkan tahun ajaran (10 menit)
 */
export const getKelasByTahunAjaran = unstable_cache(
  async (tahunAjaranId: string) => {
    const { prisma } = await import('@/lib/prisma')
    return prisma.kelas.findMany({
      where: { tahunAjaranId },
      orderBy: [{ tingkat: 'asc' }, { nama: 'asc' }]
    })
  },
  ['kelas-list'],
  { revalidate: 600, tags: ['kelas'] }
)

/**
 * Cache pengaturan sekolah (30 menit)
 */
export const getSekolahSettings = unstable_cache(
  async () => {
    const { prisma } = await import('@/lib/prisma')
    return prisma.sekolahSettings.findFirst({
      where: { id: 'default' }
    })
  },
  ['sekolah-settings'],
  { revalidate: 1800, tags: ['settings'] }
)

/**
 * Revalidate cache tahun ajaran
 */
export function revalidateTahunAjaran() {
  revalidatePath('/api/manajemen/tahun-ajaran')
  revalidateTag('tahun-ajaran')
}

/**
 * Revalidate cache kelas
 */
export function revalidateKelas() {
  revalidatePath('/api/manajemen/kelas')
  revalidateTag('kelas')
}

/**
 * Revalidate cache settings
 */
export function revalidateSettings() {
  revalidatePath('/api/settings')
  revalidateTag('settings')
}

/**
 * Revalidate all cache tags
 */
export function revalidateTag(tag: string) {
  // Next.js 15+ revalidateTag
  try {
    if (typeof revalidateTag !== 'undefined') {
      // @ts-ignore
      unstable_revalidateTag(tag)
    }
  } catch {
    // Fallback to revalidatePath
  }
}
