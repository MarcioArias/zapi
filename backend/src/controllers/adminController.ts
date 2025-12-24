import { Request, Response } from 'express';
import { supabase } from '../config/supabase';
import { logger } from '../config/logger';

// Dashboard Stats
export const getDashboardStats = async (req: Request, res: Response) => {
  try {
    const { period } = req.query; // 'today', 'month', '30days' (default)

    let startDate = new Date();
    startDate.setDate(startDate.getDate() - 30); // Default 30 days

    if (period === 'today') {
        startDate = new Date();
        startDate.setHours(0,0,0,0);
    } else if (period === 'month') {
        startDate = new Date();
        startDate.setDate(1);
        startDate.setHours(0,0,0,0);
    }

    const startStr = startDate.toISOString();

    // 1. Total Clients (Snapshot - All time)
    const { count: totalClients } = await supabase
      .from('clients')
      .select('*', { count: 'exact', head: true });

    // 2. Active Clients (Snapshot)
    const { count: activeClients } = await supabase
      .from('clients')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active');

    // 3. New Clients in Period
    const { count: newClients } = await supabase
      .from('clients')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', startStr);

    // 4. Revenue in Period
    const { data: payments } = await supabase
      .from('payments')
      .select('amount, paid_at')
      .eq('status', 'paid')
      .gte('paid_at', startStr);
    
    const revenue = payments?.reduce((acc, curr) => acc + Number(curr.amount), 0) || 0;

    // 5. Recent Clients (Last 5)
    const { data: recentClients } = await supabase
      .from('clients')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);

    // --- CHART DATA GENERATION (Aggregated in Node.js for MVP) ---
    
    // Chart 1: Clients Growth (Last 6 Months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);
    
    const { data: allClients } = await supabase
        .from('clients')
        .select('created_at')
        .gte('created_at', sixMonthsAgo.toISOString());

    const clientsGrowth: any = {};
    allClients?.forEach(c => {
        const month = new Date(c.created_at).toLocaleString('pt-BR', { month: 'short' });
        clientsGrowth[month] = (clientsGrowth[month] || 0) + 1;
    });

    // Chart 2: Revenue History (Last 6 Months)
    const { data: allPayments } = await supabase
        .from('payments')
        .select('amount, paid_at')
        .eq('status', 'paid')
        .gte('paid_at', sixMonthsAgo.toISOString());

    const revenueGrowth: any = {};
    allPayments?.forEach(p => {
        if (!p.paid_at) return;
        const month = new Date(p.paid_at).toLocaleString('pt-BR', { month: 'short' });
        revenueGrowth[month] = (revenueGrowth[month] || 0) + Number(p.amount);
    });

    // Chart 3: Status Distribution
    const { data: statusData } = await supabase
        .from('clients')
        .select('status');
    
    const statusDist: any = { active: 0, inactive: 0, blocked: 0 };
    statusData?.forEach(c => {
        const s = c.status || 'inactive';
        statusDist[s] = (statusDist[s] || 0) + 1;
    });

    return res.json({
      totalClients: totalClients || 0,
      activeClients: activeClients || 0,
      newClientsInPeriod: newClients || 0,
      revenueInPeriod: revenue,
      recentClients: recentClients || [],
      charts: {
        clientsGrowth, // { 'jan': 10, 'feb': 15 }
        revenueGrowth, // { 'jan': 1000, 'feb': 1500 }
        statusDist
      }
    });

  } catch (error: any) {
    logger.error('Admin Stats Error:', error);
    return res.status(500).json({ error: 'Failed to fetch stats' });
  }
};

// List All Clients
export const getAllClients = async (req: Request, res: Response) => {
  try {
    const { data: clients, error } = await supabase
      .from('clients')
      .select('*') // Select directly from clients
      .order('created_at', { ascending: false });

    if (error) throw error;

    return res.json(clients);

  } catch (error: any) {
    logger.error('List Clients Error:', error);
    return res.status(500).json({ error: 'Failed to fetch clients' });
  }
};

// Update Client (Status, Limits)
export const updateClient = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status: rawStatus, user_limit, account_type } = req.body;

    const updates: any = {};
    
    // Status Logic Mapping
    if (rawStatus) {
      if (rawStatus === 'trial') {
        updates.status = 'active';
        updates.account_type = 'trial';
      } else if (rawStatus === 'blocked') {
        updates.status = 'suspended';
      } else if (rawStatus === 'pending') {
        // Since DB doesn't support 'pending', we map to 'suspended' for now
        // or we could use 'active' if it means 'pending payment but active'
        // Let's assume 'suspended' for security
        updates.status = 'suspended'; 
      } else if (rawStatus === 'active') {
        updates.status = 'active';
        // If coming back to active, ensure account_type is active (unless specified otherwise)
        if (!account_type) updates.account_type = 'active';
      } else {
        updates.status = rawStatus;
      }
    }

    if (user_limit) updates.user_limit = user_limit;
    if (account_type) updates.account_type = account_type;

    const { data, error } = await supabase
      .from('clients')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return res.json({ message: 'Client updated successfully', client: data });

  } catch (error: any) {
    logger.error('Update Client Error:', error);
    return res.status(500).json({ error: 'Failed to update client' });
  }
};

// --- Financial ---

// List Payments
export const getPayments = async (req: Request, res: Response) => {
  try {
    const { data: payments, error } = await supabase
      .from('payments')
      .select('*, clients(company_name, individual_name, email)')
      .order('due_date', { ascending: false });

    if (error) {
       // If table doesn't exist yet, return empty array instead of crashing
       if (error.code === '42P01') return res.json([]); 
       throw error;
    }

    return res.json(payments);
  } catch (error: any) {
    logger.error('Get Payments Error:', error);
    return res.status(500).json({ error: 'Failed to fetch payments' });
  }
};

// Create Payment (Manual)
export const createPayment = async (req: Request, res: Response) => {
  try {
    const { client_id, amount, due_date, status, description } = req.body;

    const { data, error } = await supabase
      .from('payments')
      .insert([{
        client_id,
        amount,
        due_date,
        status: status || 'pending',
        description,
        paid_at: status === 'paid' ? new Date() : null
      }])
      .select()
      .single();

    if (error) throw error;

    return res.status(201).json(data);
  } catch (error: any) {
    logger.error('Create Payment Error:', error);
    return res.status(500).json({ error: 'Failed to create payment' });
  }
};

