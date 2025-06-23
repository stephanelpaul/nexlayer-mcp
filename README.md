# Nexlayer MCP Server

A Model Context Protocol (MCP) server that provides tools for interacting with the [Nexlayer](https://docs.nexlayer.com/) cloud platform. This server allows you to deploy and manage applications using Nexlayer's YAML-based deployment system.

## Features

This MCP server provides the following tools based on the [Nexlayer API reference](https://docs.nexlayer.com/documentation/api-reference):

### Core Deployment Tools
- **`deploy-application`** - Deploy a new application using YAML configuration
- **`add-database`** - Add a PostgreSQL database pod
- **`add-prisma-backend`** - Add a Prisma backend with database connection
- **`add-openai-integration`** - Add OpenAI integration with API key
- **`create-full-stack`** - Create a complete full-stack application

### Deployment Management
- **`extend-deployment`** - Extend a deployment using session token
- **`claim-deployment`** - Claim a deployment using session token

### Reservation Management
- **`manage-reservation`** - Add or remove deployment reservations
- **`get-reservations`** - Get all reservations for a session token

### YAML Tools
- **`validate-yaml`** - Validate a nexlayer.yaml file
- **`get-schema`** - Get the nexlayer.yaml schema

## Installation

1. Install dependencies:
```bash
npm install
```

2. Build the project:
```bash
npm run build
```

## Usage

### Starting the MCP Server

The server can be started and connected to any MCP-compatible client. Users will need to provide their own session tokens for authentication with Nexlayer.

### Example Tool Usage

#### Deploy a Simple Application
```typescript
// Deploy a Next.js application
{
  "name": "my-nextjs-app",
  "image": "user-name/nextjs-app:latest",
  "servicePorts": [3000],
  "vars": {
    "NODE_ENV": "production"
  },
  "sessionToken": "your-nexlayer-session-token"
}
```

#### Add a Database
```typescript
// Add a PostgreSQL database
{
  "name": "my-database",
  "user": "dbuser",
  "password": "dbpassword",
  "database": "mydb",
  "sessionToken": "your-nexlayer-session-token"
}
```

#### Create a Full-Stack Application
```typescript
// Create a complete full-stack app
{
  "appName": "my-fullstack-app",
  "frontendImage": "user-name/frontend:latest",
  "backendImage": "user-name/backend:latest",
  "databaseImage": "postgres:14",
  "sessionToken": "your-nexlayer-session-token"
}
```

#### Extend a Deployment
```typescript
// Extend an existing deployment
{
  "sessionToken": "your-nexlayer-session-token",
  "applicationName": "my-app"
}
```

## API Integration

This MCP server integrates with the actual Nexlayer API endpoints:

- **POST** `/startUserDeployment` - Start deployments with YAML
- **POST** `/extendDeployment` - Extend existing deployments
- **POST** `/claimDeployment` - Claim deployments
- **POST** `/addDeploymentReservation` - Add deployment reservations
- **POST** `/removeDeploymentReservation` - Remove deployment reservations
- **GET** `/getReservations` - Get all reservations
- **GET** `/schema` - Get YAML schema
- **POST** `/validate` - Validate YAML files

## Authentication

The server uses session tokens for authentication with Nexlayer. Users must provide their own session tokens when calling the tools. Session tokens are returned when deployments are started and can be used for subsequent operations.

## YAML Generation

The server automatically generates proper `nexlayer.yaml` files based on the tool parameters. For example:

```yaml
application:
  name: "my-app"
  pods:
    - name: "frontend"
      image: "user-name/frontend:latest"
      servicePorts:
        - 3000
      vars:
        NODE_ENV: "production"
    - name: "database"
      image: "postgres:14"
      servicePorts:
        - 5432
      vars:
        POSTGRES_USER: "dbuser"
        POSTGRES_PASSWORD: "dbpassword"
        POSTGRES_DB: "mydb"
```

## Error Handling

All tools include comprehensive error handling and will return meaningful error messages if operations fail. The server logs API errors for debugging purposes.

## Development

### Project Structure
```
nexlayer-mcp/
├── index.ts              # Main MCP server
├── types/
│   └── nexlayer.ts       # TypeScript interfaces
├── services/
│   └── nexlayer-api.ts   # Nexlayer API client
├── package.json
└── README.md
```

### Adding New Tools

To add new tools:

1. Define the parameter interface in `types/nexlayer.ts`
2. Add the API method in `services/nexlayer-api.ts`
3. Implement the tool in `index.ts`

## License

ISC

## Support

For issues related to the Nexlayer platform, refer to the [Nexlayer documentation](https://docs.nexlayer.com/). 