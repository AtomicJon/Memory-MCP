#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { config } from 'dotenv';
import {
  DatabaseService,
  DatabaseConfig,
  DatabaseType,
} from './modules/database/index.js';
import {
  EmbeddingConfig,
  EmbeddingProviderType,
  EmbeddingService,
} from './modules/embedding/index.js';

// Load environment variables
config();

import {
  isValidDeleteMemoryArgs,
  isValidListMemoriesArgs,
  isValidSearchMemoriesArgs,
  isValidStoreMemoryArgs,
} from './modules/server/server.validation.js';

/**
 * Memory MCP Server
 */
class MemoryMCPServer {
  private server: Server;
  private database: DatabaseService;
  private embeddings: EmbeddingService;

  constructor() {
    this.server = new Server(
      {
        name: 'memory-mcp',
        version: '0.1.0',
      },
      {
        capabilities: {
          tools: {},
        },
      },
    );

    // Initialize database connection
    const databaseConfig: DatabaseConfig = this.createDatabaseConfig();
    this.database = new DatabaseService(databaseConfig);

    // Initialize embedding service
    const embeddingConfig: EmbeddingConfig = {
      provider:
        process.env.EMBEDDING_PROVIDER === 'openai'
          ? EmbeddingProviderType.OPENAI
          : EmbeddingProviderType.OLLAMA,
      apiKey: process.env.OPENAI_API_KEY,
      baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
      model: process.env.EMBEDDING_MODEL || 'nomic-embed-text',
      dimensions: parseInt(process.env.EMBEDDING_DIMENSIONS || '768'),
    };

    this.embeddings = new EmbeddingService(embeddingConfig);

    this.setupToolHandlers();

    // Error handling
    this.server.onerror = (error) => console.error('[MCP Error]', error);
    process.on('SIGINT', async () => {
      await this.cleanup();
      process.exit(0);
    });
  }

  /**
   * Create database configuration based on environment variables
   */
  private createDatabaseConfig(): DatabaseConfig {
    const databaseUrl = process.env.DATABASE_URL;
    const pgliteDataDir = process.env.PGLITE_DATA_DIR;

    // If DATABASE_URL is provided, use PostgreSQL
    if (databaseUrl) {
      return {
        type: DatabaseType.POSTGRESQL,
        connectionString: databaseUrl,
      };
    }

    // Otherwise, use PGlite (default)
    return {
      type: DatabaseType.PGLITE,
      dataDir: pgliteDataDir,
    };
  }

  /**
   * Setup MCP tool handlers
   */
  private setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'storeMemory',
          description: 'Store a coding preference or correction as a memory',
          inputSchema: {
            type: 'object',
            properties: {
              content: {
                type: 'string',
                description: 'The preference or correction content to store',
              },
              context: {
                type: 'string',
                description: 'Optional code context where this applies',
              },
              tags: {
                type: 'array',
                items: { type: 'string' },
                description: 'Optional array of tags for categorization',
              },
              importanceScore: {
                type: 'number',
                minimum: 1,
                maximum: 5,
                description: 'Importance score from 1-5, defaults to 1',
              },
            },
            required: ['content'],
          },
        },
        {
          name: 'searchMemories',
          description: 'Search for relevant memories using semantic similarity',
          inputSchema: {
            type: 'object',
            properties: {
              query: {
                type: 'string',
                description: 'The query text to search for similar memories',
              },
              limit: {
                type: 'number',
                description:
                  'Maximum number of results to return, defaults to 10',
              },
              similarityThreshold: {
                type: 'number',
                minimum: 0,
                maximum: 1,
                description:
                  'Minimum similarity threshold (0-1), defaults to 0.7',
              },
              tags: {
                type: 'array',
                items: { type: 'string' },
                description: 'Optional array of tags to filter results',
              },
              embeddingProvider: {
                type: 'string',
                enum: [
                  EmbeddingProviderType.OPENAI,
                  EmbeddingProviderType.OLLAMA,
                ],
                description: 'Optional embedding provider to search within',
              },
              embeddingModel: {
                type: 'string',
                description: 'Optional specific model to filter by',
              },
            },
            required: ['query'],
          },
        },
        {
          name: 'listMemories',
          description: 'List memories with optional filtering',
          inputSchema: {
            type: 'object',
            properties: {
              limit: {
                type: 'number',
                description:
                  'Maximum number of results to return, defaults to 50',
              },
              offset: {
                type: 'number',
                description:
                  'Number of results to skip for pagination, defaults to 0',
              },
              tags: {
                type: 'array',
                items: { type: 'string' },
                description: 'Optional array of tags to filter by',
              },
              minImportance: {
                type: 'number',
                minimum: 1,
                maximum: 5,
                description: 'Minimum importance score to include',
              },
              startDate: {
                type: 'string',
                description: 'Start date for filtering (ISO string format)',
              },
              endDate: {
                type: 'string',
                description: 'End date for filtering (ISO string format)',
              },
              embeddingProvider: {
                type: 'string',
                enum: [
                  EmbeddingProviderType.OPENAI,
                  EmbeddingProviderType.OLLAMA,
                ],
                description: 'Optional embedding provider to filter by',
              },
            },
            required: [],
          },
        },
        {
          name: 'deleteMemory',
          description: 'Delete a memory by ID',
          inputSchema: {
            type: 'object',
            properties: {
              memoryId: {
                type: 'number',
                description: 'The ID of the memory to delete',
              },
            },
            required: ['memoryId'],
          },
        },
        {
          name: 'listTags',
          description: 'List all unique tags used in memories',
          inputSchema: {
            type: 'object',
            properties: {},
            required: [],
          },
        },
        {
          name: 'getMemoryStats',
          description: 'Get statistics about stored memories',
          inputSchema: {
            type: 'object',
            properties: {},
            required: [],
          },
        },
      ],
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      try {
        switch (request.params.name) {
          case 'storeMemory':
            return await this.handleStoreMemory(request.params.arguments);

          case 'searchMemories':
            return await this.handleSearchMemories(request.params.arguments);

          case 'listMemories':
            return await this.handleListMemories(request.params.arguments);

          case 'deleteMemory':
            return await this.handleDeleteMemory(request.params.arguments);

          case 'listTags':
            return await this.handleListTags();

          case 'getMemoryStats':
            return await this.handleGetMemoryStats();

          default:
            throw new McpError(
              ErrorCode.MethodNotFound,
              `Unknown tool: ${request.params.name}`,
            );
        }
      } catch (error) {
        console.error(`Error in ${request.params.name}:`, error);
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${
                error instanceof Error ? error.message : 'Unknown error'
              }`,
            },
          ],
          isError: true,
        };
      }
    });
  }

  /**
   * Handle storeMemory tool
   */
  private async handleStoreMemory(args: unknown) {
    if (!isValidStoreMemoryArgs(args)) {
      throw new McpError(
        ErrorCode.InvalidParams,
        'Invalid storeMemory arguments',
      );
    }

    // Generate embedding for the content
    const embedding = await this.embeddings.generateEmbedding(args.content);

    // Store in database with embedding metadata
    const memory = await this.database.storeMemory(
      args,
      embedding,
      this.embeddings.getModel(),
      this.embeddings.getProvider(),
    );

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              success: true,
              memory: {
                ...memory,
                importanceScore: memory.importanceScore,
                embeddingModel: memory.embeddingModel,
                embeddingProvider: memory.embeddingProvider,
                createdAt: memory.createdAt,
              },
            },
            null,
            2,
          ),
        },
      ],
    };
  }

  /**
   * Handle searchMemories tool
   */
  private async handleSearchMemories(args: unknown) {
    if (!isValidSearchMemoriesArgs(args)) {
      throw new McpError(
        ErrorCode.InvalidParams,
        'Invalid searchMemories arguments',
      );
    }

    // Generate embedding for the query
    const queryEmbedding = await this.embeddings.generateEmbedding(args.query);

    // Search in database
    const results = await this.database.searchMemories(
      args,
      queryEmbedding,
      this.embeddings.getProvider(),
    );

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              success: true,
              results: results.map((result) => ({
                memory: {
                  ...result.memory,
                  importanceScore: result.memory.importanceScore,
                  embeddingModel: result.memory.embeddingModel,
                  embeddingProvider: result.memory.embeddingProvider,
                  createdAt: result.memory.createdAt,
                },
                similarityScore: result.similarityScore,
              })),
              totalResults: results.length,
            },
            null,
            2,
          ),
        },
      ],
    };
  }

  /**
   * Handle listMemories tool
   */
  private async handleListMemories(args: unknown) {
    if (!isValidListMemoriesArgs(args)) {
      throw new McpError(
        ErrorCode.InvalidParams,
        'Invalid listMemories arguments',
      );
    }

    const memories = await this.database.listMemories(args);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              success: true,
              memories: memories.map((memory) => ({
                ...memory,
                importanceScore: memory.importanceScore,
                createdAt: memory.createdAt,
              })),
              totalResults: memories.length,
            },
            null,
            2,
          ),
        },
      ],
    };
  }

  /**
   * Handle deleteMemory tool
   */
  private async handleDeleteMemory(args: unknown) {
    if (!isValidDeleteMemoryArgs(args)) {
      throw new McpError(
        ErrorCode.InvalidParams,
        'Invalid deleteMemory arguments',
      );
    }

    const deleted = await this.database.deleteMemory(args.memoryId);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              success: deleted,
              message: deleted
                ? `Memory ${args.memoryId} deleted successfully`
                : `Memory ${args.memoryId} not found`,
            },
            null,
            2,
          ),
        },
      ],
    };
  }

  /**
   * Handle listTags tool
   */
  private async handleListTags() {
    const tags = await this.database.listTags();

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              success: true,
              tags: tags,
              totalTags: tags.length,
            },
            null,
            2,
          ),
        },
      ],
    };
  }

  /**
   * Handle getMemoryStats tool
   */
  private async handleGetMemoryStats() {
    const stats = await this.database.getStats();

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              success: true,
              stats: {
                ...stats,
                currentProvider: this.embeddings.getProvider(),
                currentModel: this.embeddings.getModel(),
                currentDimensions: this.embeddings.getDimensions(),
              },
            },
            null,
            2,
          ),
        },
      ],
    };
  }

  /**
   * Test connections and start the server
   */
  async run() {
    try {
      // Test database connection and initialize schema
      await this.database.testConnection();
      await this.database.initializeSchema();
      // Using error since MCP is using stdio transport
      console.error('Database connection and schema initialization successful');

      // Start MCP server
      const transport = new StdioServerTransport();
      await this.server.connect(transport);
      // Using error since MCP is using stdio transport
      console.error('Memory MCP server running on stdio');
    } catch (error) {
      console.error('Failed to start server:', error);
      process.exit(1);
    }
  }

  /**
   * Cleanup resources
   */
  private async cleanup() {
    try {
      await this.database.close();
      await this.server.close();
    } catch (error) {
      console.error('Error during cleanup:', error);
    }
  }
}

// Start the server
const server = new MemoryMCPServer();
server.run().catch(console.error);
