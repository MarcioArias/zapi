import { Request, Response } from 'express';
import { supabase } from '../config/supabase';
import { whatsappService } from '../services/whatsappService';
import { logger } from '../config/logger';

// Check if running in Desktop Mode
const isDesktopMode = () => process.env.APP_MODE === 'desktop';

// --- INSTANCES ---

export const getInstances = async (req: Request, res: Response) => {
  try {
    const client_id = req.user.clientId;

    const { data, error } = await supabase
      .from('instances')
      .select('*')
      .eq('client_id', client_id);

    if (error) throw error;
    return res.json(data);
  } catch (error: any) {
    logger.error('Get Instances Error:', error);
    return res.status(500).json({ error: error.message });
  }
};

export const createInstance = async (req: Request, res: Response) => {
  try {
    // In Cloud Mode, we DON'T create local WhatsApp instances
    // We only create the DB record. The Desktop App will pick it up.
    
    // In Desktop Mode, we DO create the local instance.
    
    const client_id = req.user.clientId;
    const { name, phone_number } = req.body;

    const { data, error } = await supabase
      .from('instances')
      .insert([{ client_id, name, phone_number, status: 'disconnected' }])
      .select()
      .single();

    if (error) throw error;

    if (isDesktopMode()) {
        logger.info('🖥️ Modo Desktop: Iniciando instância local do WhatsApp...');
        // Initialize WhatsApp Service Locally
        whatsappService.initializeInstance(data.id, client_id);
    } else {
        logger.info('☁️ Modo Cloud: Instância criada no DB. Aguardando App Desktop conectar.');
    }

    return res.status(201).json(data);
  } catch (error: any) {
    logger.error('Create Instance Error:', error);
    return res.status(500).json({ error: error.message });
  }
};

export const updateInstance = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const client_id = req.user.clientId;
    
    const { data, error } = await supabase
      .from('instances')
      .update({ status })
      .eq('id', id)
      .eq('client_id', client_id) // Ensure ownership
      .select();

    if (error) throw error;
    return res.json(data);
  } catch (error: any) {
    logger.error('Update Instance Error:', error);
    return res.status(500).json({ error: error.message });
  }
};

export const deleteInstance = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const client_id = req.user.clientId;

    const { error } = await supabase
      .from('instances')
      .delete()
      .eq('id', id)
      .eq('client_id', client_id); // Security check

    if (error) throw error;
    
    // Always try to cleanup local resources if they exist
    // Even in cloud mode, maybe we want to send a signal (future)
    if (isDesktopMode()) {
        // Stop WhatsApp Service Locally
        // Note: whatsappService needs a method for this exposed if not already
        // whatsappService.destroyInstance(id); // TODO: Implement destroy in service
    }

    return res.json({ message: 'Instance deleted' });
  } catch (error: any) {
    logger.error('Delete Instance Error:', error);
    return res.status(500).json({ error: error.message });
  }
};

// --- MESSAGING ---

export const sendMessage = async (req: Request, res: Response) => {
  try {
    if (!isDesktopMode()) {
        return res.status(400).json({ 
            error: 'Operação não permitida no modo Cloud. Use o App Desktop para enviar mensagens.' 
        });
    }

    const { instanceId, to, message, file } = req.body;
    const client_id = req.user.clientId; // Validated from token

    // 1. Verify ownership
    // (Optional optimization: cache this check)
    const { data: instance } = await supabase
        .from('instances')
        .select('id')
        .eq('id', instanceId)
        .eq('client_id', client_id)
        .single();
    
    if (!instance) {
        return res.status(403).json({ error: 'Instance not found or access denied' });
    }

    // 2. Send via Local Service
    const result = await whatsappService.sendMessage(instanceId, to, message, file);

    return res.json(result);

  } catch (error: any) {
    logger.error('Send Message Error:', error);
    return res.status(500).json({ error: error.message });
  }
};
