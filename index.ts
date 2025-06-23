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
  PodConfig
} from "./types/nexlayer.js";
import { NexlayerApiClient } from "./services/nexlayer-api.js";

const server = new McpServer({
  name: "nexlayer-mcp-server",
  version: process.env.npm_package_version || "1.0.0",
});

// Initialize Nexlayer API client
let nexlayerClient: NexlayerApiClient | null = null;

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
          text: `Successfully deployed application "${name}"!\nSession Token: ${result.sessionToken}\nStatus: ${result.status}\nURL: ${result.url || 'Deploying...'}`
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
 * Tool for adding a database pod
 */
server.tool("add-database", async (extra) => {
  const params = extra as unknown as AddDatabaseParams;
  const { name = "db", image = "postgres:14", user, password, database, sessionToken } = params;
  
  try {
    const client = getClient(sessionToken);
    const pods: PodConfig[] = [{
      name: name,
      image: image,
      vars: {
        POSTGRES_USER: user,
        POSTGRES_PASSWORD: password,
        POSTGRES_DB: database
      },
      servicePorts: [5432]
    }];
    
    const yamlContent = client.generateYaml(`${name}-app`, pods);
    const result = await client.startUserDeployment({ yamlContent, sessionToken });
    
    return {
      content: [
        {
          type: "text",
          text: `Successfully added database "${name}"!\nSession Token: ${result.sessionToken}\nDatabase URL: postgresql://${user}:${password}@${name}.pod:5432/${database}`
        }
      ]
    };
  } catch (error: any) {
    return {
      content: [
        {
          type: "text",
          text: `Failed to add database: ${error.message}`
        }
      ]
    };
  }
});

/**
 * Tool for adding a Prisma backend
 */
server.tool("add-prisma-backend", async (extra) => {
  const params = extra as unknown as AddPrismaBackendParams;
  const { name = "api", image, databaseUrl, path = "/api", sessionToken } = params;
  
  try {
    const client = getClient(sessionToken);
    const pods: PodConfig[] = [{
      name: name,
      image: image,
      vars: {
        DATABASE_URL: databaseUrl
      },
      servicePorts: [4000]
    }];
    
    const yamlContent = client.generateYaml(`${name}-app`, pods);
    const result = await client.startUserDeployment({ yamlContent, sessionToken });
    
    return {
      content: [
        {
          type: "text",
          text: `Successfully added Prisma backend "${name}"!\nSession Token: ${result.sessionToken}\nAPI available at ${path}`
        }
      ]
    };
  } catch (error: any) {
    return {
      content: [
        {
          type: "text",
          text: `Failed to add Prisma backend: ${error.message}`
        }
      ]
    };
  }
});

/**
 * Tool for adding an OpenAI integration
 */
server.tool("add-openai-integration", async (extra) => {
  const params = extra as unknown as AddOpenAIIntegrationParams;
  const { name = "openai", image, openaiApiKey, sessionToken } = params;
  
  try {
    const client = getClient(sessionToken);
    const pods: PodConfig[] = [{
      name: name,
      image: image,
      vars: {
        OPENAI_API_KEY: openaiApiKey
      },
      servicePorts: [3000]
    }];
    
    const yamlContent = client.generateYaml(`${name}-app`, pods);
    const result = await client.startUserDeployment({ yamlContent, sessionToken });
    
    return {
      content: [
        {
          type: "text",
          text: `Successfully added OpenAI integration "${name}"!\nSession Token: ${result.sessionToken}\nAPI key configured securely.`
        }
      ]
    };
  } catch (error: any) {
    return {
      content: [
        {
          type: "text",
          text: `Failed to add OpenAI integration: ${error.message}`
        }
      ]
    };
  }
});

/**
 * Tool for extending a deployment
 */
server.tool("extend-deployment", async (extra) => {
  const params = extra as unknown as ExtendDeploymentParams;
  const { sessionToken, applicationName } = params;
  
  try {
    const client = getClient(sessionToken);
    const result = await client.extendDeployment({ sessionToken, applicationName });
    
    return {
      content: [
        {
          type: "text",
          text: `Successfully extended deployment for "${applicationName}"!\nStatus: ${result.status}\nURL: ${result.url || 'Deploying...'}`
        }
      ]
    };
  } catch (error: any) {
    return {
      content: [
        {
          type: "text",
          text: `Failed to extend deployment: ${error.message}`
        }
      ]
    };
  }
});

/**
 * Tool for claiming a deployment
 */
server.tool("claim-deployment", async (extra) => {
  const params = extra as unknown as ClaimDeploymentParams;
  const { sessionToken, applicationName } = params;
  
  try {
    const client = getClient(sessionToken);
    const result = await client.claimDeployment({ sessionToken, applicationName });
    
    return {
      content: [
        {
          type: "text",
          text: `Successfully claimed deployment for "${applicationName}"!\nStatus: ${result.status}\nURL: ${result.url || 'Deploying...'}`
        }
      ]
    };
  } catch (error: any) {
    return {
      content: [
        {
          type: "text",
          text: `Failed to claim deployment: ${error.message}`
        }
      ]
    };
  }
});

/**
 * Tool for managing deployment reservations
 */
server.tool("manage-reservation", async (extra) => {
  const params = extra as unknown as ManageReservationParams;
  const { sessionToken, applicationName, action } = params;
  
  try {
    const client = getClient(sessionToken);
    
    if (action === 'add') {
      await client.addDeploymentReservation({ sessionToken, applicationName });
      return {
        content: [
          {
            type: "text",
            text: `Successfully added reservation for "${applicationName}"`
          }
        ]
      };
    } else {
      await client.removeDeploymentReservation({ sessionToken, applicationName });
      return {
        content: [
          {
            type: "text",
            text: `Successfully removed reservation for "${applicationName}"`
          }
        ]
      };
    }
  } catch (error: any) {
    return {
      content: [
        {
          type: "text",
          text: `Failed to ${action} reservation: ${error.message}`
        }
      ]
    };
  }
});

/**
 * Tool for getting all reservations
 */
server.tool("get-reservations", async (extra) => {
  const params = extra as unknown as GetReservationsParams;
  const { sessionToken } = params;
  
  try {
    const client = getClient(sessionToken);
    const reservations = await client.getReservations({ sessionToken });
    
    const reservationList = reservations.map(r => 
      `- ${r.applicationName} (expires: ${r.expiresAt})`
    ).join('\n');
    
    return {
      content: [
        {
          type: "text",
          text: `Reservations:\n${reservationList || 'No reservations found'}`
        }
      ]
    };
  } catch (error: any) {
    return {
      content: [
        {
          type: "text",
          text: `Failed to get reservations: ${error.message}`
        }
      ]
    };
  }
});

/**
 * Tool for validating YAML
 */
server.tool("validate-yaml", async (extra) => {
  const params = extra as unknown as ValidateYamlParams;
  const { yamlContent } = params;
  
  try {
    const client = getClient();
    const result = await client.validateYaml({ yamlContent });
    
    if (result.valid) {
      return {
        content: [
          {
            type: "text",
            text: `YAML is valid!${result.warnings?.length ? '\nWarnings: ' + result.warnings.join(', ') : ''}`
          }
        ]
      };
    } else {
      return {
        content: [
          {
            type: "text",
            text: `YAML validation failed:\nErrors: ${result.errors?.join('\n') || 'Unknown error'}`
          }
        ]
      };
    }
  } catch (error: any) {
    return {
      content: [
        {
          type: "text",
          text: `Failed to validate YAML: ${error.message}`
        }
      ]
    };
  }
});

/**
 * Tool for getting schema
 */
server.tool("get-schema", async (extra) => {
  try {
    const client = getClient();
    const schema = await client.getSchema();
    
    return {
      content: [
        {
          type: "text",
          text: `Nexlayer YAML Schema (v${schema.version}):\n${JSON.stringify(schema.schema, null, 2)}`
        }
      ]
    };
  } catch (error: any) {
    return {
      content: [
        {
          type: "text",
          text: `Failed to get schema: ${error.message}`
        }
      ]
    };
  }
});

/**
 * Tool for creating a complete full-stack application
 */
server.tool("create-full-stack", async (extra) => {
  const params = extra as unknown as CreateFullStackParams;
  const { appName, frontendImage, backendImage, databaseImage = "postgres:14", sessionToken } = params;
  
  try {
    const client = getClient(sessionToken);
    const pods: PodConfig[] = [
      {
        name: "frontend",
        image: frontendImage,
        servicePorts: [3000]
      },
      {
        name: "backend",
        image: backendImage,
        servicePorts: [4000]
      },
      {
        name: "database",
        image: databaseImage,
        servicePorts: [5432]
      }
    ];
    
    const yamlContent = client.generateYaml(appName, pods);
    const result = await client.startUserDeployment({ yamlContent, sessionToken });
    
    return {
      content: [
        {
          type: "text",
          text: `Successfully created full-stack application "${appName}"!\nSession Token: ${result.sessionToken}\nStatus: ${result.status}\nURL: ${result.url || 'Deploying...'}`
        }
      ]
    };
  } catch (error: any) {
    return {
      content: [
        {
          type: "text",
          text: `Failed to create full-stack application: ${error.message}`
        }
      ]
    };
  }
});