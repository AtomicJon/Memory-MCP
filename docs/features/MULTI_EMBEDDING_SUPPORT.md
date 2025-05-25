# Multi-Dimensional Embedding Support

This document describes the implementation of multi-dimensional embedding support in the Memory MCP server, allowing it to work with both OpenAI embeddings (1536 dimensions) and nomic-embed-text (768 dimensions) using separate tables for each embedding provider.

## Architecture Overview

The system uses a **separate tables approach** where:
- Main memory content is stored in the `memories` table
- OpenAI embeddings (1536 dimensions) are stored in `memory_embeddings_openai` table
- Ollama embeddings (768 dimensions) are stored in `memory_embeddings_ollama` table

This approach ensures that pgvector's fixed-dimension requirement is met while maintaining clean separation between different embedding models.

## Database Schema

### Main Tables

**`memories` table:**
- Stores the core memory content (text, tags, metadata)
- No embedding data - keeps it lightweight
- Foreign key relationships with embedding tables

**`memory_embeddings_openai` table:**
- Stores OpenAI embeddings with fixed 1536 dimensions
- References `memories.id` via `memory_id`
- Includes model name for tracking specific OpenAI models

**`memory_embeddings_ollama` table:**
- Stores Ollama embeddings with fixed 768 dimensions  
- References `memories.id` via `memory_id`
- Includes model name for tracking specific Ollama models

### Benefits of This Approach

1. **pgvector Compatibility**: Each table has fixed dimensions as required
2. **Performance**: Optimized indexes per embedding type
3. **Scalability**: Easy to add new embedding providers
4. **Data Integrity**: Cascade deletes ensure consistency
5. **Storage Efficiency**: No wasted space for unused embedding slots

## Changes Made

### 1. Database Schema (`db/init.sql`)
- Separated embeddings into provider-specific tables
- Added proper foreign key constraints with CASCADE DELETE
- Optimized indexes for each embedding type
- Fixed dimension vectors: `VECTOR(1536)` for OpenAI, `VECTOR(768)` for Ollama

### 2. Type System (`src/types.ts`)
- Updated `Memory` type to exclude embedding data
- Added `MemoryWithEmbedding` type for memories with embedding info
- Enhanced search and list inputs to support provider filtering
- Added `getProvider()` method to embedding interface

### 3. Database Service (`src/database.ts`)
- Implemented transaction-based storage across multiple tables
- Added provider-aware search functionality
- Enhanced statistics to show counts per embedding type
- Added `getMemoryWithEmbeddingById()` for retrieving with embeddings

### 4. Embedding Service (`src/embeddings.ts`)
- Added `getProvider()` method to return provider type
- Enhanced service to track provider information

### 5. Application Logic (`src/index.ts`)
- Updated to pass provider information to database operations
- Enhanced API responses to include embedding metadata
- Added provider filtering to search and list operations

## Configuration

The system supports multiple embedding providers through environment variables:

```bash
# For OpenAI
EMBEDDING_PROVIDER=openai
OPENAI_API_KEY=your_api_key
EMBEDDING_MODEL=text-embedding-3-small
EMBEDDING_DIMENSIONS=1536

# For Ollama (nomic-embed-text)
EMBEDDING_PROVIDER=ollama
OLLAMA_BASE_URL=http://localhost:11434
EMBEDDING_MODEL=nomic-embed-text
EMBEDDING_DIMENSIONS=768
```

## API Usage

### Store Memory
Memories are automatically stored with the configured embedding provider:

```json
{
  "content": "Always use TypeScript strict mode",
  "context": "TypeScript configuration",
  "tags": ["typescript", "config"],
  "importance_score": 4
}
```

### Search Memories
Search within specific embedding providers:

```json
{
  "query": "typescript configuration",
  "embedding_provider": "openai",
  "embedding_model": "text-embedding-3-small",
  "limit": 10,
  "similarity_threshold": 0.7
}
```

### List Memories
Filter by embedding provider:

```json
{
  "embedding_provider": "ollama",
  "limit": 50,
  "tags": ["typescript"]
}
```

## Testing

The project includes comprehensive Jest tests following the AAA (Arrange, Act, Assert) pattern:

```bash
# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

### Test Coverage
- Multi-provider memory storage
- Provider-specific search functionality
- Embedding metadata integrity
- Cascade deletion behavior
- Statistics accuracy

## Performance Considerations

1. **Separate Indexes**: Each embedding table has optimized ivfflat indexes
2. **Provider Filtering**: Searches only query relevant embedding tables
3. **Transaction Safety**: Multi-table operations use database transactions
4. **Memory Efficiency**: No unused embedding slots waste storage

## Migration from Single Table

For existing installations with the old single-table approach:

1. **Backup your data** before migration
2. **Reset the database** during development (as recommended)
3. Use the new `db/init.sql` schema
4. Re-import your memories using the new API

## Best Practices

1. **Consistent Providers**: Use the same embedding provider for related memories
2. **Provider Awareness**: Specify embedding_provider in searches for better performance
3. **Model Tracking**: The system automatically tracks which specific model was used
4. **Testing**: Use separate test database to avoid conflicts

## Troubleshooting

### Common Issues

1. **Dimension Mismatch**: Ensure your embedding service configuration matches the expected dimensions
2. **Provider Mismatch**: Verify you're searching in the correct embedding provider
3. **Missing Embeddings**: Check that memories were stored with the expected provider

### Verification

Check embedding distribution:
```sql
-- Check memory counts per provider
SELECT 
  'openai' as provider,
  COUNT(*) as count 
FROM memory_embeddings_openai
UNION ALL
SELECT 
  'ollama' as provider,
  COUNT(*) as count 
FROM memory_embeddings_ollama;
```

## Future Enhancements

The separate tables approach makes it easy to:
- Add new embedding providers (just create a new table)
- Support different dimension sizes per provider
- Implement provider-specific optimizations
- Add embedding versioning and migration tools

This architecture provides a solid foundation for multi-provider embedding support while maintaining performance and data integrity.
