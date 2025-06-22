#!/usr/bin/env node

/**
 * Test script for Tavily MCP Server
 * This script tests the MCP server by simulating MCP protocol communication
 */

import { spawn } from 'child_process';
import { readFileSync } from 'fs';

// Test configuration
const TEST_CONFIG = {
  timeout: 10000, // 10 seconds timeout
  testQueries: [
    'latest AI developments',
    'Node.js best practices',
    'TypeScript tutorial'
  ]
};

class MCPTester {
  constructor() {
    this.serverProcess = null;
    this.testResults = [];
  }

  async runTests() {
    console.log('🧪 Starting Tavily MCP Server Tests...\n');

    try {
      // Check if build exists
      await this.checkBuild();
      
      // Test server startup
      await this.testServerStartup();
      
      // Test list tools
      await this.testListTools();
      
      // Test web search functionality
      await this.testWebSearch();
      
      // Print results
      this.printResults();
      
    } catch (error) {
      console.error('❌ Test failed:', error.message);
      process.exit(1);
    } finally {
      if (this.serverProcess) {
        this.serverProcess.kill();
      }
    }
  }

  async checkBuild() {
    console.log('📦 Checking build...');
    try {
      const packageJson = JSON.parse(readFileSync('./package.json', 'utf8'));
      console.log(`✅ Package: ${packageJson.name} v${packageJson.version}`);
      
      // Check if dist directory exists
      try {
        readFileSync('./dist/index.js');
        console.log('✅ Build files found');
      } catch {
        throw new Error('Build files not found. Run "npm run build" first.');
      }
    } catch (error) {
      throw new Error(`Build check failed: ${error.message}`);
    }
  }

  async testServerStartup() {
    console.log('\n🚀 Testing server startup...');
    
    return new Promise((resolve, reject) => {
      // Set test API key if not provided
      const env = { ...process.env };
      if (!env.TAVILY_API_KEY) {
        env.TAVILY_API_KEY = 'test-key-for-startup-test';
      }

      this.serverProcess = spawn('node', ['dist/index.js'], {
        stdio: ['pipe', 'pipe', 'pipe'],
        env
      });

      let startupOutput = '';
      let errorOutput = '';

      const timeout = setTimeout(() => {
        reject(new Error('Server startup timeout'));
      }, TEST_CONFIG.timeout);

      this.serverProcess.stderr.on('data', (data) => {
        const output = data.toString();
        errorOutput += output;
        
        if (output.includes('Tavily MCP server running on stdio')) {
          clearTimeout(timeout);
          console.log('✅ Server started successfully');
          this.testResults.push({ test: 'Server Startup', status: 'PASS' });
          resolve();
        }
      });

      this.serverProcess.stdout.on('data', (data) => {
        startupOutput += data.toString();
      });

      this.serverProcess.on('error', (error) => {
        clearTimeout(timeout);
        reject(new Error(`Server startup failed: ${error.message}`));
      });

      this.serverProcess.on('exit', (code) => {
        if (code !== 0) {
          clearTimeout(timeout);
          reject(new Error(`Server exited with code ${code}. Error: ${errorOutput}`));
        }
      });
    });
  }

  async testListTools() {
    console.log('\n🔧 Testing list tools...');
    
    return new Promise((resolve, reject) => {
      if (!this.serverProcess) {
        reject(new Error('Server not running'));
        return;
      }

      const listToolsRequest = {
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/list'
      };

      let responseData = '';
      
      const timeout = setTimeout(() => {
        reject(new Error('List tools timeout'));
      }, 5000);

      this.serverProcess.stdout.on('data', (data) => {
        responseData += data.toString();
        
        try {
          const response = JSON.parse(responseData);
          if (response.id === 1 && response.result && response.result.tools) {
            clearTimeout(timeout);
            
            const tools = response.result.tools;
            const webSearchTool = tools.find(tool => tool.name === 'web_search');
            
            if (webSearchTool) {
              console.log('✅ web_search tool found');
              console.log(`   Description: ${webSearchTool.description}`);
              this.testResults.push({ test: 'List Tools', status: 'PASS' });
              resolve();
            } else {
              reject(new Error('web_search tool not found in tools list'));
            }
          }
        } catch (error) {
          // Continue accumulating data if JSON is incomplete
        }
      });

      // Send the request
      this.serverProcess.stdin.write(JSON.stringify(listToolsRequest) + '\n');
    });
  }

  async testWebSearch() {
    console.log('\n🔍 Testing web search functionality...');
    
    // Skip actual API test if no real API key
    if (!process.env.TAVILY_API_KEY || process.env.TAVILY_API_KEY === 'test-key-for-startup-test') {
      console.log('⚠️  Skipping web search test - no valid TAVILY_API_KEY provided');
      this.testResults.push({ test: 'Web Search', status: 'SKIP' });
      return;
    }

    return new Promise((resolve, reject) => {
      const searchRequest = {
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/call',
        params: {
          name: 'web_search',
          arguments: {
            query: TEST_CONFIG.testQueries[0],
            max_results: 3,
            include_answer: true
          }
        }
      };

      let responseData = '';
      
      const timeout = setTimeout(() => {
        reject(new Error('Web search timeout'));
      }, 15000); // Longer timeout for API call

      this.serverProcess.stdout.on('data', (data) => {
        responseData += data.toString();
        
        try {
          const response = JSON.parse(responseData);
          if (response.id === 2) {
            clearTimeout(timeout);
            
            if (response.error) {
              console.log(`⚠️  Web search returned error: ${response.error.message}`);
              this.testResults.push({ test: 'Web Search', status: 'FAIL', error: response.error.message });
            } else if (response.result && response.result.content) {
              console.log('✅ Web search completed successfully');
              console.log(`   Results contain: ${response.result.content[0].text.substring(0, 100)}...`);
              this.testResults.push({ test: 'Web Search', status: 'PASS' });
            } else {
              reject(new Error('Invalid web search response format'));
            }
            resolve();
          }
        } catch (error) {
          // Continue accumulating data if JSON is incomplete
        }
      });

      // Send the request
      this.serverProcess.stdin.write(JSON.stringify(searchRequest) + '\n');
    });
  }

  printResults() {
    console.log('\n📊 Test Results Summary:');
    console.log('========================');
    
    let passed = 0;
    let failed = 0;
    let skipped = 0;
    
    this.testResults.forEach(result => {
      const status = result.status === 'PASS' ? '✅' : 
                    result.status === 'FAIL' ? '❌' : '⚠️';
      console.log(`${status} ${result.test}: ${result.status}`);
      if (result.error) {
        console.log(`   Error: ${result.error}`);
      }
      
      if (result.status === 'PASS') passed++;
      else if (result.status === 'FAIL') failed++;
      else skipped++;
    });
    
    console.log('\n📈 Summary:');
    console.log(`   Passed: ${passed}`);
    console.log(`   Failed: ${failed}`);
    console.log(`   Skipped: ${skipped}`);
    
    if (failed > 0) {
      console.log('\n❌ Some tests failed. Please check the errors above.');
      process.exit(1);
    } else {
      console.log('\n🎉 All tests passed! The MCP server is ready for deployment.');
    }
  }
}

// Run tests if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const tester = new MCPTester();
  tester.runTests().catch(console.error);
}

export { MCPTester };