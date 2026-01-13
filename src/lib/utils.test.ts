import { describe, it, expect } from 'vitest'
import { formatCurrency, formatDate } from './utils'

describe('formatCurrency', () => {
  it('should format number to Indonesian Rupiah', () => {
    expect(formatCurrency(100000)).toContain('100.000')
    expect(formatCurrency(1500000)).toContain('1.500.000')
    expect(formatCurrency(0)).toContain('0')
  })

  it('should handle large numbers', () => {
    expect(formatCurrency(10000000)).toContain('10.000.000')
    expect(formatCurrency(999999999)).toContain('999.999.999')
  })

  it('should handle string input', () => {
    const result = formatCurrency('100500')
    expect(result).toContain('100.500')
  })
})

describe('formatDate', () => {
  it('should format date to Indonesian locale', () => {
    const date = new Date('2024-01-15')
    const result = formatDate(date)
    expect(result).toContain('2024')
    expect(result).toContain('Januari')
  })

  it('should handle string date input', () => {
    const result = formatDate('2024-06-20')
    expect(result).toContain('2024')
  })
})
