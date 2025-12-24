-- Tabela: administrators (Super Admin)
CREATE TABLE administrators (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela: clients (Empresas / Gerentes)
CREATE TABLE clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_type VARCHAR(10) NOT NULL CHECK (account_type IN ('trial', 'active', 'suspended')),
    business_type VARCHAR(20) NOT NULL CHECK (business_type IN ('individual', 'company')),
    
    -- Dados Identificação
    individual_name VARCHAR(200),
    individual_cpf VARCHAR(14),
    company_name VARCHAR(200),
    trading_name VARCHAR(200),
    company_cnpj VARCHAR(18),
    
    -- Login do Gerente/Dono
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    
    -- Configurações do Plano
    user_limit INTEGER NOT NULL DEFAULT 1,
    current_users INTEGER NOT NULL DEFAULT 0,
    monthly_price DECIMAL(10,2),
    
    -- Datas e Status
    trial_start_date DATE,
    trial_end_date DATE,
    next_billing_date DATE,
    status VARCHAR(20) DEFAULT 'active',
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela: users (Operadores)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    
    name VARCHAR(200) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    
    role VARCHAR(20) DEFAULT 'user', -- 'user' (Operador)
    status VARCHAR(20) DEFAULT 'active',
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_clients_email ON clients(email);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_client ON users(client_id);
