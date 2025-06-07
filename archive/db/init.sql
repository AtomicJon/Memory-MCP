-- Enable the pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create the main memories table (without embeddings)
CREATE TABLE IF NOT EXISTS memories (
    id SERIAL PRIMARY KEY,
    content TEXT NOT NULL,
    context TEXT,
    tags TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    importance_score INTEGER DEFAULT 1 CHECK (importance_score >= 1 AND importance_score <= 5)
);

-- Create OpenAI embeddings table (1536 dimensions)
CREATE TABLE IF NOT EXISTS memory_embeddings_openai (
    memory_id INTEGER PRIMARY KEY REFERENCES memories(id) ON DELETE CASCADE,
    embedding VECTOR(1536) NOT NULL,
    model VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create Ollama embeddings table (768 dimensions for nomic-embed-text)
CREATE TABLE IF NOT EXISTS memory_embeddings_ollama (
    memory_id INTEGER PRIMARY KEY REFERENCES memories(id) ON DELETE CASCADE,
    embedding VECTOR(768) NOT NULL,
    model VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for efficient querying on main memories table
CREATE INDEX IF NOT EXISTS idx_memories_tags ON memories USING GIN (tags);
CREATE INDEX IF NOT EXISTS idx_memories_created_at ON memories (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_memories_importance ON memories (importance_score DESC);

-- Create indexes for efficient vector similarity search
CREATE INDEX IF NOT EXISTS idx_openai_embedding ON memory_embeddings_openai USING ivfflat (embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS idx_openai_model ON memory_embeddings_openai (model);

CREATE INDEX IF NOT EXISTS idx_ollama_embedding ON memory_embeddings_ollama USING ivfflat (embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS idx_ollama_model ON memory_embeddings_ollama (model);

-- Create a function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create a trigger to automatically update the updated_at column
CREATE TRIGGER update_memories_updated_at 
    BEFORE UPDATE ON memories 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();
