-- Tabela: clients
CREATE TABLE clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_type VARCHAR(10) NOT NULL CHECK (account_type IN ('trial', 'active', 'suspended')),
    business_type VARCHAR(20) NOT NULL CHECK (business_type IN ('individual', 'company')),
    
    -- Dados pessoa física
    individual_name VARCHAR(200),
    individual_cpf VARCHAR(14),
    
    -- Dados empresa
    company_name VARCHAR(200),
    trading_name VARCHAR(200),
    company_cnpj VARCHAR(18),
    
    -- Contato
    email VARCHAR(100) UNIQUE NOT NULL,
    phone VARCHAR(20),
    password_hash VARCHAR(255) NOT NULL, -- Mantido por compatibilidade, mas o login real é via users
    
    -- Plano
    user_limit INTEGER NOT NULL DEFAULT 1,
    current_users INTEGER NOT NULL DEFAULT 0,
    monthly_price DECIMAL(10,2),
    
    -- Datas
    trial_start_date DATE,
    trial_end_date DATE,
    subscription_start_date DATE,
    subscription_end_date DATE,
    next_billing_date DATE,
    
    -- Status
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'cancelled')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_clients_email ON clients(email);
CREATE INDEX idx_clients_status ON clients(status);
CREATE INDEX idx_clients_next_billing ON clients(next_billing_date);

-- Tabela: users
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL, -- Adicionado UNIQUE para garantir integridade

    password_hash VARCHAR(255),
    role VARCHAR(20) DEFAULT 'user', -- 'super_admin', 'admin' or 'user'
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela: payments
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES clients(id),
    
    -- Detalhes
    additional_users INTEGER DEFAULT 0,
    unit_price DECIMAL(10,2) NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    prorated_amount DECIMAL(10,2),
    prorated_days INTEGER,
    
    -- Mercado Pago
    mercado_pago_id VARCHAR(100),
    mercado_pago_status VARCHAR(50),
    payment_link TEXT,
    
    -- Período
    period_start DATE,
    period_end DATE,
    processed_at TIMESTAMPTZ,
    
    -- Status
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'paid', 'failed', 'refunded')),
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_payments_client_id ON payments(client_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_processed ON payments(processed_at);

-- Tabela: daily_metrics
CREATE TABLE daily_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    metric_date DATE NOT NULL,

    -- Métricas
    messages_sent INTEGER DEFAULT 0,
    messages_with_files INTEGER DEFAULT 0,
    unique_contacts INTEGER DEFAULT 0,
    total_errors INTEGER DEFAULT 0,
    
    last_sync_time TIMESTAMPTZ DEFAULT NOW(),
    
    -- Índice composto único
    UNIQUE(user_id, metric_date)
);

CREATE INDEX idx_daily_metrics_date ON daily_metrics(metric_date);
CREATE INDEX idx_daily_metrics_user_date ON daily_metrics(user_id, metric_date);
