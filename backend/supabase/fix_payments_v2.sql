-- FIX FINAL: Atualiza a tabela payments de forma segura
-- Este script verifica se a tabela existe e adiciona as colunas faltantes, ou a cria se não existir.

DO $$
BEGIN
    -- 1. Se a tabela não existir, cria ela completa
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'payments') THEN
        CREATE TABLE payments (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
            amount DECIMAL(10, 2) NOT NULL,
            status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue', 'cancelled')),
            due_date DATE NOT NULL,
            paid_at TIMESTAMPTZ,
            payment_method VARCHAR(50) DEFAULT 'manual',
            description VARCHAR(200),
            created_at TIMESTAMPTZ DEFAULT NOW()
        );
        
        CREATE INDEX idx_payments_client ON payments(client_id);
        CREATE INDEX idx_payments_status ON payments(status);
        
    ELSE
        -- 2. Se a tabela JÁ existir, adiciona as colunas que podem estar faltando
        
        -- Adiciona due_date se não existir
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'payments' AND column_name = 'due_date') THEN
            ALTER TABLE payments ADD COLUMN due_date DATE;
        END IF;

        -- Adiciona payment_method se não existir
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'payments' AND column_name = 'payment_method') THEN
            ALTER TABLE payments ADD COLUMN payment_method VARCHAR(50) DEFAULT 'manual';
        END IF;

        -- Adiciona description se não existir
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'payments' AND column_name = 'description') THEN
            ALTER TABLE payments ADD COLUMN description VARCHAR(200);
        END IF;
        
        -- Adiciona paid_at se não existir
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'payments' AND column_name = 'paid_at') THEN
            ALTER TABLE payments ADD COLUMN paid_at TIMESTAMPTZ;
        END IF;

    END IF;
END $$;
