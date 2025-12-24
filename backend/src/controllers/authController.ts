import { Request, Response } from 'express';
import { supabase } from '../config/supabase';
import { logger } from '../config/logger';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const JWT_SECRET = process.env.JWT_SECRET || 'seu_segredo_super_seguro_mude_isso_em_prod';

// Helper to check password and migrate if necessary
const checkPassword = async (password: string, user: any, table: string) => {
    // 1. Try bcrypt compare
    let isValid = false;
    try {
        isValid = await bcrypt.compare(password, user.password_hash);
    } catch (e) {
        // likely not a hash
        isValid = false;
    }

    if (isValid) return true;

    // 2. Fallback: Check plain text (Migration Strategy)
    if (user.password_hash === password) {
        // It matches plain text! Upgrade to bcrypt.
        const salt = await bcrypt.genSalt(10);
        const newHash = await bcrypt.hash(password, salt);
        
        await supabase
            .from(table)
            .update({ password_hash: newHash })
            .eq('id', user.id);
            
        return true;
    }

    return false;
};

export const loginClient = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email e senha são obrigatórios' });
    }

    // 1. Try Administrator (Super Admin)
    const { data: admin } = await supabase
      .from('administrators')
      .select('*')
      .eq('email', email)
      .single();

    if (admin) {
        const isMatch = await checkPassword(password, admin, 'administrators');
        if (isMatch) {
            const { password_hash, ...adminData } = admin;
            const token = jwt.sign(
                { id: admin.id, role: 'super_admin' },
                JWT_SECRET,
                { expiresIn: '8h' }
            );
            return res.json({
                message: 'Login realizado com sucesso',
                token,
                user: { ...adminData, role: 'super_admin' }
            });
        }
    }

    // 2. Try Client (Manager)
    const { data: client } = await supabase
      .from('clients')
      .select('*')
      .eq('email', email)
      .single();

    if (client) {
        const isMatch = await checkPassword(password, client, 'clients');
        if (isMatch) {
            const { password_hash, ...clientData } = client;
            const token = jwt.sign(
                { id: client.id, role: 'admin', clientId: client.id },
                JWT_SECRET,
                { expiresIn: '8h' }
            );
            return res.json({
                message: 'Login realizado com sucesso',
                token,
                user: { 
                    ...clientData, 
                    role: 'admin',
                    name: clientData.company_name || clientData.individual_name,
                    clients: [clientData] 
                }
            });
        }
    }

    // 3. Try User (Operator)
    const { data: user } = await supabase
      .from('users')
      .select('*, clients(*)')
      .eq('email', email)
      .single();

    if (user) {
      const isMatch = await checkPassword(password, user, 'users');
      if (isMatch) {
        // Check for First Access (Based on last_login)
        if (!user.last_login) {
            return res.json({
            message: 'Primeiro acesso: Token necessário',
            requireFirstAccess: true,
            email: user.email
            });
        }

        // Update last_login
        await supabase.from('users').update({ last_login: new Date() }).eq('id', user.id);

        const { password_hash, ...userData } = user;
        const token = jwt.sign(
            { id: user.id, role: 'user', clientId: user.client_id },
            JWT_SECRET,
            { expiresIn: '8h' }
        );
        return res.json({
            message: 'Login realizado com sucesso',
            token,
            user: { ...userData, role: 'user' }
        });
      }
    }

    return res.status(401).json({ error: 'Credenciais inválidas' });

  } catch (error: any) {
    logger.error('Login error:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

export const completeFirstAccess = async (req: Request, res: Response) => {
  try {
    const { email, token, newPassword } = req.body;
    
    if (!email || !token || !newPassword) {
      return res.status(400).json({ error: 'Todos os campos são obrigatórios' });
    }

    // Find user
    const { data: user } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });

    // Validate Token
    if (user.first_access_token !== token) {
      return res.status(400).json({ error: 'Token inválido' });
    }

    // Update Password and Update Last Login (Do NOT clear token)
    const { error: updateError } = await supabase
      .from('users')
      .update({
        password_hash: newPassword, // In real app, hash this
        last_login: new Date()
      })
      .eq('id', user.id);

    if (updateError) throw updateError;

    return res.json({ message: 'Senha definida com sucesso! Faça login.' });

  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};
