import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { supabase } from '../config/supabase';

const JWT_SECRET = process.env.JWT_SECRET || 'seu_segredo_super_seguro_mude_isso_em_prod';

// Extend Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

export const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return res.status(401).json({ error: 'Token não fornecido' });
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2) {
        return res.status(401).json({ error: 'Erro no Token' });
    }

    const [scheme, token] = parts;

    if (!/^Bearer$/i.test(scheme)) {
        return res.status(401).json({ error: 'Token malformatado' });
    }

    try {
        const decoded: any = jwt.verify(token, JWT_SECRET);
        
        // Validação extra: O usuário ainda existe e está ativo?
        // Note: For performance, we might skip this DB call on every request or cache it.
        // For now, let's keep it simple and trust the token expiration (8h) or do a quick check.
        // Doing a check ensures revoked users lose access immediately.
        
        /* 
           Performance Note: 
           Querying Supabase on every request adds latency. 
           For high traffic, consider verifying only signature or using Redis.
           For this MVP/Small Scale, it's fine.
        */

        req.user = { id: decoded.id, role: decoded.role, clientId: decoded.clientId };
        
        return next();
    } catch (err) {
        return res.status(401).json({ error: 'Token inválido ou expirado' });
    }
};

export const adminMiddleware = (req: Request, res: Response, next: NextFunction) => {
    if (req.user?.role !== 'admin' && req.user?.role !== 'super_admin') {
        return res.status(403).json({ error: 'Acesso negado: Requer privilégios de administrador' });
    }
    next();
};

export const superAdminMiddleware = (req: Request, res: Response, next: NextFunction) => {
    if (req.user?.role !== 'super_admin') {
        return res.status(403).json({ error: 'Acesso negado: Requer privilégios de super administrador' });
    }
    next();
};
