import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock environment setup
const mockEnv = {
  TAVILY_API_KEY: 'test-api-key'
}

// Mock axios
const mockAxios = {
  post: vi.fn(),
  isAxiosError: vi.fn()
}

// Mock MCP SDK
const mockServer = {
  setRequestHandler: vi.fn(),
  connect: vi.fn()
}

const mockTransport = {}

// Set up mocks
vi.mock('axios', () => ({ default: mockAxios }))
vi.mock('@modelcontextprotocol/sdk/server/index.js', () => ({
  Server: vi.fn(() => mockServer)
}))
vi.mock('@modelcontextprotocol/sdk/server/stdio.js', () => ({
  StdioServerTransport: vi.fn(() => mockTransport)
}))
vi.mock('@modelcontextprotocol/sdk/types.js', () => ({
  ListToolsRequestSchema: 'ListToolsRequestSchema',
  CallToolRequestSchema: 'CallToolRequestSchema'
}))

// Mock process.env
Object.defineProperty(global, 'process', {
  value: { env: mockEnv, argv: [] }
})

describe('Tavily MCP Server Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockEnv.TAVILY_API_KEY = 'test-api-key'
  })

  it('should initialize server with correct configuration', async () => {
    const { TavilyMCPServer } = await import('../index.js')
    
    const server = new TavilyMCPServer()
    expect(server).toBeDefined()
  })

  it('should throw error without API key', async () => {
    delete mockEnv.TAVILY_API_KEY
    
    const { TavilyMCPServer } = await import('../index.js')
    
    expect(() => new TavilyMCPServer()).toThrow('TAVILY_API_KEY environment variable is required')
  })

  it('should handle web search with valid response', async () => {
    const mockResponse = {
      data: {
        query: 'test query',
        response_time: 1.5,
        answer: 'Test answer',
        results: [
          {
            title: 'Test Result',
            url: 'https://example.com',
            content: 'Test content',
            score: 0.95,
            published_date: '2024-01-01'
          }
        ],
        follow_up_questions: ['What is this?']
      }
    }

    mockAxios.post.mockResolvedValueOnce(mockResponse)

    const { TavilyMCPServer } = await import('../index.js')
    const server = new TavilyMCPServer()

    const result = await server.handleWebSearch({
      query: 'test query',
      search_depth: 'basic',
      include_answer: true,
      max_results: 5
    })

    expect(mockAxios.post).toHaveBeenCalledWith(
      'https://api.tavily.com/search',
      {
        query: 'test query',
        search_depth: 'basic',
        include_answer: true,
        include_raw_content: false,
        max_results: 5,
        include_domains: undefined,
        exclude_domains: undefined
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-api-key'
        }
      }
    )

    expect(result.content).toHaveLength(1)
    expect(result.content[0].type).toBe('text')
    expect(result.content[0].text).toContain('# Search Results for: "test query"')
    expect(result.content[0].text).toContain('## Direct Answer')
    expect(result.content[0].text).toContain('Test answer')
    expect(result.content[0].text).toContain('Test Result')
    expect(result.content[0].text).toContain('https://example.com')
    expect(result.content[0].text).toContain('## Follow-up Questions')
    expect(result.content[0].text).toContain('What is this?')
  })

  it('should handle API errors gracefully', async () => {
    const errorResponse = {
      response: {
        data: {
          error: 'Invalid API key'
        }
      }
    }

    mockAxios.post.mockRejectedValueOnce(errorResponse)
    mockAxios.isAxiosError.mockReturnValueOnce(true)

    const { TavilyMCPServer } = await import('../index.js')
    const server = new TavilyMCPServer()

    await expect(server.handleWebSearch({ query: 'test' })).rejects.toThrow('Tavily API error: Invalid API key')
  })

  it('should handle network errors', async () => {
    const networkError = new Error('Network error')
    mockAxios.post.mockRejectedValueOnce(networkError)
    mockAxios.isAxiosError.mockReturnValueOnce(false)

    const { TavilyMCPServer } = await import('../index.js')
    const server = new TavilyMCPServer()

    await expect(server.handleWebSearch({ query: 'test' })).rejects.toThrow('Search failed: Error: Network error')
  })

  it('should format response without answer when include_answer is false', async () => {
    const mockResponse = {
      data: {
        query: 'test query',
        response_time: 1.5,
        results: [
          {
            title: 'Test Result',
            url: 'https://example.com',
            content: 'Test content',
            score: 0.95
          }
        ]
      }
    }

    mockAxios.post.mockResolvedValueOnce(mockResponse)

    const { TavilyMCPServer } = await import('../index.js')
    const server = new TavilyMCPServer()

    const result = await server.handleWebSearch({
      query: 'test query',
      include_answer: false
    })

    expect(result.content[0].text).not.toContain('## Direct Answer')
    expect(result.content[0].text).toContain('## Search Results')
    expect(result.content[0].text).toContain('Test Result')
  })

  it('should handle domain filtering', async () => {
    const mockResponse = {
      data: {
        query: 'test query',
        response_time: 1.5,
        results: []
      }
    }

    mockAxios.post.mockResolvedValueOnce(mockResponse)

    const { TavilyMCPServer } = await import('../index.js')
    const server = new TavilyMCPServer()

    await server.handleWebSearch({
      query: 'test query',
      include_domains: ['example.com'],
      exclude_domains: ['spam.com']
    })

    expect(mockAxios.post).toHaveBeenCalledWith(
      'https://api.tavily.com/search',
      expect.objectContaining({
        include_domains: ['example.com'],
        exclude_domains: ['spam.com']
      }),
      expect.any(Object)
    )
  })
})