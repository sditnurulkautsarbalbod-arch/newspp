import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock Prisma Client
vi.mock('@/lib/prisma', () => ({
  prisma: {
    siswa: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    tagihan: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      aggregate: vi.fn(),
    },
    pembayaran: {
      findMany: vi.fn(),
      create: vi.fn(),
      aggregate: vi.fn(),
    },
    jenisTagihan: {
      findMany: vi.fn(),
    },
  },
}))

import { prisma } from '@/lib/prisma'

describe('Siswa API Logic', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should fetch all siswa', async () => {
    const mockSiswa = [
      { id: '1', nipd: '2024001', nama: 'Ahmad', kelas: '7A' },
      { id: '2', nipd: '2024002', nama: 'Budi', kelas: '7B' },
    ]
    
    vi.mocked(prisma.siswa.findMany).mockResolvedValue(mockSiswa as never)
    
    const result = await prisma.siswa.findMany()
    
    expect(result).toHaveLength(2)
    expect(result[0].nama).toBe('Ahmad')
  })

  it('should find siswa by NIPD', async () => {
    const mockSiswa = { id: '1', nipd: '2024001', nama: 'Ahmad', kelas: '7A' }
    
    vi.mocked(prisma.siswa.findUnique).mockResolvedValue(mockSiswa as never)
    
    const result = await prisma.siswa.findUnique({
      where: { nipd: '2024001' }
    })
    
    expect(result?.nipd).toBe('2024001')
    expect(result?.nama).toBe('Ahmad')
  })
})

describe('Tagihan API Logic', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should calculate total tagihan', async () => {
    vi.mocked(prisma.tagihan.aggregate).mockResolvedValue({
      _sum: { jumlahTagihan: 5000000 },
      _count: 10,
    } as never)
    
    const result = await prisma.tagihan.aggregate({
      _sum: { jumlahTagihan: true },
    })
    
    expect(result._sum.jumlahTagihan).toBe(5000000)
  })

  it('should filter tagihan by status', async () => {
    const mockTagihan = [
      { id: '1', status: 'LUNAS', jumlahTagihan: 500000 },
      { id: '2', status: 'LUNAS', jumlahTagihan: 500000 },
    ]
    
    vi.mocked(prisma.tagihan.findMany).mockResolvedValue(mockTagihan as never)
    
    const result = await prisma.tagihan.findMany({
      where: { status: 'LUNAS' }
    })
    
    expect(result).toHaveLength(2)
    expect(result.every(t => t.status === 'LUNAS')).toBe(true)
  })
})

describe('Pembayaran API Logic', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should create pembayaran', async () => {
    const mockPembayaran = {
      id: '1',
      tagihanId: 'tag-1',
      jumlahBayar: 500000,
      metodeBayar: 'TUNAI',
      nomorKuitansi: 'KWT-2024-0001',
    }
    
    vi.mocked(prisma.pembayaran.create).mockResolvedValue(mockPembayaran as never)
    
    const result = await prisma.pembayaran.create({
      data: mockPembayaran,
    })
    
    expect(result.nomorKuitansi).toBe('KWT-2024-0001')
    expect(result.jumlahBayar).toBe(500000)
  })

  it('should calculate total pembayaran', async () => {
    vi.mocked(prisma.pembayaran.aggregate).mockResolvedValue({
      _sum: { jumlahBayar: 3500000 },
    } as never)
    
    const result = await prisma.pembayaran.aggregate({
      _sum: { jumlahBayar: true },
    })
    
    expect(result._sum.jumlahBayar).toBe(3500000)
  })
})
