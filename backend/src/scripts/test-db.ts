import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Carregar variáveis de ambiente
dotenv.config({ path: path.join(__dirname, '../../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

console.log('--- Teste de Conexão Supabase ---');
console.log('URL:', supabaseUrl ? 'Definida' : 'NÃO DEFINIDA');
console.log('KEY:', supabaseKey ? 'Definida' : 'NÃO DEFINIDA');

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ ERRO: Credenciais ausentes no .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  try {
    // Tentar ler a tabela clients (mesmo que vazia)
    const { data, error, count } = await supabase
      .from('clients')
      .select('*', { count: 'exact', head: true });

    if (error) {
      console.error('❌ ERRO ao conectar ou consultar tabela clients:');
      console.error(JSON.stringify(error, null, 2));
      
      if (error.code === 'PGRST204' || error.message?.includes('does not exist')) {
        console.error('\n⚠️  DICA: Parece que a tabela "clients" não existe.');
        console.error('   Você executou o script SQL no painel do Supabase?');
        console.error('   Vá em "SQL Editor" -> "New Query" -> Cole o conteúdo de backend/supabase/schema.sql -> Run');
      }
    } else {
      console.log('✅ SUCESSO! Conexão estabelecida.');
      console.log(`   Tabela "clients" encontrada. Registros atuais: ${count}`);
    }

  } catch (err) {
    console.error('❌ ERRO INESPERADO:', err);
  }
}

testConnection();
