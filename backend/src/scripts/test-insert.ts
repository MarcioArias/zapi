import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_KEY!);

async function testInsert() {
  console.log('--- Teste de Inserção Direta ---');
  
  const testClient = {
    account_type: 'trial',
    business_type: 'individual',
    individual_name: 'Teste Script',
    individual_cpf: '00000000000',
    email: `teste_${Date.now()}@exemplo.com`,
    password_hash: '123456',
    user_limit: 1,
    status: 'active'
  };

  console.log('Tentando inserir:', testClient.email);

  const { data, error } = await supabase
    .from('clients')
    .insert([testClient])
    .select();

  if (error) {
    console.error('❌ ERRO na inserção:');
    console.error(JSON.stringify(error, null, 2));
    
    if (error.code === '42501') {
      console.error('\n⚠️  ERRO DE PERMISSÃO (RLS):');
      console.error('   O Row Level Security (RLS) está ativado e bloqueando a inserção.');
      console.error('   Solução rápida (DEV): Desative o RLS no painel do Supabase para a tabela clients.');
      console.error('   Ou crie uma policy: "Enable insert for everyone".');
    }
  } else {
    console.log('✅ SUCESSO! Cliente inserido.');
    console.log(data);
  }
}

testInsert();
