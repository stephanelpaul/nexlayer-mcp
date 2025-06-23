#!/usr/bin/env node

// Simple test script for the Nexlayer MCP server
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🧪 Testing Nexlayer MCP Server...\n');

// Test 1: Build the project
console.log('1️⃣ Building the project...');
const buildProcess = spawn('npm', ['run', 'build'], { 
  stdio: 'inherit',
  cwd: __dirname 
});

buildProcess.on('close', async (code) => {
  if (code !== 0) {
    console.error('❌ Build failed');
    process.exit(1);
  }
  
  console.log('✅ Build successful\n');
  
  // Test 2: Check if the server can be imported
  console.log('2️⃣ Testing server import...');
  try {
    const { McpServer } = await import('./dist/index.js');
    console.log('✅ Server import successful\n');
  } catch (error) {
    console.error('❌ Server import failed:', error.message);
    process.exit(1);
  }
  
  // Test 3: Test YAML generation
  console.log('3️⃣ Testing YAML generation...');
  try {
    const { NexlayerApiClient } = await import('./dist/services/nexlayer-api.js');
    const client = new NexlayerApiClient({});
    
    const yaml = client.generateYaml('test-app', [{
      name: 'frontend',
      image: 'nextjs:latest',
      servicePorts: [3000],
      vars: { NODE_ENV: 'production' }
    }]);
    
    console.log('Generated YAML:');
    console.log(yaml);
    console.log('✅ YAML generation successful\n');
  } catch (error) {
    console.error('❌ YAML generation failed:', error.message);
    process.exit(1);
  }
  
  console.log('🎉 All tests passed! The MCP server is ready to use.');
  console.log('\n📋 Next steps:');
  console.log('1. Configure Cursor to use this MCP server');
  console.log('2. Get a Nexlayer session token');
  console.log('3. Test the tools with real API calls');
}); 