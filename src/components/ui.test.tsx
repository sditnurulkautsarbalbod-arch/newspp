import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// Mock component for testing button interactions
function TestButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className="px-4 py-2 bg-blue-500 text-white rounded">
      {children}
    </button>
  )
}

// Mock card component
function TestCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="p-4 border rounded-lg">
      <h3 className="text-sm text-gray-500">{title}</h3>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  )
}

describe('UI Components', () => {
  describe('Button Component', () => {
    it('should render button with text', () => {
      const handleClick = vi.fn()
      render(<TestButton onClick={handleClick}>Click Me</TestButton>)
      
      expect(screen.getByRole('button')).toHaveTextContent('Click Me')
    })

    it('should call onClick when clicked', async () => {
      const user = userEvent.setup()
      const handleClick = vi.fn()
      
      render(<TestButton onClick={handleClick}>Click Me</TestButton>)
      
      await user.click(screen.getByRole('button'))
      
      expect(handleClick).toHaveBeenCalledTimes(1)
    })
  })

  describe('Card Component', () => {
    it('should display title and value', () => {
      render(<TestCard title="Total Siswa" value="150" />)
      
      expect(screen.getByText('Total Siswa')).toBeInTheDocument()
      expect(screen.getByText('150')).toBeInTheDocument()
    })

    it('should display formatted currency value', () => {
      render(<TestCard title="Total Tagihan" value="Rp 5.000.000" />)
      
      expect(screen.getByText('Total Tagihan')).toBeInTheDocument()
      expect(screen.getByText('Rp 5.000.000')).toBeInTheDocument()
    })
  })
})

describe('Form Validation', () => {
  it('should validate required NIPD format', () => {
    const validateNIPD = (nipd: string) => {
      return /^\d{7}$/.test(nipd)
    }
    
    expect(validateNIPD('2024001')).toBe(true)
    expect(validateNIPD('123')).toBe(false)
    expect(validateNIPD('abcdefg')).toBe(false)
    expect(validateNIPD('')).toBe(false)
  })

  it('should validate payment amount', () => {
    const validatePayment = (amount: number, maxAmount: number) => {
      return amount > 0 && amount <= maxAmount
    }
    
    expect(validatePayment(500000, 1000000)).toBe(true)
    expect(validatePayment(0, 1000000)).toBe(false)
    expect(validatePayment(1500000, 1000000)).toBe(false)
    expect(validatePayment(-100, 1000000)).toBe(false)
  })

  it('should validate email format', () => {
    const validateEmail = (email: string) => {
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    }
    
    expect(validateEmail('admin@sekolah.sch.id')).toBe(true)
    expect(validateEmail('invalid-email')).toBe(false)
    expect(validateEmail('')).toBe(false)
  })
})
