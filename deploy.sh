#!/bin/bash

# Tavily MCP Server Deployment Script
set -e

echo "🚀 Deploying Tavily MCP Server..."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Please run this script from the tavily-mcp-server directory."
    exit 1
fi

# Check if TAVILY_API_KEY is set
if [ -z "$TAVILY_API_KEY" ]; then
    echo "❌ Error: TAVILY_API_KEY environment variable is not set."
    echo "Please set it with: export TAVILY_API_KEY='your-api-key-here'"
    exit 1
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Run tests
echo "🧪 Running tests..."
npm test

# Build the project
echo "🔨 Building project..."
npm run build

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
    echo "📦 Installing PM2 globally..."
    npm install -g pm2
fi

# Update PM2 config with actual API key
echo "⚙️  Updating PM2 configuration..."
sed -i "s/\"TAVILY_API_KEY\": \"\"/\"TAVILY_API_KEY\": \"$TAVILY_API_KEY\"/g" pm2-apps.json

# Create log directory if it doesn't exist
sudo mkdir -p /var/log/pm2
sudo chown $USER:$USER /var/log/pm2

# Stop existing process if running
echo "🛑 Stopping existing process..."
pm2 stop tavily-mcp-server 2>/dev/null || true
pm2 delete tavily-mcp-server 2>/dev/null || true

# Start the server with PM2
echo "🚀 Starting server with PM2..."
pm2 start pm2-apps.json

# Save PM2 configuration
pm2 save

# Setup PM2 startup script
pm2 startup

echo "✅ Deployment complete!"
echo ""
echo "📊 Server status:"
pm2 status

echo ""
echo "📝 Useful commands:"
echo "  pm2 logs tavily-mcp-server    # View logs"
echo "  pm2 restart tavily-mcp-server # Restart server"
echo "  pm2 stop tavily-mcp-server    # Stop server"
echo "  pm2 monit                     # Monitor all processes"
echo ""
echo "🔗 The server is now running and ready to accept MCP connections!"