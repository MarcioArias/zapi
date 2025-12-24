import { Router } from 'express';
import { getDashboardStats, getAllClients, updateClient, getPayments, createPayment } from '../controllers/adminController';
import { authMiddleware, superAdminMiddleware } from '../middleware/authMiddleware';

const router = Router();

// Apply middleware to all admin routes
router.use(authMiddleware);
router.use(superAdminMiddleware);

router.get('/stats', getDashboardStats);
router.get('/clients', getAllClients);
router.put('/clients/:id', updateClient);

// Financial Routes
router.get('/payments', getPayments);
router.post('/payments', createPayment);

export default router;
