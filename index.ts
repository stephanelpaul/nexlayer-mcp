import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  DeployApplicationParams,
  AddDatabaseParams,
  AddPrismaBackendParams,
  AddOpenAIIntegrationParams,
  ExtendDeploymentParams,
  ClaimDeploymentParams,
  ManageReservationParams,
  GetReservationsParams,
  ValidateYamlParams,
  CreateFullStackParams,
  PodConfig,
  GenerateDockerfileParams,
  GenerateNexlayerYamlParams,
  GenerateFullStackParams as LocalFullStackParams,
  FileGenerationResult
} from "./types/nexlayer.js";
import { NexlayerApiClient } from "./services/nexlayer-api.js";
import { FileGenerator } from "./services/file-generator.js";
import { spawn } from 'child_process';

const server = new McpServer({
  name: "nexlayer-mcp-server",
  version: process.env.npm_package_version || "1.0.0",
});

// Initialize services
let nexlayerClient: NexlayerApiClient | null = null;
const fileGenerator = new FileGenerator();

function getClient(sessionToken?: string): NexlayerApiClient {
  if (!nexlayerClient) {
    nexlayerClient = new NexlayerApiClient({
      sessionToken,
      baseUrl: 'https://app.nexlayer.io'
    });
  }
  return nexlayerClient;
}

/**
 * Tool for generating a Dockerfile locally
 */
server.tool("generate-dockerfile", async (extra) => {
  const params = extra as unknown as GenerateDockerfileParams;
  const { name, type, baseImage, port, buildCommand, startCommand, dependencies, customDockerfile } = params;
  
  try {
    const dockerfile = fileGenerator.generateDockerfile(params);
    
    return {
      content: [
        {
          type: "text",
          text: `Generated Dockerfile for ${name} (${type}):\n\n\`\`\`dockerfile\n${dockerfile}\n\`\`\`\n\nSave this as \`Dockerfile\` in your project directory.`
        }
      ]
    };
  } catch (error: any) {
    return {
      content: [
        {
          type: "text",
          text: `Failed to generate Dockerfile: ${error.message}`
        }
      ]
    };
  }
});

/**
 * Tool for generating a nexlayer.yaml file locally
 */
server.tool("generate-nexlayer-yaml", async (extra) => {
  const params = extra as unknown as GenerateNexlayerYamlParams;
  const { applicationName, pods, outputPath } = params;
  
  try {
    const yaml = fileGenerator.generateNexlayerYaml(params);
    
    return {
      content: [
        {
          type: "text",
          text: `Generated nexlayer.yaml for ${applicationName}:\n\n\`\`\`yaml\n${yaml}\n\`\`\`\n\nSave this as \`nexlayer.yaml\` in your project directory.`
        }
      ]
    };
  } catch (error: any) {
    return {
      content: [
        {
          type: "text",
          text: `Failed to generate nexlayer.yaml: ${error.message}`
        }
      ]
    };
  }
});

/**
 * Tool for building and pushing Docker images
 */
server.tool("build-and-push-docker", async (extra) => {
  const params = extra as unknown as { 
    imageName: string; 
    dockerfilePath: string; 
    registry?: string;
    tag?: string;
  };
  const { imageName, dockerfilePath, registry = "ttl.sh", tag = "1h" } = params;
  
  try {
    const fullImageName = `${registry}/${imageName}:${tag}`;
    
    // Build the Docker image
    const buildResult = await executeCommand('docker', ['build', '-t', fullImageName, '-f', dockerfilePath, '.']);
    
    if (buildResult.error) {
      throw new Error(`Docker build failed: ${buildResult.error}`);
    }
    
    // Push the Docker image
    const pushResult = await executeCommand('docker', ['push', fullImageName]);
    
    if (pushResult.error) {
      throw new Error(`Docker push failed: ${pushResult.error}`);
    }
    
    return {
      content: [
        {
          type: "text",
          text: `Successfully built and pushed Docker image: ${fullImageName}\n\nBuild output:\n${buildResult.output}\n\nPush output:\n${pushResult.output}`
        }
      ]
    };
  } catch (error: any) {
    return {
      content: [
        {
          type: "text",
          text: `Failed to build and push Docker image: ${error.message}`
        }
      ]
    };
  }
});

/**
 * Tool for creating a complete full-stack project locally
 */
server.tool("generate-full-stack-project", async (extra) => {
  const params = extra as unknown as LocalFullStackParams;
  const { appName, frontend, backend, database, openai } = params;
  
  try {
    const result = fileGenerator.generateFullStack(params);
    
    const filesList = result.files.map(file => 
      `**${file.name}** (${file.path}):\n\`\`\`\n${file.content}\n\`\`\``
    ).join('\n\n');
    
    return {
      content: [
        {
          type: "text",
          text: `Generated full-stack project "${appName}":\n\n${filesList}\n\n${result.instructions}`
        }
      ]
    };
  } catch (error: any) {
    return {
      content: [
        {
          type: "text",
          text: `Failed to generate full-stack project: ${error.message}`
        }
      ]
    };
  }
});

/**
 * Tool for creating and deploying a React Hello World example
 */
server.tool("deploy-react-hello-world", async (extra) => {
  const params = extra as unknown as { 
    appName?: string; 
    sessionToken?: string;
    registry?: string;
  };
  const { appName = "react-hello-world", sessionToken, registry = "ttl.sh" } = params;
  
  try {
    // Generate React app files
    const reactFiles = generateReactHelloWorldFiles(appName);
    
    // Generate Dockerfile
    const dockerfile = fileGenerator.generateDockerfile({
      name: appName,
      type: 'react',
      port: 3000
    });
    
    // Generate nexlayer.yaml
    const pods: PodConfig[] = [{
      name: appName,
      image: `${registry}/${appName}:1h`,
      servicePorts: [3000]
    }];
    
    const yaml = fileGenerator.generateNexlayerYaml({
      applicationName: appName,
      pods: pods
    });
    
    // Build and push instructions
    const buildInstructions = `
## Quick Deploy Instructions

1. **Create project directory:**
   \`\`\`bash
   mkdir ${appName}
   cd ${appName}
   \`\`\`

2. **Create the files:**
   - Save the React files above
   - Save the Dockerfile
   - Save the nexlayer.yaml

3. **Build and push Docker image:**
   \`\`\`bash
   docker build -t ${registry}/${appName}:1h .
   docker push ${registry}/${appName}:1h
   \`\`\`

4. **Deploy to Nexlayer:**
   \`\`\`bash
   curl -X POST "https://app.nexlayer.io/startUserDeployment" \\
     -H "Content-Type: text/x-yaml" \\
     --data-binary @nexlayer.yaml
   \`\`\`

Your React Hello World app will be deployed and accessible via the URL provided by Nexlayer!
`;
    
    return {
      content: [
        {
          type: "text",
          text: `🚀 React Hello World Project Generated!\n\n**Files to create:**\n\n**package.json:**\n\`\`\`json\n${reactFiles.packageJson}\n\`\`\`\n\n**src/App.js:**\n\`\`\`jsx\n${reactFiles.appJs}\n\`\`\`\n\n**public/index.html:**\n\`\`\`html\n${reactFiles.indexHtml}\n\`\`\`\n\n**Dockerfile:**\n\`\`\`dockerfile\n${dockerfile}\n\`\`\`\n\n**nexlayer.yaml:**\n\`\`\`yaml\n${yaml}\n\`\`\`\n\n${buildInstructions}`
        }
      ]
    };
  } catch (error: any) {
    return {
      content: [
        {
          type: "text",
          text: `Failed to generate React Hello World: ${error.message}`
        }
      ]
    };
  }
});

// Helper function to execute shell commands
async function executeCommand(command: string, args: string[]): Promise<{ output: string; error: string }> {
  return new Promise((resolve) => {
    const process = spawn(command, args);
    let output = '';
    let error = '';
    
    process.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    process.stderr.on('data', (data) => {
      error += data.toString();
    });
    
    process.on('close', (code) => {
      if (code !== 0) {
        resolve({ output, error: error || `Process exited with code ${code}` });
      } else {
        resolve({ output, error });
      }
    });
  });
}

// Helper function to generate React Hello World files
function generateReactHelloWorldFiles(appName: string) {
  return {
    packageJson: `{
  "name": "${appName}",
  "version": "0.1.0",
  "private": true,
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-scripts": "5.0.1"
  },
  "scripts": {
    "start": "react-scripts start",
    "build": "react-scripts build",
    "test": "react-scripts test",
    "eject": "react-scripts eject"
  },
  "eslintConfig": {
    "extends": [
      "react-app",
      "react-app/jest"
    ]
  },
  "browserslist": {
    "production": [
      ">0.2%",
      "not dead",
      "not op_mini all"
    ],
    "development": [
      "last 1 chrome version",
      "last 1 firefox version",
      "last 1 safari version"
    ]
  }
}`,
    appJs: `import React from 'react';
import './App.css';

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <h1>Hello World from React!</h1>
        <p>Welcome to your first React app deployed on Nexlayer</p>
        <a
          className="App-link"
          href="https://reactjs.org"
          target="_blank"
          rel="noopener noreferrer"
        >
          Learn React
        </a>
      </header>
    </div>
  );
}

export default App;`,
    indexHtml: `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <link rel="icon" href="%PUBLIC_URL%/favicon.ico" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="theme-color" content="#000000" />
    <meta
      name="description"
      content="React Hello World app deployed on Nexlayer"
    />
    <title>React Hello World</title>
  </head>
  <body>
    <noscript>You need to enable JavaScript to run this app.</noscript>
    <div id="root"></div>
  </body>
</html>`
  };
}

/**
 * Tool for deploying a new application using YAML
 */
server.tool("deploy-application", async (extra) => {
  const params = extra as unknown as DeployApplicationParams;
  const { name, image, servicePorts = [3000], vars = {}, sessionToken } = params;
  
  try {
    const client = getClient(sessionToken);
    const pods: PodConfig[] = [{
      name: name,
      image: image,
      servicePorts: servicePorts,
      vars: vars
    }];
    
    const yamlContent = client.generateYaml(name, pods);
    const result = await client.startUserDeployment({ yamlContent, sessionToken });
    
    return {
      content: [
        {
          type: "text",
          text: `Successfully deployed application "${name}"!\n\nApplication Name: ${result.applicationName}\nStatus: ${result.status}\nURL: ${result.url || 'Will be available shortly'}`
        }
      ]
    };
  } catch (error: any) {
    return {
      content: [
        {
          type: "text",
          text: `Failed to deploy application: ${error.message}`
        }
      ]
    };
  }
});

/**
 * Tool for deploying a local YAML file
 */
server.tool("deploy-local-yaml", async (extra) => {
  const params = extra as unknown as { 
    yamlFilePath: string; 
    sessionToken?: string;
  };
  const { yamlFilePath, sessionToken } = params;
  
  try {
    const client = getClient(sessionToken);
    
    // Read the YAML file
    const fs = await import('fs/promises');
    const yamlContent = await fs.readFile(yamlFilePath, 'utf-8');
    
    // Deploy using the YAML content
    const result = await client.startUserDeployment({ yamlContent, sessionToken });
    
    return {
      content: [
        {
          type: "text",
          text: `Successfully deployed from local YAML file "${yamlFilePath}"!\n\nApplication Name: ${result.applicationName}\nStatus: ${result.status}\nURL: ${result.url || 'Will be available shortly'}`
        }
      ]
    };
  } catch (error: any) {
    return {
      content: [
        {
          type: "text",
          text: `Failed to deploy from local YAML: ${error.message}`
        }
      ]
    };
  }
});

/**
 * Tool for generating files locally in the current directory
 */
server.tool("generate-files-locally", async (extra) => {
  const params = extra as unknown as { 
    projectType: 'react' | 'next' | 'vue' | 'node' | 'python' | 'fullstack';
    projectName: string;
    outputDir?: string;
    sessionToken?: string;
  };
  const { projectType, projectName, outputDir = '.', sessionToken } = params;
  
  try {
    const fs = await import('fs/promises');
    const path = await import('path');
    
    // Create output directory if it doesn't exist
    const targetDir = path.resolve(outputDir, projectName);
    await fs.mkdir(targetDir, { recursive: true });
    
    let filesGenerated = [];
    
    switch (projectType) {
      case 'react':
        const reactFiles = generateReactHelloWorldFiles(projectName);
        const dockerfile = fileGenerator.generateDockerfile({
          name: projectName,
          type: 'react',
          port: 3000
        });
        
        // Write React files
        await fs.writeFile(path.join(targetDir, 'package.json'), reactFiles.packageJson);
        await fs.mkdir(path.join(targetDir, 'src'), { recursive: true });
        await fs.writeFile(path.join(targetDir, 'src/App.js'), reactFiles.appJs);
        await fs.mkdir(path.join(targetDir, 'public'), { recursive: true });
        await fs.writeFile(path.join(targetDir, 'public/index.html'), reactFiles.indexHtml);
        await fs.writeFile(path.join(targetDir, 'Dockerfile'), dockerfile);
        
        // Create nginx.conf for React
        const nginxConfig = `server {
    listen 3000;
    server_name localhost;
    
    location / {
        root /usr/share/nginx/html;
        index index.html index.htm;
        try_files $uri $uri/ /index.html;
    }
}`;
        await fs.writeFile(path.join(targetDir, 'nginx.conf'), nginxConfig);
        
        filesGenerated = [
          'package.json',
          'src/App.js', 
          'public/index.html',
          'Dockerfile',
          'nginx.conf'
        ];
        break;
        
      case 'next':
        const nextPackageJson = `{
  "name": "${projectName}",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  },
  "dependencies": {
    "next": "14.0.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "typescript": "^5.0.0"
  }
}`;
        
        const nextPage = `'use client';

import { useState } from 'react';

export default function Home() {
  const [message, setMessage] = useState('Hello from Next.js!');

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-24">
      <h1 className="text-4xl font-bold mb-4">{message}</h1>
      <p className="text-xl">Welcome to your Next.js app on Nexlayer!</p>
    </main>
  );
}`;
        
        const nextDockerfile = fileGenerator.generateDockerfile({
          name: projectName,
          type: 'next',
          port: 3000
        });
        
        await fs.writeFile(path.join(targetDir, 'package.json'), nextPackageJson);
        await fs.mkdir(path.join(targetDir, 'app'), { recursive: true });
        await fs.writeFile(path.join(targetDir, 'app/page.tsx'), nextPage);
        await fs.writeFile(path.join(targetDir, 'Dockerfile'), nextDockerfile);
        
        filesGenerated = [
          'package.json',
          'app/page.tsx',
          'Dockerfile'
        ];
        break;
        
      case 'fullstack':
        const result = fileGenerator.generateFullStack({
          appName: projectName,
          frontend: {
            type: 'react',
            port: 3000
          },
          backend: {
            type: 'node',
            port: 8000
          }
        });
        
        // Write all generated files
        for (const file of result.files) {
          const filePath = path.join(targetDir, file.path);
          await fs.mkdir(path.dirname(filePath), { recursive: true });
          await fs.writeFile(filePath, file.content);
        }
        
        filesGenerated = result.files.map(f => f.path);
        break;
        
      default:
        throw new Error(`Unsupported project type: ${projectType}`);
    }
    
    return {
      content: [
        {
          type: "text",
          text: `✅ Successfully generated ${projectType} project "${projectName}"!\n\n📁 Files created in: ${targetDir}\n\n📄 Generated files:\n${filesGenerated.map(f => `  - ${f}`).join('\n')}\n\n🚀 Next steps:\n1. cd ${projectName}\n2. npm install (if applicable)\n3. Build and deploy with Nexlayer!`
        }
      ]
    };
  } catch (error: any) {
    return {
      content: [
        {
          type: "text",
          text: `Failed to generate files locally: ${error.message}`
        }
      ]
    };
  }
});

/**
 * Smart deployment tool that analyzes local directory and handles everything automatically
 */
server.tool("smart-deploy", async (extra) => {
  const params = extra as unknown as { 
    appName?: string;
    sessionToken?: string;
    registry?: string;
    tag?: string;
  };
  const { appName, sessionToken, registry = "ttl.sh", tag = "1h" } = params;
  
  try {
    const fs = await import('fs/promises');
    const path = await import('path');
    
    // Get current working directory
    const cwd = process.cwd();
    
    // Determine app name from directory or params
    const finalAppName = appName || path.basename(cwd);
    
    // Analyze the project structure
    const projectAnalysis = await analyzeProject(cwd);
    
    let dockerfilePath = 'Dockerfile';
    let imageName = `${registry}/${finalAppName}:${tag}`;
    
    // Check if Dockerfile already exists
    const dockerfileExists = await fs.access(path.join(cwd, 'Dockerfile')).then(() => true).catch(() => false);
    
    if (!dockerfileExists) {
      // Generate Dockerfile based on project analysis
      console.log(`Generating Dockerfile for ${projectAnalysis.type} project...`);
      const dockerfile = fileGenerator.generateDockerfile({
        name: finalAppName,
        type: mapProjectTypeToDockerType(projectAnalysis.type),
        port: projectAnalysis.port || 3000
      });
      
      await fs.writeFile(path.join(cwd, 'Dockerfile'), dockerfile);
      
      // Generate additional files if needed
      if (projectAnalysis.type === 'react') {
        const nginxConfig = `server {
    listen ${projectAnalysis.port || 3000};
    server_name localhost;
    
    location / {
        root /usr/share/nginx/html;
        index index.html index.htm;
        try_files $uri $uri/ /index.html;
    }
}`;
        await fs.writeFile(path.join(cwd, 'nginx.conf'), nginxConfig);
      }
    }
    
    // Build and push Docker image
    console.log(`Building and pushing Docker image: ${imageName}`);
    const buildResult = await executeCommand('docker', ['build', '-t', imageName, '.']);
    
    if (buildResult.error) {
      throw new Error(`Docker build failed: ${buildResult.error}`);
    }
    
    const pushResult = await executeCommand('docker', ['push', imageName]);
    
    if (pushResult.error) {
      throw new Error(`Docker push failed: ${pushResult.error}`);
    }
    
    // Generate nexlayer.yaml
    const pods: PodConfig[] = [{
      name: finalAppName,
      image: imageName,
      servicePorts: [projectAnalysis.port || 3000]
    }];
    
    const yaml = fileGenerator.generateNexlayerYaml({
      applicationName: finalAppName,
      pods: pods
    });
    
    // Save nexlayer.yaml
    await fs.writeFile(path.join(cwd, 'nexlayer.yaml'), yaml);
    
    // Deploy to Nexlayer if session token provided
    let deploymentResult = null;
    if (sessionToken) {
      console.log('Deploying to Nexlayer...');
      const client = getClient(sessionToken);
      deploymentResult = await client.startUserDeployment({ yamlContent: yaml, sessionToken });
    }
    
    return {
      content: [
        {
          type: "text",
          text: `🚀 Smart deployment completed for "${finalAppName}"!\n\n📊 Project Analysis:\n  - Type: ${projectAnalysis.type}\n  - Port: ${projectAnalysis.port || 3000}\n  - Framework: ${projectAnalysis.framework || 'Unknown'}\n\n🐳 Docker:\n  - Image: ${imageName}\n  - Build: ✅ Success\n  - Push: ✅ Success\n\n📄 Files Generated:\n  - ${dockerfileExists ? 'Using existing' : 'Generated new'} Dockerfile\n  - Generated nexlayer.yaml\n\n${deploymentResult ? `🚀 Deployment:\n  - Status: ${deploymentResult.status}\n  - URL: ${deploymentResult.url || 'Will be available shortly'}\n` : '💡 To deploy: Use the deploy-local-yaml tool with your session token'}\n\n📁 Files in ${cwd}:\n  - Dockerfile\n  - nexlayer.yaml${projectAnalysis.type === 'react' ? '\n  - nginx.conf' : ''}`
        }
      ]
    };
  } catch (error: any) {
    return {
      content: [
        {
          type: "text",
          text: `Failed to smart deploy: ${error.message}`
        }
      ]
    };
  }
});

// Helper function to analyze project structure
async function analyzeProject(projectPath: string): Promise<{
  type: string;
  port?: number;
  framework?: string;
}> {
  const fs = await import('fs/promises');
  const path = await import('path');
  
  try {
    // Check for package.json
    const packageJsonPath = path.join(projectPath, 'package.json');
    const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));
    
    // Analyze dependencies and scripts
    const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };
    
    // React detection
    if (dependencies['react'] && dependencies['react-scripts']) {
      return { type: 'react', port: 3000, framework: 'React' };
    }
    
    // Next.js detection
    if (dependencies['next']) {
      return { type: 'next', port: 3000, framework: 'Next.js' };
    }
    
    // Vue detection
    if (dependencies['vue'] && dependencies['@vue/cli-service']) {
      return { type: 'vue', port: 3000, framework: 'Vue.js' };
    }
    
    // Node.js/Express detection
    if (dependencies['express'] || packageJson.scripts?.start?.includes('node')) {
      return { type: 'node', port: 3000, framework: 'Node.js' };
    }
    
    // Default to Node.js
    return { type: 'node', port: 3000, framework: 'Node.js' };
    
  } catch (error) {
    // No package.json found, check for other indicators
    
    // Check for Python files
    const pythonFiles = await fs.readdir(projectPath).then(files => 
      files.filter(f => f.endsWith('.py'))
    );
    if (pythonFiles.length > 0) {
      return { type: 'python', port: 8000, framework: 'Python' };
    }
    
    // Check for Go files
    const goFiles = await fs.readdir(projectPath).then(files => 
      files.filter(f => f.endsWith('.go'))
    );
    if (goFiles.length > 0) {
      return { type: 'go', port: 8080, framework: 'Go' };
    }
    
    // Default to Node.js
    return { type: 'node', port: 3000, framework: 'Node.js' };
  }
}

// Helper function to map project types to Dockerfile types
function mapProjectTypeToDockerType(projectType: string): 'node' | 'python' | 'go' | 'rust' | 'nextjs' | 'react' | 'vue' | 'angular' | 'next' | 'php' | 'java' | 'dotnet' | 'custom' {
  switch (projectType) {
    case 'react': return 'react';
    case 'next': return 'next';
    case 'vue': return 'vue';
    case 'node': return 'node';
    case 'python': return 'python';
    case 'go': return 'go';
    default: return 'node';
  }
}
