import { Request, Response } from 'express';
import { supabase } from '../config/supabase';
import { logger } from '../config/logger';
import bcrypt from 'bcryptjs';

export const registerClient = async (req: Request, res: Response) => {
  try {
    console.log('📝 Recebendo requisição de cadastro:', JSON.stringify(req.body, null, 2));

    const {
      account_type,
      business_type,
      individual_name,
      individual_cpf,
      company_name,
      trading_name,
      company_cnpj,
      email,
      phone,
      password,
      user_limit
    } = req.body;

    // 1. Validations (Basic)
    if (!email || !password || !account_type || !business_type) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // 2. Check if email already exists
    const { data: existingClient } = await supabase
      .from('clients')
      .select('id')
      .eq('email', email)
      .single();

    if (existingClient) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // 3. Create Client
    // Secure password hashing
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    const clientData = {
      account_type,
      business_type,
      individual_name: business_type === 'individual' ? individual_name : null,
      individual_cpf: business_type === 'individual' ? individual_cpf : null,
      company_name: business_type === 'company' ? company_name : null,
      trading_name: business_type === 'company' ? trading_name : null,
      company_cnpj: business_type === 'company' ? company_cnpj : null,
      email,
      phone,
      password_hash,
      user_limit: user_limit || 1,
      status: 'active' // Default status is active (schema constraint: active, suspended, cancelled)
    };

    const { data: newClient, error: clientError } = await supabase
      .from('clients')
      .insert([clientData])
      .select()
      .single();

    if (clientError) {
      logger.error('Error creating client FULL OBJECT:', clientError);
      return res.status(500).json({ error: 'Failed to create client account', details: clientError.message, fullError: clientError });
    }

    // REMOVED: Step 4. Create Initial User (Admin)
    // Reason: Clients now authenticate directly via the 'clients' table.

    return res.status(201).json({
      message: 'Client registered successfully',
      client: newClient
    });

  } catch (error: any) {
    logger.error('Register error:', error);
    return res.status(500).json({ error: 'Internal server error', details: error.message });
  }
};

// --- CLIENT DASHBOARD FEATURES ---

// 1. Get Users (Operators)
export const getClientUsers = async (req: Request, res: Response) => {
  try {
    const clientId = req.user.clientId; // From Token
    
    const { data: users, error } = await supabase
      .from('users')
      .select('*')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    
    // Auto-fill tokens for old users if missing (Quick fix)
    const usersWithTokens = await Promise.all(users.map(async (u) => {
        if (!u.first_access_token) {
             const newToken = Math.random().toString(36).substring(2, 8).toUpperCase();
             await supabase.from('users').update({ first_access_token: newToken }).eq('id', u.id);
             u.first_access_token = newToken;
        }
        return u;
    }));

    return res.json(usersWithTokens);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};

// 2. Create User
export const createClientUser = async (req: Request, res: Response) => {
  try {
    const clientId = req.user.clientId; // From Token

    const { name, email, password, phone } = req.body;

    // Basic validation
    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Name, email and password are required' });
    }

    // Generate First Access Token
    const firstAccessToken = Math.random().toString(36).substring(2, 8).toUpperCase();
    logger.info('🔑 Token gerado:', { token: firstAccessToken });

    const { data: newUser, error } = await supabase
      .from('users')
      .insert([{
        client_id: clientId,
        name,
        email,
        phone,
        password_hash: password, // TODO: Hash
        role: 'user', // Operator
        status: 'active',
        first_access_token: firstAccessToken
      }])
      .select()
      .single();

    if (error) {
        logger.error('❌ Erro ao criar usuário:', error);
        throw error;
    }
    
    // Auto-login hack? No.
    
    logger.info('✅ Usuário criado com token:', { user: newUser });
    return res.status(201).json(newUser);
  } catch (error: any) {
    logger.error('Create User Error:', error);
    return res.status(500).json({ error: error.message });
  }
};

// 3. Update User
export const updateClientUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const clientId = req.user.clientId;
    
    // Prevent changing critical fields directly if needed
    delete updates.id;
    delete updates.client_id;

    const { data: updated, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', id)
      .eq('client_id', clientId) // Ensure ownership
      .select()
      .single();

    if (error) throw error;
    return res.json(updated);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};

// 4. Delete User
export const deleteClientUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const clientId = req.user.clientId;
    
    const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', id)
        .eq('client_id', clientId); // Ensure ownership
        
    if (error) throw error;
    return res.json({ message: 'User deleted' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};

// 5. Get Payments
export const getClientPayments = async (req: Request, res: Response) => {
  try {
    const clientId = req.user.clientId;
    
    const { data: payments, error } = await supabase
      .from('payments')
      .select('*')
      .eq('client_id', clientId)
      .order('due_date', { ascending: false });

    if (error) {
       // If table doesn't exist yet, return empty
       if (error.code === '42P01') return res.json([]);
       throw error;
    }
    return res.json(payments);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};

// 6. Get Dashboard Stats (Charts)
export const getClientStats = async (req: Request, res: Response) => {
  try {
    const clientId = req.user.clientId;

    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString();

    // 1. Total Messages Sent (Month)
    const { count: msgCount, error: msgError } = await supabase
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .eq('client_id', clientId)
      .gte('created_at', startOfMonth);

    // 2. Total Campaigns (Month)
    const { count: campCount, error: campError } = await supabase
      .from('campaigns')
      .select('id', { count: 'exact', head: true })
      .eq('client_id', clientId)
      .gte('created_at', startOfMonth);
      
    // 3. Messages by Status (for Pie Chart)
    // Note: Supabase JS doesn't support GROUP BY easily without RPC.
    // We will fetch all messages from last 7 days for client-side aggregation or simple stats
    // For performance, let's limit to recent 1000 or use a different approach.
    // Here we will just return counts if possible, or fetch raw data.
    
    // Alternative: Just get counts for specific statuses
    const { count: successCount } = await supabase
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .eq('client_id', clientId)
      .eq('status', 'sent'); // or delivered/read

    const { count: failedCount } = await supabase
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .eq('client_id', clientId)
      .eq('status', 'failed');

    return res.json({
      monthly_messages: msgCount || 0,
      monthly_campaigns: campCount || 0,
      status_distribution: {
        success: successCount || 0,
        failed: failedCount || 0,
        pending: (msgCount || 0) - ((successCount || 0) + (failedCount || 0))
      }
    });

  } catch (error: any) {
    // Fail gracefully for stats
    logger.error('Stats error:', error);
    return res.json({ monthly_messages: 0, monthly_campaigns: 0 });
  }
};
