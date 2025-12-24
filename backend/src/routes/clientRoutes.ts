import { Router } from 'express';
import { 
    registerClient,
    getClientUsers,
    createClientUser,
    updateClientUser,
    deleteClientUser,
    getClientPayments,
    getClientStats
} from '../controllers/clientController';
import { authMiddleware, adminMiddleware } from '../middleware/authMiddleware';

const router = Router();

// Public
router.post('/register', registerClient);

// Protected (Needs Auth)
router.use(authMiddleware);
router.use(adminMiddleware);

router.get('/users', getClientUsers);
router.post('/users', createClientUser);
router.put('/users/:id', updateClientUser);
router.delete('/users/:id', deleteClientUser);

router.get('/payments', getClientPayments);
router.get('/stats', getClientStats);

export default router;
