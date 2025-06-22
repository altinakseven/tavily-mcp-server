import { describe, it, expect, vi, beforeEach } from 'vitest'
import axios from 'axios'
import { TavilyMCPServer } from '../index.js'

// Mock the MCP SDK
vi.mock('@modelcontextprotocol/sdk/server/index.js', () => ({
  Server: vi.fn().mockImplementation(() => ({
    setRequestHandler: vi.fn(),
    connect: vi.fn()
  }))
}))

vi.mock('@modelcontextprotocol/sdk/server/stdio.js', () => ({
  StdioServerTransport: vi.fn()
}))

vi.mock('@modelcontextprotocol/sdk/types.js', () => ({
  ListToolsRequestSchema: 'ListToolsRequestSchema',
  CallToolRequestSchema: 'CallToolRequestSchema'
}))

const mockedAxios = vi.mocked(axios)

describe('TavilyMCPServer', () => {
  let server: TavilyMCPServer

  beforeEach(() => {
    vi.clearAllMocks()
    process.env.TAVILY_API_KEY = 'test-api-key'
  })

  describe('constructor', () => {
    it('should throw error when TAVILY_API_KEY is not set', () => {
      delete process.env.TAVILY_API_KEY
      expect(() => new TavilyMCPServer()).toThrow('TAVILY_API_KEY environment variable is required')
    })

    it('should initialize successfully with API key', () => {
      expect(() => new TavilyMCPServer()).not.toThrow()
    })
  })

  describe('handleWebSearch', () => {
    beforeEach(() => {
      server = new TavilyMCPServer()
    })

    it('should handle basic web search successfully', async () => {
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

      mockedAxios.post.mockResolvedValueOnce(mockResponse)

      const result = await server.handleWebSearch({
        query: 'test query',
        search_depth: 'basic',
        include_answer: true,
        max_results: 5
      })

      expect(mockedAxios.post).toHaveBeenCalledWith(
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
      expect(result.content[0].text).toContain('## Search Results')
      expect(result.content[0].text).toContain('Test Result')
      expect(result.content[0].text).toContain('## Follow-up Questions')
    })

    it('should handle search without answer', async () => {
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

      mockedAxios.post.mockResolvedValueOnce(mockResponse)

      const result = await server.handleWebSearch({
        query: 'test query',
        include_answer: false
      })

      expect(result.content[0].text).not.toContain('## Direct Answer')
      expect(result.content[0].text).toContain('## Search Results')
    })

    it('should handle domain filters', async () => {
      const mockResponse = {
        data: {
          query: 'test query',
          response_time: 1.5,
          results: []
        }
      }

      mockedAxios.post.mockResolvedValueOnce(mockResponse)

      await server.handleWebSearch({
        query: 'test query',
        include_domains: ['example.com'],
        exclude_domains: ['spam.com']
      })

      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://api.tavily.com/search',
        expect.objectContaining({
          include_domains: ['example.com'],
          exclude_domains: ['spam.com']
        }),
        expect.any(Object)
      )
    })

    it('should handle API errors', async () => {
      const errorResponse = {
        response: {
          data: {
            error: 'Invalid API key'
          }
        }
      }

      mockedAxios.post.mockRejectedValueOnce(errorResponse)
      mockedAxios.isAxiosError.mockReturnValueOnce(true)

      await expect(server.handleWebSearch({ query: 'test' })).rejects.toThrow('Tavily API error: Invalid API key')
    })

    it('should handle network errors', async () => {
      const networkError = new Error('Network error')
      mockedAxios.post.mockRejectedValueOnce(networkError)
      mockedAxios.isAxiosError.mockReturnValueOnce(false)

      await expect(server.handleWebSearch({ query: 'test' })).rejects.toThrow('Search failed: Error: Network error')
    })

    it('should handle advanced search depth', async () => {
      const mockResponse = {
        data: {
          query: 'test query',
          response_time: 2.5,
          results: []
        }
      }

      mockedAxios.post.mockResolvedValueOnce(mockResponse)

      await server.handleWebSearch({
        query: 'test query',
        search_depth: 'advanced',
        max_results: 10
      })

      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://api.tavily.com/search',
        expect.objectContaining({
          search_depth: 'advanced',
          max_results: 10
        }),
        expect.any(Object)
      )
    })
  })
})