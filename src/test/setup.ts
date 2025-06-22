import { vi } from 'vitest'

// Mock environment variables
process.env.TAVILY_API_KEY = 'test-api-key'

// Global test setup
beforeEach(() => {
  // Reset all mocks before each test
  vi.clearAllMocks()
})

// Mock axios for all tests
vi.mock('axios', () => ({
  default: {
    post: vi.fn(),
    isAxiosError: vi.fn()
  }
}))