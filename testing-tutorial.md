# Testing Tutorial - SPP Payment System

Panduan lengkap untuk menjalankan dan menulis test pada aplikasi SPP Payment.

## 📋 Daftar Isi

1. [Setup Testing](#setup-testing)
2. [Menjalankan Test](#menjalankan-test)
3. [Struktur Test Files](#struktur-test-files)
4. [Menulis Test Baru](#menulis-test-baru)
5. [Best Practices](#best-practices)
6. [Troubleshooting](#troubleshooting)

---

## Setup Testing

### Framework yang Digunakan

- **Vitest** - Test runner yang cepat dan kompatibel dengan Vite
- **React Testing Library** - Testing untuk React components
- **jsdom** - DOM simulation untuk testing browser environment

### Konfigurasi

File konfigurasi test ada di `vitest.config.ts`:

```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
```

### Setup File

File `src/test/setup.ts` berisi mock global dan konfigurasi:

```typescript
import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
  }),
}))
```

---

## Menjalankan Test

### Perintah Dasar

```bash
# Menjalankan test dalam mode watch (development)
npm test

# Menjalankan semua test sekali (CI/CD)
npm run test:run

# Menjalankan test dengan coverage report
npm run test:coverage
```

### Contoh Output

```
✓ src/lib/utils.test.ts (5 tests) 12ms
✓ src/lib/api.test.ts (6 tests) 45ms
✓ src/components/ui.test.tsx (7 tests) 89ms

Test Files  3 passed (3)
Tests       18 passed (18)
Duration    1.23s
```

---

## Struktur Test Files

```
src/
├── lib/
│   ├── utils.ts          # Source file
│   ├── utils.test.ts     # Unit tests untuk utils
│   ├── api.test.ts       # API logic tests
│   └── prisma.ts
├── components/
│   ├── ui/
│   └── ui.test.tsx       # Component tests
└── test/
    └── setup.ts          # Global test setup
```

### Naming Convention

- Test file: `[nama-file].test.ts` atau `[nama-file].test.tsx`
- Letakkan test file di folder yang sama dengan source file

---

## Menulis Test Baru

### 1. Unit Test untuk Utility Functions

```typescript
// src/lib/utils.test.ts
import { describe, it, expect } from 'vitest'
import { formatCurrency, formatDate } from './utils'

describe('formatCurrency', () => {
  it('should format number to Indonesian Rupiah', () => {
    const result = formatCurrency(100000)
    expect(result).toContain('100.000')
  })

  it('should handle zero', () => {
    const result = formatCurrency(0)
    expect(result).toContain('0')
  })
})
```

### 2. Test dengan Mocking

```typescript
// Mocking Prisma Client
import { vi } from 'vitest'

vi.mock('@/lib/prisma', () => ({
  prisma: {
    siswa: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
  },
}))

import { prisma } from '@/lib/prisma'

describe('Siswa API', () => {
  it('should fetch all siswa', async () => {
    const mockData = [{ id: '1', nama: 'Ahmad' }]
    vi.mocked(prisma.siswa.findMany).mockResolvedValue(mockData)
    
    const result = await prisma.siswa.findMany()
    expect(result).toHaveLength(1)
  })
})
```

### 3. Component Testing

```typescript
// src/components/Button.test.tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Button } from './Button'

describe('Button Component', () => {
  it('should render correctly', () => {
    render(<Button>Click Me</Button>)
    expect(screen.getByRole('button')).toHaveTextContent('Click Me')
  })

  it('should handle click events', async () => {
    const user = userEvent.setup()
    const handleClick = vi.fn()
    
    render(<Button onClick={handleClick}>Click</Button>)
    await user.click(screen.getByRole('button'))
    
    expect(handleClick).toHaveBeenCalledTimes(1)
  })
})
```

### 4. Testing Forms

```typescript
describe('Form Validation', () => {
  it('should validate NIPD format', () => {
    const validateNIPD = (nipd: string) => /^\d{7}$/.test(nipd)
    
    expect(validateNIPD('2024001')).toBe(true)
    expect(validateNIPD('123')).toBe(false)
  })

  it('should validate payment amount', () => {
    const validatePayment = (amount: number, max: number) => {
      return amount > 0 && amount <= max
    }
    
    expect(validatePayment(500000, 1000000)).toBe(true)
    expect(validatePayment(0, 1000000)).toBe(false)
  })
})
```

---

## Best Practices

### ✅ Do's

1. **Test behavior, bukan implementation**
   ```typescript
   // ✅ Good - test what user sees
   expect(screen.getByText('Berhasil')).toBeInTheDocument()
   
   // ❌ Bad - test implementation details
   expect(component.state.isSuccess).toBe(true)
   ```

2. **Gunakan describe untuk grouping**
   ```typescript
   describe('PaymentForm', () => {
     describe('validation', () => {
       it('should reject negative amounts', () => {})
       it('should reject amounts exceeding balance', () => {})
     })
     
     describe('submission', () => {
       it('should call API on submit', () => {})
     })
   })
   ```

3. **Setup dan cleanup yang tepat**
   ```typescript
   beforeEach(() => {
     vi.clearAllMocks()
   })
   
   afterEach(() => {
     cleanup()
   })
   ```

4. **Test edge cases**
   ```typescript
   it('should handle empty data', () => {})
   it('should handle null values', () => {})
   it('should handle very large numbers', () => {})
   ```

### ❌ Don'ts

1. Jangan test library pihak ketiga (Prisma, Next.js, etc.)
2. Jangan test implementation details
3. Jangan buat test yang terlalu dependent satu sama lain
4. Jangan skip test tanpa alasan jelas

---

## Troubleshooting

### Error: "Cannot find module '@/lib/prisma'"

Pastikan alias sudah dikonfigurasi di `vitest.config.ts`:

```typescript
resolve: {
  alias: {
    '@': path.resolve(__dirname, './src'),
  },
}
```

### Error: "document is not defined"

Pastikan environment jsdom sudah diset:

```typescript
test: {
  environment: 'jsdom',
}
```

### Error: "useRouter is not a function"

Pastikan mock untuk next/navigation sudah ada di setup.ts.

### Test berjalan lambat

1. Gunakan `--reporter=verbose` untuk melihat test mana yang lambat
2. Hindari real API calls - gunakan mocking
3. Batasi scope test dengan `describe.only()` saat development

---

## Coverage Report

Jalankan test dengan coverage:

```bash
npm run test:coverage
```

Output coverage akan tersedia di:
- Terminal: ringkasan coverage
- `coverage/` folder: detailed HTML report

Target coverage yang disarankan:
- **Statements**: > 80%
- **Branches**: > 75%
- **Functions**: > 80%
- **Lines**: > 80%

---

## Referensi

- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Testing Library Queries](https://testing-library.com/docs/queries/about)
- [Jest DOM Matchers](https://github.com/testing-library/jest-dom)

---

*Last updated: Januari 2026*
