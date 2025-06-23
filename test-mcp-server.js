#!/usr/bin/env node

// Test script to verify MCP server tools
import { FileGenerator } from './dist/services/file-generator.js';

console.log('🧪 Testing Nexlayer MCP Server Tools...\n');

const fileGenerator = new FileGenerator();

// Test 1: Generate Dockerfile
console.log('1️⃣ Testing Dockerfile generation...');
try {
  const dockerfile = fileGenerator.generateDockerfile({
    name: 'react-app',
    type: 'react',
    port: 3000
  });
  
  console.log('✅ Dockerfile generated successfully!');
  console.log('\nGenerated Dockerfile:');
  console.log('='.repeat(50));
  console.log(dockerfile);
  console.log('='.repeat(50));
} catch (error) {
  console.error('❌ Dockerfile generation failed:', error.message);
}

console.log('\n2️⃣ Testing YAML generation...');
try {
  const yaml = fileGenerator.generateNexlayerYaml({
    applicationName: 'test-app',
    pods: [{
      name: 'frontend',
      image: 'ttl.sh/react-app:1h',
      servicePorts: [3000]
    }]
  });
  
  console.log('✅ YAML generated successfully!');
  console.log('\nGenerated YAML:');
  console.log('='.repeat(50));
  console.log(yaml);
  console.log('='.repeat(50));
} catch (error) {
  console.error('❌ YAML generation failed:', error.message);
}

console.log('\n3️⃣ Testing full-stack project generation...');
try {
  const result = fileGenerator.generateFullStack({
    appName: 'test-fullstack',
    frontend: {
      type: 'react',
      port: 3000
    },
    backend: {
      type: 'node',
      port: 8000
    }
  });
  
  console.log('✅ Full-stack project generated successfully!');
  console.log(`\nGenerated ${result.files.length} files:`);
  result.files.forEach(file => {
    console.log(`  - ${file.path}`);
  });
  console.log('\nInstructions:');
  console.log(result.instructions);
} catch (error) {
  console.error('❌ Full-stack generation failed:', error.message);
}

console.log('\n🎉 All tests completed!');
console.log('\n📋 To use with Cursor:');
console.log('1. Make sure Cursor is restarted');
console.log('2. The MCP tools should be available in chat');
console.log('3. Try asking: "Generate a Dockerfile for a React app"'); 