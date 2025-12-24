import { Router } from 'express';
import { createCheckout, handleWebhook } from '../controllers/paymentController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

router.post('/checkout', authMiddleware, createCheckout);
router.post('/webhook', handleWebhook);

export default router;
