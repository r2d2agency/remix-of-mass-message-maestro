-- ============================================
-- CONVERSATION SUMMARIES MODULE
-- Resumos automáticos de conversas com IA
-- ============================================

-- Conversation summaries (AI-generated)
CREATE TABLE IF NOT EXISTS conversation_summaries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Summary content
    summary TEXT NOT NULL,                    -- Resumo principal da conversa
    key_points JSONB DEFAULT '[]',           -- Pontos principais extraídos
    customer_sentiment VARCHAR(20),           -- 'positive', 'neutral', 'negative', 'mixed'
    topics JSONB DEFAULT '[]',               -- Tópicos identificados
    action_items JSONB DEFAULT '[]',         -- Ações sugeridas/pendentes
    resolution_status VARCHAR(20),           -- 'resolved', 'pending', 'escalated', 'unknown'
    
    -- Metadata
    messages_analyzed INTEGER DEFAULT 0,     -- Quantidade de mensagens analisadas
    generated_by VARCHAR(50),                -- 'ai_agent', 'manual', 'system'
    ai_provider VARCHAR(20),                 -- 'openai', 'gemini'
    ai_model VARCHAR(50),                    -- Modelo usado
    processing_time_ms INTEGER,              -- Tempo de processamento
    
    -- User who triggered generation (optional)
    triggered_by UUID REFERENCES users(id) ON DELETE SET NULL,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Only one summary per conversation (can be updated)
    UNIQUE(conversation_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_conv_summaries_org ON conversation_summaries(organization_id);
CREATE INDEX IF NOT EXISTS idx_conv_summaries_conv ON conversation_summaries(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conv_summaries_sentiment ON conversation_summaries(customer_sentiment);
CREATE INDEX IF NOT EXISTS idx_conv_summaries_resolution ON conversation_summaries(resolution_status);
CREATE INDEX IF NOT EXISTS idx_conv_summaries_created ON conversation_summaries(created_at DESC);

-- Add summary column to conversations for quick access
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'conversations' AND column_name = 'ai_summary'
    ) THEN
        ALTER TABLE conversations ADD COLUMN ai_summary TEXT;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'conversations' AND column_name = 'ai_sentiment'
    ) THEN
        ALTER TABLE conversations ADD COLUMN ai_sentiment VARCHAR(20);
    END IF;
END $$;

-- Comments
COMMENT ON TABLE conversation_summaries IS 'AI-generated conversation summaries with sentiment and action items';
