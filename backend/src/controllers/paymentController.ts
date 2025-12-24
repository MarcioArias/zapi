import { Request, Response } from 'express';
import { MercadoPagoConfig, Preference, Payment } from 'mercadopago';
import { supabase } from '../config/supabase';
import { logger } from '../config/logger';
import dotenv from 'dotenv';

dotenv.config();

const client = new MercadoPagoConfig({ 
    accessToken: process.env.MP_ACCESS_TOKEN || '' 
});

export const createCheckout = async (req: Request, res: Response) => {
    try {
        const { title, price } = req.body;
        const client_id = req.user.clientId;

        if (!process.env.MP_ACCESS_TOKEN) {
            return res.status(500).json({ error: 'MP_ACCESS_TOKEN not configured' });
        }

        const preference = new Preference(client);

        const result = await preference.create({
            body: {
                items: [
                    {
                        id: 'plan-subscription',
                        title: title,
                        quantity: 1,
                        unit_price: Number(price)
                    }
                ],
                external_reference: client_id, // We store the Client ID here to identify who paid
                back_urls: {
                    success: `${process.env.APP_URL || 'https://localhost:3000'}/dashboard.html?status=success`,
                    failure: `${process.env.APP_URL || 'https://localhost:3000'}/subscription.html?status=failure`,
                    pending: `${process.env.APP_URL || 'https://localhost:3000'}/dashboard.html?status=pending`
                },
                auto_return: 'approved',
                notification_url: `${process.env.NGROK_URL || process.env.APP_URL}/api/payments/webhook` 
                // Note: localhost webhooks won't work without ngrok
            }
        });

        // Create a pending payment record
        await supabase.from('payments').insert([{
            client_id: client_id,
            amount: price,
            due_date: new Date(),
            status: 'pending',
            description: `Checkout: ${title}`,
            payment_method: 'mercadopago'
        }]);

        return res.json({ id: result.id, init_point: result.init_point });

    } catch (error: any) {
        logger.error('MP Create Error:', error);
        return res.status(500).json({ error: error.message });
    }
};

export const handleWebhook = async (req: Request, res: Response) => {
    try {
        const { query, body } = req;
        const topic = query.topic || query.type;
        const id = query.id || query['data.id'];

        logger.info('Webhook received:', { topic, id });

        if (topic === 'payment') {
            const payment = new Payment(client);
            const paymentInfo = await payment.get({ id: String(id) });
            
            const status = paymentInfo.status;
            const clientId = paymentInfo.external_reference;

            if (status === 'approved' && clientId) {
                // 1. Update Client Status (AUTO-APPROVAL DISABLED FOR TESTING)
                /*
                await supabase
                    .from('clients')
                    .update({ 
                        status: 'active',
                        account_type: 'premium' 
                    })
                    .eq('id', clientId);
                */
                logger.info(`Payment approved for Client ${clientId}. Manual activation required.`);

                // 2. Register Payment in DB
                // We might want to update the pending one or create new. 
                // Since external_reference is client_id, we just log it.
                await supabase.from('payments').insert([{
                    client_id: clientId,
                    amount: paymentInfo.transaction_amount,
                    due_date: new Date(),
                    status: 'paid',
                    paid_at: new Date(),
                    description: `Mercado Pago Payment #${id}`,
                    payment_method: 'mercadopago'
                }]);
                
                logger.info(`Client ${clientId} upgraded to active.`);
            }
        }

        return res.sendStatus(200);
    } catch (error) {
        logger.error('Webhook Error:', error);
        return res.sendStatus(500);
    }
};
