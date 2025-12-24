-- Tabela: instances (Conexões WhatsApp - Necessária no Servidor para Gerenciar Sessão)
CREATE TABLE IF NOT EXISTS instances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    phone_number VARCHAR(20),
    status VARCHAR(20) DEFAULT 'disconnected' CHECK (status IN ('disconnected', 'connecting', 'connected')),
    qr_code TEXT,
    last_connected_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- NOTA: As tabelas 'contacts', 'campaigns' e 'messages' NÃO são mais necessárias no Supabase
-- pois os dados agora são armazenados localmente no navegador do usuário (IndexedDB).
