# Instruções para Configurar o Banco de Dados

Para que o módulo Financeiro funcione, você precisa criar a tabela `payments` no seu banco de dados Supabase.

1. Acesse o painel do Supabase (https://supabase.com/dashboard).
2. Vá para o seu projeto.
3. No menu lateral, clique em **SQL Editor**.
4. Clique em **New Query**.
5. Cole o conteúdo do arquivo `backend/src/scripts/init_payments.sql` (localizado neste projeto).
6. Clique em **Run**.

Após executar o script, a tabela `payments` será criada e o módulo Financeiro deverá funcionar corretamente.
