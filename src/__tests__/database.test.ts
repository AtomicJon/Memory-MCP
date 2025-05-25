import { DatabaseService } from '../modules/database/index';
import { CreateMemoryInput, EmbeddingProviderType } from '../types';

// Mock data for testing
const mockEmbeddings = {
  openai: {
    model: 'text-embedding-3-small',
    provider: EmbeddingProviderType.OPENAI,
    vector: new Array(1536).fill(0).map(() => Math.random()),
  },
  ollama: {
    model: 'nomic-embed-text',
    provider: EmbeddingProviderType.OLLAMA,
    vector: new Array(768).fill(0).map(() => Math.random()),
  },
};

describe('DatabaseService Multi-Embedding Support', () => {
  let database: DatabaseService;
  const testDatabaseUrl =
    process.env.TEST_DATABASE_URL ||
    'postgresql://memory_user:memory_password@localhost:5432/memory_mcp_test';

  beforeAll(async () => {
    // Arrange
    database = new DatabaseService(testDatabaseUrl);

    // Ensure database connection works
    await database.testConnection();
  });

  afterAll(async () => {
    // Cleanup
    await database.close();
  });

  beforeEach(async () => {
    // Clean up test data before each test
    // Note: In a real test environment, you'd want to use a test database
    // and clean up properly between tests
  });

  describe('storeMemory', () => {
    it('should store memory with OpenAI embedding', async () => {
      // Arrange
      const memoryInput: CreateMemoryInput = {
        content: 'Test memory with OpenAI embedding',
        context: 'Testing context',
        tags: ['test', 'openai'],
        importance_score: 3,
      };

      // Act
      const result = await database.storeMemory(
        memoryInput,
        mockEmbeddings.openai.vector,
        mockEmbeddings.openai.model,
        mockEmbeddings.openai.provider,
      );

      // Assert
      expect(result).toBeDefined();
      expect(result.id).toBeGreaterThan(0);
      expect(result.content).toBe(memoryInput.content);
      expect(result.embedding_model).toBe(mockEmbeddings.openai.model);
      expect(result.embedding_provider).toBe(mockEmbeddings.openai.provider);
      expect(result.embedding).toEqual(mockEmbeddings.openai.vector);
    });

    it('should store memory with Ollama embedding', async () => {
      // Arrange
      const memoryInput: CreateMemoryInput = {
        content: 'Test memory with Ollama embedding',
        context: 'Testing context',
        tags: ['test', 'ollama'],
        importance_score: 4,
      };

      // Act
      const result = await database.storeMemory(
        memoryInput,
        mockEmbeddings.ollama.vector,
        mockEmbeddings.ollama.model,
        mockEmbeddings.ollama.provider,
      );

      // Assert
      expect(result).toBeDefined();
      expect(result.id).toBeGreaterThan(0);
      expect(result.content).toBe(memoryInput.content);
      expect(result.embedding_model).toBe(mockEmbeddings.ollama.model);
      expect(result.embedding_provider).toBe(mockEmbeddings.ollama.provider);
      expect(result.embedding).toEqual(mockEmbeddings.ollama.vector);
    });
  });

  describe('searchMemories', () => {
    beforeEach(async () => {
      // Arrange - Store test memories
      await database.storeMemory(
        {
          content: 'OpenAI test memory for search',
          tags: ['search', 'openai'],
          importance_score: 3,
        },
        mockEmbeddings.openai.vector,
        mockEmbeddings.openai.model,
        mockEmbeddings.openai.provider,
      );

      await database.storeMemory(
        {
          content: 'Ollama test memory for search',
          tags: ['search', 'ollama'],
          importance_score: 4,
        },
        mockEmbeddings.ollama.vector,
        mockEmbeddings.ollama.model,
        mockEmbeddings.ollama.provider,
      );
    });

    it('should search within OpenAI embeddings only', async () => {
      // Arrange
      const searchInput = {
        query: 'test search',
        embedding_provider: EmbeddingProviderType.OPENAI,
        similarity_threshold: 0.0, // Low threshold for testing
      };

      // Act
      const results = await database.searchMemories(
        searchInput,
        mockEmbeddings.openai.vector,
        EmbeddingProviderType.OPENAI,
      );

      // Assert
      expect(results).toBeDefined();
      expect(results.length).toBeGreaterThan(0);
      results.forEach((result) => {
        expect(result.memory.embedding_provider).toBe(
          EmbeddingProviderType.OPENAI,
        );
        expect(result.similarity_score).toBeGreaterThanOrEqual(0);
        expect(result.similarity_score).toBeLessThanOrEqual(1);
      });
    });

    it('should search within Ollama embeddings only', async () => {
      // Arrange
      const searchInput = {
        query: 'test search',
        embedding_provider: EmbeddingProviderType.OLLAMA,
        similarity_threshold: 0.0, // Low threshold for testing
      };

      // Act
      const results = await database.searchMemories(
        searchInput,
        mockEmbeddings.ollama.vector,
        EmbeddingProviderType.OLLAMA,
      );

      // Assert
      expect(results).toBeDefined();
      expect(results.length).toBeGreaterThan(0);
      results.forEach((result) => {
        expect(result.memory.embedding_provider).toBe(
          EmbeddingProviderType.OLLAMA,
        );
        expect(result.similarity_score).toBeGreaterThanOrEqual(0);
        expect(result.similarity_score).toBeLessThanOrEqual(1);
      });
    });

    it('should filter by specific embedding model', async () => {
      // Arrange
      const searchInput = {
        query: 'test search',
        embedding_provider: EmbeddingProviderType.OPENAI,
        embedding_model: mockEmbeddings.openai.model,
        similarity_threshold: 0.0,
      };

      // Act
      const results = await database.searchMemories(
        searchInput,
        mockEmbeddings.openai.vector,
        EmbeddingProviderType.OPENAI,
      );

      // Assert
      expect(results).toBeDefined();
      results.forEach((result) => {
        expect(result.memory.embedding_model).toBe(mockEmbeddings.openai.model);
      });
    });
  });

  describe('listMemories', () => {
    beforeEach(async () => {
      // Arrange - Store test memories
      await database.storeMemory(
        {
          content: 'OpenAI memory for listing',
          tags: ['list', 'openai'],
        },
        mockEmbeddings.openai.vector,
        mockEmbeddings.openai.model,
        mockEmbeddings.openai.provider,
      );

      await database.storeMemory(
        {
          content: 'Ollama memory for listing',
          tags: ['list', 'ollama'],
        },
        mockEmbeddings.ollama.vector,
        mockEmbeddings.ollama.model,
        mockEmbeddings.ollama.provider,
      );
    });

    it('should list all memories without provider filter', async () => {
      // Arrange
      const listInput = {
        limit: 10,
      };

      // Act
      const memories = await database.listMemories(listInput);

      // Assert
      expect(memories).toBeDefined();
      expect(Array.isArray(memories)).toBe(true);
      expect(memories.length).toBeGreaterThan(0);
    });

    it('should filter memories by embedding provider', async () => {
      // Arrange
      const listInput = {
        embedding_provider: EmbeddingProviderType.OPENAI,
        limit: 10,
      };

      // Act
      const memories = await database.listMemories(listInput);

      // Assert
      expect(memories).toBeDefined();
      expect(Array.isArray(memories)).toBe(true);
      // Note: Since listMemories returns Memory[] (without embedding info),
      // we can't directly verify the provider, but we can verify the query works
    });
  });

  describe('getStats', () => {
    beforeEach(async () => {
      // Arrange - Store test memories
      await database.storeMemory(
        {
          content: 'OpenAI memory for stats',
          importance_score: 3,
        },
        mockEmbeddings.openai.vector,
        mockEmbeddings.openai.model,
        mockEmbeddings.openai.provider,
      );

      await database.storeMemory(
        {
          content: 'Ollama memory for stats',
          importance_score: 4,
        },
        mockEmbeddings.ollama.vector,
        mockEmbeddings.ollama.model,
        mockEmbeddings.ollama.provider,
      );
    });

    it('should return statistics including embedding counts', async () => {
      // Arrange & Act
      const stats = await database.getStats();

      // Assert
      expect(stats).toBeDefined();
      expect(typeof stats.total_memories).toBe('number');
      expect(typeof stats.avg_importance).toBe('number');
      expect(Array.isArray(stats.unique_tags)).toBe(true);
      expect(typeof stats.openai_embeddings).toBe('number');
      expect(typeof stats.ollama_embeddings).toBe('number');
      expect(stats.total_memories).toBeGreaterThan(0);
    });
  });

  describe('getMemoryWithEmbeddingById', () => {
    let testMemoryId: number;

    beforeEach(async () => {
      // Arrange
      const memory = await database.storeMemory(
        {
          content: 'Test memory for retrieval',
          tags: ['retrieval', 'test'],
        },
        mockEmbeddings.openai.vector,
        mockEmbeddings.openai.model,
        mockEmbeddings.openai.provider,
      );
      testMemoryId = memory.id;
    });

    it('should retrieve memory with embedding by ID and provider', async () => {
      // Arrange & Act
      const memory = await database.getMemoryWithEmbeddingById(
        testMemoryId,
        EmbeddingProviderType.OPENAI,
      );

      // Assert
      expect(memory).toBeDefined();
      expect(memory!.id).toBe(testMemoryId);
      expect(memory!.embedding_provider).toBe(EmbeddingProviderType.OPENAI);
      expect(memory!.embedding_model).toBe(mockEmbeddings.openai.model);
      expect(memory!.embedding).toEqual(mockEmbeddings.openai.vector);
    });

    it('should return null for wrong provider', async () => {
      // Arrange & Act
      const memory = await database.getMemoryWithEmbeddingById(
        testMemoryId,
        EmbeddingProviderType.OLLAMA,
      );

      // Assert
      expect(memory).toBeNull();
    });
  });

  describe('deleteMemory', () => {
    let testMemoryId: number;

    beforeEach(async () => {
      // Arrange
      const memory = await database.storeMemory(
        {
          content: 'Test memory for deletion',
          tags: ['deletion', 'test'],
        },
        mockEmbeddings.openai.vector,
        mockEmbeddings.openai.model,
        mockEmbeddings.openai.provider,
      );
      testMemoryId = memory.id;
    });

    it('should delete memory and cascade to embedding tables', async () => {
      // Arrange & Act
      const deleted = await database.deleteMemory(testMemoryId);

      // Assert
      expect(deleted).toBe(true);

      // Verify memory is deleted
      const memory = await database.getMemoryById(testMemoryId);
      expect(memory).toBeNull();

      // Verify embedding is also deleted (cascade)
      const memoryWithEmbedding = await database.getMemoryWithEmbeddingById(
        testMemoryId,
        EmbeddingProviderType.OPENAI,
      );
      expect(memoryWithEmbedding).toBeNull();
    });
  });
});
