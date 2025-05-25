# Memory MCP Server

> **⚠️ EXPERIMENTAL - NOT PRODUCTION READY**
>
> This MCP server is an experimental implementation that lacks essential security features required for production use. It has no authentication, authorization, or access controls. Use only in trusted, single-user development environments.

A Model Context Protocol (MCP) server for storing and retrieving coding preferences and corrections using vector embeddings for semantic search.

## Features

- **Store coding memories**: Save preferences, corrections, and best practices with contextual information
- **Semantic search**: Find relevant memories using vector similarity search
- **Configurable embeddings**: Support for both OpenAI and Ollama embedding providers
- **PostgreSQL with pgvector**: Efficient vector storage and similarity search
- **Tag-based organization**: Categorize memories with custom tags
- **Importance scoring**: Prioritize memories with 1-5 importance levels
- **Docker support**: Easy setup with docker compose

## Architecture

- **TypeScript MCP Server**: Implements the Model Context Protocol
- **PostgreSQL + pgvector**: Vector database for storing embeddings
- **Configurable Embedding Providers**:
  - OpenAI (text-embedding-ada-002, text-embedding-3-small, text-embedding-3-large)
  - Ollama (nomic-embed-text, mxbai-embed-large, etc.)

## Setup

### 1. Prerequisites

- Node.js 18+ and npm
- Docker and docker compose
- OpenAI API key (if using OpenAI embeddings) OR Ollama running locally

### 2. Install Dependencies

```bash
cd <path-to-project>/memory-mcp
npm install
```

### 3. Configure Environment

Copy the example environment file and configure it:

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```env
# Database Configuration
DATABASE_URL=postgresql://memory_user:memory_password@localhost:5432/memory_mcp

# Embedding Provider Configuration
EMBEDDING_PROVIDER=openai  # or "ollama"

# OpenAI Configuration (if using OpenAI)
OPENAI_API_KEY=your_openai_api_key_here

# Ollama Configuration (if using Ollama)
OLLAMA_BASE_URL=http://localhost:11434

# Model Configuration
EMBEDDING_MODEL=text-embedding-3-small  # or nomic-embed-text for Ollama
EMBEDDING_DIMENSIONS=1536  # or 768 for nomic-embed-text
```

### 4. Start PostgreSQL Database

```bash
docker compose up -d
```

This will start PostgreSQL with pgvector extension and automatically initialize the database schema.

### 5. Build the MCP Server

```bash
npm run build
```

### 6. Install in MCP Client

#### For Claude Code

Create or edit the `.claude.json` file in your project directory:

```json
{
  "mcpServers": {
    "memory-mcp": {
      "type": "stdio",
      "command": "node",
      "args": ["<path-to-project>/memory-mcp/build/index.js"],
      "env": {
        "DATABASE_URL": "postgresql://memory_user:memory_password@localhost:5432/memory_mcp",
        "EMBEDDING_PROVIDER": "openai",
        "OPENAI_API_KEY": "your_openai_api_key_here",
        "EMBEDDING_MODEL": "text-embedding-3-small",
        "EMBEDDING_DIMENSIONS": "1536"
      }
    }
  }
}
```

Restart Claude Code for changes to take effect. Check MCP status with `/mcp` command.

#### For Cline (VS Code Extension)

1. Open the Cline extension in VS Code
2. Click the MCP Servers icon
3. Click "Configure MCP Servers" to open the configuration file
4. Add the server configuration:

```json
{
  "mcpServers": {
    "memory-mcp": {
      "command": "node",
      "args": ["<path-to-project>/memory-mcp/build/index.js"],
      "env": {
        "DATABASE_URL": "postgresql://memory_user:memory_password@localhost:5432/memory_mcp",
        "EMBEDDING_PROVIDER": "openai",
        "OPENAI_API_KEY": "your_openai_api_key_here",
        "EMBEDDING_MODEL": "text-embedding-3-small",
        "EMBEDDING_DIMENSIONS": "1536"
      }
    }
  }
}
```

#### For Claude Desktop

Add to your Claude Desktop MCP settings file:

```json
{
  "mcpServers": {
    "memory-mcp": {
      "command": "node",
      "args": ["<path-to-project>/memory-mcp/build/index.js"],
      "env": {
        "DATABASE_URL": "postgresql://memory_user:memory_password@localhost:5432/memory_mcp",
        "EMBEDDING_PROVIDER": "openai",
        "OPENAI_API_KEY": "your_openai_api_key_here",
        "EMBEDDING_MODEL": "text-embedding-3-small",
        "EMBEDDING_DIMENSIONS": "1536"
      }
    }
  }
}
```

**Note**: Replace `<path-to-project>` with the actual path to your memory-mcp installation directory.

## Usage

### Available Tools

#### 1. `store_memory`
Store a coding preference or correction as a memory.

**Parameters:**
- `content` (required): The preference or correction content
- `context` (optional): Code context where this applies
- `tags` (optional): Array of categorization tags
- `importance_score` (optional): Importance level 1-5, defaults to 1

**Example:**
```json
{
  "content": "Always use async/await instead of .then() chains for better readability",
  "context": "JavaScript Promise handling in React components",
  "tags": ["javascript", "promises", "react", "best-practices"],
  "importance_score": 4
}
```

#### 2. `search_memories`
Search for relevant memories using semantic similarity.

**Parameters:**
- `query` (required): The search query
- `limit` (optional): Maximum results to return, defaults to 10
- `similarity_threshold` (optional): Minimum similarity (0-1), defaults to 0.7
- `tags` (optional): Filter by specific tags
- `embedding_provider` (optional): Search within specific provider ("openai" or "ollama")
- `embedding_model` (optional): Filter by specific embedding model

**Example:**
```json
{
  "query": "How should I handle API calls in React components?",
  "limit": 5,
  "tags": ["react", "api"]
}
```

#### 3. `list_memories`
List memories with optional filtering.

**Parameters:**
- `limit` (optional): Maximum results, defaults to 50
- `offset` (optional): Pagination offset, defaults to 0
- `tags` (optional): Filter by tags
- `min_importance` (optional): Minimum importance score
- `start_date` (optional): Filter by creation date (ISO string)
- `end_date` (optional): Filter by creation date (ISO string)
- `embedding_provider` (optional): Filter by embedding provider ("openai" or "ollama")

#### 4. `delete_memory`
Delete a memory by ID.

**Parameters:**
- `memory_id` (required): The ID of the memory to delete

#### 5. `list_tags`
List all unique tags used in memories.

Returns an array of unique tag names sorted alphabetically.

#### 6. `get_memory_stats`
Get statistics about stored memories.

Returns total count, average importance, unique tags, and embedding configuration.

## Embedding Providers

### OpenAI
- Models: `text-embedding-ada-002` (1536d), `text-embedding-3-small` (1536d), `text-embedding-3-large` (3072d)
- Requires: `OPENAI_API_KEY`

### Ollama
- Models: `nomic-embed-text` (768d), `mxbai-embed-large` (1024d), etc.
- Requires: Ollama running locally with the model pulled
- Setup: `ollama pull nomic-embed-text`

## Development

### Build
```bash
npm run build
```

### Watch Mode
```bash
npm run dev
```

### Database Management

**Stop database:**
```bash
docker compose down
```

**Reset database (removes all data):**
```bash
docker compose down -v
docker compose up -d
```

## Integration Workflow

1. **Correction Phase**: When a coding agent is corrected, call `store_memory` with the preference
2. **Coding Phase**: Before making decisions, call `search_memories` with current context
3. **Learning**: System builds up a knowledge base of coding preferences over time

## Example Usage in Practice

```javascript
// Store a memory when corrected
await use_mcp_tool("memory-mcp", "store_memory", {
  content: "Use TypeScript strict mode and avoid 'any' type",
  context: "TypeScript configuration and type safety",
  tags: ["typescript", "configuration", "types"],
  importance_score: 5
});

// Search for relevant memories before coding
const results = await use_mcp_tool("memory-mcp", "search_memories", {
  query: "TypeScript configuration best practices",
  limit: 3
});
```

## Troubleshooting

1. **Database connection issues**: Ensure PostgreSQL is running with `docker compose ps`
2. **Embedding errors**: Check API keys and model availability
3. **Build errors**: Run `npm install` and ensure TypeScript is properly configured
4. **MCP connection issues**: Verify the build path in MCP settings matches the actual build output

## License

MIT
