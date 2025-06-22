# Tavily MCP Server

A production-ready MCP (Model Context Protocol) server that provides web search capabilities using the Tavily API. This server integrates seamlessly with Roo and other MCP-compatible AI assistants.

## Features

- 🔍 **Web Search**: Powerful web search using Tavily's AI-optimized search API
- 🎯 **Direct Answers**: Get immediate answers to queries when available
- 📊 **Configurable Results**: Control search depth, result count, and domain filtering
- 🚀 **Production Ready**: Built with TypeScript, comprehensive testing, and PM2 deployment
- 🔒 **Secure**: Environment-based API key management
- 📈 **Monitoring**: Full logging and process monitoring with PM2
- 🧪 **Well Tested**: Comprehensive unit and integration test coverage

## Quick Start

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Tavily API key ([Get one here](https://tavily.com))
- PM2 (for production deployment)

### Installation & Deployment

1. **Clone and setup:**
   ```bash
   cd tavily-mcp-server
   npm install
   ```

2. **Set your API key:**
   ```bash
   export TAVILY_API_KEY="your-api-key-here"
   ```

3. **Run tests:**
   ```bash
   npm test
   npm run test:coverage
   ```

4. **Deploy with PM2:**
   ```bash
   ./deploy.sh
   ```

That's it! The server is now running and ready for MCP connections.

## Development

### Build and Test

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Build for production
npm run build

# Run unit tests
npm test

# Run tests with coverage
npm run test:coverage

# Run integration tests
./test-mcp.js

# Lint code
npm run lint
npm run lint:fix
```

### Testing

The project includes comprehensive testing:

- **Unit Tests**: Test individual components and functions
- **Integration Tests**: Test the complete MCP server functionality
- **MCP Protocol Tests**: Validate MCP protocol compliance
- **API Tests**: Test Tavily API integration (requires valid API key)

```bash
# Run all tests
npm test

# Run with coverage report
npm run test:coverage

# Test the actual MCP server
./test-mcp.js
```

## Configuration

### Environment Variables

- `TAVILY_API_KEY` (required): Your Tavily API key
- `NODE_ENV` (optional): Set to "production" for production deployment

### PM2 Configuration

The `pm2-apps.json` file contains production configuration:

```json
{
  "apps": [{
    "name": "tavily-mcp-server",
    "script": "dist/index.js",
    "instances": 1,
    "exec_mode": "fork",
    "env": {
      "NODE_ENV": "production",
      "TAVILY_API_KEY": "your-api-key"
    }
  }]
}
```

## Usage with Roo

### Global Installation

Add to your global MCP settings (`~/.roo/mcp_settings.json`):

```json
{
  "mcpServers": {
    "tavily-search": {
      "command": "node",
      "args": ["/home/ubuntu/roo-tavily/tavily-mcp-server/dist/index.js"],
      "env": {
        "TAVILY_API_KEY": "your-api-key-here"
      }
    }
  }
}
```

### Project-specific Installation

Add to your project's MCP settings (`.roo/mcp.json`):

```json
{
  "mcpServers": {
    "tavily-search": {
      "command": "node",
      "args": ["./tavily-mcp-server/dist/index.js"],
      "env": {
        "TAVILY_API_KEY": "your-api-key-here"
      }
    }
  }
}
```

### Using the Web Search Tool

Once configured, you can use the web search tool in Roo:

```xml
<use_mcp_tool>
<server_name>tavily-search</server_name>
<tool_name>web_search</tool_name>
<arguments>
{
  "query": "latest developments in AI",
  "search_depth": "advanced",
  "max_results": 10,
  "include_answer": true
}
</arguments>
</use_mcp_tool>
```

## API Reference

### web_search Tool

Search the web using Tavily's AI-optimized search API.

#### Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `query` | string | ✅ | - | The search query to execute |
| `search_depth` | string | ❌ | "basic" | Search depth: "basic" or "advanced" |
| `include_answer` | boolean | ❌ | true | Whether to include a direct answer |
| `max_results` | number | ❌ | 5 | Number of results (1-20) |
| `include_domains` | string[] | ❌ | - | Domains to include in search |
| `exclude_domains` | string[] | ❌ | - | Domains to exclude from search |

#### Response Format

The tool returns formatted search results including:

- **Direct Answer**: AI-generated answer to the query (if available)
- **Search Results**: List of relevant web pages with:
  - Title and URL
  - Content snippet
  - Relevance score
  - Publication date (if available)
- **Follow-up Questions**: Suggested related queries

#### Example Response

```
# Search Results for: "latest developments in AI"

## Direct Answer
Recent AI developments include advances in large language models, 
multimodal AI systems, and improved reasoning capabilities...

## Search Results

### 1. Major AI Breakthroughs in 2024
**URL:** https://example.com/ai-breakthroughs
**Published:** 2024-01-15
**Score:** 0.95

Recent developments in artificial intelligence have shown remarkable 
progress in areas such as natural language processing...

---

### 2. OpenAI Announces GPT-5
**URL:** https://example.com/gpt5-announcement
**Score:** 0.92

OpenAI has announced the development of GPT-5, promising significant 
improvements in reasoning and multimodal capabilities...

---

## Follow-up Questions
1. What are the implications of these AI developments?
2. How do these advances compare to previous years?
3. What challenges remain in AI development?
```

## Production Deployment

### PM2 Management

```bash
# Start the server
pm2 start pm2-apps.json

# View status
pm2 status

# View logs
pm2 logs tavily-mcp-server

# Restart server
pm2 restart tavily-mcp-server

# Stop server
pm2 stop tavily-mcp-server

# Monitor all processes
pm2 monit
```

### Nginx Reverse Proxy (Optional)

If you need HTTP access, you can set up an Nginx reverse proxy:

```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Monitoring and Logs

- **Application Logs**: `/var/log/pm2/tavily-mcp-server.log`
- **Error Logs**: `/var/log/pm2/tavily-mcp-server-error.log`
- **PM2 Monitoring**: `pm2 monit`

## Troubleshooting

### Common Issues

1. **"TAVILY_API_KEY environment variable is required"**
   - Ensure your API key is set: `export TAVILY_API_KEY="your-key"`
   - Check PM2 config has the correct API key

2. **"Cannot find module" errors**
   - Run `npm install` to install dependencies
   - Ensure you've built the project: `npm run build`

3. **Server won't start**
   - Check logs: `pm2 logs tavily-mcp-server`
   - Verify API key is valid
   - Ensure port is not in use

4. **Search requests failing**
   - Verify API key is valid and has credits
   - Check network connectivity
   - Review error logs for specific API errors

### Debug Mode

Run the server in debug mode:

```bash
NODE_ENV=development npm run dev
```

### Testing Connection

Test the MCP server directly:

```bash
./test-mcp.js
```

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass: `npm test`
6. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Support

- 📧 Email: support@roo.com
- 🐛 Issues: [GitHub Issues](https://github.com/roo/tavily-mcp-server/issues)
- 📖 Documentation: [Roo Documentation](https://docs.roo.com)

---

Built with ❤️ by the Roo team