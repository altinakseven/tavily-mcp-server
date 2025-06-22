#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import axios from "axios";

interface TavilySearchRequest {
  query: string;
  search_depth?: "basic" | "advanced";
  include_answer?: boolean;
  include_raw_content?: boolean;
  max_results?: number;
  include_domains?: string[];
  exclude_domains?: string[];
}

interface TavilySearchResult {
  title: string;
  url: string;
  content: string;
  score: number;
  published_date?: string;
}

interface TavilyResponse {
  answer?: string;
  query: string;
  response_time: number;
  images?: string[];
  follow_up_questions?: string[];
  results: TavilySearchResult[];
}

export class TavilyMCPServer {
  private server: Server;
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.TAVILY_API_KEY || "";
    if (!this.apiKey) {
      throw new Error("TAVILY_API_KEY environment variable is required");
    }

    this.server = new Server(
      {
        name: "tavily-search",
        version: "1.0.0",
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupToolHandlers();
  }

  private setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: "web_search",
            description: "Search the web using Tavily API. Returns relevant search results with content snippets.",
            inputSchema: {
              type: "object",
              properties: {
                query: {
                  type: "string",
                  description: "The search query to execute",
                },
                search_depth: {
                  type: "string",
                  enum: ["basic", "advanced"],
                  description: "The depth of the search (basic or advanced)",
                  default: "basic",
                },
                include_answer: {
                  type: "boolean",
                  description: "Whether to include a direct answer to the query",
                  default: true,
                },
                max_results: {
                  type: "number",
                  description: "Maximum number of search results to return",
                  default: 5,
                  minimum: 1,
                  maximum: 20,
                },
                include_domains: {
                  type: "array",
                  items: { type: "string" },
                  description: "List of domains to include in search",
                },
                exclude_domains: {
                  type: "array",
                  items: { type: "string" },
                  description: "List of domains to exclude from search",
                },
              },
              required: ["query"],
            },
          },
        ],
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      if (request.params.name === "web_search") {
        return await this.handleWebSearch(request.params.arguments);
      }
      throw new Error(`Unknown tool: ${request.params.name}`);
    });
  }

  public async handleWebSearch(args: any) {
    try {
      const searchRequest: TavilySearchRequest = {
        query: args.query,
        search_depth: args.search_depth || "basic",
        include_answer: args.include_answer !== false,
        include_raw_content: false,
        max_results: args.max_results || 5,
        include_domains: args.include_domains,
        exclude_domains: args.exclude_domains,
      };

      const response = await axios.post<TavilyResponse>(
        "https://api.tavily.com/search",
        searchRequest,
        {
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${this.apiKey}`,
          },
        }
      );

      const data = response.data;
      
      // Format the response for better readability
      let formattedResponse = `# Search Results for: "${data.query}"\n\n`;
      
      if (data.answer) {
        formattedResponse += `## Direct Answer\n${data.answer}\n\n`;
      }
      
      formattedResponse += `## Search Results\n\n`;
      
      data.results.forEach((result, index) => {
        formattedResponse += `### ${index + 1}. ${result.title}\n`;
        formattedResponse += `**URL:** ${result.url}\n`;
        if (result.published_date) {
          formattedResponse += `**Published:** ${result.published_date}\n`;
        }
        formattedResponse += `**Score:** ${result.score}\n\n`;
        formattedResponse += `${result.content}\n\n`;
        formattedResponse += `---\n\n`;
      });

      if (data.follow_up_questions && data.follow_up_questions.length > 0) {
        formattedResponse += `## Follow-up Questions\n`;
        data.follow_up_questions.forEach((question, index) => {
          formattedResponse += `${index + 1}. ${question}\n`;
        });
      }

      return {
        content: [
          {
            type: "text",
            text: formattedResponse,
          },
        ],
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const errorMessage = error.response?.data?.error || error.message;
        throw new Error(`Tavily API error: ${errorMessage}`);
      }
      throw new Error(`Search failed: ${error}`);
    }
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error("Tavily MCP server running on stdio");
  }
}

// Only run the server if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const server = new TavilyMCPServer();
  server.run().catch(console.error);
}