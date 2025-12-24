import { Client, LocalAuth, MessageMedia } from 'whatsapp-web.js';
import QRCode from 'qrcode';
import { supabase } from '../config/supabase';
import path from 'path';
import fs from 'fs';
import { logger } from '../config/logger';

const MAX_RETRIES = 3;
const INITIAL_DELAY_MS = 2000;
const BACKOFF_MULTIPLIER = 2;

class WhatsappService {
    private clients: Map<string, Client>;

    constructor() {
        this.clients = new Map();
    }

    // Destroy all active clients
    async destroy() {
        logger.info('[WhatsApp] Destroying all active sessions...');
        const promises: Promise<void>[] = [];

        for (const [instanceId, client] of this.clients.entries()) {
            promises.push(
                (async () => {
                    try {
                        await client.destroy();
                        logger.info(`[WhatsApp] Destroyed session ${instanceId}`);
                    } catch (e) {
                        logger.error(`[WhatsApp] Error destroying session ${instanceId}:`, e);
                    }
                })()
            );
        }

        await Promise.all(promises);
        this.clients.clear();
    }

    async initializeInstance(instanceId: string, clientId: string) {
        logger.info(`[WhatsApp] Initializing instance ${instanceId} for client ${clientId}`);

        // 0. Check if client exists in memory and destroy it first
        if (this.clients.has(instanceId)) {
            logger.info(`[WhatsApp] Destroying existing client instance for ${instanceId}`);
            const oldClient = this.clients.get(instanceId);
            try {
                await oldClient?.destroy();
            } catch (e) {
                // Ignore EBUSY from library's internal cleanup, we do it manually
                logger.warn(`[WhatsApp] Warning during destroy (likely EBUSY):`, e);
            }
            this.clients.delete(instanceId);
            // Wait for processes to cleanup
            await new Promise(resolve => setTimeout(resolve, 3000)); // Increased to 3s
        }

        // Create session directory for LocalAuth
        const baseSessionPath = path.join(__dirname, '../../.wwebjs_auth');
        const specificSessionPath = path.join(baseSessionPath, `session-${instanceId}`);

        // Clean up previous session if exists (prevent corruption)
        if (fs.existsSync(specificSessionPath)) {
            logger.info(`[WhatsApp] Cleaning up existing session folder for ${instanceId}`);

            // Strategy: Rename to .trash first (Windows lock workaround)
            const trashPath = specificSessionPath + '.trash.' + Date.now();
            try {
                fs.renameSync(specificSessionPath, trashPath);
                logger.info(`[WhatsApp] Renamed locked session to ${trashPath}`);

                // Delete trash in background (don't await)
                fs.rm(trashPath, { recursive: true, force: true }, () => { });
            } catch (renameErr) {
                logger.warn(`[WhatsApp] Rename failed, trying robust delete...`);

                // Retry logic for folder deletion
                let retries = 5;
                while (retries > 0) {
                    try {
                        fs.rmSync(specificSessionPath, { recursive: true, force: true });
                        break;
                    } catch (e: any) {
                        logger.error(`[WhatsApp] Failed to clean session folder (attempt ${6 - retries}):`, e.message);
                        retries--;
                        if (retries > 0) await new Promise(resolve => setTimeout(resolve, 1500));
                    }
                }
            }
        }

        if (!fs.existsSync(baseSessionPath)) {
            fs.mkdirSync(baseSessionPath, { recursive: true });
        }

        const client = new Client({
            authStrategy: new LocalAuth({
                clientId: instanceId,
                dataPath: baseSessionPath
            }),
            puppeteer: {
                headless: true,
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-accelerated-2d-canvas',
                    '--no-first-run',
                    '--no-zygote',
                    '--disable-gpu'
                ],
                timeout: 60000 // Increase timeout to 60s
            }
        });

        this.clients.set(instanceId, client);

        client.on('qr', async (qr) => {
            logger.info(`[WhatsApp] QR Code received for ${instanceId}`);
            try {
                const dataUrl = await QRCode.toDataURL(qr);

                await supabase
                    .from('instances')
                    .update({
                        qr_code: dataUrl,
                        status: 'connecting'
                    })
                    .eq('id', instanceId);
            } catch (error) {
                logger.error('[WhatsApp] Error saving QR:', error);
            }
        });

        client.on('ready', async () => {
            logger.info(`[WhatsApp] Instance ${instanceId} is ready!`);
            await supabase
                .from('instances')
                .update({
                    status: 'connected',
                    qr_code: null
                })
                .eq('id', instanceId);
        });

        client.on('authenticated', async () => {
            logger.info(`[WhatsApp] Instance ${instanceId} authenticated`);
            // Clear QR code to indicate progress on frontend
            await supabase
                .from('instances')
                .update({ qr_code: null })
                .eq('id', instanceId);
        });

        client.on('auth_failure', async (msg) => {
            logger.error(`[WhatsApp] Auth failure for ${instanceId}:`, msg);
            await supabase
                .from('instances')
                .update({ status: 'failed' })
                .eq('id', instanceId);
        });

        client.on('disconnected', async (reason) => {
            logger.info(`[WhatsApp] Instance ${instanceId} disconnected:`, reason);

            // 1. Notify Database immediately
            await supabase
                .from('instances')
                .update({ status: 'disconnected' })
                .eq('id', instanceId);

            // 2. Destroy client to free resources
            try {
                await client.destroy();
            } catch (e) { logger.warn('Error destroying disconnected client:', e); }

            this.clients.delete(instanceId);
        });

        try {
            logger.info(`[WhatsApp] Starting client ${instanceId}...`);
            await client.initialize();
        } catch (error) {
            logger.error(`[WhatsApp] Failed to initialize client ${instanceId}:`, error);
            // Update DB to reflect failure
            await supabase.from('instances').update({ status: 'failed' }).eq('id', instanceId);
        }
    }

    async sendMessage(instanceId: string, phone: string, message: string, media?: { name: string, data: string, type: string }) {
        const client = this.clients.get(instanceId);
        if (!client) {
            throw new Error('Instance not found or not connected');
        }

        // Format phone: WhatsApp expects '5511999999999@c.us'
        // Remove non-digits
        let formattedPhone = phone.replace(/\D/g, '');

        // Check if it has @c.us, if not add it
        if (!formattedPhone.includes('@c.us')) {
            formattedPhone = `${formattedPhone}@c.us`;
        }

        let lastError: any;

        for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
            try {
                if (media) {
                    // Remove header from base64 if present (e.g., "data:image/png;base64,")
                    const base64Data = media.data.split(',')[1] || media.data;
                    const messageMedia = new MessageMedia(media.type, base64Data, media.name);
                    await client.sendMessage(formattedPhone, messageMedia, { caption: message });
                } else {
                    await client.sendMessage(formattedPhone, message);
                }

                if (attempt > 1) {
                    logger.info(`[WhatsApp] Message sent successfully on attempt ${attempt} for ${instanceId}`);
                }
                return { success: true };

            } catch (error: any) {
                lastError = error;
                const errorMsg = error.message || String(error);

                // Determine if retryable
                const isRetryable =
                    errorMsg.includes('Protocol error') ||
                    errorMsg.includes('Evaluation failed') ||
                    errorMsg.includes('Target closed') ||
                    errorMsg.includes('Session closed') ||
                    errorMsg.includes('NetworkError') ||
                    errorMsg.includes('timeout');

                if (!isRetryable) {
                    logger.error(`[WhatsApp] Non-retryable error for ${instanceId}: ${errorMsg}`);
                    throw error; // Fail immediately for critical/business errors
                }

                logger.warn(`[WhatsApp] Send attempt ${attempt}/${MAX_RETRIES} failed for ${instanceId}: ${errorMsg}`);

                if (attempt === MAX_RETRIES) {
                    break; // Exit loop to throw error
                }

                // Exponential Backoff
                const delay = INITIAL_DELAY_MS * Math.pow(BACKOFF_MULTIPLIER, attempt - 1);
                logger.info(`[WhatsApp] Retrying in ${delay}ms...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }

        logger.error(`[WhatsApp] All ${MAX_RETRIES} attempts failed for ${instanceId}`);
        throw lastError;
    }

    async restoreSessions() {
        logger.info('[WhatsApp] Restoring sessions...');
        const { data: instances } = await supabase
            .from('instances')
            .select('*')
            .eq('status', 'connected');

        // Also handle 'connecting' instances that were interrupted -> mark as failed/disconnected
        const { data: stuckInstances } = await supabase
            .from('instances')
            .select('id')
            .eq('status', 'connecting');

        if (stuckInstances && stuckInstances.length > 0) {
            logger.info(`[WhatsApp] Found ${stuckInstances.length} stuck sessions. Marking as disconnected.`);
            const ids = stuckInstances.map(i => i.id);
            await supabase.from('instances').update({ status: 'disconnected' }).in('id', ids);
        }

        if (instances && instances.length > 0) {
            for (const instance of instances) {
                logger.info(`[WhatsApp] Restoring ${instance.id}`);
                this.initializeInstance(instance.id, instance.client_id);
            }
        } else {
            logger.info('[WhatsApp] No active sessions to restore.');
        }
    }

    async deleteSession(instanceId: string) {
        logger.info(`[WhatsApp] Deleting session for ${instanceId}`);
        // 1. Destroy client if running
        const client = this.clients.get(instanceId);
        if (client) {
            try {
                await client.destroy();
            } catch (e) {
                logger.error(`[WhatsApp] Error destroying client ${instanceId}`, e);
            }
            this.clients.delete(instanceId);
        }

        // 2. Remove folder
        const sessionPath = path.join(__dirname, '../../.wwebjs_auth', `session-${instanceId}`);
        if (fs.existsSync(sessionPath)) {
            try {
                fs.rmSync(sessionPath, { recursive: true, force: true });
                logger.info(`[WhatsApp] Session folder deleted for ${instanceId}`);
            } catch (e) {
                logger.error(`[WhatsApp] Error deleting session folder for ${instanceId}`, e);
            }
        }
    }
}

export const whatsappService = new WhatsappService();
